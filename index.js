import PluginManager from '@mynbites/plugin-manager'
import { Connection } from './util/Connection.js'
import { serialize } from './util/Message.js'
// import Database from './util/Database.js'

/**
 * @type {import('./types').plugin}
 */
export const plugin = new PluginManager(import.meta.dirname)
export const Conn = new Connection(process.argv.slice(2).filter(v => !v.startsWith('-'))[0] || 'default')
// export const db = new (Function)()

export default plugin

Conn.reconnectOnLogout = true
const isPair = process.env.NUMBER

serialize()
await plugin.addPluginFolder('./plugins', true)
await Conn.start({ printQRInTerminal: !isPair })
if (isPair) {
  console.log('Found env variable NUMBER with value', isPair)
  await new Promise(resolve => setTimeout(resolve, 2000))
  console.log('Your pairing code:', await Conn.getCode(process.env.NUMBER))
}

process.on('unhandledRejection', console.error)
