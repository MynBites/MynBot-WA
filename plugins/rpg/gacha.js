import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'
import { DefaultValues, fMoney } from './config.js'
import { randomRange, getChance } from '../../util/Util.js'

plugin.add('rpg-gacha', {
  help: ['gacha'],
  command: 'gacha',
  type: 'rpg',
  async onCommand(m, { Users }) {
    let User = await Users.findOne({ id: m.sender })
    let rpg = User?.rpg || DefaultValues
    let cost = 50_000
    if ((rpg.economy?.money || 0) < cost)
      throw Lang.format('plugins.rpg-gacha.message.needMoney', { cost: fMoney(cost) })

    await Users.updateOne(
      { id: m.sender },
      { $inc: { 'rpg.economy.money': -cost } },
      { upsert: true },
    )

    let roll = getChance({ money: 6, exp: 6, potion: 4, diamond: 2, crate: 1 })
    if (roll.money) {
      let money = randomRange(0, 200_000)
      await Users.updateOne(
        { id: m.sender },
        { $inc: { 'rpg.economy.money': money } },
        { upsert: true },
      )
      await this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-gacha.message.result.money', { money: fMoney(money) }) },
        { quoted: m },
      )
      return
    }

    if (roll.exp) {
      let exp = randomRange(0, 20_000)
      await Users.updateOne({ id: m.sender }, { $inc: { 'rpg.stats.exp': exp } }, { upsert: true })
      await this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-gacha.message.result.exp', { exp }) },
        { quoted: m },
      )
      return
    }

    if (roll.potion) {
      let p = randomRange(1, 5)
      await Users.updateOne(
        { id: m.sender },
        { $inc: { 'rpg.inventory.potion': p } },
        { upsert: true },
      )
      await this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-gacha.message.result.potion', { potion: p }) },
        { quoted: m },
      )
      return
    }

    if (roll.diamond) {
      let d = randomRange(1, 3)
      await Users.updateOne(
        { id: m.sender },
        { $inc: { 'rpg.inventory.diamond': d } },
        { upsert: true },
      )
      await this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-gacha.message.result.diamond', { diamond: d }) },
        { quoted: m },
      )
      return
    }

    let crate = randomRange(1, 2)
    await Users.updateOne(
      { id: m.sender },
      { $inc: { 'rpg.crate.common': crate } },
      { upsert: true },
    )
    await this.sendMessage(
      m.chat,
      { text: Lang.format('plugins.rpg-gacha.message.result.crate', { crate }) },
      { quoted: m },
    )
  },
})
