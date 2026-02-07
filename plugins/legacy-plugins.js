import { plugin } from '../index.js'
import path from 'path'
import Permissions from '../util/Permissions.js'

const legacyFolder = path.resolve(path.join(import.meta.dirname, 'legacy'))
const PermissionLegacyMap = {
  isROwner: 'rowner',
  isOwner: 'owner',
  isAdmin: 'admin',
  isBotAdmin: 'botAdmin',
  isGroup: 'group',
  isPrivate: 'private',
}

plugin.removeAllListeners('load')
plugin.on('load', ({ file, folder, data }) => {
  if (!folder.startsWith(legacyFolder)) return
  const transformed = {
    ...data,
    permission: [],
    preMessage: data.before,
    preCommand: data.all,
    onCommand: data
      ? function (m, options) {
          legacyOptions = {}
          for (const [key, value] of Object.entries(PermissionLegacyMap)) {
            if (data[value]) legacyOptions[key] = Permissions[value].call(this, m, options)
          }
          return data.call(this, m, { ...options, legacyOptions, conn: this, sock: this })
        }
      : undefined,
    postCommand: data.after,
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
