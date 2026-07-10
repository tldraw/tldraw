// N.B. We rework these Windows placeholders down below.
function getCmdKey(isDarwin: boolean) {
	return isDarwin ? '⌘' : '__CTRL__'
}

function getCtrlKey(isDarwin: boolean) {
	return isDarwin ? '⌃' : '__CTRL__'
}

function getAltKey(isDarwin: boolean) {
	return isDarwin ? '⌥' : '__ALT__'
}

/** @public */
export function kbd(str: string, isDarwin: boolean) {
	const cmdKey = getCmdKey(isDarwin)
	const ctrlKey = getCtrlKey(isDarwin)
	const altKey = getAltKey(isDarwin)

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
							.replace(/ctrl\+/g, ctrlKey)
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
				if (sub[0] === '+') return []

				let modifiedKey
				if (sub === '__CTRL__') {
					modifiedKey = 'Ctrl'
				} else if (sub === '__ALT__') {
					modifiedKey = 'Alt'
				} else {
					modifiedKey = sub[0].toUpperCase() + sub.slice(1)
				}
				return isDarwin || !index ? modifiedKey : ['+', modifiedKey]
			})
			.flat()
	)
}

/** @public */
export function kbdStr(str: string, isDarwin: boolean) {
	return '— ' + kbd(str, isDarwin).join(' ')
}
