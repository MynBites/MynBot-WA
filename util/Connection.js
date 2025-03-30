import fs, { existsSync, mkdirSync } from 'fs'
import path, { join } from 'path'
import pino from 'pino'
import {
  Browsers,
  makeWASocket,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  areJidsSameUser,
} from '@whiskeysockets/baileys'
import makeInMemoryStore from './Store.js'
import { serialize } from './Message.js'
import { onCall, onGroupUpdate, onMessage, onParticipantsUpdate } from './Handlers.js'

const browser = Browsers.appropriate('Edge')
const P = pino({
  level: 'info',
  transport: { target: 'pino-pretty' },
  prettyPrint: { levelFirst: true, ignore: 'hostname', translateTime: true },
})
const SESSION_FOLDER = join(import.meta.dirname, '../db/session')
const DB_FOLDER = join(import.meta.dirname, '../db/data')
export class Connection {
  /** @type {ReturnType<typeof import('@whiskeysockets/baileys').makeWASocket>} */
  conn = {}
  /** @type {import('@whiskeysockets/baileys').makeInMemoryStore} */
  store = {}
  /** @type {import('@whiskeysockets/baileys').AuthenticationState} */
  auth = {}
  qr = ''
  constructor(name = 'default') {
    this.sessionName = name
    this.logger = P.child({ class: this.sessionName })

    let t = 0
    setInterval(() => {
      if (Date.now() - t < 5000) return
      t = Date.now()
      this.store?.writeToFile(this.store.file)
    }, 5_000)

    process.on('beforeExit', () => {
      this.store?.writeToFile(this.store.file)
    })
  }

  get sessionFolder() {
    const folder = join(SESSION_FOLDER, this.sessionName)
    if (!existsSync(folder)) mkdirSync(folder, { recursive: true })
    return folder
  }

  get dbFolder() {
    const folder = join(DB_FOLDER, this.sessionName)
    if (!existsSync(folder)) mkdirSync(folder, { recursive: true })
    return folder
  }

  /**
   * @param {import('@whiskeysockets/baileys').UserFacingSocketConfig} options
   * @param {import('@whiskeysockets/baileys').WASocket} conn
   * @returns {import('@whiskeysockets/baileys').WASocket}
   */
  async start(options = {}, conn) {
    const self = this
    const WA_VERSION = await fetchLatestWaWebVersion()
    if (WA_VERSION)
      P.child({ class: 'Connection' }).info(
        `using WA v${WA_VERSION.version.join('.')}, isLatest: ${WA_VERSION.isLatest}`,
      )
    this.auth = await useMultiFileAuthState(this.sessionFolder)

    this.conn = Object.defineProperties(
      makeWASocket({
        logger: this.logger,
        // version: WA_VERSION.version,
        browser,
        auth: {
          ...this.auth.state,
          keys: makeCacheableSignalKeyStore(this.auth.state.keys, this.logger),
        },
        qrTimeout: 60_000,
        syncFullHistory: false,
        defaultQueryTimeoutMs: undefined,
        printQRInTerminal: true,
        generateHighQualityLinkPreview: false,
        getMessage: (key) => this.store.loadMessage(key.remoteJid, key.id),
        cachedGroupMetadata: (jid) => this.store.fetchGroupMetadata(jid, this.conn),
        patchMessageBeforeSending: (message) => {
          const requiresPatch = Boolean(
            message.listMessage ||
              message.buttonsMessage ||
              message.templateMessage ||
              message.interactiveMessage,
          )
          if (requiresPatch) {
            message = {
              viewOnceMessage: {
                message: {
                  messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                  },
                  ...message,
                },
              },
            }
          }
          return message
        },
        ...options,
      }),
      {
        store: {
          get() {
            return self.store
          },
        },
        reply: {
          value(chatId, message, quoted, options) {
            self.logger.info('reply', { chatId, message, quoted, options })
            this.sendMessage(
              chatId,
              { ...(typeof message == 'string' ? { text: message } : message), ...options },
              { quoted, ...options },
            )
          },
        },
        getName: {
          /**
           * Get name from jid
           * @param {String} jid
           * @param {Boolean} withoutContact
           */
          value(jid = '') {
            let v =
              areJidsSameUser(jid, '0@s.whatsapp.net')
                ? {
                    jid,
                    name: 'WhatsApp',
                  }
                : areJidsSameUser(jid, this.user?.id)
                ? this.user
                : {
                    ...self.store.chats.get(jid),
                    ...self.store.contacts[jid],
                    ...self.store.groupMetadata[jid],
                  }
            let name =
              v.subject ||
              v.verifiedName ||
              v.notify ||
              v.name ||
              PhoneNumber('+' + jid?.replace('@s.whatsapp.net', ''))?.getNumber('international')
            return name
          },
        },
      },
    )

