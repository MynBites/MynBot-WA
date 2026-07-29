import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'
import { Levelling } from './config.js'

plugin.add('rpg-autolevelup', {
  middleware: async function (m, { Users }) {
    try {
      let User = await Users.findOne({ id: m.sender })
      if (!User?.rpg?.autolevelup) return false
      let rpg = User.rpg
      let level = rpg.stats?.level || 0
      let xp = rpg.stats?.exp || 0
      let leveled = 0
      while (Levelling.canLevelUp(level, xp)) {
        level += 1
        leveled += 1
      }
      if (leveled) {
        await Users.updateOne({ id: m.sender }, { $set: { 'rpg.stats.level': level } })
        await this.sendMessage(
          m.chat,
          { text: Lang.format('plugins.rpg-autolevelup.message.leveled', { leveled, level }) },
          { quoted: m },
        )
      }
    } catch (e) {
      console.error(e)
    }
    return false
  },
})
