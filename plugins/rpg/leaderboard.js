import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'

plugin.add('rpg-leaderboard', {
  help: ['leaderboard', 'lb'],
  command: /^(leaderboard|lb)$/i,
  type: 'rpg',
  async onCommand(m, { Users, args }) {
    let len = 10
    if (args[0] && !isNaN(parseInt(args[0]))) len = Math.max(1, Math.min(parseInt(args[0]), 20))

    // Use MongoDB aggregation to avoid loading all documents into memory
    const topExp = await Users.aggregate([
      { $project: { id: 1, value: { $ifNull: ['$rpg.stats.exp', 0] } } },
      { $sort: { value: -1 } },
      { $limit: len },
    ]).toArray()

    const topLevel = await Users.aggregate([
      { $project: { id: 1, value: { $ifNull: ['$rpg.stats.level', 0] } } },
      { $sort: { value: -1 } },
      { $limit: len },
    ]).toArray()

    const topMoney = await Users.aggregate([
      { $project: { id: 1, value: { $ifNull: ['$rpg.economy.money', 0] } } },
      { $sort: { value: -1 } },
      { $limit: len },
    ]).toArray()

    const fmt = (list, suffix = '') =>
      list
        .map(
          (it, i) =>
            `${i + 1}. ${it.id.split('@')[0]} *${(it.value || 0).toLocaleString()}${suffix}*`,
        )
        .join('\n')

    let text = Lang.format('plugins.rpg-leaderboard.message.header', { len }) + '\n\n'
    text += Lang.format('plugins.rpg-leaderboard.message.exp') + '\n' + fmt(topExp, ' Exp') + '\n\n'
    text +=
      Lang.format('plugins.rpg-leaderboard.message.level') + '\n' + fmt(topLevel, ' Lvl') + '\n\n'
    text += Lang.format('plugins.rpg-leaderboard.message.money') + '\n' + fmt(topMoney, '')

    await this.sendMessage(m.chat, { text }, { quoted: m })
  },
})
