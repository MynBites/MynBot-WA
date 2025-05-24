/* By Caliph - Modified to use Map for chats only */
/* Modified by Nurutomo */
/* eslint-disable no-unused-vars */
import {
	existsSync,
	readFileSync,
	writeFileSync
} from "fs";

import baileys, {
	isJidGroup,
	isJidBroadcast,
	getContentType,
	jidNormalizedUser,
	WAMessageStubType,
	updateMessageWithReceipt,
	updateMessageWithReaction
} from "@whiskeysockets/baileys";

const { proto } = baileys;
const AVATAR = "https://telegra.ph/file/7ce3f080ee6d1e58f7e33.png";
export default function makeInMemoryStore(config) {

	// Using Map for chats only
	let chats = new Map(),
		messages = {},
		contacts = {},
		groupMetadata = {},
		state = {},
		expired = [];

	function loadMessage(jid, id = null) {
		let message = null;
		if (jid && !id) {
			id = jid;
			const messageFind = Object.entries(messages)
				.find(([_, msgs]) => msgs.find(m => m.key?.id == id));
			message = messageFind?.[1]?.find?.(m => m?.key?.id == id);
		} else {
			jid = jidNormalizedUser(jid);
			if (!(jid in messages)) return null;
			message = messages[jid]?.find?.(m => m?.key?.id == id);
		};
		return message;
	};

	async function handleExpired() {
		const now = new Date() * 1;
		for (const [id, chatData] of chats.entries()) {
			if (!chatData || typeof chatData !== "object") continue;
			if (!("expired" in chatData)) continue;
			if (!expired.includes(id) && chatData.expired != 0 && chatData.expired !== undefined && now >= chatData.expired) {
				expired.push(id);
			};
		};
		return expired;
	};

	function isJid(id) {
		return typeof id !== "undefined" && !isJidBroadcast(id);
	};

	function getExpiration(jid) {
		if (!isJid(jid)) return null;
		const expirationGroup = groupMetadata[jid]?.ephemeralDuration;
		const expirationChat = chats.get(jid)?.ephemeralExpiration ?? chats.get(jid)?.ephemeralDuration ?? contacts[jid]?.ephemeralExpiration ?? contacts[jid]?.ephemeralDuration;
		return (expirationGroup || expirationChat);
	};

	function getExpirationOfMessage(m) {
		if (!m) return;
		m = proto.WebMessageInfo.fromObject(m);
		let mtype = m.message ? (getContentType(m.message) || Object.keys(m.message)[0]) : "";
		let msg = m.message ? m.message[mtype] : null;
		if (/viewOnceMessage/.test(mtype)) {
			mtype = getContentType(msg.message) || Object.keys(msg.message)[0] || "";
			msg = msg.message[mtype];
		};

		let expiration;
		if (msg && msg !== null && typeof msg === "object" && "contextInfo" in msg && msg.contextInfo) {
			if (msg.contextInfo !== null && typeof msg.contextInfo === "object") {
				if (msg.contextInfo && "expiration" in msg.contextInfo && msg.contextInfo.expiration) {
					expiration = msg.contextInfo.expiration;
				};
			};
		};

		return expiration;
	};

	function contactsUpsert(newContacts) {
		const oldContacts = new Set(Object.keys(contacts));
		config?.SocketConfig?.logger.info("menyinkronkan kontak terbaru...");
		for (const contact of newContacts) {
			oldContacts.delete(contact.id);
			contacts[contact.id] = Object.assign(contacts[contact.id] || {}, contact);
		};
		config?.socket?.onWhatsApp(...newContacts.map(({ id }) => id))
			.then(lids => lids
				.forEach(({ jid, lid }) => Object.assign(contacts[jid], { lid }))
			)
		config?.SocketConfig?.logger.info("Berhasil menyinkronkan kontak!");
		return oldContacts;
	};

	function upsertMessage(id, message, type = "append") {
		// @ts-ignore
		id = jidNormalizedUser(id) || id;
		if (!(id in messages)) messages[id] = [];

		// Clean Message
		// delete message.message?.senderKeyDistributionMessage;

		const msg = loadMessage(id, message.key?.id);
		if (msg)
			Object.assign(msg, message);
		else {
			if (type == "append")
				messages[id].push(message);
			else
				messages[id].splice(0, 0, message);
		};
	};

	/**
	* binds to a BaileysEventEmitter.
	* It listens to all events and constructs a state that you can query accurate data from.
	* Eg. can use the store to fetch chats, contacts, messages etc.
	* @param {(await import("@whisketsockets/baileys")).BaileysEventEmitter} ev typically the event emitter from the socket connection
	*/
	function bind(ev) {
		// ===== KODE PERBAIKAN =====
		ev.on("connection.update", async update => {
			Object.assign(state, update);
			const rawId = config?.socket?.user?.id;
			if (!rawId) {
				// log peringatan, lalu keluar supaya tidak error
				config?.SocketConfig?.logger.warn("socket.user.id belum tersedia, skip onWhatsApp call");
				return;
			}
			const waId = rawId.split('@')[0].split(':')[0] + '@s.whatsapp.net';
			if ((waId in contacts && 'lid' in contacts[waId]) || state.connection !== 'open') return
			const [{ jid, lid }] = await config.socket.onWhatsApp(waId);
			contacts[jid] = { id: jid, lid };
		});

		ev.on("messaging-history.set", ({
			chats: newChats,
			contacts: newContacts,
			messages: newMessages,
			isLatest,
			syncType
		}) => {
			if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
				return // FOR NOW,
				//TODO: HANDLE
			}

			if (isLatest) {
				chats.clear()

				for (const id in messages) {
					delete messages[id]
				}
			}

			const insertions = [];
			newChats.forEach(v => {
				if (!v)
					return;
				// if ID is present
				const presentValue = chats.has(v.id);
				if (presentValue)
					return;
				chats.set(v.id, v);
				insertions.push(v);
			});
			config?.SocketConfig?.logger.debug({ chatsAdded: insertions.length }, 'synced chats')

			const oldContacts = contactsUpsert(newContacts)
			if (isLatest) {
				for (const jid of oldContacts) {
					delete contacts[jid]
				}
			}

			for (const msg of newMessages) {
				const jid = msg.key.remoteJid
				if (!messages[jid]) messages[jid] = []
				messages[jid].unshift(msg)
			}

			config?.SocketConfig?.logger.debug({ deletedContacts: isLatest ? oldContacts.size : 0, newContacts }, "synced contacts");
		});

		ev.on("contacts.upsert", contact => {
			contactsUpsert(contact);
		});

		ev.on("contacts.update", updates => {
			const updatedIds = []
			for (const update of updates) {
				if (!isJid(update.id)) continue;
				if (!(update.id in contacts)) contacts[update.id] = {};
				Object.assign(contacts[update.id], update);
				updatedIds.push(update.id)
			};
			config?.socket?.onWhatsApp(...updatedIds)
				.then(lids => lids
					.forEach(({ jid, lid }) => Object.assign(contacts[jid], { lid }))
				)
		});

		ev.on("chats.upsert", newChats => {
			for (const chat of newChats) {
				const id = jidNormalizedUser(chat.id);
				if (!isJid(id)) continue;
				if (!chats.has(id)) chats.set(id, {});
				const data = (isJidGroup(id) ? config?.db?.data?.chats[id] : config?.db?.data?.users[id] || {});
				const exp = (isJidGroup(id) ? data?.expired : data?.premiumTime) || 0;
				Object.assign(chat || {}, { expired: exp });

				Object.assign(chats.get(id), chat);
				if ("ephemeralExpiration" in chat && !isJidGroup(id)) {
					if (!(id in contacts)) contacts[id] = {};
					Object.assign(contacts[id], { ephemeralExpiration: chat.ephemeralExpiration });
				};
				if (!isJidGroup(id)) Object.assign(chats.get(id), { id, isPrivate: true });
			};
		});

		ev.on("chats.update", updates => {
			for (const update of updates) {
				const id = jidNormalizedUser(update.id);
				if (!isJid(id)) continue;
				if (!chats.has(id)) chats.set(id, {});
				if (update.unreadCount && chats.get(id)?.unreadCount) update.unreadCount += chats.get(id).unreadCount || 0;
				const data = (isJidGroup(id) ? config?.db?.data?.chats[id] : config?.db?.data?.users[id] || {});
				const exp = (isJidGroup(id) ? data?.expired : data?.premiumTime) || 0;
				Object.assign(update || {}, { expired: exp });
				Object.assign(chats.get(id), update);
				if ("ephemeralExpiration" in update && !isJidGroup(id)) {
					if (!(id in contacts)) contacts[id] = {};
					Object.assign(contacts[id], { ephemeralExpiration: update.ephemeralExpiration });
				};
				if (!isJidGroup(id)) Object.assign(chats.get(id), { id, isPrivate: true });
			};
		});

		ev.on("chats.delete", deletions => {
			for (const id of deletions) {
				console.log("id in chats.delete store system: ", id);
				if (id in messages) delete messages[id];
				if (chats.has(id)) chats.delete(id);
			};
		});

		ev.on('presence.update', ({ id, presences: update }) => {
			id = jidNormalizedUser(id) || id;
			if (!isJid(id)) return;
			if (!chats.has(id)) chats.set(id, {});
			Object.assign(chats.get(id), update);
		});

		ev.on("messages.upsert", ({ messages: newMessages, type }) => {
			switch (type) {
				case "append":
				case "notify":
					for (const msg of newMessages) {
						const jid = jidNormalizedUser(msg.key?.remoteJid);
						if (!jid) continue;
						if (jid && (isJidBroadcast(jid) || msg.broadcast)) {
							continue;
						};
						if (msg.messageStubTybe == WAMessageStubType.CIPHERTEXT)
							continue;

						upsertMessage(jid, proto.WebMessageInfo.fromObject(msg));
						if (type == "notify") {
							let exp = getExpirationOfMessage(msg);
							if (chats.has(jid) && chats.get(jid) && !chats.get(jid).ephemeralExpiration) {
								if (exp) chats.get(jid).ephemeralExpiration = exp;
							};
							if (!chats.has(jid)) {
								ev.emit("chats.upsert", [{
									id: jid,
									conversationTimestamp: msg.messageTimestamp,
									unreadCount: 1,
									notify: msg.pushName || msg.verifiedBizName,
									...(exp ? { ephemeralExpiration: exp } : {})
								}]);
							};
						};
					};

					break;
			};
		});

		ev.on("messages.update", updates => {
			for (const { key, update } of updates) {
				const jid = jidNormalizedUser(key?.remoteJid);
				if (!isJid(jid)) continue;
				if (!(jid in messages)) messages[jid] = [];
				let msg = loadMessage(jid, key?.id);
				if (!msg) continue;
				if (update?.messageStubType == WAMessageStubType.REVOKE) continue;
				if (update?.status) {
					const listStatus = msg?.status;
					if (listStatus && update.status <= listStatus) {
						config?.SocketConfig?.logger.debug({ update, storedStatus: listStatus }, "status stored newer then update");
						delete update.status;
					};
				};

				Object.assign(msg, update);
				const index = messages[jid].findIndex(m => m.key?.id == key.id);
				if (index == -1) continue;
				const result = Object.assign(messages[jid][index], update);
				if (!result) config?.SocketConfig?.logger.debug({ update }, "got update for non-existent message");
			};
		});

		ev.on("groups.update", async (updates) => {
			for (const update of updates) {
				const id = update?.id;
				if (!(id in groupMetadata))
					await fetchGroupMetadata(id, config?.socket);
				// Pastikan participants selalu array
				const parts = Array.isArray(update.participants)
					? update.participants
					: update.participants
						? [update.participants]
						: [];
				for (let { id: participantId, phoneNumber } of parts) {
					if (!contacts[phoneNumber]) contacts[phoneNumber] = {};
					Object.assign(contacts[phoneNumber], { id: phoneNumber, lid: participantId });
				}

				Object.assign(groupMetadata[id], update);
			}
		});

		ev.on("group-participants.update", ({ id, participants, action }) => {
			const metadata = groupMetadata[id];
			if (metadata) {
				switch (action) {
					case "add":
						metadata.participants.push(...participants.map(id => ({ id, admin: null })));
						break;
					case "demote":
					case "promote":
						for (const participant of metadata.participants) {
							if (participants.includes(participant.id)) {
								participant.admin = action === "promote" ? (participant.id === metadata.owner || metadata.id?.includes?.("-") && metadata.id.split("-")[0] + "@s.whatsapp.net") ? "superadmin" : "admin" : null;
							};
						};

						break;
					case "remove":
						metadata.participants = metadata.participants.filter(p => !participants.includes(p.id));
						break;
				};

				Object.assign(groupMetadata[id], metadata);
			};
		});

		ev.on("message-receipt.update", updates => {
			for (const { key, receipt } of updates) {
				const msg = loadMessage(key?.remoteJid, key?.id);
				if (msg) updateMessageWithReceipt(msg, receipt);
			};
		});

		ev.on("messages.reaction", updates => {
			for (const { key, reaction } of updates) {
				const msg = loadMessage(key?.remoteJid, key?.id);
				if (msg) updateMessageWithReaction(msg, reaction);
			};
		});
	};

	// Tambahkan di scope atas makeInMemoryStore
	const pendingFetches = new Map(); // Map<jid, Promise>

	// Ubah fungsi fetchGroupMetadata jadi seperti ini
	async function fetchGroupMetadata(jid, conn) {
		if (!isJidGroup(jid)) return null;
		if (!(jid in groupMetadata)) groupMetadata[jid] = { id: jid };

		// 1) Kalau ada fetch untuk jid ini yang masih pending, tunggu itu
		if (pendingFetches.has(jid)) {
			return pendingFetches.get(jid);
		}

		// 2) Hitung interval cache (misal 5 menit)
		const CACHE_INTERVAL = 5 * 60 * 1000;
		const needsUpdate = !groupMetadata[jid]?.metadata
			|| Date.now() - (groupMetadata[jid]?.lastfetch || 0) > CACHE_INTERVAL;

		// 3) Jika tidak perlu update, langsung return cache
		if (!needsUpdate) {
			return groupMetadata[jid];
		}

		// 4) Buat sebuah promise dan simpan di pendingFetches
		const p = (async () => {
			try {
				// panggil API (conn.groupMetadata)
				const apiFn = conn.groupMetadata;
				const metadata = await apiFn(jid);
				if (metadata) {
					Object.assign(groupMetadata[jid], {
						...metadata,
						lastfetch: Date.now(),
						expired: config?.db?.data?.chats?.[jid]?.expired ?? 0
					});
					for (let { id, phoneNumber } of metadata.participants) {
						if (phoneNumber) {
							if (!contacts[phoneNumber]) contacts[phoneNumber] = {}
							Object.assign(contacts[phoneNumber], { id: phoneNumber, lid: id })
						}
					}
				}
			} catch (err) {
				// jika kena rate limit (429) atau error server (500), log & gunakan cache
				if (err?.data === 429 || err?.output?.statusCode === 500) {
					config?.SocketConfig?.logger.warn(
						`Rate limit saat fetch metadata ${jid}, pakai cache.`
					);
				} else {
					// error lain diteruskan
					throw err;
				}
			} finally {
				// bersihkan pending
				pendingFetches.delete(jid);
			}
			return groupMetadata[jid];
		})();
		pendingFetches.set(jid, p);
		return p;
	}

	function toJSON() {
		// Convert Map to object for JSON serialization
		const mapToObject = (map) => {
			const obj = {};
			for (const [key, value] of map.entries()) {
				obj[key] = value;
			}
			return obj;
		};

		return {
			chats: mapToObject(chats),
			messages,
			contacts,
			groupMetadata
		};
	};

	function fromJSON(json) {
		// Convert chats object back to Map
		if (json?.chats) {
			for (const [key, value] of Object.entries(json.chats)) {
				chats.set(key, value);
			}
		}
		if (json?.contacts) Object.assign(contacts, json.contacts);
		if (json?.groupMetadata) Object.assign(groupMetadata, json.groupMetadata);
		if (json?.messages) {
			for (const jid in json.messages) {
				messages[jid] = json.messages[jid].map(m => m && proto.WebMessageInfo.fromObject(m)).filter(m => m && m.messageStubType != WAMessageStubType.CIPHERTEXT);
			};
		};
	};

	return {
		chats,
		contacts,
		messages,
		groupMetadata,
		state,
		expired,
		bind,
		loadMessage,
		getExpiration,
		handleExpired,
		mostRecentMessage: (jid) => messages[jid]?.slice(-1)[0],
		fetchImageUrl: async (jid, conn) => {
			jid = jidNormalizedUser(jid) || jid;
			if (!(jid in contacts)) contacts[jid] = {};
			if (contacts[jid] && !contacts[jid].imgUrl || /changed/.test(contacts[jid].imgUrl)) {
				const url = await conn?.profilePictureUrl(jid, "image").catch(_ => AVATAR);
				Object.assign(contacts[jid], { id: jid, imgUrl: url });
			};
			return contacts[jid].imgUrl;
		},
		fetchGroupMetadata,
		fetchMessageReceipts: ({ remoteJid, id }) => {
			const msg = loadMessage(remoteJid, id);
			return msg?.userReceipt;
		},
		toJSON,
		fromJSON,
		writeToFile: (path, extra = false) => {
			let listJids = Object.keys(messages);
			if (listJids.length)
				for (const jid of listJids) {
					const length = messages[jid].length;
					if (length > 100) {
						delete messages[jid];
					}
				};

			// Limit storage size
			if (chats.size >= 250) chats.clear();
			if (Object.keys(messages).length >= 300) messages = {};

			writeFileSync(path, JSON.stringify(toJSON(extra), null, 2));
		},
		readFromFile: (path) => {
			if (existsSync(path)) {
				config?.SocketConfig?.logger.debug({ path }, "reading from file");
				const jsonStr = readFileSync(path, "utf-8");
				const json = JSON.parse(jsonStr);
				fromJSON(json);
			} else
				config?.logger?.error({ path }, "path does exist");
		}
	};
};