import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'
import { DefaultValues, fMoney } from './config.js'
import { randomRange } from '../../util/Util.js'

const MODES = {
  easy: {
    pets: [
      { key: 'cat', min: 5 },
      { key: 'horse', min: 5 },
      { key: 'fox', min: 5 },
    ],
    lostRange: [1, 3],
    expRange: [100, 5_000],
    moneyRange: [1_000, 100_000],
    crate: 'common',
    needMsg: 'plugins.rpg-bossraid.message.needPetsEasy',
    successKey: 'plugins.rpg-bossraid.message.success.easy',
  },
  normal: {
    pets: [
      { key: 'griffin', min: 7 },
      { key: 'phoenix', min: 7 },
      { key: 'wolf', min: 7 },
    ],
    lostRange: [1, 4],
    expRange: [1_000, 100_000],
    moneyRange: [10_000, 1_000_000],
    crate: 'uncommon',
    needMsg: 'plugins.rpg-bossraid.message.needPetsNormal',
    successKey: 'plugins.rpg-bossraid.message.success.normal',
  },
  hard: {
    pets: [
      { key: 'dragon', min: 10 },
      { key: 'kyubi', min: 10 },
      { key: 'centaur', min: 10 },
    ],
    lostRange: [3, 6],
    expRange: [10_000, 1_000_000],
    moneyRange: [100_000, 100_000_000],
    crate: 'legendary',
    needMsg: 'plugins.rpg-bossraid.message.needPetsHard',
    successKey: 'plugins.rpg-bossraid.message.success.hard',
  },
}

plugin.add('rpg-bossraid', {
  help: ['bosraid'],
  command: 'bosraid',
  type: 'rpg',
  async onCommand(m, { Users, command, args }) {
    const mode = (args[0] || 'easy').toLowerCase()
    const User = await Users.findOne({ id: m.sender })
    const rpg = User?.rpg ?? DefaultValues
    const now = Date.now()
    const COOLDOWN = 600_000

    if (!rpg.last) rpg.last = {}
    if (!rpg.pet) rpg.pet = DefaultValues.pet

    const last = rpg.last.bossraid || 0
    if (now - last < COOLDOWN)
      throw Lang.format('plugins.rpg-bossraid.message.cooldown', {
        time: Math.ceil((COOLDOWN - (now - last)) / 1000) + 's',
      })

    const cfg = MODES[mode]
    if (!cfg) {
      await this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-bossraid.usageDescription', { command }) },
        { quoted: m },
      )
      return
    }

    // pet requirements
    const hasPets = cfg.pets.every((p) => (rpg.pet?.[p.key] || 0) >= p.min)
    if (!hasPets) throw Lang.format(cfg.needMsg)

    const lost = randomRange(...cfg.lostRange)
    const exp = randomRange(...cfg.expRange)
    const money = randomRange(...cfg.moneyRange)

    // build $inc object dynamically
    const inc = {
      'rpg.stats.exp': exp,
      'rpg.economy.money': money,
    }
    cfg.pets.forEach((p) => (inc[`rpg.pet.${p.key}`] = -lost))
    inc[`rpg.crate.${cfg.crate}`] = 1

    await Users.updateOne(
      { id: m.sender },
      { $inc: inc, $set: { 'rpg.last.bossRaid': now } },
      { upsert: true },
    )

    await this.sendMessage(
      m.chat,
      {
        text: Lang.format(cfg.successKey, {
          lost,
          exp,
          money: fMoney(money),
        }),
      },
      { quoted: m },
    )
  },
})
