import { plugin } from '../index.js'
import got from 'got'
import util from 'util'

plugin.add('get', {
  command: ['get'],
  async onCommand(m, { text }) {
    const res = await got(text)
    const size = res.headers['content-length']
    const type = res.headers['content-type'] || 'application/octet-stream'
    const filename = res.headers['content-disposition'] ? res.headers['content-disposition'].split('filename=')[1] : '' || 'file'
    console.log(res.headers)
    if (size > 1024 * 1024 * 1024 * 512) throw 'Filesize too big'
    let answer = res.rawBody
    let messageType = 'document'
    switch (type.split('/')[0]) {
      case 'image':
      case 'video':
      case 'audio':
      case 'text':
        messageType = type.split('/')[0]
        break
    }
    if (type.split('/')[1] === 'json') {
      messageType = 'text'
      answer = Buffer.from(util.inspect(JSON.parse(answer.toString()), true, 99, false))
    }
    if (size > 65536 || messageType != 'text') m.reply({
      [messageType]: answer,
      mimetype: type,
      filename
    })
    else m.reply(answer.toString())
  }
})

