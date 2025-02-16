import { plugin } from '../index.js'

plugin.add('menu', {
  command: ['menu', 'help', '?'],
  onCommand(m) {
    m.reply('Belum ada menu')
  }
})