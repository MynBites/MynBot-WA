import { plugin } from '../index.js'
import Lang from '../util/Language.js'

/**
 * Menu plugin - displays available commands organized by type
 * @type {import('../types.js').PluginData}
 */
plugin.add('menu', {
  help: 'menu',
  type: 'main',
  command: ['menu', 'help', '?'],
  /**
   * Handle menu command
   * @this {import('@whiskeysockets/baileys').WASocket}
   * @param {import('../types.js').WebMessageInfo} m - The message
   * @param {import('../types.js').Options} options - Command options
   */
  onCommand(m, { prefix, args: [search] }) {
    let tags = {}
    for (let name in plugin.plugins) {
      let Plugin = plugin.plugins[name]
      if (!Plugin.type) continue
      if (search && !Plugin.type.includes(search)) continue
      tags[Plugin.type] = tags[Plugin.type] || []
      tags[Plugin.type].push({
        pname: name,
        ...(Array.isArray(Plugin.help)
          ? { usage: Plugin.help }
          : typeof Plugin.help === 'string'
            ? { usage: [Plugin.help] }
            : Plugin.help),
      })
    }
    console.log(tags)
    m.reply(
      Object.entries(tags)
        .map(([type, Help]) => {
          let text = `${type}\n`
          for (let help of Help) {
            let { pname, usage, arguments: argsInfo } = help || {}
            if (!Array.isArray(usage)) usage = [usage]

            // name = name || Lang.format(`plugins.${pname}.name`) || pname
            // description = description || Lang.format(`plugins.${pname}.description`) || ''
            argsInfo = argsInfo ? argsInfo : Lang.format(`plugins.${pname}.arguments`)
            let argsText = ''
            console.log(pname, argsInfo, usage)
            if (argsInfo) {
              for (let arg of argsInfo) {
                let types = Array.isArray(arg.type) ? arg.type.join('|') : arg.type || ''
                argsText += ` ${arg.optional ? '[' : '<'}${types?.includes('mention') ? '@' : ''}${arg.name}${arg.optional ? ']' : '>'}`
              }
            }
            for (let i in usage) {
              text += `- ${prefix}${usage[i]}${argsText}\n`
            }
          }
          return text
        })
        .join('\n\n'),
    )
  },
})
