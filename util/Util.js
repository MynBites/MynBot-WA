import { parsePhoneNumber, getNumberFrom } from 'awesome-phonenumber'
import { jidDecode } from '@whiskeysockets/baileys'
export function toPhoneNumber(jid) {
  const decoded = jidDecode(jid)
  return decoded?.user && getNumberFrom(parsePhoneNumber("+" + decoded.user), "international").number || jid
}