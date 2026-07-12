import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'
import { DefaultValues, fMoney } from './config.js'
import { MINUTE, clockString, randomRange, pickRandom, flattenObject } from '../../util/Util.js'

const Monsters = {
  'Spider Dragon': 'https://telegra.ph/file/cb254df6391057afb1d61.jpg',
  'Long Neck Dragon': 'https://telegra.ph/file/aeda94211d958f0726020.jpg',
  'Green Snake Dragon': 'https://telegra.ph/file/8504645f09237ee51aa55.jpg',
  'Blue Wolf Dragon': 'https://telegra.ph/file/0ad92a47597f21a0182a2.jpg',
  'Thorny Tirex Dragon': 'https://telegra.ph/file/b172e3031b3fd672673bd.jpg',
  'Blue Rhino Dragon': 'https://telegra.ph/file/6c78ce26c800699f6888b.jpg',
  'Red Rhino Dragon': 'https://telegra.ph/file/226e31d67ca326957dcd8.jpg',
  'Blue Tirex Dragon': 'https://telegra.ph/file/51ca0b2a5b72a7af4e135.jpg',
  'The Biggest Dragon': 'https://telegra.ph/file/a183b170a6a94d6e76008.jpg',
  'Biggest Wing Dragon': 'https://telegra.ph/file/cfc96314d366e4aaf35b1.jpg',
  'Blue Bat Dragon': 'https://telegra.ph/file/5559a40b7abd7ecb6a46e.jpg',
  'Big Monster Dragon': 'https://telegra.ph/file/fc78472a020c403e95bc0.jpg',
  'King Spider Dragon': 'https://telegra.ph/file/bc00a563c119cf37beb6a.jpg',
  'Blue Ice Dragon': 'https://telegra.ph/file/842bb589be0d7288a8e26.jpg',
  'Legendary Dragon': 'https://telegra.ph/file/54643ffdb12e35e88a6b1.jpg',
}

plugin.add('rpg-hunt', {
  help: ['hunt'],
  command: 'hunt',
  type: 'rpg',
  async onCommand(m, { Users }) {
    let User = await Users.findOne({ id: m.sender })
    let rpg = User.rpg || DefaultValues
    if (Date.now() - rpg?.last.hunt < 20 * MINUTE)
      throw Lang.format('plugins.rpg.message.cooldown', {
        type: Lang.format('plugins.rpg-hunt.name'),
        time: clockString(rpg?.last.hunt + 20 * MINUTE - Date.now()),
      })

    let money = randomRange(0, 100_000)
    let exp = randomRange(0, 10_000)
    let healthCost = randomRange(0, 100)
    let monster = pickRandom(Object.keys(Monsters))
    let isDead = rpg.stats.health - healthCost < 0
    let isPenalty = isDead && rpg.stats.level > 0 && rpg.weapons.sword > 0

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
          'rpg.stats.health': isDead ? DefaultValues.stats.health - rpg.stats.health : -healthCost,
          'rpg.stats.exp': exp * (isPenalty ? 0 : 1),
          'rpg.economy.money': isDead ? 0 : money,
          'rpg.weapons.sword': isPenalty ? -1 : 0,
          'rpg.stats.level': isPenalty ? -1 : 0,
          'rpg.economy.ticket': isDead ? 0 : 1,
        },
        $set: {
          'rpg.last.hunt': Date.now(),
        },
      },
      { upsert: true },
    )

    if (isDead) {
      await m.reply(
        Lang.format('plugins.rpg-hunt.message.death', {
          health: rpg.stats.health,
          killer: monster,
        }) + (isPenalty ? '\n\n' + Lang.format('plugins.rpg-hunt.message.deathPenalty') : ''),
      )
    } else {
      await this.sendMessage(
        m.chat,
        {
          text: Lang.format('plugins.rpg-hunt.message.success', {
            monster,
            money: fMoney(money, Lang.lang),
            exp,
            healthCost,
          }),
          image: { url: Monsters[monster] },
        },
        { quoted: m },
      )
    }
  },
})
