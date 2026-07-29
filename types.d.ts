import PluginManager from '@mynbites/plugin-manager'
import {
  BaileysEventMap,
  GroupParticipant,
  GroupMetadata,
  WASocket,
  proto,
  WAMessageContent,
  MiscMessageGenerationOptions,
} from '@whiskeysockets/baileys'
import Db from 'mongodb'

type CustomPermission = (
  this: WASocket,
  message?: WebMessageInfo,
  options?: Options,
) => boolean | Promise<boolean>

type Permissions =
  | 'rowner'
  | 'owner'
  | 'admin'
  | 'botadmin'
  | 'group'
  | 'private'
  | 'announcement'
  | 'story'
  | 'reply'
  | CustomPermission

interface Options {
  prefix: string
  noPrefix: string
  match: RegExpMatchArray
  command: string
  text: string
  args: string[]

  permission: Permissions[]
  groupMetadata?: GroupMetadata
  participants?: GroupParticipant[]

  Users: Db.Collection<Db.Document>
  Chats: Db.Collection<Db.Document>

  User: Db.Document
  Chat: Db.Document
}

type PluginData = {
  prefix?: string | RegExp | (string | RegExp)[]
  command?: string | RegExp | (string | RegExp)[] | false
  permission?: Permissions[]
  priority?: number

  disableAutoReact?: boolean

  help?: string | string[]
  type?: string

  middleware?(this: WASocket, message?: WebMessageInfo, options?: Options): any
  onCommand?(this: WASocket, message?: WebMessageInfo, options?: Options): any
  onCall?(this: WASocket, event: BaileysEventMap['call']): any
  onGroupUpdate?: (this: WASocket, metadata: BaileysEventMap['groups.update']) => any
  onParticipantsUpdate?: (
    this: WASocket,
    metadata: BaileysEventMap['group-participants.update'],
  ) => any
  onFail?: (this: WASocket, message?: WebMessageInfo, options?: { reason: string } & Options) => any
}

export interface plugin extends PluginManager {
  add(name: string, options: PluginData): any
  plugins: {
    [key: string]: PluginData
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
  forward(
    jid: string,
    force: boolean,
    options: MiscMessageGenerationOptions,
  ): Promise<WebMessageInfo>
  copyNForward(
    jid: string,
    force: boolean,
    options: MiscMessageGenerationOptions,
  ): Promise<WebMessageInfo>
  cMod(
    jid: string,
    text: string,
    sender: string,
    options: MiscMessageGenerationOptions,
  ): Promise<WebMessageInfo>
  delete(): Promise<WebMessageInfo>
  react(emoji: string): Promise<WebMessageInfo>
  quoted: WebMessageInfo
  getQuotedObj(): WebMessageInfo
}
