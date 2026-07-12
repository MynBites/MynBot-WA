import { parsePhoneNumber, getNumberFrom } from 'awesome-phonenumber'
import { jidDecode } from '@whiskeysockets/baileys'
export function toPhoneNumber(jid) {
  const decoded = jidDecode(jid)
  return (
    (decoded?.user &&
      getNumberFrom(parsePhoneNumber('+' + decoded.user), 'international').number) ||
    jid
  )
}

export const readMore = String.fromCharCode(8206).repeat(4001)

export function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomChance(chance) {
  return Math.random() < chance
}

export function getChance(obj) {
  let total = Object.values(obj).reduce((a, b) => a + b, 0)
  for (let [key, value] of Object.entries(obj)) {
    if (randomChance(value / total)) return key
    else total -= value
  }
}

export function getObjFrequency(arr) {
  return arr.reduce((acc, obj) => {
    acc[obj] = (acc[obj] || 0) + 1
    return acc
  }, {})
}

export function clockString(ms, { days = false, milliseconds = false } = {}) {
  let d = isNaN(ms) ? '--' : Math.floor(ms / DAY)
  let h = isNaN(ms) ? '--' : Math.floor(ms / HOUR) % 24
  let m = isNaN(ms) ? '--' : Math.floor(ms / MINUTE) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / SECOND) % 60
  let mss = isNaN(ms) ? '' : Math.floor(ms) % SECOND
  let l = [h, m, s]
  if (days || d) l.unshift(d)
  return (
    l.map((v) => v.toString().padStart(2, 0)).join(':') +
    (mss && milliseconds ? '.' + mss.toString().padStart(3, 0) : '')
  )
}

export const flattenObject = (obj, parent = '', res = {}) => {
  for (let key in obj) {
    const propName = parent ? `${parent}.${key}` : key

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      flattenObject(obj[key], propName, res)
    } else {
      res[propName] = obj[key]
    }
  }
  return res
}

export function constrain(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function isNumber(value) {
  return !isNaN(parseFloat(value)) && isFinite(value)
}

export function deepGet(obj, path, defaultValue = {}) {
  let curr = obj
  for (const key of path.split('.')) {
    if (curr && typeof curr === 'object') {
      curr = curr[key]
    } else {
      return defaultValue
    }
  }
  return curr
}

export const SECOND = 1000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const WEEK = 7 * DAY
export const MONTH = 30 * DAY
export const YEAR = 365 * DAY
