import syntaxError from 'syntax-error'
import { format } from 'util'
import { plugin } from '../index.js'

const AsyncFunction = (async () => {}).constructor
function execute(code, _this, providedVariables) {
  let keys = Object.keys(providedVariables)
  let values = Object.values(providedVariables)
  let exec = AsyncFunction(...keys, code)
  return exec.apply(_this, values)
}
plugin.add('eval', {
  prefix: /^=?> /,
  command: false,
  permission: ['rowner'],
  async onCommand(m, options) {
    let { prefix, command, noPrefix } = options
    let _return
    let _syntax = ''
    let _text = (/^=/.test(prefix) ? 'return ' : '') + noPrefix
    let i = 15
    let a
    try {
      _return = await execute((command === '=>' ? 'return ' : '') + _text, this, {
        m,
        sock: this,
        conn: this,
        plugin,
        // baileys,
        print(...args) {
          if (--i < 1) return
          console.log(...args)
          return m.reply(format(...args))
        },
      })
    } catch (e) {
      let err = await syntaxError(_text, 'Execution Function', {
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true
      })
      if (err) _syntax = '```' + err + '```\n\n'
      _return = e
    } finally {
      this.sendMessage(m.chat, {text: _syntax + format(_return)}, { quoted: m })
    }
  },
})
