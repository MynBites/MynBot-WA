import PluginManager from '@mynbites/plugin-manager'
import {
  BaileysEventMap,
  GroupMetadata,
  WASocket,
  proto,
  WAMessageContent,
  MiscMessageGenerationOptions,
} from '@whiskeysockets/baileys'

type CustomPermission = (
  this: ThisParameterType<PluginData['onCommand']>,
  ...args: Parameters<PluginData['onCommand']>
) => boolean
type Permissions = 'rowner' | 'owner' | 'admin' | 'botadmin' | 'group' | 'private' | 'announcement' | 'story' | 'reply' | CustomPermission

interface Options {
  prefix: string
  noPrefix: string
  command: string
  text: string
  args: string[]

  groupMetadata: GroupMetadata
  permission: Permissions[]
}

type PluginData = {
  prefix?: string | RegExp | PluginData.prefix[]
  command?: string | RegExp | PluginData.command[] | false
  permission: Permissions[]
  priority?: number

  help?: string[]
  type?: string

  onCommand(this: WASocket, message?: WebMessageInfo, options?: Options): any
  onCall(this: WASocket, event: BaileysEventMap['call']): any
  onGroupUpdate: (this: WASocket, metadata: BaileysEventMap['groups.update']) => any
  onParticipantsUpdate: (
    this: WASocket,
    metadata: BaileysEventMap['group-participants.update'],
  ) => any
}

export interface plugin extends PluginManager {
  add(name: string, options: PluginData): any
  plugins: {
    [string]: PluginData
  }
}

export default plugin

export interface WebMessageInfo extends proto.WebMessageInfo {
  conn: WASocket
  id: string
  isBaileys: boolean
  chat: string
  isGroup: boolean
  sender: string
  fromMe: boolean
  mtype: keyof proto.IMessage
  msg: WAMessageContent
  mediaMessage: WAMessageContent
  mediaType: keyof proto.IMessage
  _text: string
  text: string
  mentionedJid: proto.ContextInfo['mentionedJid']
  name: string
  download(saveToFile: boolean): Buffer
  reply(text: string, chatId: string, options: MiscMessageGenerationOptions): any
  copy(): WebMessageInfo
  forward(jid: string, force: boolean, options: MiscMessageGenerationOptions): Promise<WebMessageInfo>
  copyNForward(jid: string, force: boolean, options: MiscMessageGenerationOptions): Promise<WebMessageInfo>
  cMod(jid: string, text: string, sender: string, options: MiscMessageGenerationOptions): Promise<WebMessageInfo>
  delete(): Promise<WebMessageInfo>
  react(emoji: string): Promise<WebMessageInfo>
  quoted: WebMessageInfo
  getQuotedObj(): WebMessageInfo
}
