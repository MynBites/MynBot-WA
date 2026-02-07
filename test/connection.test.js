import assert from 'assert'
import { describe, it, after } from 'mocha'
import { Conn } from '../index.js'

describe('WhatsApp Connection Test', function () {
  // Increase timeout for connection establishment
  this.timeout(60000)

  after(async function () {
    // Clean up connection after tests
    if (Conn && Conn.conn) {
      try {
        await Conn.disconnect(false, false)
      } catch (error) {
        console.log('Cleanup error (ignored):', error.message)
      }
    }
  })

  describe('Connection to WhatsApp Web', function () {
    it('should be able to connect to WhatsApp Web and receive connection events', async function () {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection test timed out after 60 seconds'))
        }, 60000)

        // Connection is already started by index.js
        // Just wait for connection update events
        let connectionEventReceived = false

        // Listen for connection updates
        Conn.conn.ev.on('connection.update', (update) => {
          console.log('Connection update:', update)

          if (update.qr) {
            // QR code received - means we can connect to WhatsApp servers
            console.log('✓ QR Code received - connection to WhatsApp Web is working')
            connectionEventReceived = true
            clearTimeout(timeout)
            resolve()
          }

          if (update.connection === 'open') {
            // Connection opened successfully (authenticated)
            console.log('✓ Connection opened - fully connected to WhatsApp Web')
            connectionEventReceived = true
            clearTimeout(timeout)
            resolve()
          }

          if (update.connection === 'close') {
            // Connection closed - check if it's an error
            const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== 401
            if (shouldReconnect && !connectionEventReceived) {
              console.log('Connection closed, but will retry...')
            } else if (!connectionEventReceived) {
              clearTimeout(timeout)
              reject(new Error('Connection closed without successful connection'))
            }
          }
        })

        // Assert that connection exists
        assert.ok(Conn.conn, 'Connection socket should be created')
        assert.ok(Conn.auth, 'Auth state should be initialized')

        console.log('Waiting for connection events...')
      })
    })
  })
})
