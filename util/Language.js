import fs from 'fs'

export const Lang = {
  lang: 'id',
  langList: ['en', 'id'],
  langData: {},
  setLang(lang) {
    this.lang = lang
    this.langData = JSON.parse(fs.readFileSync(`./lang/${lang}.json`, 'utf8'))
  },
  format(type, args) {
    let curr = this.langData
    for (const key of type.split('.')) {
      if (curr && typeof curr === 'object') {
        curr = curr[key]
      } else {
        return ''
      }
    }
    return args ? curr?.replace(/\{([_0-9A-Za-z]+?)\}/g, (_, group) => {
      return args && args[group] ? args[group] : ''
    }) : curr || ''
  }
}

Lang.setLang(Lang.lang)

export default Lang