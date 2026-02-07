import { plugin } from '../index.js'
import Lang from '../util/Language.js'

plugin.add('q', {
  help: ['q'],
  type: 'tools',
  command: 'q',
  permission: 'reply',
  async onCommand(m) {
    const q = await m.getQuotedObj()
    if (!q.quoted) throw Lang.format('check.unquoted')
    q.quoted.forward(m.chat)
  },
})
