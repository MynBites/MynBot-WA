import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'
import { DefaultValues, fMoney } from './config.js'
import {
  DAY,
  clockString,
  getObjFrequency,
  getChance,
  randomRange,
  pickRandom,
  flattenObject,
} from '../../util/Util.js'

const Places = {
  'Beautiful Green Forest Waterfall': 'https://telegra.ph/file/3db18ece1f08a5cf0a086.jpg',
  'Blue Aurora Forest': 'https://telegra.ph/file/545ab458c7379b2684516.jpg',
  'Dragon Valley Forest': 'https://telegra.ph/file/5d2d177294db36754ae40.jpg',
  'Fairy Secret Forest': 'https://telegra.ph/file/f6b6b772fe6c4c2c3da29.jpg',
  'Light In The Dark Forest': 'https://telegra.ph/file/a51bdd96267412d60b8ec.jpg',
  'Dim Light Forest': 'https://telegra.ph/file/40e2c1ccaf1ccf7a89057.jpg',
  'Fairy House Forest': 'https://telegra.ph/file/f07505b35165ce98fb1c0.jpg',
  'Hallway Bridge Forest': 'https://telegra.ph/file/d9f43acd1467ece6a5269.jpg',
  'Secret Door In The Forest': 'https://telegra.ph/file/048f763ce04c712f3b5f1.jpg',
  'Blue River Valley': 'https://telegra.ph/file/e7ab8b0456b68b25f892a.jpg',
  'Misty Rooted Valley Forest': 'https://telegra.ph/file/1199eee5ffdd0a15f485b.jpg',
  'Rooted Blue Valley': 'https://telegra.ph/file/7996e56dddb1188229029.jpg',
  'Colored Valley Bridge': 'https://telegra.ph/file/aa3eafc03488923882f8a.jpg',
  'Dangerous Green Valley': 'https://telegra.ph/file/962b63c265bf921c6979e.jpg',
}

plugin.add('rpg-adventure', {
  help: ['adventure'],
  command: 'adventure',
  type: 'rpg',
  async onCommand(m, { Users }) {
    let User = await Users.findOne({ id: m.sender })
    let rpg = User.rpg || DefaultValues
    if (Date.now() - rpg?.last.adventure < DAY)
      throw Lang.format('plugins.rpg.message.cooldown', {
        type: Lang.format('plugins.rpg-adventure.name'),
        time: clockString(rpg?.last.adventure + DAY - Date.now()),
      })
    if (rpg?.stats?.health < 80)
      throw Lang.format('plugins.rpg-adventure.message.lowHealth', {
        health: rpg.stats.health,
      })

    let crate = getObjFrequency(
      new Array(10).fill().map(() =>
        getChance({
          common: 10,
          uncommon: 6,
          mythic: 3,
          legendary: 1,
        }),
      ),
    )

    let exp = randomRange(0, 10_000)
    let money = randomRange(0, 1_000_000)
    let potion = randomRange(0, 3)
    let trash = randomRange(0, 50)
    let diamond = randomRange(0, 10)
    let healthCost = randomRange(0, rpg.stats.health - 1)
    let place = pickRandom(Object.keys(Places))

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
          'rpg.stats.health': healthCost,
          'rpg.stats.exp': exp,
          'rpg.economy.money': money,
          'rpg.inventory.potion': potion,
          'rpg.trashMan.trash': trash,
          'rpg.inventory.diamond': diamond,
          'rpg.crate.common': crate.common || 0,
          'rpg.crate.uncommon': crate.uncommon || 0,
          'rpg.crate.mythic': crate.mythic || 0,
          'rpg.crate.legendary': crate.legendary || 0,
        },
        $set: {
          'rpg.last.adventure': Date.now(),
        },
      },
      { upsert: true },
    )

    let caption =
      Lang.format('plugins.rpg-adventure.message.success', { place }) +
      '\n\n' +
      `
*Exp:* ${exp}
*Money:* ${fMoney(money)}
*Potion:* ${potion}
*Trash:* ${trash}
*Diamond:* ${diamond}

${crate.mythic || crate.legendary ? Lang.format('plugins.rpg-adventure.message.rareCrate') : ''}

*Crate:*
${crate.common ? `- *Common:* ${crate.common}` : ''}
${crate.uncommon ? `- *Uncommon:* ${crate.uncommon}` : ''}
${crate.mythic ? `- *Mythic:* ${crate.mythic}` : ''}
${crate.legendary ? `- *Legendary:* ${crate.legendary}` : ''}`.trim()

    await this.sendMessage(m.chat, { text: caption, image: { url: Places[place] } }, { quoted: m })
  },
})
