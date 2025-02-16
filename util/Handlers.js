import { plugin } from '../index.js'
import { prefix } from './ConfigLoader.js'

const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')

/**
 * @this {import('@whiskeysockets/baileys').WASocket}
 * @param {import('../types').WebMessageInfo} m
 */
export function onMessage(m) {
  let options = {}
  console.log(m.sender, m.text)
  
  if (m.isBaileys) return

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

    console.log(Plugin, options, isAccept)
    if (!isAccept) continue
    Plugin.onCommand?.call(this, m, options)
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
