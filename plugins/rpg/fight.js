import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'
import { DefaultValues, fMoney } from './config.js'
import { randomRange, pickRandom } from '../../util/Util.js'

const Enemies = [
  { name: 'Wild Boar', hp: 40, exp: 100, money: 200 },
  { name: 'Forest Wolf', hp: 80, exp: 400, money: 800 },
  { name: 'Bandit', hp: 120, exp: 800, money: 1600 },
]

plugin.add('rpg-fight', {
  help: ['fight'],
  command: 'fight',
  type: 'rpg',
  async onCommand(m, { Users }) {
    let User = await Users.findOne({ id: m.sender })
    let rpg = User?.rpg || DefaultValues
    if ((rpg.stats?.health || 0) < 10) throw Lang.format('plugins.rpg-fight.message.tooWeak')

    let enemy = pickRandom(Enemies)
    let damageToEnemy = randomRange(5, 50)
    let damageToUser = randomRange(1, Math.floor(enemy.hp / 2))

    await Users.updateOne(
      { id: m.sender },
      {
        $inc: {
          'rpg.stats.health': -damageToUser,
          'rpg.stats.exp': enemy.exp,
          'rpg.economy.money': enemy.money,
        },
      },
      { upsert: true },
    )

    let msg = Lang.format('plugins.rpg-fight.message.result', {
      enemy: enemy.name,
      dmgToEnemy: damageToEnemy,
      dmgToUser: damageToUser,
      exp: enemy.exp,
      money: fMoney(enemy.money),
    })
    await this.sendMessage(m.chat, { text: msg }, { quoted: m })
  },
})
