import assert from 'assert'
import { describe, it } from 'mocha'
import { readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pluginsDir = join(__dirname, '../plugins')

describe('Plugin Tests', function () {
  // Increase timeout since loading plugins takes time
  this.timeout(10000)

  describe('Plugin Loading', function () {
    it('should load all plugin files without syntax errors', async function () {
      const files = await readdir(pluginsDir, { recursive: true })
      const jsFiles = files.filter((file) => file.endsWith('.js'))

      assert.ok(jsFiles.length > 0, 'No plugin files found')

      // Just verify files can be read (syntax check)
      for (const file of jsFiles) {
        const pluginPath = join(pluginsDir, file)
        try {
          await import(pluginPath)
          assert.ok(true, `Plugin ${file} loaded successfully`)
        } catch (error) {
          // Ignore database connection errors during tests
          if (!error.message.includes('ECONNREFUSED') && !error.message.includes('MongoServer')) {
            assert.fail(`Failed to load plugin ${file}: ${error.message}`)
          }
        }
      }
    })
  })

  describe('Plugin Structure', function () {
    it('should verify plugin exports are valid', async function () {
      try {
        // Import the plugin manager to check if plugins are registered
        const { plugin } = await import('../index.js')

        assert.ok(plugin, 'Plugin manager should exist')
        assert.ok(plugin.plugins, 'Plugin manager should have plugins property')
        assert.ok(typeof plugin.plugins === 'object', 'Plugins should be an object')

        // Verify each plugin has required properties
        const pluginNames = Object.keys(plugin.plugins)
        assert.ok(pluginNames.length > 0, 'Should have at least one plugin registered')

        for (const name of pluginNames) {
          const pluginData = plugin.plugins[name]
          assert.ok(pluginData, `Plugin ${name} should exist`)

          // Check for at least one handler
          const hasHandler =
            pluginData.onCommand ||
            pluginData.onCall ||
            pluginData.onGroupUpdate ||
            pluginData.onParticipantsUpdate
          assert.ok(hasHandler, `Plugin ${name} should have at least one handler`)
        }
      } catch (error) {
        // Skip if database is not available
        if (error.message.includes('ECONNREFUSED') || error.message.includes('MongoServer')) {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Plugin Commands', function () {
    it('should verify all plugins with commands have valid command definitions', async function () {
      try {
        const { plugin } = await import('../index.js')

        for (const [name, pluginData] of Object.entries(plugin.plugins)) {
          if (pluginData.command !== undefined && pluginData.command !== false) {
            const isValidCommand =
              typeof pluginData.command === 'string' ||
              pluginData.command instanceof RegExp ||
              Array.isArray(pluginData.command)

            assert.ok(
              isValidCommand,
              `Plugin ${name} should have valid command definition (string, RegExp, or array)`,
            )
          }
        }
      } catch (error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('MongoServer')) {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Plugin Help', function () {
    it('should verify plugins with help have valid help definitions', async function () {
      try {
        const { plugin } = await import('../index.js')

        for (const [name, pluginData] of Object.entries(plugin.plugins)) {
          if (pluginData.help) {
            const isValidHelp = typeof pluginData.help === 'string' || Array.isArray(pluginData.help)

            assert.ok(
              isValidHelp,
              `Plugin ${name} should have valid help definition (string or array)`,
            )
          }
        }
      } catch (error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('MongoServer')) {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Plugin Types', function () {
    it('should verify plugins with type have valid type definitions', async function () {
      try {
        const { plugin } = await import('../index.js')

        for (const [name, pluginData] of Object.entries(plugin.plugins)) {
          if (pluginData.type) {
            assert.ok(
              typeof pluginData.type === 'string',
              `Plugin ${name} should have a string type definition`,
            )
          }
        }
      } catch (error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('MongoServer')) {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })
})
