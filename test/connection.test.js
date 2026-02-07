import assert from 'assert'
import { describe, it } from 'mocha'
import https from 'https'

describe('WhatsApp Web Connection Test', function () {
  // Increase timeout for network requests
  this.timeout(15000)

  describe('Connection to web.whatsapp.com', function () {
    it('should be able to connect to web.whatsapp.com', function (done) {
      const options = {
        hostname: 'web.whatsapp.com',
        port: 443,
        path: '/',
        method: 'GET',
        timeout: 10000,
      }

      const req = https.request(options, (res) => {
        // We just need to verify we can connect, any response is fine
        assert.ok(res.statusCode, 'Should receive a status code from web.whatsapp.com')
        console.log(`Connected to web.whatsapp.com - Status: ${res.statusCode}`)
        done()
      })

      req.on('error', (error) => {
        // Connection failed
        assert.fail(`Failed to connect to web.whatsapp.com: ${error.message}`)
        done()
      })

      req.on('timeout', () => {
        req.destroy()
        assert.fail('Connection to web.whatsapp.com timed out')
        done()
      })

      req.end()
    })

    it('should resolve web.whatsapp.com DNS', function (done) {
      const dns = require('dns')
      dns.resolve('web.whatsapp.com', (err, addresses) => {
        if (err) {
          assert.fail(`Failed to resolve web.whatsapp.com: ${err.message}`)
        } else {
          assert.ok(addresses.length > 0, 'Should resolve at least one IP address')
          console.log(`web.whatsapp.com resolves to: ${addresses.join(', ')}`)
        }
        done()
      })
    })
  })
})
