import { areJidsSameUser } from '@whiskeysockets/baileys'
import { plugin } from '../index.js'
import { prefix, owner } from './ConfigLoader.js'
import { format } from 'util'
import Permissions from './Permissions.js'
import Lang from './Language.js'

const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')

/**
 * @this {import('@whiskeysockets/baileys').WASocket}
 * @param {import('../types').WebMessageInfo} m
 */
export async function onMessage(m) {
  let options = {}
  console.log(m.sender, m.text)

  if (m.isBaileys) return

  options.groupMetadata = m.isGroup ? await this.groupMetadata(m.chat) : {}
  options.participants = m.isGroup ? options.groupMetadata.participants : []

  for (let name in plugin.plugins) {
    const Plugin = plugin.plugins[name]

    const _prefix = Plugin.prefix ? Plugin.prefix : prefix
    options.match = (
      _prefix instanceof RegExp // RegExp Mode?
        ? [[_prefix.exec(m.text), _prefix]]
        : Array.isArray(_prefix) // Array?
          ? _prefix.map((p) => {
            let re =
              p instanceof RegExp // RegExp in Array?
                ? p
                : new RegExp(str2Regex(p))
            return [re.exec(m.text), re]
          })
          : typeof _prefix === 'string' // String?
            ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]]
            : [[[], new RegExp()]]
    ).find((p) => p[1])
    options.prefix = (options.match[0] || '')[0]

    if (!options.prefix) continue
    options.noPrefix = m.text.replace(options.prefix, '')
    let [command, ...args] = options.noPrefix.trim().split` `.filter((v) => v)
    args = args || []
    const _args = options.noPrefix.trim().split` `.slice(1)
    options.text = _args.join` `
    options.command = (command || '').toLowerCase()

    options = {
      ...options,
      args
    }

    const isAccept =
      Plugin.command instanceof RegExp // RegExp Mode?
        ? Plugin.command.test(options.command)
        : Array.isArray(Plugin.command) // Array?
          ? Plugin.command
            .some((command) =>
              command instanceof RegExp // RegExp in Array?
                ? command.test(options.command)
                : command == options.command,
            )
          : typeof Plugin.command == 'string' // String?
            ? Plugin.command.split(' ')[0] == options.command
            : typeof Plugin.command == 'boolean'
              ? Plugin.command == false
              : false

    if (!isAccept) continue
    const permissions = Array.isArray(Plugin.permission) ? Plugin.permission : [Plugin.permission]
    const passPermission = permissions.map(permission => (typeof Plugin.permission == 'string' && permission in Permissions ? Permissions[permission] : typeof permission == 'function' ? permission : () => true).call(this, m, options))
    const isNotPass = passPermission.findIndex((p) => p == false)
    if (isNotPass > -1) {
      const reason = permissions[isNotPass]
      const onFail = Plugin.onFail || (m => {
        m.react('❌')
        m.reply(
          Lang.format('permission.denied', {
            reason: Lang.format(`permission.reason.${reason}`) || reason
          })
        )
      })
      onFail?.call(this, m, { ...options, reason })
      continue
    }
    try {
      m.react('⏳')
      await Plugin.onCommand?.call(this, m, options)
      m.react('✅')
    } catch (e) {
      m.react('❌')
      m.reply(format(e))
      console.error(e)
    }
  }
}

/**
 * @this {import('@whiskeysockets/baileys').WASocket}
 * @param {import('@whiskeysockets/baileys').BaileysEventMap['call']} content
 */
export function onCall(content) {
  for (let name in plugin.plugins) {
    const Plugin = plugin.plugins[name]
    Plugin.onCall?.call(this, content)
  }
}

/**
 * @this {import('@whiskeysockets/baileys').WASocket}
 * @param {import('@whiskeysockets/baileys').BaileysEventMap['groups.update']} content
 */
export function onGroupUpdate(content) {
  for (let name in plugin.plugins) {
    const Plugin = plugin.plugins[name]
    Plugin.onGroupUpdate?.call(this, content)
  }
}

/**
 * @this {import('@whiskeysockets/baileys').WASocket}
 * @param {import('@whiskeysockets/baileys').BaileysEventMap['group-participants.update']} content
 */
export function onParticipantsUpdate(content) {
  for (let name in plugin.plugins) {
    const Plugin = plugin.plugins[name]
    Plugin.onParticipantsUpdate?.call(this, content)
  }
}
