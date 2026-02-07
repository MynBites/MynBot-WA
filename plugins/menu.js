import { plugin } from '../index.js'

/**
 * Menu plugin - displays available commands organized by type
 * @type {import('../types.js').PluginData}
 */
plugin.add('menu', {
  help: ['menu'],
  type: 'main',
  command: ['menu', 'help', '?'],
  /**
   * Handle menu command
   * @this {import('@whiskeysockets/baileys').WASocket}
   * @param {import('../types.js').WebMessageInfo} m - The message
   * @param {import('../types.js').Options} options - Command options
   */
  onCommand(m, { prefix }) {
    let tags = {}
    for (let name in plugin.plugins) {
      let Plugin = plugin.plugins[name]
      if (!Plugin.type || !Plugin.help) continue
      tags[Plugin.type] = tags[Plugin.type] || []
      tags[Plugin.type].push(
        ...(Array.isArray(Plugin.help) ? Plugin.help : [Plugin.help]).map(
          (v) => (Plugin.prefix ? '' : prefix) + v,
        ),
      )
    }
    m.reply(
      Object.entries(tags)
        .map(([type, help]) => `${type}\n${help.map((v) => `- ${v}`).join('\n')}`)
        .join('\n\n'),
    )
  },
})
