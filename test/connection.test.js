import assert from 'assert'
import { describe, it } from 'mocha'
import { Connection } from '../util/Connection.js'

describe('WhatsApp Connection Test', function () {
  // Increase timeout for connection establishment
  this.timeout(60000)

  let testConnection = null

  after(async function () {
    // Clean up connection after tests
    if (testConnection && testConnection.conn) {
      try {
        await testConnection.disconnect(false, false)
      } catch (error) {
        console.log('Cleanup error (ignored):', error.message)
      }
    }
  })

  describe('Connection to WhatsApp Web', function () {
    it('should be able to connect to WhatsApp Web and receive connection events', async function () {
      return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection test timed out after 60 seconds'))
        }, 60000)

        try {
          // Create a test connection with a test session
          testConnection = new Connection('test-connection')

          console.log('Starting WhatsApp connection...')

          // Start the connection without QR terminal output
          await testConnection.start({ printQRInTerminal: false })

          // Wait for connection update events
          let connectionEventReceived = false

          // Listen for connection updates
          testConnection.conn.ev.on('connection.update', (update) => {
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

          // Assert that we at least started the connection
          assert.ok(testConnection.conn, 'Connection socket should be created')
          assert.ok(testConnection.auth, 'Auth state should be initialized')

          console.log('Waiting for connection events...')
        } catch (error) {
          clearTimeout(timeout)
          reject(error)
        }
      })
    })
  })
})
