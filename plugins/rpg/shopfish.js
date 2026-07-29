import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'

const PRICES = {
  hiu: { buy: 1500, sell: 400 },
  ikan: { buy: 500, sell: 50 },
  dory: { buy: 800, sell: 200 },
}

plugin.add('rpg-shopfish', {
  help: ['shopfish'],
  command: 'shopfish',
  type: 'rpg',
  async onCommand(m, { Users, args, usedPrefix }) {
    let mode = (args[0] || '').toLowerCase()
    let item = (args[1] || '').toLowerCase()
    let count = Math.max(1, parseInt(args[2] || '1'))
    if (!mode || !item)
      return this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-shopfish.message.usage', { prefix: usedPrefix }) },
        { quoted: m },
      )
    if (!PRICES[item])
      return this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-shopfish.message.unknownItem', { item }) },
        { quoted: m },
      )

    let User = await Users.findOne({ id: m.sender })
    let money = User?.rpg?.economy?.money || 0

    if (mode === 'buy') {
      let cost = PRICES[item].buy * count
      if (money < cost) throw Lang.format('plugins.rpg-shopfish.message.notEnoughMoney')
      await Users.updateOne(
        { id: m.sender },
        { $inc: { 'rpg.economy.money': -cost, [`rpg.fish.${item}`]: count } },
        { upsert: true },
      )
      return this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-shopfish.message.bought', { item, count, cost }) },
        { quoted: m },
      )
    }

    if (mode === 'sell') {
      let have = User?.rpg?.fish?.[item] || 0
      if (have < count) throw Lang.format('plugins.rpg-shopfish.message.notHaveItem', { item })
      let gain = PRICES[item].sell * count
      await Users.updateOne(
        { id: m.sender },
        { $inc: { 'rpg.economy.money': gain, [`rpg.fish.${item}`]: -count } },
        { upsert: true },
      )
      return this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-shopfish.message.sold', { item, count, gain }) },
        { quoted: m },
      )
    }

    return this.sendMessage(
      m.chat,
      { text: Lang.format('plugins.rpg-shopfish.message.usage', { prefix: usedPrefix }) },
      { quoted: m },
    )
  },
})
