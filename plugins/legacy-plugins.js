import { plugin } from '../index.js'
import path from 'path'

const legacyFolder = path.resolve(path.join(import.meta.dirname, 'legacy'))

plugin.removeAllListeners('load')
plugin.on('load', ({ file, folder, data }) => {
  if (!folder.startsWith(legacyFolder)) return
  const transformed = {
    ...data,
    permission: [],
    preMessage: data.before,
    preCommand: data.all,
    onCommand: data ? function (m, options) {
      return data.call(this, m, { ...options, conn: this, sock: this })
    } : undefined,
    postCommand: data.after
  }
  if (data.rowner) transformed.permission.push('rowner')
  if (data.owner) transformed.permission.push('rowner')
  if (data.prems) transformed.permission.push('premium')
  if (data.group) transformed.permission.push('group')
  if (data.private) transformed.permission.push('private')
  plugin.add('legacy/' + file, transformed)
  console.log(transformed)
})
plugin.deletePluginFolder(legacyFolder)
plugin.addPluginFolder(legacyFolder, true)