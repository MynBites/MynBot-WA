import {
  isJidGroup,
  getContentType,
  extractMessageContent,
  isLidUser,
  jidNormalizedUser,
  proto,
  areJidsSameUser,
} from '@whiskeysockets/baileys'
import { IDENTIFIER } from './Connection.js'

// https://github.com/Nurutomo/wabot-aq/issues/490
const MediaType = [
  'imageMessage',
  'videoMessage',
  'audioMessage',
  'stickerMessage',
  'documentMessage',
]

let getJidFromLidFunction = null

/**
 * Serialize a message
 * @param {import('@whiskeysockets/baileys').proto.IWebMessageInfo} message - The message to serialize
 * @param {import('@whiskeysockets/baileys').WASocket} connection - The WhatsApp socket connection
 * @param {Function} [getJidFromLid] - Function to convert LID to JID
 * @returns {import('../types.js').WebMessageInfo} Serialized message
 */
export function serialize(message, connection, getJidFromLid) {
  if (getJidFromLid) {
    if (typeof getJidFromLid === 'function') {
      getJidFromLidFunction = getJidFromLid
    }
  }
  if (getJidFromLidFunction) {
    getJidFromLid = getJidFromLidFunction
  }
  let property = {
    get() {
      return connection
    },
  }
  if (!message) return
  if ('conn' in message || 'reply' in message) return message

  let m = Object.defineProperties(message || proto.WebMessageInfo.prototype, {
    ...(connection ? { conn: property, sock: property } : {}),
    id: {
      get() {
        return this.key?.id
      },
    },
    isBaileys: {
      get() {
        return (
          this.id?.startsWith('3EB0') && this.id?.length === 40 && this.id?.endsWith(IDENTIFIER)
        )
      },
    },
    chat: {
      get() {
        const senderKeyDistributionMessage = this.message?.senderKeyDistributionMessage?.groupId
        return (
          this.key?.remoteJid ||
          (senderKeyDistributionMessage && senderKeyDistributionMessage !== 'status@broadcast') ||
          ''
        )
      },
    },
    isGroup: {
      get() {
        return this.chat.endsWith('@g.us')
      },
      enumerable: true,
    },
    _sender: {
      value: '',
      writable: true,
    },
    sender: {
      get() {
        return jidNormalizedUser(
          this._sender ||
            (this.key?.fromMe && this.conn?.user.id) ||
            this.participant ||
            this.key.participant ||
            this.chat ||
            '',
        )
      },
      set(value) {
        return (this._sender = jidNormalizedUser(value))
      },
      enumerable: true,
    },
    fromMe: {
      get() {
        return this.key?.fromMe || areJidsSameUser(this.conn?.user.id, this.sender) || false
      },
    },
    mtype: {
      get() {
        if (!this.message) return ''
        return getContentType(this.message)
      },
      enumerable: true,
    },
    _msg: {
      value: null,
      writable: true,
    },
    msg: {
      get() {
        if (!this.message) return null
        const findMsg = (message) => {
          const type = getContentType(message?.message || message)
          if (!type) return null
          const msg = (message?.message || message)[type]
          const data = findMsg(msg) || msg
          if (msg?.editedMessage && data?.caption) {
            const msgStore =
              this.conn.store.loadMessage(msg.key.remoteJid, msg.key.id) ||
              this.conn.store.loadMessage(msg.key.id)
            msgStore.then((msg) => {
              if (msg) {
                const msg2 = proto.WebMessageInfo.fromObject(msgStore)
                msg2.msg.caption = data.caption
                this.msg = msg2.msg
              }
            })
          }
          return data
        }
        return this._msg || findMsg(extractMessageContent(this.message))
      },
      set(value) {
        return (this._msg = value)
      },
      enumerable: true,
    },
    mediaMessage: {
      get() {
        if (!this.message) return null
        const Message =
          (this.msg?.url || this.msg?.directPath
            ? { ...this.message }
            : extractMessageContent(this.message)) || null
        if (!Message) return null
        const mtype = Object.keys(Message)[0]
        return MediaType.includes(mtype) ? Message : null
      },
      enumerable: true,
    },
    mediaType: {
      get() {
        let message
        if (!(message = this.mediaMessage)) return null
        return Object.keys(message)[0]
      },
      enumerable: true,
    },
    _text: {
      value: null,
      writable: true,
    },
    text: {
      get() {
        const msg = this.msg
        const text =
          (typeof msg === 'string' ? msg : msg?.text) ||
          msg?.caption ||
          msg?.contentText ||
          (msg?.options && msg?.name) ||
          ''
        return typeof this._text === 'string'
          ? this._text
          : (typeof text === 'string'
              ? text
              : text?.selectedDisplayText ||
                text?.hydratedTemplate?.hydratedContentText ||
                text) ||
              ''
      },
      set(str) {
        return (this._text = str)
      },
      enumerable: true,
    },
    _mentionedJid: {
      value: null,
      writable: true,
    },
    mentionedJid: {
      get() {
        return (
          this._mentionedJid ||
          (this.msg?.contextInfo?.mentionedJid?.length && this.msg.contextInfo.mentionedJid) ||
          []
        )
      },
      set(value) {
        return (this._mentionedJid = value)
      },
      enumerable: true,
    },
    name: {
      async get() {
        return (!nullish(this.pushName) && this.pushName) || (await this.conn?.getName(this.sender))
      },
      enumerable: true,
    },
    download: {
      value(saveToFile = false) {
        const msg = this.msg
        if (!msg.url || !msg.directPath) return null
        return this.conn?.downloadM(this, { saveToFile })
      },
      enumerable: true,
      configurable: true,
    },
    reply: {
      value(text, chatId, options) {
        return this.conn?.reply(chatId ? chatId : this.chat, text, this, options)
      },
    },
    copy: {
      value() {
        const M = proto.WebMessageInfo
        return serialize(this.conn, M.fromObject(M.toObject(this)))
      },
      enumerable: true,
    },
    forward: {
      value(jid, force = false, options = {}) {
        return this.conn?.sendMessage(
          jid,
          {
            forward: this,
            force,
            ...options,
          },
          { ...options },
        )
      },
      enumerable: true,
    },
    copyNForward: {
      value(jid, forceForward = false, options = {}) {
        return this.conn?.copyNForward(jid, this, forceForward, options)
      },
      enumerable: true,
    },
    cMod: {
      value(jid, text = '', sender = this.sender, options = {}) {
        return this.conn?.cMod(jid, this, text, sender, options)
      },
      enumerable: true,
    },
    delete: {
      value() {
        return this.conn?.sendMessage(this.chat, { delete: this.key })
      },
      enumerable: true,
    },
    react: {
      value(text) {
        return this.conn?.sendMessage(this.chat, {
          react: {
            text,
            key: this.key,
          },
        })
      },
      enumerable: true,
    },
    quoted: {
      get() {
        const contextInfo = this.msg?.contextInfo
        if (!contextInfo?.quotedMessage) return null
        const remoteJid = contextInfo.remoteJid || this.chat
        const participant = contextInfo.participant || remoteJid
        return serialize(
          proto.WebMessageInfo.fromObject({
            key: {
              remoteJid,
              fromMe: this.conn?.user?.jid == participant,
              id: contextInfo.stanzaId,
              participant: isJidGroup(remoteJid) ? participant : undefined,
            },
            message: contextInfo.quotedMessage,
          }),
          this.conn,
          getJidFromLid,
        )
      },
    },
    getQuotedObj: {
      async value() {
        const q = this.quoted
        if (!q) return null
        return serialize(
          (await this.conn?.store.loadMessage(q.chat, q.id)) || q,
          this.conn,
          getJidFromLid,
        )
      },
    },
  })
  if (getJidFromLid) {
    ;(async () => {
      if (isLidUser(m.sender)) m.sender = await getJidFromLid(m.sender)
      m.mentionedJid = await Promise.all(
        m.mentionedJid.map(async (id) => (isLidUser(id) ? await getJidFromLid(id) : id)),
      )
    })()
  }
  return m
}

/**
 * Check if a value is null or undefined
 * @param {*} args - The value to check
 * @returns {boolean} True if value is null or undefined
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator
 */
function nullish(args) {
  return !(args !== null && args !== undefined)
}
