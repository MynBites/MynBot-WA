import { areJidsSameUser } from '@whiskeysockets/baileys'
import { owner } from './ConfigLoader.js'

export const Permissions = {
  rowner: (m) =>
    owner.some((jid) => areJidsSameUser(m.sender, jid.replace(/:\d+$/, '') + '@s.whatsapp.net')),
  owner: function (m) {
    return areJidsSameUser(m.sender, this.user?.id)
  },
  admin: (m, { participants }) =>
    participants.find(
      (user) => areJidsSameUser(m.sender, user.id) || areJidsSameUser(m.sender, user.phoneNumber),
    ).admin,
  botAdmin: function (_, { participants }) {
    return participants.find(
      (user) =>
        areJidsSameUser(this.user?.id, user.id) || areJidsSameUser(this.user?.id, user.phoneNumber),
    ).admin
  },
  group: (m) => m.isGroup,
  private: (m) => !m.isGroup,
  reply: (m) => !!m.quoted,
}

export default Permissions
