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
    bossRaid: 0,
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

  // Pengali default untuk menghitung EXP (dapat diubah di config.js)
  static MULTIPLIER = 1000

  /**
   * Menghitung rentang minimum, maksimum, dan kebutuhan EXP untuk level tertentu.
   */
  static xpRange(level, multiplier = this.MULTIPLIER) {
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
  static findLevel(xp, multiplier = this.MULTIPLIER) {
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
  static canLevelUp(level, xp, multiplier = this.MULTIPLIER) {
    if (level >= this.MAX_LEVEL) return false
    return xp >= this.xpRange(level, multiplier).max
  }

  static getRole(level) {
    const role = [
      { name: 'Newbie ㋡', level: 0 },
      { name: 'Beginner Grade 1 ⚊¹', level: 6 },
      { name: 'Beginner Grade 2 ⚊²', level: 11 },
      { name: 'Beginner Grade 3 ⚊³', level: 16 },
      { name: 'Beginner Grade 4 ⚊⁴', level: 21 },
      { name: 'Private Grade 1 ⚌¹', level: 26 },
      { name: 'Private Grade 2 ⚌²', level: 31 },
      { name: 'Private Grade 3 ⚌³', level: 36 },
      { name: 'Private Grade 4 ⚌⁴', level: 41 },
      { name: 'Private Grade 5 ⚌⁵', level: 46 },
      { name: 'Corporal Grade 1 ☰¹', level: 51 },
      { name: 'Corporal Grade 2 ☰²', level: 56 },
      { name: 'Corporal Grade 3 ☰³', level: 61 },
      { name: 'Corporal Grade 4 ☰⁴', level: 66 },
      { name: 'Corporal Grade 5 ☰⁵', level: 71 },
      { name: 'Sergeant Grade 1 ≣¹', level: 76 },
      { name: 'Sergeant Grade 2 ≣²', level: 81 },
      { name: 'Sergeant Grade 3 ≣³', level: 86 },
      { name: 'Sergeant Grade 4 ≣⁴', level: 91 },
      { name: 'Sergeant Grade 5 ≣⁵', level: 96 },
      { name: 'Staff Grade 1 ﹀¹', level: 101 },
      { name: 'Staff Grade 2 ﹀²', level: 106 },
      { name: 'Staff Grade 3 ﹀³', level: 111 },
      { name: 'Staff Grade 4 ﹀⁴', level: 116 },
      { name: 'Staff Grade 5 ﹀⁵', level: 121 },
      { name: 'Sergeant Grade 1 ︾¹', level: 126 },
      { name: 'Sergeant Grade 2 ︾²', level: 131 },
      { name: 'Sergeant Grade 3 ︾³', level: 136 },
      { name: 'Sergeant Grade 4 ︾⁴', level: 141 },
      { name: 'Sergeant Grade 5 ︾⁵', level: 146 },
      { name: '2nd Lt. Grade 1 ♢¹', level: 151 },
      { name: '2nd Lt. Grade 2 ♢²', level: 156 },
      { name: '2nd Lt. Grade 3 ♢³', level: 161 },
      { name: '2nd Lt. Grade 4 ♢⁴', level: 166 },
      { name: '2nd Lt. Grade 5 ♢⁵', level: 171 },
      { name: '1st Lt. Grade 1 ♢♢¹', level: 176 },
      { name: '1st Lt. Grade 2 ♢♢²', level: 181 },
      { name: '1st Lt. Grade 3 ♢♢³', level: 186 },
      { name: '1st Lt. Grade 4 ♢♢⁴', level: 191 },
      { name: '1st Lt. Grade 5 ♢♢⁵', level: 196 },
      { name: 'Major Grade 1 ✷¹', level: 201 },
      { name: 'Major Grade 2 ✷²', level: 206 },
      { name: 'Major Grade 3 ✷³', level: 211 },
      { name: 'Major Grade 4 ✷⁴', level: 216 },
      { name: 'Major Grade 5 ✷⁵', level: 221 },
      { name: 'Colonel Grade 1 ✷✷¹', level: 226 },
      { name: 'Colonel Grade 2 ✷✷²', level: 231 },
      { name: 'Colonel Grade 3 ✷✷³', level: 236 },
      { name: 'Colonel Grade 4 ✷✷⁴', level: 241 },
      { name: 'Colonel Grade 5 ✷✷⁵', level: 246 },
      { name: 'Brigadier Early ✰', level: 251 },
      { name: 'Brigadier Silver ✩', level: 256 },
      { name: 'Brigadier Gold ✯', level: 261 },
      { name: 'Brigadier Platinum ✬', level: 266 },
      { name: 'Brigadier Diamond ✪', level: 271 },
      { name: 'Major General Early ✰', level: 276 },
      { name: 'Major General Silver ✩', level: 281 },
      { name: 'Major General Gold ✯', level: 286 },
      { name: 'Major General Platinum ✬', level: 291 },
      { name: 'Major General Diamond ✪', level: 296 },
      { name: 'Lt. General Early ✰', level: 301 },
      { name: 'Lt. General Silver ✩', level: 306 },
      { name: 'Lt. General Gold ✯', level: 311 },
      { name: 'Lt. General Platinum ✬', level: 316 },
      { name: 'Lt. General Diamond ✪', level: 321 },
      { name: 'General Early ✰', level: 326 },
      { name: 'General Silver ✩', level: 331 },
      { name: 'General Gold ✯', level: 336 },
      { name: 'General Platinum ✬', level: 341 },
      { name: 'General Diamond ✪', level: 346 },
      { name: 'Commander Early ★', level: 351 },
      { name: 'Commander Intermediate ⍣', level: 356 },
      { name: 'Commander Elite ≛', level: 361 },
      { name: 'The Commander Hero ⍟', level: 366 },
      { name: 'The Commander Elite Hero 𒐕', level: 371 },
      { name: 'The Commander Elite Hero 𒐖', level: 376 },
      { name: 'The Commander Elite Very Lite Hero 𒐗', level: 381 },
      { name: 'The Commander Elite Very Hard Hero 𒐘', level: 386 },
      { name: 'The Commander Elite Very Pro Hero 𒐙', level: 391 },
      { name: 'The Commander Elite Very Strong Hero 𒐚', level: 396 },
      { name: 'The Commander Elite Super Strong Hero 𒐛', level: 401 },
      { name: 'The Commander Elite Super Strong Shadow Hero 𒐜', level: 406 },
      { name: 'The Commander Elite Super Strong Shadow Hero 𒐝', level: 411 },
      { name: 'The Commander Legends Shadow Hero 忍', level: 416 },
    ]

    return role.reverse().find((role) => level >= role.level)
  }
}
