import { proto } from '@whiskeysockets/baileys'

/**
 * 
 * @param {proto.import('..').WebMessageInfo} m 
 */
export default function (m) {
    console.log(new Date(m.messageTimestamp?.toNumber() * 1000).toLocaleString('id-ID'))
    console.log(`<${m.sender}> ${m.text}`)
}