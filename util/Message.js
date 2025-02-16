import baileys, { isJidGroup, getContentType, extractMessageContent } from '@whiskeysockets/baileys'
const { proto } = baileys

// https://github.com/Nurutomo/wabot-aq/issues/490
const MediaType = [
  'imageMessage',
  'videoMessage',
  'audioMessage',
  'stickerMessage',
  'documentMessage',
]

/**
 * Serialize a message
 * @param {import('@whiskeysockets/baileys').proto.WebMessageInfo} message
 * @param {import('@whiskeysockets/baileys').WASocket} connection
 * @returns {import('..').WebMessageInfo}
 */
export function serialize(message, connection) {
  let property = {
    get() {
      return connection
    },
  }
  return Object.defineProperties(message || proto.WebMessageInfo.prototype, {
    ...(connection ? { conn: property, sock: property } : {}),
    id: {
      get() {
        return this.key?.id
      },
    },
    isBaileys: {
      get() {
        return this.id?.startsWith('3EB0') && this.id?.length === 40 && this.id?.endsWith('A1EE')
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
    sender: {
      get() {
        return (
          (this.key?.fromMe && this.conn?.user.id) ||
          this.participant ||
          this.key.participant ||
          this.chat ||
          ''
        )
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
            if (msgStore) {
              const msg2 = proto.WebMessageInfo.fromObject(msgStore)
              msg2.msg.caption = data.caption
              return msg2.msg
            }
          }
          return data
        }
        return findMsg(extractMessageContent(this.message))
      },
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
          (typeof msg === 'string' ? msg : msg?.text) || msg?.caption || msg?.contentText || ''
        return typeof this._text === 'string'
          ? this._text
          : '' ||
              (typeof text === 'string'
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
    mentionedJid: {
      get() {
        return (
          (this.msg?.contextInfo?.mentionedJid?.length && this.msg.contextInfo.mentionedJid) || []
        )
      },
      enumerable: true,
    },
    name: {
      get() {
        return (!nullish(this.pushName) && this.pushName) || this.conn?.getName(this.sender)
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
        )
      },
    },
    getQuotedObj: {
      value() {
        const q = this.quoted
        if (!q) return null
        return serialize(this.conn, this.conn?.store.loadMessage(q.chat, q.id) || q)
      },
    },
  })
}

/**
 * ??
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator
 * @returns {boolean}
 */
function nullish(args) {
  return !(args !== null && args !== undefined);
}
