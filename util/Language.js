import fs from 'fs'
import path from 'path'

export const Lang = {
  lang: 'id-ID',
  langList: ['en-US', 'id-ID'],
  langData: {},
  _watchFile: null,
  getLanguageFilePath(lang) {
    return path.join(import.meta.dirname, `../lang/${lang}.json`)
  },
  loadLanguageFile() {
    if (!this.langList.includes(this.lang)) {
      throw new Error(`Language "${this.lang}" is not supported.`)
    }
    try {
      return (this.langData[this.lang] = JSON.parse(
        fs.readFileSync(this.getLanguageFilePath(this.lang), 'utf8'),
      ))
    } catch (err) {
      console.error(`Failed to load language file for "${this.lang}":`, err.message)
      return this.langData[this.lang]
    }
  },
  setLang(lang) {
    this.lang = lang
    this.loadLanguageFile()
    this._watchFile?.close()
    this._watchFile = fs.watch(
      this.getLanguageFilePath(this.lang),
      { persistent: false },
      (eventType) => {
        if (eventType === 'change') {
          this.loadLanguageFile()
        }
      },
    )
  },
  format(type, args, forceLang) {
    let curr = forceLang
      ? this.langData[forceLang]
      : this.langData[this.lang] || this.langData[this.lang]
    for (const key of type.split('.')) {
      if (curr && typeof curr === 'object') {
        curr = curr[key]
      } else {
        return ''
      }
    }
    return args
      ? curr?.replace(/\{([_0-9A-Za-z]+?)\}/g, (_, group) => {
          return group in args ? args[group] || '' : _
        })
      : curr || ''
  },
}

Lang.setLang(Lang.lang)

export default Lang
