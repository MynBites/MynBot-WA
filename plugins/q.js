import { plugin } from '../index.js'

plugin.add('q', {
	help: ['q'],
	tags: 'tools',
	command: 'q',
	async onCommand(m) {
		if (!m.quoted) throw 'Please reply a message'
		const q = await m.getQuotedObj()
		if (!q.quoted) throw 'Replied message doesn\'t contain reply'
		q.quoted.forward(m.chat)
	}
})
