import { jidDecode } from '@whiskeysockets/baileys'
import plugin from '../../index.js'

plugin.add('fun-afk', {
  help: ['afk'],
  command: 'afk',
  async middleware(m, { Users }) {
    let User = await Users.findOne({ id: m.sender })
    if (!User) return
    if (User.afk) {
      await Users.updateOne({ id: m.sender }, { $set: { afk: null } }, { upsert: true })
      m.reply(`@${jidDecode(m.sender).user} is no longer AFK after ${User.afk.reason}`, null, {
        mentions: [m.sender],
      })
    }
    if (m.mentionedJid && m.mentionedJid.includes(this.user.jid)) {
      const users = await Promise.all(
        m.mentionedJid.map(async (u) => {
          const c = (await Users.findOne({ id: u })) || {}
          if (c.afk) {
            return `@${jidDecode(u).user} is AFK${c.afk.reason ? `: ${c.afk.reason}` : ''} since ${new Date(c.afk.time).toLocaleString()}`
          }
          return null
        }),
      ).filter((v) => v)
      if (users.length) {
        m.reply(users.join('\n'), { mentions: m.mentionedJid })
      }
    }
  },
  async onCommand(m, { text, Users }) {
    await Users.updateOne(
      { id: m.sender },
      {
        $set: {
          afk: {
            time: Date.now(),
            reason: text || 'AFK',
          },
        },
      },
      { upsert: true },
    )
    m.reply(`@${jidDecode(m.sender).user} is now AFK${text ? `: ${text}` : ''}`, null, {
      mentions: [m.sender],
    })
  },
})
