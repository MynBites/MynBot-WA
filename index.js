import PluginManager from '@mynbites/plugin-manager'
import { Connection } from './util/Connection.js'
import { serialize } from './util/Message.js'
// import Database from './util/Database.js'

/**
 * @type {import('.').Plugin}
 */
export const Plugin = new PluginManager(import.meta.dirname)
export const Conn = new Connection(process.argv[2] || 'default')
// export const db = new (Function)()

export default Plugin

const isPair = process.env.NUMBER

serialize()
await Plugin.addPluginFolder('./plugins', true)
await Conn.start({ printQRInTerminal: !isPair })
// Conn.reload(false)
if (isPair) {
  console.log('Found env variable NUMBER with value', isPair)
  await new Promise(resolve => setTimeout(resolve, 2000))
  console.log('Your pairing code:', await Conn.getCode(process.env.NUMBER))
}
console.log('Hai')