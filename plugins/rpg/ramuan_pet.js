import { plugin } from '../../index.js'
import Lang from '../../util/Language.js'
import { DefaultValues } from './config.js'

plugin.add('rpg-ramuan', {
  help: ['ramuan'],
  command: 'ramuan',
  type: 'rpg',
  async onCommand(m, { Users, args }) {
    let who = m.sender
    const pet = (args[0] || '').toLowerCase()
    let User = await Users.findOne({ id: who })
    let rpg = User?.rpg || DefaultValues
    let potions = rpg.inventory?.potion || 0
    if (!pet)
      return this.sendMessage(
        m.chat,
        { text: Lang.format('plugins.rpg-ramuan.message.usage') },
        { quoted: m },
      )
    if (potions < 1) throw Lang.format('plugins.rpg-ramuan.message.noPotion')

    const petKeyMap = {
      kucing: 'cat',
      kuda: 'horse',
      rubah: 'fox',
      serigala: 'wolf',
      naga: 'dragon',
      phonix: 'phoenix',
      griffin: 'griffin',
      kyubi: 'kyubi',
      centaur: 'centaur',
    }
    // allow either display name (map key) or internal key (map value)
    const reverseMap = Object.fromEntries(Object.entries(petKeyMap).map(([k, v]) => [v, k]))
    let key = null
    let display = pet

    if (petKeyMap[pet]) {
      key = petKeyMap[pet]
      display = pet
    } else if (reverseMap[pet]) {
      key = pet
      display = reverseMap[pet]
    } else {
      // support 'display:internal' or 'internal:display' formats
      if (pet.includes(':')) {
        const parts = pet.split(':').map((s) => s.trim())
        if (parts.length === 2) {
          const [a, b] = parts
          if (petKeyMap[a] === b) {
            key = b
            display = a
          } else if (petKeyMap[b] === a) {
            key = a
            display = b
          }
        }
      }
    }

    if (!key) throw Lang.format('plugins.rpg-ramuan.message.unknownPet')

    await Users.updateOne(
      { id: who },
      {
        $inc: { 'rpg.inventory.potion': -1, [`rpg.pet.${key}.exp`]: 200 },
        $setOnInsert: { rpg: DefaultValues },
      },
      { upsert: true },
    )
    await this.sendMessage(
      m.chat,
      { text: Lang.format('plugins.rpg-ramuan.message.success', { pet: display }) },
      { quoted: m },
    )
  },
})
