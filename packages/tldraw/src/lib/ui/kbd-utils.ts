import { tlenv } from '@tldraw/editor'

// N.B. We rework these Windows placeholders down below.
const cmdKey = tlenv.isDarwin ? '⌘' : '__CTRL__'
const altKey = tlenv.isDarwin ? '⌥' : '__ALT__'

/** @public */
export function kbd(str: string) {
	if (str === ',') return [',']

	return (
		str
			.split(',')[0]
			// If the string contains [[Tab]], we don't split these up
			// as they're meant to be atomic.
			.split(/(\[\[[^\]]+\]\])/g)
			.map((s) =>
				s.startsWith('[[')
					? s.replace(/[[\]]/g, '')
					: s
							.replace(/cmd\+/g, cmdKey)
							.replace(/ctrl\+/g, cmdKey)
							.replace(/alt\+/g, altKey)
							.replace(/shift\+/g, '⇧')
							// Backwards compatibility with the old system.
							.replace(/\$/g, cmdKey)
							.replace(/\?/g, altKey)
							.replace(/!/g, '⇧')
							.match(/__CTRL__|__ALT__|./g) || []
			)
			.flat()
			.map((sub, index) => {
				if (sub === '__CTRL__') return 'Ctrl'
				if (sub === '__ALT__') return 'Alt'
				const modifiedKey = sub[0].toUpperCase() + sub.slice(1)
				return tlenv.isDarwin || !index ? modifiedKey : ['+', modifiedKey]
			})
			.flat()
	)
}

/** @public */
export function kbdStr(str: string) {
	return '— ' + kbd(str).join(' ')
}
