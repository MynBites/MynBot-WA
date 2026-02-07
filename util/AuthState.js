import { Mutex } from 'async-mutex'
import { BufferJSON, initAuthCreds, WAProto } from '@whiskeysockets/baileys'

const Locks = new Map()

// Get or create a mutex
const getLock = (path) => {
  let mutex = Locks.get(path)
  if (!mutex) {
    mutex = new Mutex()
    Locks.set(path, mutex)
  }
  return mutex
}

/**
 * createAuthState
 * @param {import('mongodb').Db} db
 * @returns
 */
export const createAuthState = async (db, logger = console) => {
  const auth = db.collection('auth')
  const TEMP = {}
  const writeData = async (id, data) => {
    const mutex = getLock(id)

    const release = await mutex.acquire()
    try {
      TEMP[id] = data
      await auth.replaceOne(
        { _id: id },
        { value: JSON.parse(JSON.stringify(data, BufferJSON.replacer)) },
        { upsert: true },
      )
    } finally {
      release()
    }
  }
  const readData = async (id) => {
    const mutex = getLock(id)

    const release = await mutex.acquire()
    try {
      const data = JSON.stringify((await auth.findOne({ _id: id })) || {})
      return JSON.parse(data, BufferJSON.reviver)?.value
    } catch (error) {
      logger?.error({ error }, 'Failed to read auth state')
      return TEMP[id] || {}
    } finally {
      release()
    }
  }
  const creds = (await readData('creds')) || (0, initAuthCreds)()
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {}
          let IDs = await readData(type)
          for (const id of ids) {
            if (IDs && IDs[id]) {
              let value = IDs[id]
              if (type === 'app-state-sync-key') {
                value = WAProto.Message.AppStateSyncKeyData.fromObject(value)
              }
              data[id] = value
            }
          }
          return data
        },
        set: (data) => {
          return Promise.all(
            Object.keys(data).map(async (category) => {
              const IDs = (await readData(category)) || {}
              for (const id of Object.keys(data[category])) {
                let value = data[category][id]
                if (value) {
                  IDs[id] = value
                } else {
                  delete IDs[id]
                }
              }
              await writeData(category, IDs)
            }),
          )
        },
      },
    },
    saveCreds: () => {
      return writeData('creds', creds)
    },
    clear: () => {
      return auth.deleteMany({})
    },
  }
}

export default createAuthState
