import Lang from '../../util/Language.js'

export const DefaultValues = {
  inventory: {
    potion: 0,
  },
  stats: {
    health: 100,
    armor: 0,
    level: 1,
    exp: 0,
  },
  pet: {
    cat: {
      level: 0,
      exp: 0,
    },
    dog: {
      level: 0,
      exp: 0,
    },
    fox: {
      level: 0,
      exp: 0,
    },
    wolf: {
      level: 0,
      exp: 0,
    },
    dragon: {
      level: 0,
      exp: 0,
    },
    horse: {
      level: 0,
      exp: 0,
    },
    phoenix: {
      level: 0,
      exp: 0,
    },
    griffin: {
      level: 0,
      exp: 0,
    },
    kyubi: {
      level: 0,
      exp: 0,
    },
    centaur: {
      level: 0,
      exp: 0,
    },
  },
  crate: {
    box: 0,
    common: 0,
    uncommon: 0,
    mythic: 0,
    legendary: 0,
    pet: 0,
    garden: 0,
  },
  food: {
    pet: 0,
    dragon: 0,
    griffin: 0,
    kyubi: 0,
    centaur: 0,
  },
  fruits: {
    grapes: 0,
    oranges: 0,
    apples: 0,
    mangoes: 0,
    bananas: 0,
  },
  seeds: {
    grapes: 0,
    oranges: 0,
    apples: 0,
    mangoes: 0,
    bananas: 0,
  },
  trashMan: {
    cardboard: 0,
    bottle: 0,
    can: 0,
  },
  economy: {
    bank: 0,
    money: 0,
    coupon: 0,
    ticket: 0,
    coin: 0,
  },
  weapons: {
    sword: 0,
  },
  material: {
    string: 0,
    can: 0,
    wood: 0,
    rock: 0,
    iron: 0,
    diamond: 0,
    gold: 0,
  },
  hero: {
    level: 0,
    exp: 0,
  },
  last: {
    adventure: 0,
    hunt: 0,
    mining: 0,
    fishing: 0,
    work: 0,
  },
}

export const MaxHealth = 200
export const MaxLevel = {
  hero: 50,
  pet: {
    cat: 5,
    horse: 5,
    dragon: 20,
    kyubi: 20,
    centaur: 20,
    rubah: 5,
    phonix: 15,
    griffin: 15,
    wolf: 15,
  },
}

export const getArmor = (armor) =>
  ['empty', 'leather', 'iron', 'gold', 'diamond', 'netherite'][armor]

export const fMoney = (money, lang = Lang.lang) =>
  new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: Lang.format('currency', null, lang),
  }).format(money)

export class Levelling {
  // lib/levelling.js

  static MAX_LEVEL = 500

  // Batas mutlak EXP (JavaScript akan membulatkannya menjadi 10.000.000.000.000.000.000)
  static MAX_EXP = 10000000000000000000

  // Eksponen ajaib: Rumus agar EXP mencapai tepat batas MAX_EXP di Level 500
  static POWER = 4.446045

  /**
   * Menghitung rentang minimum, maksimum, dan kebutuhan EXP untuk level tertentu.
   */
  static xpRange(level, multiplier = 1000) {
    // Pengaman: Jika level di luar batas logika
    if (level < 0) return { min: 0, max: 0, xp: 0 }
    if (level >= this.MAX_LEVEL) return { min: this.MAX_EXP, max: this.MAX_EXP, xp: 0 }

    // BASE_EXP: Fondasi EXP (Durasi Terpanjang di Level 0 ke 1)
    // Karena multiplier di config.js Anda adalah 1000,
    // Maka naik ke Level 1 membutuhkan 10.000.000 (10 JUTA) EXP!
    let BASE_EXP = 100 * multiplier

    // Kalkulasi matematika eksponensial
    let min = Math.floor(BASE_EXP * Math.pow(level, this.POWER))
    let max = Math.floor(BASE_EXP * Math.pow(level + 1, this.POWER))

    // Mencegah kebocoran angka melebihi batas yang Anda minta
    if (max > this.MAX_EXP) max = this.MAX_EXP
    if (min > this.MAX_EXP) min = this.MAX_EXP

    return {
      min,
      max,
      xp: max - min, // Ini adalah sisa EXP murni yang dibutuhkan untuk naik dari level ini
    }
  }

  /**
   * Menerjemahkan Total EXP murni menjadi Level saat ini.
   */
  static findLevel(xp, multiplier = 1000) {
    if (xp <= 0) return 0
    if (xp >= this.MAX_EXP) return this.MAX_LEVEL

    let BASE_EXP = 10000 * multiplier

    // Membalikkan rumus eksponensial untuk mendeteksi level
    let level = Math.floor(Math.pow(xp / BASE_EXP, 1 / this.POWER))

    if (level > this.MAX_LEVEL) level = this.MAX_LEVEL
    return level
  }

  /**
   * Detektor otomatis untuk fitur naik level.
   */
  static canLevelUp(level, xp, multiplier = 1000) {
    if (level >= this.MAX_LEVEL) return false
    return xp >= this.xpRange(level, multiplier).max
  }
}
