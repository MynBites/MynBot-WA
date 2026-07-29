import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'
import { Levelling } from './config.js'

plugin.add('rpg-levelup', {
  async onCommand(m, { Users }) {
    const User = Users.findOne({ id: m.sender })

    if (!Levelling.canLevelUp(User.stats.level, User.stats.exp)) {
      let { min, xp, max } = Levelling.xpRange(User.stats.level)
      throw Lang.format('plugins.rpg-levelup.message.cantLevel', {
        level: User.stats.level,
        curr: User.stats.exp - min,
        xp,
        needed: max - User.stats.exp,
      })
    }
    let level = 0
    while (Levelling.canLevelUp(User.stats.level + level, User.stats.exp)) level++
    if (level == 0) return
    let role = Levelling.getRole(User.stats.level + level).name

    await Users.updateOne(
      { id: m.sender },
      {
        $inc: {
          'rpg.stats.level': level,
        },
      },
    )

    // let teks = 'Selamat Kamu Naik Level!'
    let caption = Lang.format('plugins.rpg-levelup.message.success', {
      name: this.getName(m.sender),
      prevLevel: User.stats.level,
      newLevel: User.stats.level + level,
      role,
      time: new Date().toLocaleString(Lang.lang),
    })
    m.reply(caption)
    // const img = await levelup(teks, User.stats.level)
    // this.sendMessage(m.chat, { image, caption }, { quoted: m })
  },
})
