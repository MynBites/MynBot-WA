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

  describe('Plugin Files', function () {
    it('should have JavaScript files in plugins directory', async function () {
      const files = await readdir(pluginsDir, { recursive: true })
      const jsFiles = files.filter((file) => file.endsWith('.js'))
      assert.ok(jsFiles.length > 0, 'Should have at least one JavaScript file')
    })

    it('should have valid file structure', async function () {
      const files = await readdir(pluginsDir)
      assert.ok(files.length > 0, 'Plugins directory should not be empty')
    })
  })
})
