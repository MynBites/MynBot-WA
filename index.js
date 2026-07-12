import 'dotenv/config'
import PluginManager from '@mynbites/plugin-manager'
import { Connection } from './util/Connection.js'
import { serialize } from './util/Message.js'
import client from './util/Database.js'

/**
 * Plugin manager instance
 * @type {import('./types.js').plugin}
 */
export const plugin = new PluginManager(import.meta.dirname)

const name = process.argv.slice(2).filter((v) => !v.startsWith('-'))[0] || 'default'

/**
 * WhatsApp connection instance
 * @type {Connection}
 */
export const Conn = new Connection(process.env.NODE_ENV === 'test' ? 'default' : name)

export const db = client.db('MynBot-WA-' + (process.env.NODE_ENV === 'test' ? 'test' : name))

export default plugin

Conn.reconnectOnLogout = true
/** @type {string | undefined} */
const isPair = process.env.NUMBER

serialize()
await plugin.addPluginFolder('./plugins', true)
await Conn.start({ printQRInTerminal: !isPair })
if (isPair) {
  console.log('Found env variable NUMBER with value', isPair)
  await new Promise((resolve) => setTimeout(resolve, 2000))
  const pairingCode = await Conn.getCode(process.env.NUMBER)
  console.log('Your pairing code:', pairingCode)
  console.log('✓ Pairing code generated successfully')
}

process.on('unhandledRejection', console.error)
