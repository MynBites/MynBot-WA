import plugin from "../index.js";

const masa = [
  ['detik', 60],
  ['menit', 60],
  ['jam', 24],
  ['hari', 30],
  ['bulan', 12],
  ['tahun', 10],
  ['dekade', 10],
  ['abad', 10],
  ['milinium', 10]
]

plugin.add('pertanyaan', {
  help: ['apakah', 'kapankah', 'when'],
  prefix: /^(apakah|kapankah|when)/i,
  command: false,
  type: 'fun',
  async onCommand(m, { prefix }) {
    if (prefix.toLowerCase() === 'kapankah' || prefix.toLowerCase() === 'when') {
      let selected = pickRandom(masa);
      m.reply(`_${randRange(1, selected[1] - 1)} ${selected[0]} lagi..._`);
    } else {
      m.reply(pickRandom(['Ya', 'Tidak', 'Mungkin saja', 'Bisa jadi', 'Tentu saja', 'Tentu tidak', 'Coba tanya lagi nanti', 'Saya tidak tahu', 'Kemungkinan besar iya', 'Kemungkinan besar tidak']))
    } 
  }
})

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}