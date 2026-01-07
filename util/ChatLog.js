import { WAMessageStubType, URL_REGEX, WAProto } from "@whiskeysockets/baileys"
import { toPhoneNumber } from "./Util.js";
import { serialize } from "./Message.js";
import chalk from "chalk"
import util from "util"

/**
 * @this {import('@whiskeysockets/baileys').WASocket}
 * @param {import('..').WebMessageInfo} m 
 */
export default async function ChatLog(m) {
  let _name = await this.getName(m.sender);
  let sender = toPhoneNumber(m.sender) + (_name ? " ~" + _name : "");
  let chat = await this.getName(m.chat);
  // let ansi = '\x1b['
  let filesize =
    (m.msg
      ? m.msg.vcard
        ? m.msg.vcard?.length
        : m.msg.fileLength
          ? m.msg.fileLength.low || m.msg.fileLength
          : m.msg.axolotlSenderKeyDistributionMessage
            ? m.msg.axolotlSenderKeyDistributionMessage?.length
            : m.text
              ? m.text?.length
              : 0
      : m.text
        ? m.text.length
        : 0) || 0;
  let me = toPhoneNumber(this.user?.id);
  let types = []
  function getFutureProofMessage(message) {
    if (message?.ephemeralMessage) {
      types.push("ephemeralMessage")
      return message.ephemeralMessage
    } else if (message?.viewOnceMessage) {
      types.push("viewOnceMessage")
      return message.viewOnceMessage
    } else if (message?.documentWithCaptionMessage) {
      types.push("documentWithCaptionMessage")
      return message.documentWithCaptionMessage
    } else if (message?.viewOnceMessageV2) {
      types.push("viewOnceMessageV2")
      return message.viewOnceMessageV2
    } else if (message?.viewOnceMessageV2Extension) {
      types.push("viewOnceMessageV2Extension")
      return message.viewOnceMessageV2Extension
    } else if (message?.editedMessage) {
      types.push("editedMessage")
      return message.editedMessage
    }
  }
  let content = m.message
  for (let i = 0; i < 5; i++) {
    const inner = getFutureProofMessage(content);
    if (!inner) {
      break;
    }
    content = inner.message;
  }
  content ? types.push(Object.keys(content)[0]) : ''
  console.log(
    `
${chalk.redBright("%s")} ${chalk.black(chalk.bgYellow("%s"))} ${chalk.black(chalk.bgGreen("%s"))} ${chalk.magenta("%s [%s %sB]")}
${chalk.green("%s")} ${chalk.blueBright("to")} ${chalk.green("%s")} ${chalk.black(chalk.bgYellow("%s"))}
`.trim(),
    me + " ~" + this.user.name,
    (m.messageTimestamp
      ? new Date(1000 * (m.messageTimestamp.low || m.messageTimestamp))
      : new Date()
    ).toTimeString(),
    m.messageStubType ? WAMessageStubType[m.messageStubType] : "",
    filesize,
    filesize === 0
      ? 0
      : (
        filesize /
        1000 ** Math.floor(Math.log(filesize) / Math.log(1024))
      ).toFixed(1),
    ["", ..."KMGTP"][Math.floor(Math.log(filesize) / Math.log(1024))] || "",
    sender,
    m.chat + (chat ? " ~" + chat : ""),
    types.map(type => type
      ? type
        .replace(/message$/i, "")
        .replace("audio", content?.ptt ? "PTT" : "audio")
        .replace(/^./, (v) => v.toUpperCase())
      : "").join('')
  )
  if (m.mtype === "protocolMessage") {
    let message = m.message[types[0]]
    if (message.type !== WAProto.Message.ProtocolMessage.Type.MESSAGE_EDIT) {
      console.log(chalk.black(chalk.bgWhite(WAProto.Message.ProtocolMessage.Type[message.type])))
    }
    switch (message.type) {
      case WAProto.Message.ProtocolMessage.Type.MESSAGE_EDIT: {
      } break
      case WAProto.Message.ProtocolMessage.Type.REVOKE: {
        let key = message.key
        let m = serialize(await this.store.loadMessage(key.remoteJid, key.id), this)
        if (m) {
          ChatLog.call(this, m)
        }
      }
      default: {
        console.log(util.inspect(message, false, 99, true))
      } break
    }
  }
  // if (m.mtype === "pollUpdateMessage") {
  //     let message = m.message[types[0]]
  //     console.log(util.inspect(message, false, 99, true))
  //     const payload = Buffer.from(message.vote.encPayload)
  //     const iv = Buffer.from(message.vote.encIv)
  //     const poll = await this.store.loadMessage(message.pollCreationMessageKey.id)
  //     const secret = Buffer.from(JSON.stringify(poll.message.messageContextInfo.messageSecret), 'base64')

  //     // Assume payload is a Buffer (ciphertext + tag), iv is a Buffer, secret is a Buffer
  //     const tagLength = 16; // 128 bits (16 bytes) is standard for AES-GCM

  //     // Split payload into ciphertext and tag
  //     const ciphertext = payload.subarray(0, payload.length - tagLength);
  //     const authTag = payload.subarray(payload.length - tagLength);

  //     const aad = poll.key.id + '\x00' + poll.key.participant

  //     console.log({ iv: iv.length, secret: secret.length, payload: payload.length, aad: aad.length });
  //     console.log({ iv: iv.toString('base64'), secret: secret.toString('base64'), aad, ciphertext: ciphertext.toString('base64'), authTag: authTag.toString('base64') });

  //     const decipher = crypto.createDecipheriv('aes-256-gcm', secret, iv);
  //     decipher.setAAD(Buffer.from(aad, 'utf8'));

  //     decipher.setAuthTag(authTag);

  //     let decrypted = decipher.update(ciphertext) + decipher.final()
  //     console.log(decrypted)
  // }
  if (typeof m.text === "string" && m.text) {
    let log = m.text.replace(/\u200e+/g, "");
    let mdRegex =
      /(?<=(?:^|[\s\n])\S?)(?:([*_~])(.+?)\1|```((?:.||[\n\r])+?)```)(?=\S?(?:[\s\n]|$))/g;
    let mdFormat =
      (depth = 4) =>
        (_, type, text, monospace) => {
          let types = {
            _: "italic",
            "*": "bold",
            "~": "strikethrough",
          };
          text = text || monospace;
          let formatted =
            !types[type] || depth < 1
              ? text
              : chalk[types[type]](text.replace(mdRegex, mdFormat(depth - 1)));
          // console.log({ depth, type, formatted, text, monospace }, formatted)
          return formatted;
        };
    if (log?.length < 4096)
      log = log.replace(URL_REGEX, (url, i, text) => {
        let end = url?.length + i;
        return i === 0 ||
          end === text?.length ||
          (/^\s$/.test(text?.[end]) && /^\s$/.test(text?.[i - 1]))
          ? chalk.blueBright(url)
          : url;
      });
    log = log.replace(mdRegex, mdFormat(4));
    if (m.mentionedJid)
      for (let user of m.mentionedJid)
        log = log.replace(
          "@" + user.split`@`[0],
          chalk.blueBright("@" + (await this.getName(user))),
        );
    console.log(
      m.error != null ? chalk.red(log) : m.isCommand ? chalk.yellow(log) : log,
    );
  }
  if (m.messageStubParameters?.length)
    console.log(
      (await Promise.all(m.messageStubParameters
        .map(async (param) => {
          let jid = typeof param === "object" && param.id ? param.id : param;
          let name = await this.getName(jid);
          return chalk.gray(toPhoneNumber(jid) + (name ? " ~" + name : ""));
        })))
        .join(", "),
    );
  if (/document/i.test(m.mtype))
    console.log(`📄 ${m.msg.fileName || m.msg.displayName || "Document"}`);
  else if (/ContactsArray/i.test(m.mtype)) console.log(`👨‍👩‍👧‍👦 ${" " || ""}`);
  else if (/contact/i.test(m.mtype))
    console.log(`👨 ${m.msg.displayName || ""}`);
  else if (/audio/i.test(m.mtype)) {
    const duration = m.msg.seconds;
    console.log(
      `${m.msg.ptt ? "🎤 (PTT " : "🎵 ("}AUDIO) ${Math.floor(duration / 60)
        .toString()
        .padStart(2, 0)}:${(duration % 60).toString().padStart(2, 0)}`,
    );
  }

  console.log();
  // if (m.quoted) console.log(m.msg.contextInfo)
}