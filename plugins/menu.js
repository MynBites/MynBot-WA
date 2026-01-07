import { plugin } from '../index.js'

plugin.add('menu', {
  help: ['menu'],
  type: 'main',
  command: ['menu', 'help', '?'],
  onCommand(m, { prefix }) {
    let tags = {}
    for (let name in plugin.plugins) {
      let Plugin = plugin.plugins[name]
      if (!Plugin.type || !Plugin.help) continue
      tags[Plugin.type] = tags[Plugin.type] || []
      tags[Plugin.type].push(...(Array.isArray(Plugin.help) ? Plugin.help : [Plugin.help]).map(v => (Plugin.prefix ? '' : prefix) + v))
    }
    m.reply(Object.entries(tags).map(([type, help]) => `${type}\n${help.map(v => `- ${v}`).join('\n')}`).join('\n\n'))
  }
})
