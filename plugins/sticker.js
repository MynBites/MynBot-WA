import { plugin } from '../index.js'
import { sticker, addExif } from '../util/Sticker.js'
import { Sticker } from '../util/ConfigLoader.js'
import Lang from '../util/Language.js'

plugin.add('sticker', {
  help: ['sticker'],
  type: 'tools',
  command: /^(stic?ker|s)$/i,
  async onCommand(m) {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || q.mediaType || "";
    if (!/image|video/.test(mime)) throw Lang.format("plugins.sticker.invalid");
    const buffer = await q.download();
    const packname = Sticker.packname || (await this.getName(q.sender));
    const author =  (await this.getName(m.sender)) || Sticker.author;
    if (mime === "image/webp") {
      return await m.reply({ sticker: await addExif(buffer, packname, author, [], Sticker.extra) });
    }
    let stiker = await sticker(buffer, null, packname, author, [], Sticker.extra);
    await m.reply({ sticker: stiker });
  }
})
