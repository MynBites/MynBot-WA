import { join } from 'path'
import fs from 'fs'

export class Database {
  constructor(folder, DEFAULT = {}) {
    this._data = { ...DEFAULT, ...data }
    this._folder = folder
  }

  get(name) {
    let folder = join(this._folder, name)
    fs.readFileSync(folder)
    const self = this
    const proxy = new Proxy(obj, {
      get(target, prop, receiver) {
        const value = self.get(join(name, prop))
        if (value instanceof Function) {
          return function (...args) {
            return value.apply(this === receiver ? target : this, args)
          }
        }
        return value
      },
      set(target, prop, receiver) {
        const value = self.get(join(name, prop))
        if (value instanceof Function) {
          return function (...args) {
            return value.apply(this === receiver ? target : this, args)
          }
        }
        return value
      },
    })
  }
}

import { MongoClient, ServerApiVersion } from 'mongodb'
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/db'

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

await client.connect()
process.on('beforeExit', async () => {
  try {
    await client.close()
  } catch (error) {
    console.error('Error closing MongoDB connection:', error)
  } finally {
    process.exit(0)
  }
})

export default client
