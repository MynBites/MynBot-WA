import fs from 'fs'
import path from 'path'
import os from 'os'

const isLinux = os.platform() === 'linux'

export default class TempFile {
  static tmpDir = process.env.TMPDIR || process.env.TEMP || (isLinux ? '/tmp' : os.tmpdir())

  static async create(prefix = 'tmp-', suffix = '') {
    const tmp = new TempFile(prefix, suffix)
    await tmp.create()
    return tmp
  }

  constructor(prefix = 'tmp-', suffix = '') {
    this.dir = ''
    this.filePath = ''
    this.prefix = prefix
    this.suffix = suffix
  }

  async create() {
    this.dir = await fs.promises.mkdtemp(
      path.join(TempFile.tmpDir),
      { recursive: true },
    )
    this.filePath = path.join(this.dir, `${this.prefix}${Date.now()}${this.suffix}`)
    console.log(this.filePath, 'created')
    return this.filePath
  }

  async write(data, options = {}) {
    if (!this.filePath) await this.create()
    await fs.promises.writeFile(this.filePath, data, options)
    return this.filePath
  }

  async read(options = {}) {
    if (!this.filePath) throw new Error('File not created yet')
    return await fs.promises.readFile(this.filePath, options)
  }

  async remove() {
    if (this.filePath) {
      await fs.promises.unlink(this.filePath).catch(() => {})
      this.filePath = ''
    }
  }
  
  async exists() {
    if (!this.filePath) return false
    try {
      await fs.promises.access(this.filePath, fs.constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  toString() {
    return this.filePath
  }
}