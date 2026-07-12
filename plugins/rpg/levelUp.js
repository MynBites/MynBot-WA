import { plugin } from '../../index.js'
import { canLevelUp, xpRange, multiplier } from './config.js'

plugin.add('rpg-levelup', {
  async onCommand(m, { Users }) {
    const User = Users.findOne({ id: m.sender })

    if (!canLevelUp(User.stats.level, User.stats.exp, multiplier)) {
      let { min, xp, max } = xpRange(User.stats.level, multiplier)
      throw `
Level *${User.stats.level} (${User.stats.exp - min}/${xp})*
Kurang *${max - User.stats.exp}* lagi!
`.trim()
    }
    let before = User.stats.level * 1
    while (canLevelUp(User.stats.level, User.stats.exp, multiplier)) User.stats.level++
    if (before !== User.stats.level) {
      User.role = global.rpg.role(User.stats.level).name
      let teks = 'Selamat Kamu Naik Level!'
      let str = `
Selamat ${conn.getName(m.sender)}
• 🧬Level Sebelumnya : ${before}
• 🧬Level Baru : ${User.stats.level}
• 🧬Role Kamu : ${User.role}
• Pada Jam : ${new Date().toLocaleString('id-ID')}
*_Semakin sering berinteraksi dengan bot Semakin Tinggi level kamu_*
`.trim()
      try {
        const img = await levelup(teks, User.stats.level)
        conn.sendFile(m.chat, img, 'levelup.jpg', str, m)
      } catch (e) {
        m.reply(str)
      }
    }
  },
})