    let oldSendMessage = this.conn.sendMessage
    this.conn.sendMessage = function (chatId, message, options) {
      return oldSendMessage(chatId, message, {
        ...options,
        ephemeralExpiration: this.store.chats.get(chatId).ephemeralExpiration,
      })
    }

    this.store = makeInMemoryStore({
      logger: this.logger,
    })
    this.store.bind(this.conn.ev)
    this.store.file = path.join(this.sessionFolder, 'store.json')
    if (existsSync(this.store.file)) this.store.readFromFile(this.store.file)

    this.reload()
    return conn
  }

  /**
   * @param {boolean} isRestart
   * @param {import('@whiskeysockets/baileys').UserFacingSocketConfig} options
   * @returns
   */
  reload(isRestart, options = {}) {
    if (isRestart) {
      // this.conn.ws.close()
      this.conn.ev.removeAllListeners()
      return this.start(options, this.conn)
    }
    this.conn.ev.on('connection.update', this.connectionUpdate.bind(this))
    this.conn.ev.on('messages.upsert', ({ messages, type, requestId }) => {
      for (let m of messages) {
        m = serialize(m, this.conn) || m
        onMessage.call(this.conn, m)
      }
    })
    console.log(this.conn.ev)
    this.conn.ev.on('call', onCall.bind(this.conn))
    this.conn.ev.on('group-participants.update', onParticipantsUpdate.bind(this.conn))
    this.conn.ev.on('groups.update', onGroupUpdate.bind(this.conn))
    // this.conn.ev.on('messages.delete.me', (content) => {
    //   const keys = Array.isArray(content.keys)
    //     ? content.keys
    //     : Array.isArray(content)
    //     ? content
    //     : [content]
    //   for (const key of keys) onDeleteUpdate.bind(conn, key)
    // })
    this.conn.ev.on('creds.update', async () => {
      this.auth.saveCreds()
    })
  }

  /**
   * @param {import('@whiskeysockets/baileys').BaileysEventMap['connection.update']}
   */
  async connectionUpdate({ isNewLogin, connection, lastDisconnect, qr }) {
    if (isNewLogin) return this.reload(true)
    if (connection) {
      this.qr = qr
      this.logger[connection == 'close' ? 'error' : 'info'](
        `[ ${this.conn.user?.id} ] Connection`,
        connection,
        lastDisconnect?.error?.output?.payload?.statusCode || '',
        lastDisconnect?.error?.output?.payload?.error || '',
        lastDisconnect?.error?.output?.payload?.message || '',
      )
      if (connection == 'close') {
        if (
          lastDisconnect?.error?.output?.payload?.statusCode == DisconnectReason.loggedOut ||
          /failure/i.test(lastDisconnect?.error?.output?.payload?.message)
        )
          this.disconnect(true)
        else if (/\:/.test(this.conn.user?.id)) this.reload(true)
      }
    }
  }

  async getCode(number) {
    const code = await this.conn.requestPairingCode(number)
    return code?.match(/.{1,4}/g)?.join('-') || code
  }

  async disconnect(isLogout) {
    this.logger?.info('Close connection', isLogout ? 'logout' : '')
    if (isLogout) {
      this.conn.logout()
      await fs.promises.rm(this.sessionFolder, { recursive: true })
      this.store?.clear?.()
      if (this.reconnectOnLogout) this.reload(true)
    } else {
      this.conn.end()
    }
  }
}
