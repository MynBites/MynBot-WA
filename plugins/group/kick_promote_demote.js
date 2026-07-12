import plugin from '../../index.js'
import Lang from '../../util/Language.js'
import { areJidsSameUser, jidDecode, jidEncode } from '@whiskeysockets/baileys'
import { parsePhoneNumber, getNumberFrom } from 'awesome-phonenumber'
import { Permissions } from '../../util/Permissions.js'

plugin.add('group-kick-promote-demote', {
  command: /^(kick|remove|promote|demote)(!{0,2})$/i,
  help: ['kick', 'remove', 'promote', 'demote'],
  type: 'group',
  permission: [
    'group',
    'botAdmin',
    (m, { command, participants }) => {
      return Permissions[
        command.endsWith('!!') ? 'rowner' : command.endsWith('!') ? 'owner' : 'admin'
      ](m, { participants })
    },
  ],
  async onCommand(m, { command, args, participants }) {
    let who = m.mentionedJid?.[0]
    if (!who) {
      if (!args[0]) throw Lang.format('plugins.group-kick-promote-demote.arguments.0.error.blank')
      let number = args[0].replace(/[^0-9]/g, '')
      if (!number) throw Lang.format('plugins.group-kick-promote-demote.arguments.0.error.invalid')

      if (number.startsWith('0'))
        number = getNumberFrom(
          parsePhoneNumber(number, parsePhoneNumber('+' + jidDecode(m.sender).user).regionCode),
        ).number
      who = jidEncode(number, 's.whatsapp.net')
    }

    if (command !== 'demote' && areJidsSameUser(who, m.sender))
      throw Lang.format('plugins.group-kick-promote-demote.error.self-action')
    if (areJidsSameUser(who, this.user.jid))
      throw Lang.format('plugins.group-kick-promote-demote.error.bot-action')

    let user = participants.find((p) => areJidsSameUser(p.id, who))
    if (!user) throw Lang.format('plugins.group-kick-promote-demote.error.not-in-group')
    if (user.admin === 'superadmin')
      throw Lang.format('plugins.group-kick-promote-demote.error.super-admin')

    const action = command === 'promote' ? 'promote' : command === 'demote' ? 'demote' : 'remove'
    if (action === 'promote' && user.admin)
      throw Lang.format('plugins.group-kick-promote-demote.error.already-admin')
    if (action === 'demote' && !user.admin)
      throw Lang.format('plugins.group-kick-promote-demote.error.not-admin')
    await this.groupParticipantsUpdate(m.chat, [who], action)
  },
})
