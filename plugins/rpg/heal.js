import { plugin } from '../../index.js'
import { isNumber, constrain, flattenObject } from '../../util/Util.js'
import Lang from '../../util/Language.js'
import { MaxHealth, DefaultValues } from './config.js'

plugin.add('rpg-heal', {
  help: ['heal'],
  command: 'heal',
  type: 'rpg',
  async onCommand(m, { args, Users }) {
    let User = await Users.findOne({ id: m.sender })
    let rpg = User.rpg || DefaultValues
    if (!User.rpg)
      await Users.updateOne({ id: m.sender }, { $setOnInsert: DefaultValues }, { upsert: true })
    if (rpg.stats.health >= MaxHealth) throw Lang.format('plugins.rpg-heal.message.fullHealth')
    const heal = 50
    let amount = isNumber(args[0])
      ? constrain(parseInt(args[0]), 1, MaxHealth - rpg.stats.health)
      : Math.round((MaxHealth - rpg.stats.health) / heal)
    if (rpg.inventory.potion < amount)
      throw Lang.format('plugins.rpg-heal.message.potionNotEnough', { amount })
    await Users.updateOne(
      { id: m.sender },
      {
        $setOnInsert: flattenObject({ rpg: DefaultValues }),
      },
      { upsert: true },
    )
    await Users.updateOne(
      { id: m.sender },
      {
        $inc: {
          'rpg.stats.health': amount * heal,
          'rpg.inventory.potion': -amount,
        },
      },
    )
    await m.reply(Lang.format('plugins.rpg-heal.message.success', { amount }))
  },
})
