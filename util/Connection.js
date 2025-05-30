import pino from 'pino'
import {
  Browsers,
  makeWASocket,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestWaWebVersion,
  areJidsSameUser,
  generateMessageIDV2,
  addTransactionCapability,
  isLidUser,
  jidDecode
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import makeInMemoryStore from './Store.js'
import { serialize } from './Message.js'
import { onCall, onGroupUpdate, onMessage, onParticipantsUpdate } from './Handlers.js'
import createAuthState from './AuthState.js'
import client from './Database.js'
import { parsePhoneNumber, getNumberFrom } from 'awesome-phonenumber'

export const IDENTIFIER = 'B41E' // HEX identifier to detect messages from this bot
const browser = Browsers.appropriate('Edge')
const P = pino({
  level: 'info',
  transport: { target: 'pino-pretty' },
})

function toPhoneNumber(jid) {
    return jid && jidDecode(jid) && jidDecode(jid).user
        ? getNumberFrom(parsePhoneNumber("+" + jidDecode(jid).user), "international").number
        : jid
}


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
    this.db = client.db('wa_db_' + this.sessionName)
  }

  /**
   * @param {import('@whiskeysockets/baileys').UserFacingSocketConfig | { printQRInTerminal: boolean }} options
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
    let { printQRInTerminal: __unused_omitted_object__, ..._socketOptions } = options
    this.options = options
    this.auth = await createAuthState(this.db)

    this.conn = Object.defineProperties(
      makeWASocket({
        logger: this.logger,
        version: WA_VERSION.version,
        browser,
        auth: {
          ...this.auth.state,
          keys: makeCacheableSignalKeyStore(addTransactionCapability(this.auth.state.keys, this.logger, {
            maxCommitRetries: 10,
            delayBetweenTriesMs: 500,
          }), this.logger),
        },
        qrTimeout: 60_000,
        syncFullHistory: false,
        defaultQueryTimeoutMs: undefined,
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
        ..._socketOptions,
      }),
      {
        store: {
          get() {
            return self.store
          },
        },
        reply: {
          value(chatId, message, quoted, options) {
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
          async value(jid = '') {
            let v =
              areJidsSameUser(jid, '0@s.whatsapp.net')
                ? {
                    id: jid,
                    name: 'WhatsApp',
                  }
                : areJidsSameUser(jid, this.user?.id)
                ? this.user
                : {
                    ...await self.store.chats.findOne({ id: jid }),
                    ...await self.store.contacts.findOne({ id: jid }),
                    ...await self.store.groupMetadata.findOne({ id: jid }),
                  }
            let name =
              v.subject ||
              v.verifiedName ||
              v.notify ||
              v.name ||
              toPhoneNumber(v.id)
            return name
          },
        },
      },
    )

    let oldSendMessage = this.conn.sendMessage
    this.conn.sendMessage = async function (chatId, message, options) {
      return await oldSendMessage(chatId, message, {
        ...options,
        ephemeralExpiration: await this.store.getExpiration(chatId),
        messageId: options?.messageId || (generateMessageIDV2(this.user?.id).slice(0, -IDENTIFIER.length) + IDENTIFIER),
      })
    }

    this.store = makeInMemoryStore({
      logger: this.logger,
      db: this.db,
    })
    this.store.bind(this.conn.ev)
 
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
    this.conn.ev.on('messages.upsert', update => {
      const { messages } = update
      for (let m of messages) {
        m = serialize(m, this.conn, this.getJidFromLid.bind(this)) || m
        onMessage.call(this.conn, m)
      }
    })
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
    // console.log({ isNewLogin, connection, lastDisconnect, qr })
    if (isNewLogin) return this.reload(true)
    if (qr && this.options.printQRInTerminal) qrcode.generate(qr, { small: true })
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
          await this.disconnect(true, true)
        else if (/\:/.test(this.conn.user?.id)) await this.reload(true, this.options)
      }
    }
  }

  async getCode(number) {
    const code = await this.conn.requestPairingCode(number)
    return code?.match(/.{1,4}/g)?.join('-') || code
  }

  async disconnect(isLogout, fromDevice) {
    this.logger?.info('Close connection', isLogout ? 'logout' : '')
    if (isLogout) {
      if (!fromDevice) await this.conn.logout()
      await this.auth?.clear?.()
      await this.store?.clear?.()
      if (this.reconnectOnLogout) await this.reload(true, this.options)
    } else {
      this.conn.end()
    }
  }
  async getJidFromLid(lid) {
    if (!lid) return ''
    if (!isLidUser(lid)) return lid
    const contact = await this.store?.contacts.findOne({ lid })
    return contact?.id || lid
  }
}
