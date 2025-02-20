import { plugin } from '../index.js'
import got from 'got'

plugin.add('get', {
  command: ['get'],
  async onCommand(m, { text }) {
    const res = await got(text)
    const size = res.headers['content-length']
    const type = res.headers['content-type']
    console.log(res.headers)
    if (size > 1024 * 1024 * 1024 * 512) throw 'Filesize too big'
    let answer = res.rawBody
    let messageType = 'document'
    switch (type.split('/')[0]) {
      case 'image':
      case 'video':
      case 'audio':
        messageType = type.split('/')[0]
        break
    }
    if (size > 65536 || messageType != 'text') m.reply({
      [messageType]: answer,
      metatype: type,
    })
    else m.reply(answer.toString())
  }
})

