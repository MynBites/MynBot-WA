import { plugin } from '../index.js'
import { prefix } from './ConfigLoader.js'
import { format } from 'util'
import Permissions from './Permissions.js'
import Lang from './Language.js'
import ChatLog from './ChatLog.js'

const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')

/**
 * @this {import('@whiskeysockets/baileys').WASocket}
 * @param {import('../types').WebMessageInfo} m
 */
export async function onMessage(m) {
  let options = { sock: this, conn: this }
  // ChatLog.call(this, m)
  if (m.isBaileys) return

  options.groupMetadata = m.isGroup ? await this.store?.fetchGroupMetadata?.(m.chat, this) : {}
  options.participants = m.isGroup ? options.groupMetadata.participants : []

  for (let name in plugin.plugins) {
    const Plugin = plugin.plugins[name]

    if (Plugin.middleware) {
      let isSkip = false
      try {
        isSkip = await Plugin.middleware.call(this, m, options)
      } catch (e) {
        console.error(e)
      }
      if (isSkip) continue
    }

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
      args,
    }

    const isAccept =
      Plugin.command instanceof RegExp // RegExp Mode?
        ? Plugin.command.test(options.command)
        : Array.isArray(Plugin.command) // Array?
          ? Plugin.command.some((command) =>
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
    const passPermission = permissions.map((permission) =>
      (typeof Plugin.permission == 'string' && permission in Permissions
        ? Permissions[permission]
        : typeof permission == 'function'
          ? permission
          : () => true
      ).call(this, m, options),
    )
    console.log(
      'Permission:',
      passPermission,
      'for',
      options.command,
      'from',
      m.sender,
      'in',
      m.chat,
    )
    const isNotPass = passPermission.findIndex((p) => p == false)
    if (isNotPass > -1) {
      const reason = permissions[isNotPass]
      const onFail =
        Plugin.onFail ||
        (async (m) => {
          await m.react('❌')
          await m.reply(
            Lang.format('permission.denied', {
              reason: Lang.format(`permission.reason.${reason}`) || reason,
            }),
          )
        })
      await onFail?.call(this, m, { ...options, reason }).catch(() => {})
      continue
    }
    let isError = false
    try {
      await m.react('⏳')
      await Plugin.onCommand?.call(this, m, options)
    } catch (e) {
      isError = e
      m.reply(format(e))
      console.error(e)
    } finally {
      await m.react(isError ? '❌' : '✅')
    }
  }
  ChatLog.call(this, m)
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
