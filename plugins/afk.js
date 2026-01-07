import { jidDecode } from "@whiskeysockets/baileys";
import plugin from "../index.js";

plugin.add("afk", {
  help: ["afk [alasan]", "afk"],
  command: "afk",
  async middleware(m, {}) {
      const contact = await this.store.contacts.findOne({ id: m.sender }) || {};
      if (contact.afk) {
        await this.store.contacts.update(m.sender, { afk: null });
        m.reply(`@${jidDecode(m.sender).user} is no longer AFK after ${contact.afk.reason}`, { mentions: [m.sender] });
      }
      if (m.mentionedJid && m.mentionedJid.includes(this.user.jid)) {
        const users = await Promise.all(m.mentionedJid.map(async (u) => {
          const c = await this.store.contacts.findOne({ id: u }) || {};
          if (c.afk) {
            return `@${jidDecode(u).user} is AFK${c.afk.reason ? `: ${c.afk.reason}` : ""} since ${new Date(c.afk.time).toLocaleString()}`;
          }
          return null;
        })).filter(v => v);
        if (users.length) {
          m.reply(users.join("\n"), { mentions: m.mentionedJid });
        }
      }
  },
  async onCommand(m, { text }) {
    await this.store.contacts.update(m.sender, { afk: {
      time: Date.now(),
      reason: text || "AFK"
    }})
    m.reply(`@${jidDecode(m.sender).user} is now AFK${text ? `: ${text}` : ""}`, { mentions: [m.sender] })
  }
});
