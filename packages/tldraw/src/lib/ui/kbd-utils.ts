import { tlenv } from '@tldraw/editor'

const cmdKey = tlenv.isDarwin ? '⌘' : 'Ctrl'
const altKey = tlenv.isDarwin ? '⌥' : 'Alt'

/** @public */
export function kbd(str: string) {
	if (str === ',') return ','

	return str
		.split(',')[0]
		.replace(/cmd\+/g, cmdKey)
		.replace(/alt\+/g, altKey)
		.replace(/shift\+/g, '⇧')
		.toUpperCase()
}
