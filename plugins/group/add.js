import plugin from '../../index.js'
import Lang from '../../util/Language.js'
import { areJidsSameUser, jidDecode, jidEncode } from '@whiskeysockets/baileys'
import { parsePhoneNumber, getNumberFrom } from 'awesome-phonenumber'
import { Permissions } from '../../util/Permissions.js'

plugin.add('group-add', {
  command: [/^(add|invite)(!{0,2})$/i],
  help: ['add', 'invite'],
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
  async onCommand(m, { args, participants }) {
    if (participants.length >= 1023) {
      throw Lang.format('plugins.group-add.arguments.0.error.group-full')
    }
    if (!args[0]) throw Lang.format('plugins.group-add.arguments.0.error.blank')
    let number = args[0].replace(/[^0-9]/g, '')
    if (!number) throw Lang.format('plugins.group-add.arguments.0.error.invalid')

    if (number.startsWith('0'))
      number = getNumberFrom(
        parsePhoneNumber(number, parsePhoneNumber('+' + jidDecode(m.sender).user).regionCode),
      ).number
    let who = jidEncode(number, 's.whatsapp.net')

    if (participants.some((p) => areJidsSameUser(p.id, who)))
      throw Lang.format('plugins.group-add.error.already-in-group')
    if (!(await this.onWhatsApp(who))?.[0]?.exists)
      throw Lang.format('plugins.group-add.error.not-registered')

    const [{ status }] = await this.groupParticipantsUpdate(m.chat, [who], 'add')
    if (status === 408) {
      throw Lang.format('plugins.group-add.error.recently-left')
    } else if (status !== 200) {
      throw Lang.format('plugins.group-add.error.unknown', { status })
    } else if (status === 403) {
      await m.reply(Lang.format('plugins.group-add.message.invite', { number }))

      const groupInviteCode = await this.groupInviteCode(m.chat)
      await this.sendMessage(who, {
        groupInvite: {
          groupJid: m.chat,
          groupName: m.pushName,
          inviteCode: groupInviteCode.code,
          inviteExpiration: groupInviteCode.expiration,
          caption: Lang.format('plugins.group-add.message.invite-caption'),
        },
      })
    }
    m.reply(Lang.format('plugins.group-add.message.success', { number }))
  },
})
