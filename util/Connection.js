import pino from 'pino'
import {
  Browsers,
  makeWASocket,
  downloadMediaMessage,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestWaWebVersion,
  areJidsSameUser,
  generateMessageIDV2,
  addTransactionCapability,
  useMultiFileAuthState,
  isLidUser,
  jidNormalizedUser,
  proto,
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import makeInMemoryStore from './Store.js'
import { serialize } from './Message.js'
import { onCall, onGroupUpdate, onMessage, onParticipantsUpdate } from './Handlers.js'
import { toPhoneNumber } from './Util.js'
// import createAuthState from './AuthState.js'
import client from './Database.js'
import path from 'path'
import fs from 'fs'

export const IDENTIFIER = 'B41E' // HEX identifier to detect messages from this bot
const browser = Browsers.appropriate('Edge')
const P = pino({
  level: 'info',
  transport: { target: 'pino-pretty' },
})

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
    // this.auth = await createAuthState(this.db)
    const authFolder = path.join(import.meta.dirname, '../sessions/' + this.sessionName)
    this.auth = await useMultiFileAuthState(authFolder)
    this.auth.clear = () => fs.rmSync(authFolder, { recursive: true, force: true })

    this.conn = Object.defineProperties(
      makeWASocket({
        logger: this.logger,
        version: WA_VERSION.version,
        browser,
        auth: {
          ...this.auth.state,
          keys: addTransactionCapability(makeCacheableSignalKeyStore(this.auth.state.keys, this.logger), this.logger, {
            maxCommitRetries: 10,
            delayBetweenTriesMs: 5,
          }),
        },
        qrTimeout: 60_000,
        syncFullHistory: true,
        defaultQueryTimeoutMs: 5_000,
        generateHighQualityLinkPreview: false,
        getMessage: (key) => this.store.loadMessage(key.remoteJid, key.id),
        cachedGroupMetadata: (jid) => this.store.fetchGroupMetadata(jid, this.conn),
        // patchMessageBeforeSending: (message) => {
        //   const requiresPatch = Boolean(
        //     message.listMessage ||
        //       message.buttonsMessage ||
        //       message.templateMessage ||
        //       message.interactiveMessage,
        //   )
        //   if (requiresPatch) {
        //     message = {
        //       viewOnceMessage: {
        //         message: {
        //           messageContextInfo: {
        //             deviceListMetadata: {},
        //             deviceListMetadataVersion: 2,
        //           },
        //           ...message,
        //         },
        //       },
        //     }
        //   }
        //   return message
        // },
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
            let lid = isLidUser(jid) ? jid : await this.signalRepository?.lidMapping.getLIDForPN(jid).catch(() => null)
            let v =
              areJidsSameUser(jid, '0@s.whatsapp.net')
                ? {
                  id: jid,
                  name: 'WhatsApp',
                }
                : areJidsSameUser(jid, this.user?.id)
                  ? this.user
                  : {
                    ...await self.store.chats.findOne({ id: { $in: [jid, lid] } }),
                    ...await self.store.contacts.findOne({ id: { $in: [jid, lid] } }),
                    ...await self.store.groupMetadata.findOne({ id: { $in: [jid, lid] } }),
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
        downloadM: {
          /**
           * Get name from jid
           * @param {proto.WebMessageInfo} m
           * @param {Boolean} withoutContact
           */
          async value(m, options = {}) {
            if (typeof options != "object") options = {};
            const msg = m.msg;
            if (!msg) return null;
            if (!(msg.url || msg.directPath || msg.thumbnailDirectPath))
              return null;
            const edit = m.message?.editedMessage?.message?.protocolMessage;
            const stream = await downloadMediaMessage(
              edit
                ? {
                  message: {
                    [getContentType(edit.editedMessage)]: msg,
                  },
                }
                : m,
              options.asStream || options.saveToFile ? "stream" : "buffer",
              options,
              {
                logger: this.ws.config.logger,
                reuploadRequest: this.updateMediaMessage,
              },
            )
            if (options.saveToFile) {
              stream.pipe(fs.createWriteStream(options.saveToFile));
            }
            return stream
            // if (options.asStream) return stream;
            // return toBuffer(stream);
          }
        }
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
      this.conn.ev.flush()
      return this.start(options, this.conn)
    }
    if (!this.events) {
      this.events = this.conn.ev.process(async events => {
        for (const eventName in events) {
          const event = events[eventName]
          try {
            switch (eventName) {
              case 'call': {
                await onCall.call(this.conn, event)
              } break
              case 'connection.update': {
                await this.connectionUpdate(event)
              } break
              case 'creds.update': {
                await this.auth.saveCreds()
              } break
              case 'group-participants.update': {
                await onParticipantsUpdate.call(this.conn, event)
              } break
              case 'groups.update': {
                await onGroupUpdate.call(this.conn, event)
              } break
              case 'messages.upsert': {
                for (let m of event.messages) {
                  m = serialize(m, this.conn, this.getJidFromLid.bind(this.conn)) || m
                  onMessage.call(this.conn, m)
                }
              } break
              case 'messages.delete.me': {
                const keys = Array.isArray(event.keys)
                  ? event.keys
                  : Array.isArray(event)
                    ? event
                    : [event]
                for (const key of keys) onDeleteUpdate.bind(conn, key)
              } break
              case 'chats.upsert':
              case 'chats.update':
              case 'message-receipt.update':
              case 'presence.update':
              case 'contacts.update': {
                // console.log(event)
              } break
              default: {
                this.logger.info(`[${eventName}]:`, event)
              } break
            }
          } catch (e) {
            this.logger.error(`Error in event ${eventName}`, e)
          }
        }
      })
    }
    // this.conn.ev.on('messages.delete.me', (content) => {
    // })
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

  async getCode(number, customPairingCode) {
    const code = await this.conn.requestPairingCode(number, customPairingCode)
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
    const contact = await this.signalRepository?.lidMapping.getPNForLID(lid).then(id => ({ id: jidNormalizedUser(id) })).catch(() => { }) || await this.store.contacts.find(c => c.lid === lid)
    return contact?.id || lid
  }
}
