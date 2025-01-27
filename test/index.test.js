import assert from 'assert'
import say from '../index.js'

describe('Example', function () {
  describe('string log', function () {
    it('it will fail', function () {
      assert.throws(say, Error)
    })

    it('it will pass', function () {
      assert.ok(say('Say'))
    })
  })
})
