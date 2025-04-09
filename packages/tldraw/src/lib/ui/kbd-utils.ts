import { tlenv } from '@tldraw/editor'

const cmdKey = tlenv.isDarwin ? '⌘' : 'Ctrl'
const altKey = tlenv.isDarwin ? '⌥' : 'Alt'

/** @public */
export function kbd(str: string) {
	if (str === ',') return [',']

	return str
		.split(',')[0]
		.split(/(\[\[[^\]]+\]\])/g)
		.map((s) => (s.startsWith('[[') ? s.replace(/[[\]]/g, '') : s.split('')))
		.flat()
		.map((sub) => {
			const subStr = sub.replace(/\$/g, cmdKey).replace(/\?/g, altKey).replace(/!/g, '⇧')
			return subStr[0].toUpperCase() + subStr.slice(1)
		})
}

/** @public */
export function kbdStr(str: string) {
	return '— ' + kbd(str).join(' ')
}
