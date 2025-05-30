import plugin from "../index.js";
import os from "os"
import v8 from "v8"
import { sizeFormatter } from "human-readable"
import got from "got"

const formatSize = (byte) => {
  if (typeof byte !== "number") return byte;
  const format = sizeFormatter({
    std: "JEDEC",
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
  });
  return format(byte);
}

const List = (data) =>
    Object.keys(data)
      .map((key) => `- *${key}:* ${data[key]}`)
      .join("\n");

plugin.add('serverInfo', {
  description: 'Displays server information',
  command: ['srv'],
  async onCommand(m) {
    const json = await got("https://ipwho.is/").json();

    const memory = {};
    for (const [type, size] of [
      ...Object.entries(process.memoryUsage()),
      ...Object.entries(v8.getHeapStatistics()),
    ]) {
      if (size > 10) {
        memory[
          type
            .replace(/_/g, " ")
            .replace(" size", "")
            .replace("total", "")
            .replace("memory", "")
            .trim()
        ] = formatSize(size);
      }
    }

    const cpus = os.cpus().map((cpu) => {
      cpu.total = Object.keys(cpu.times).reduce(
        (last, type) => last + cpu.times[type],
        0
      );
      return cpu;
    });

    const cpu = cpus.reduce(
      (last, cpu, _, { length }) => {
        last.total += cpu.total;
        last.speed += cpu.speed / length;
        last.times.user += cpu.times.user;
        last.times.nice += cpu.times.nice;
        last.times.sys += cpu.times.sys;
        last.times.idle += cpu.times.idle;
        last.times.irq += cpu.times.irq;
        return last;
      },
      {
        speed: 0,
        total: 0,
        times: {
          user: 0,
          nice: 0,
          sys: 0,
          idle: 0,
          irq: 0,
        },
      }
    );

    const server = {
      hostname: os.hostname(),
      platform: os.platform(),
      ip: json.ip || "Tidak terdeteksi",
      region: json.region || "Tidak tersedia",
      country: json.country || "Tidak tersedia",
      domain: json.connection?.domain || "Tidak tersedia",
      isp: json.connection?.isp || "Tidak diketahui",
      arch: `${os.arch()} / ${os.machine()}`,
      os: `${os.version()} / ${os.release()}`,
      ram: `${formatSize(
        os.totalmem() - os.freemem()
      )} / ${formatSize(os.totalmem())}`,
      ...(process.env.EXP ? { expired: process.env.EXP } : {}),
      runtime: new Date(os.uptime() * 1000)
        .toISOString()
        .slice(11, 19),
    };

    const txt = `
_*Server Info*_
${List(server)}

_*NodeJS Memory Usage${process.env.SERVER_MEMORY
        ? " (" + formatSize(process.env.SERVER_MEMORY * 1024 * 1024) + ")"
        : ""
      }*_
${List(memory)}

${cpus[0]
        ? `_Total CPU Usage_
${cpus[0].model.trim()} (${cpu.speed.toFixed(2)} MHz)\n${Object.keys(cpu.times)
          .map(
            (type) =>
              `- *${type.padEnd(6)}: ${(
                (100 * cpu.times[type]) /
                cpu.total
              ).toFixed(2)}%`
          )
          .join("\n")}

_CPU Core(s) Usage (${cpus.length} Core CPU)_
${cpus
          .map(
            (cpu, i) =>
              `${i + 1}. ${cpu.model.trim()} (${cpu.speed} MHz)\n${Object.keys(
                cpu.times
              )
                .map(
                  (type) =>
                    `- *${type.padEnd(6)}: ${(
                      (100 * cpu.times[type]) /
                      cpu.total
                    ).toFixed(2)}%`
                )
                .join("\n")}`
          )
          .join("\n\n")}`
        : ""
      }`.trim();

    await m.reply(txt, null, m.key.fromMe ? { edit: m.key } : {});
  }
});