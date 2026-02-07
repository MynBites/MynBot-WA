import PluginManager from '@mynbites/plugin-manager'
import { Connection } from './util/Connection.js'
import { serialize } from './util/Message.js'
// import Database from './util/Database.js'

/**
 * Plugin manager instance
 * @type {import('./types.js').plugin}
 */
export const plugin = new PluginManager(import.meta.dirname)

/**
 * WhatsApp connection instance
 * @type {Connection}
 */
export const Conn = new Connection(
  process.argv.slice(2).filter((v) => !v.startsWith('-'))[0] || 'default',
)
// export const db = new (Function)()

export default plugin

Conn.reconnectOnLogout = true
/** @type {string | undefined} */
const isPair = process.env.NUMBER

// Only start the connection if not in test mode
if (process.env.NODE_ENV !== 'test') {
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
} else {
  // In test mode, load plugins without watching (false) to allow process to exit
  serialize()
  await plugin.addPluginFolder('./plugins', false)
}
