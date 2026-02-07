/* By Caliph - Modified to use Map for chats only */
/* Modified by Nurutomo */
/* eslint-disable no-unused-vars */

import baileys, {
  isJidGroup,
  isJidBroadcast,
  getContentType,
  jidNormalizedUser,
  WAMessageStubType,
  isLidUser,
  proto,
} from '@whiskeysockets/baileys'

const AVATAR = 'https://telegra.ph/file/7ce3f080ee6d1e58f7e33.png'

export default function makeInMemoryStore(config) {
  /** @type {import('mongodb').Db} */
  const db = config.db

  const chats = db.collection('chats')
  const messages = db.collection('messages')
  const contacts = db.collection('contacts')
  const groupMetadata = db.collection('groupMetadata')
  const ephemeralDuration = {}
  // Using Map for chats only
  let state = {},
    expired = []

  async function loadMessage(jid, id = null) {
    if (jid && !id) {
      id = jid
      jid = undefined
    }
    const query = { id }
    if (jid) query.jid = jid
    const message = await messages.findOne(query)

    return proto.WebMessageInfo.fromObject(message)
  }

  function isJid(id) {
    return typeof id !== 'undefined' && !isJidBroadcast(id)
  }

  async function getExpiration(id) {
    if (!isJid(id)) return null

    let result = (await groupMetadata.findOne({ id })) || (await chats.findOne({ id })) || {}
    return result.ephemeralDuration || result.ephemeralExpiration
  }

  function getExpirationOfMessage(m) {
    if (!m) return
    m = proto.WebMessageInfo.fromObject(m)
    let mtype = m.message ? getContentType(m.message) || Object.keys(m.message)[0] : ''
    let msg = m.message ? m.message[mtype] : null
    if (/viewOnceMessage/.test(mtype)) {
      mtype = getContentType(msg.message) || Object.keys(msg.message)[0] || ''
      msg = msg.message[mtype]
    }

    let expiration
    if (msg && msg !== null && typeof msg === 'object' && 'contextInfo' in msg && msg.contextInfo) {
      if (msg.contextInfo !== null && typeof msg.contextInfo === 'object') {
        if (msg.contextInfo && 'expiration' in msg.contextInfo && msg.contextInfo.expiration) {
          expiration = msg.contextInfo.expiration
        }
      }
    }

    return expiration
  }

  async function contactsUpsert(newContacts) {
    const oldContacts = (
      (await contacts.find({ id: { $not: { $in: newContacts.map((c) => c.id) } } }).toArray()) || []
    ).map((c) => c.id)
    config?.SocketConfig?.logger.info('menyinkronkan kontak terbaru...')
    const ops = []
    for (const contact of newContacts) {
      ops.push({
        updateOne: {
          filter: { id: contact.id },
          update: { $set: contact },
          upsert: true,
        },
      })
    }
    let lids = (await config?.socket?.onWhatsApp(...newContacts.map(({ id }) => id))) || []
    if (lids)
      await config?.socket?.signalRepository.lidMapping
        .storeLIDPNMappings(lids.map(({ jid, lid }) => ({ pn: jid, lid })))
        .catch(() => {})
    if (ops.length) {
      await contacts.bulkWrite(ops)
    }
    config?.SocketConfig?.logger.info('Berhasil menyinkronkan kontak!')
    return oldContacts
  }

  /**
   * binds to a BaileysEventEmitter.
   * It listens to all events and constructs a state that you can query accurate data from.
   * Eg. can use the store to fetch chats, contacts, messages etc.
   * @param {(await import("@whisketsockets/baileys")).BaileysEventEmitter} ev typically the event emitter from the socket connection
   */
  function bind(ev) {
    // ===== KODE PERBAIKAN =====
    ev.on('connection.update', async (update) => {
      Object.assign(state, update)
      // const rawId = config?.socket?.user?.id;
      // if (!rawId) {
      // 	// log peringatan, lalu keluar supaya tidak error
      // 	config?.SocketConfig?.logger.warn("socket.user.id belum tersedia, skip onWhatsApp call");
      // 	return;
      // }
      // const waId = rawId.split('@')[0].split(':')[0] + '@s.whatsapp.net';
      // if ((waId in contacts && 'lid' in contacts[waId]) || state.connection !== 'open') return
      // const [{ jid, lid }] = await config.socket.onWhatsApp(waId);
      // await contacts.updateOne({ id: jid }, { $set: { id: jid, lid } }, { upsert: true })
    })

    ev.on(
      'messaging-history.set',
      async ({
        chats: newChats,
        contacts: newContacts,
        messages: newMessages,
        isLatest,
        syncType,
      }) => {
        if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
          return // FOR NOW,
          //TODO: HANDLE
        }

        if (isLatest) {
          await chats.deleteMany({})
          await messages.deleteMany({})
        }

        const insertions = await chats.countDocuments({
          id: { $not: { $in: newChats.map((c) => c.id) } },
        })
        let ops = newChats.map((chat) => ({
          updateOne: {
            filter: { id: chat.id },
            update: { $set: chat },
            upsert: true,
          },
        }))
        config?.SocketConfig?.logger.debug({ chatsAdded: insertions }, 'synced chats')

        const oldContacts = await contactsUpsert(newContacts)
        if (isLatest) {
          ops = [...ops, ...oldContacts.map((id) => ({ deleteOne: { filter: { id } } }))]
        }

        ops = [
          ...ops,
          ...newMessages.map((msg) => ({
            updateOne: {
              filter: { id: msg.key.id, jid: msg.key.remoteJid },
              update: { $set: msg },
              upsert: true,
            },
          })),
        ]
        if (ops.length) await messages.bulkWrite(ops)
        config?.SocketConfig?.logger.debug(
          { deletedContacts: isLatest ? oldContacts.length : 0, newContacts },
          'synced contacts',
        )
      },
    )

    ev.on('contacts.upsert', (contact) => {
      contactsUpsert(contact)
    })

    ev.on('contacts.update', async (updates) => {
      const updatedIds = updates.filter(({ id }) => isJid(id))
      if (updatedIds.length)
        await chats.bulkWrite(
          updatedIds.map((update) => ({
            updateOne: {
              filter: { id: update.id },
              update: { $set: update },
              upsert: true,
            },
          })),
        )

      let ops = []
      let lids = (await config?.socket?.onWhatsApp(...updatedIds.map(({ id }) => id))) || []
      if (lids)
        await config?.socket?.signalRepository.lidMapping
          .storeLIDPNMappings(lids.map(({ jid, lid }) => ({ pn: jid, lid })))
          .catch(() => {})
      if (ops.length) await contacts.bulkWrite(ops)
    })

    ev.on('chats.upsert', async (newChats) => {
      const ops = newChats
        .filter((chat) => isJid(jidNormalizedUser(chat.id)))
        .map((chat) => ({
          updateOne: {
            filter: { id: jidNormalizedUser(chat.id) },
            update: { $set: chat },
            upsert: true,
          },
        }))
      if (ops.length) await chats.bulkWrite(ops)
    })

    ev.on('chats.update', async (updates) => {
      const unread = {}
      updates.forEach((update) => {
        let id = jidNormalizedUser(update.id)
        if (update.unreadCount && isJid(id)) {
          if (!unread[id]) unread[id] = 0
          unread[id] += update.unreadCount
        }
      })
      const ops = []
      for (const id in unread) {
        const count = unread[id]
        ops.push({
          updateOne: {
            filter: { id },
            update: { $set: { id }, $inc: { unreadCount: count } },
            upsert: true,
          },
        })
      }
      if (ops.length) await chats.bulkWrite(ops)
    })

    ev.on('chats.delete', async (deletions) => {
      await chats.deleteMany({ id: { $in: deletions } })
      for (const id of deletions) {
        console.log('id in chats.delete store system: ', id)
      }
    })

    ev.on('presence.update', async ({ id, presences: update }) => {
      id = jidNormalizedUser(id) || id
      if (!isJid(id)) return
      await chats.updateOne(
        { id },
        {
          $set: {
            presences: update,
          },
        },
        { upsert: true },
      )
    })

    ev.on('messages.upsert', async ({ messages: newMessages, type }) => {
      // prettier-ignore
      switch (type) {
        case 'append':
        case 'notify': {
          const forEmit = []
          const ops = []
          const ops2 = []
          for (const msg of newMessages) {
            const jid = jidNormalizedUser(msg.key?.remoteJid)
            if (!jid) continue
            if (msg.messageStubType == WAMessageStubType.CIPHERTEXT) continue

            let message = proto.WebMessageInfo.fromObject(msg)
            // Clean Message
            // delete message.message?.senderKeyDistributionMessage;

            ops.push({
              updateOne: {
                filter: { id: msg.key?.id, jid },
                update: { $set: message },
                upsert: true,
              },
            })

            if (type == 'notify') {
              let exp = getExpirationOfMessage(msg)
              forEmit.push({
                id: jid,
                conversationTimestamp: msg.messageTimestamp,
                unreadCount: message?.unreadCount || 1,
                notify: msg.pushName || msg.verifiedBizName,
                ...(exp ? { ephemeralExpiration: exp } : {}),
              })
              if (exp)
                ops2.push({
                  updateOne: {
                    filter: { id: jid },
                    update: {
                      $set: {
                        id: jid,
                        unreadCount: message?.unreadCount || 1,
                        ephemeralExpiration: exp,
                      },
                    },
                    upsert: true,
                  },
                })
            }
          }
          if (ops.length) await messages.bulkWrite(ops)
          const exists = await chats
            .find({ id: { $not: { $in: forEmit.map((m) => m.id) } } })
            .toArray()
          ev.emit(
            'chats.upsert',
            exists.map((chat) => forEmit.find((m) => m.id == chat.id)).filter((m) => m),
          )
          if (ops2.length) await chats.bulkWrite(ops2)
        } break
      }
    })

    ev.on('messages.update', async (updates) => {
      const ops = updates
        .filter(
          ({ key, update }) =>
            isJid(jidNormalizedUser(key?.remoteJid)) &&
            update?.messageStubType != WAMessageStubType.REVOKE,
        )
        .map(({ key, update }) => {
          const jid = jidNormalizedUser(key?.remoteJid)
          // if (update?.status) {
          // 	const listStatus = msg?.status;
          // 	if (listStatus && update.status <= listStatus) {
          // 		config?.SocketConfig?.logger.debug({ update, storedStatus: listStatus }, "status stored newer then update");
          // 		delete update.status;
          // 	};
          // };
          return {
            updateOne: {
              filter: { id: key.id, jid },
              update: { $set: update },
              upsert: true,
            },
          }
        })
      if (ops.length) await messages.bulkWrite(ops)
    })

    ev.on('groups.update', async (updates) => {
      const ops = []
      for (const update of updates) {
        const id = update?.id
        await fetchGroupMetadata(id, config?.socket)
        // Pastikan participants selalu array
        const parts = Array.isArray(update.participants)
          ? update.participants
          : update.participants
            ? [update.participants]
            : []

        // Simpan mapping LID dan PN
        let lids = parts.filter(({ id }) => isLidUser(id))
        if (lids)
          await config?.socket?.signalRepository.lidMapping
            .storeLIDPNMappings(lids.map(({ phoneNumber: pn, id: lid }) => ({ pn, lid })))
            .catch(() => {})

        ops.push({
          updateOne: {
            filter: { id },
            update: { $set: update },
            upsert: true,
          },
        })
      }
      if (ops.length) await groupMetadata.bulkWrite(ops)
    })

    ev.on('group-participants.update', async ({ id, participants, action }) => {
      // prettier-ignore
      switch (action) {
        case 'add': {
          await groupMetadata.updateOne(
            { id },
            {
              $push: {
                participants: { $each: participants.map((id) => ({ id, admin: null })) },
              },
            },
          )
        } break
        case 'demote':
        case 'promote': {
          await groupMetadata.updateOne(
            { id, 'participants.id': { $in: participants } },
            {
              $set: {
                'participants.$[participant].admin': action == 'promote' ? 'admin' : null,
              },
            },
            {
              arrayFilters: [{ 'participant.id': { $in: participants } }],
            },
          )
        } break
        case 'remove': {
          await groupMetadata.updateOne(
            { id, 'participants.id': { $in: participants } },
            {
              $pull: {
                participants: { id: { $in: participants } },
              },
            },
          )
        } break
      }
    })

    ev.on('message-receipt.update', async (updates) => {
      const ops = updates.map(({ key, receipt }) => ({
        updateOne: {
          filter: { id: key?.id, jid: key?.remoteJid },
          update: { $push: { receipts: receipt } },
          upsert: true,
        },
      }))
      if (ops.length) await messages.bulkWrite(ops)
    })

    ev.on('messages.reaction', async (updates) => {
      const ops = updates.map(({ key, reaction }) => ({
        updateOne: {
          filter: { id: key?.id, jid: key?.remoteJid },
          update: { $push: { reactions: reaction } },
          upsert: true,
        },
      }))
      if (ops.length) await messages.bulkWrite(ops)
    })
  }

  // Tambahkan di scope atas makeInMemoryStore
  const pendingFetches = new Map() // Map<jid, Promise>

  // Ubah fungsi fetchGroupMetadata jadi seperti ini
  async function fetchGroupMetadata(id, conn) {
    if (!isJidGroup(id)) return null

    // 1) Kalau ada fetch untuk jid ini yang masih pending, tunggu itu
    if (pendingFetches.has(id)) {
      return pendingFetches.get(id)
    }

    // 2) Hitung interval cache (misal 30 detik)
    const CACHE_INTERVAL = 30 * 1000

    const gm = await groupMetadata.findOne({ id })
    const needsUpdate = !gm || Date.now() - (gm?.lastfetch || 0) > CACHE_INTERVAL

    // 3) Jika tidak perlu update, langsung return cache
    if (!needsUpdate) {
      return gm
    }

    // 4) Buat sebuah promise dan simpan di pendingFetches
    const p = (async () => {
      try {
        // panggil API (conn.groupMetadata)
        const apiFn = conn.groupMetadata
        const metadata = await apiFn(id)
        if (metadata) {
          await groupMetadata.updateOne(
            { id },
            {
              $set: {
                id,
                ...metadata,
                lastfetch: Date.now(),
              },
            },
            { upsert: true },
          )

          let lids = metadata.participants.filter(({ id }) => isLidUser(id))
          if (lids)
            await config?.socket?.signalRepository.lidMapping
              .storeLIDPNMappings(lids.map(({ phoneNumber: pn, id: lid }) => ({ pn, lid })))
              .catch(() => {})
        }
      } catch (err) {
        // jika kena rate limit (429) atau error server (500), log & gunakan cache
        if (err?.data === 429 || err?.output?.statusCode === 500) {
          config?.SocketConfig?.logger.warn(`Rate limit saat fetch metadata ${id}, pakai cache.`)
        } else {
          // error lain diteruskan
          throw err
        }
      } finally {
        // bersihkan pending
        pendingFetches.delete(id)
      }
      return await groupMetadata.findOne({ id })
    })()
    pendingFetches.set(id, p)
    return p
  }

  return {
    db,
    chats,
    contacts,
    messages,
    groupMetadata,
    state,
    bind,
    loadMessage,
    getExpiration,
    mostRecentMessage: (jid) =>
      messages.findOne({ jid: jidNormalizedUser(jid) }, { sort: { messageTimestamp: -1 } }),
    fetchImageUrl: async (jid, conn) => {
      jid = jidNormalizedUser(jid) || jid
      const contact = await contacts.findOne({ id: jid })
      let url = AVATAR
      if ((contact && !contact.imgUrl) || /changed/.test(contact.imgUrl)) {
        url = await conn?.profilePictureUrl(jid, 'image').catch((_) => AVATAR)
        await contacts.updateOne({ id: jid }, { $set: { imgUrl: url } }, { upsert: true })
      }
      return url
    },
    fetchGroupMetadata,
    fetchMessageReceipts: async ({ remoteJid, id }) => {
      const msg = await loadMessage(remoteJid, id)
      return msg?.receipts
    },
  }
}
