import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'
import { DefaultValues, MaxHealth, MaxLevel, getArmor, fMoney } from './config.js'
import { deepGet, readMore } from '../../util/Util.js'

const toStringLevelAndExp = (level, exp, maxLevel, maxExp) =>
  level == 0
    ? Lang.format('plugins.rpg.message.notHave')
    : level == maxLevel
      ? 'Max Level'
      : `Level *${level}* -> Level *${level + 1}*\nExp ${exp}/${maxExp}`

const getLeaderboard = async (doc, field, value) => {
  return await doc.countDocuments({ [field]: { $gt: value } }).then((c) => c + 1)
}

const toStringLevel = (level, max) =>
  level == 0 ? Lang.format('plugins.rpg.message.notHave') : `Level ${level == max ? 'MAX' : level}`

plugin.add('rpg-inv', {
  help: ['inv', 'inv'],
  command: 'inv',
  async onCommand(m, { Users }) {
    let rpg = (await Users.findOne({ _id: m.sender }))?.rpg || DefaultValues
    let count = await Users.countDocuments({})
    let name = await this.getName(m.sender)

    const f = (...keys) => Lang.format(`plugins.rpg-inv.names.${keys.join('.')}`)

    let str = `
Inventory *${name}*

${f('stats.health')}: *${rpg.stats.health}/${MaxHealth}*
${f('stats.armor')}: *${getArmor(rpg.stats.armor)}*
${f('economy.money')}: *${fMoney(rpg.economy.money, Lang.lang)}*
${f('limit')}: *${rpg.limit}*
${f('level')}: *${rpg.stats.level}*
${f('exp')}: *${rpg.stats.exp}*
${f('economy.bank')}: *${fMoney(rpg.economy.bank, Lang.lang)}*
${f('economy.coupon')}: *${rpg.economy.coupon}*
${f('economy.ticket')}: *${rpg.economy.ticket}*
${f('economy.coin')}: *${rpg.economy.coin}*
${readMore}

*${f('food.name')}*
${Object.entries(rpg.food)
  .map(([key, value]) => `*${f('food', key) || f('pet', key) || key}*: ${value}`)
  .join('\n')}

*${f('crate.name')}*
${Object.entries(rpg.crate)
  .map(([key, value]) => `*${f('crate', key) || key}*: ${value}`)
  .join('\n')}

*${f('fruits.name')}*
${Object.entries(rpg.fruits)
  .map(([key, value]) => `*${f('fruits', key) || key}*: ${value}`)
  .join('\n')}

*${f('seeds')}*
${Object.entries(rpg.seeds)
  .map(([key, value]) => `*${f('fruits', key) || key}*: ${value}`)
  .join('\n')}

*${f('trashMan.name')}*
${Object.entries(rpg.trashMan)
  .map(([key, value]) => `*${f('trashMan', key) || key}*: ${value}`)
  .join('\n')}

*${f('material.name')}*
${Object.entries(rpg.material)
  .map(([key, value]) => `*${f('material', key) || key}*: ${value}`)
  .join('\n')}

*${f('hero.name')}*
My Hero: *${toStringLevel(rpg.hero.level, MaxLevel.Hero)}*

*${f('pet.name')}*
${Object.entries(rpg.pet)
  .map(
    ([key, value]) =>
      `*${f('pet', key) || key}*: ${toStringLevel(value.level, MaxLevel.pet[key] || 5)}`,
  )
  .join('\n')}

*${f('progress')}*
╭────────────────
│ Hero ${toStringLevelAndExp(rpg.hero.level, rpg.hero.exp, MaxLevel.Hero, rpg.hero.maxExp).replace('\n', '\n| ')}
╰────────────────
${Object.entries(rpg.pet)
  .map(([key, { level, exp }]) =>
    `
╭────────────────
│ ${f('pet', key) || key} ${toStringLevelAndExp(level, exp, MaxLevel.pet[key] || 5, (level || 1) * 1000).replace('\n', '\n| ')}
╰────────────────
`.trim(),
  )
  .join('\n')}

*Achievement*
${(
  await Promise.all(
    [
      'level',
      'economy.money',
      'material.diamond',
      'inventory.potion',
      'crate.common',
      'crate.uncommon',
      'crate.mythic',
      'crate.legendary',
    ].map(
      async (key, index) =>
        `${index + 1}. Top ${f(key)} *${await getLeaderboard(Users, `rpg.${key}`, deepGet(rpg, key))}* dari *${count}*`,
    ),
  )
).join('\n')}`.trim()
    m.reply(str, null, { mentions: [m.sender] })
  },
})
