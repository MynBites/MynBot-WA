import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'
import { DefaultValues, fMoney } from './config.js'
import { randomRange } from '../../util/Util.js'

plugin.add('rpg-killmonster', {
  help: ['kill monster'],
  command: 'kill',
  type: 'rpg',
  async onCommand(m, { Users, args, usedPrefix }) {
    if ((args[0] || '').toLowerCase() !== 'monster')
      return this.sendMessage(
        m.chat,
        {
          text: Lang.format('plugins.rpg-killmonster.message.usage', {
            cmd: 'kill monster',
            prefix: usedPrefix,
          }),
        },
        { quoted: m },
      )

    let User = await Users.findOne({ id: m.sender })
    let rpg = User?.rpg || DefaultValues
    if ((rpg.stats?.health || 0) < 80)
      throw Lang.format('plugins.rpg-killmonster.message.lowHealth')
    if ((rpg.economy?.ticket || 0) < 100)
      throw Lang.format('plugins.rpg-killmonster.message.needTicket')

    let healthLoss = randomRange(10, 50)
    let exp = randomRange(100, 100000)
    let money = randomRange(100, 100000)
    let potion = randomRange(0, 2)

    await Users.updateOne(
      { id: m.sender },
      {
        $inc: {
          'rpg.stats.health': -healthLoss,
          'rpg.stats.exp': exp,
          'rpg.economy.money': money,
          'rpg.inventory.potion': potion,
          'rpg.economy.ticket': -100,
        },
        $set: { 'rpg.last.warpet': Date.now() },
      },
      { upsert: true },
    )

    await this.sendMessage(
      m.chat,
      {
        text: Lang.format('plugins.rpg-killmonster.message.result', {
          lost: healthLoss,
          exp,
          money: fMoney(money),
          potion,
        }),
      },
      { quoted: m },
    )
  },
})
