import assert from 'assert'
import { plugin } from '../index.js'

describe('Example', function () {
  describe('Plugin Manager', function () {
    it('should have a plugin manager', function () {
      assert.ok(plugin)
      assert.ok(typeof plugin === 'object')
    })

    it('should have plugins property', function () {
      assert.ok(plugin.plugins)
      assert.ok(typeof plugin.plugins === 'object')
    })
  })
})
