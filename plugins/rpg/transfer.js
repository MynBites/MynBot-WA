import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'

plugin.add('rpg-transfer', {
  help: ['transfer'],
  command: 'transfer',
  type: 'rpg',
  async onCommand(m, { Users, args }) {
    if (!m.isGroup) throw Lang.format('plugins.rpg-transfer.message.groupOnly')
    if (args.length < 3)
      return this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-transfer.message.usage') },
        { quoted: m },
      )
    let type = (args[0] || '').toLowerCase()
    let count = Math.max(1, parseInt(args[1] || '0'))
    let who = m.mentionedJid?.[0]
    if (!who)
      return this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-transfer.message.noTag') },
        { quoted: m },
      )

    const sender = await Users.findOne({ id: m.sender })
    const recipient = await Users.findOne({ id: who })
    if (!recipient)
      await Users.updateOne({ id: who }, { $setOnInsert: { rpg: {} } }, { upsert: true })

    switch (type) {
      case 'money':
        if ((sender.rpg?.economy?.money || 0) < count)
          throw Lang.format('plugins.rpg-transfer.message.notEnoughMoney')
        await Users.updateOne({ id: m.sender }, { $inc: { 'rpg.economy.money': -count } })
        await Users.updateOne(
          { id: who },
          { $inc: { 'rpg.economy.money': count } },
          { upsert: true },
        )
        return this.sendMessage(
          m.chat,
          { text: Lang.format('plugins.rpg-transfer.message.success.money', { count }) },
          { quoted: m },
        )
      case 'exp':
        if ((sender.rpg?.stats?.exp || 0) < count)
          throw Lang.format('plugins.rpg-transfer.message.notEnoughExp')
        await Users.updateOne({ id: m.sender }, { $inc: { 'rpg.stats.exp': -count } })
        await Users.updateOne({ id: who }, { $inc: { 'rpg.stats.exp': count } }, { upsert: true })
        return this.sendMessage(
          m.chat,
          { text: Lang.format('plugins.rpg-transfer.message.success.exp', { count }) },
          { quoted: m },
        )
      default:
        return this.sendMessage(
          m.chat,
          { text: Lang.format('plugins.rpg-transfer.message.usage') },
          { quoted: m },
        )
    }
  },
})
