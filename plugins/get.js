import { plugin } from '../index.js'
import got from 'got'

plugin.add('get', {
  command: ['get'],
  async onCommand(m, { text }) {
    let res = await got(text)
    let answer = await res.body()
    m.reply(answer)
  }
})
