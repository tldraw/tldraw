import { tlenv } from '@tldraw/editor'

/*!
 * `splitKbd` is adapted from hotkeys-js.
 *
 * MIT License: https://github.com/jaywcjlove/hotkeys-js/blob/master/LICENSE
 * Copyright (c) 2015-present, Kenny Wong
 * Copyright (c) 2011-2013 Thomas Fuchs (https://github.com/madrobby/keymaster)
 * Source: https://github.com/jaywcjlove/hotkeys-js
 */

/** @public */
export function kbd(str: string) {
	// N.B. We rework these Windows placeholders down below.
	const cmdKey = tlenv.isDarwin ? '⌘' : '__CTRL__'
	const ctrlKey = tlenv.isDarwin ? '⌃' : '__CTRL__'
	const altKey = tlenv.isDarwin ? '⌥' : '__ALT__'
	const shiftKey = tlenv.isDarwin ? '⇧' : '__SHIFT__'

	return (
		(splitKbd(str)[0] ?? '')
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
							.replace(/shift\+/g, shiftKey)
							// Backwards compatibility with the old system.
							.replace(/\$/g, cmdKey)
							.replace(/\?/g, altKey)
							.replace(/!/g, shiftKey)
							.match(/__CTRL__|__ALT__|__SHIFT__|./g) || []
			)
			.flat()
			.map((sub, index) => {
				if (sub[0] === '+') return []

				let modifiedKey
				if (sub === '__CTRL__') {
					modifiedKey = 'Ctrl'
				} else if (sub === '__ALT__') {
					modifiedKey = 'Alt'
				} else if (sub === '__SHIFT__') {
					modifiedKey = 'Shift'
				} else {
					modifiedKey = sub[0].toUpperCase() + sub.slice(1)
				}
				return tlenv.isDarwin || !index ? modifiedKey : ['+', modifiedKey]
			})
			.flat()
	)
}

// Split a kbd string on commas, treating an empty entry produced by "x,," as a literal
// trailing comma on the previous entry.
/** @internal */
export function splitKbd(key: string) {
	if (!key) return []
	const keys = key.split(',')
	let index = keys.lastIndexOf('')

	for (; index >= 0; ) {
		keys[index - 1] += ','
		keys.splice(index, 1)
		index = keys.lastIndexOf('')
	}

	return keys
}

/** @public */
export function kbdStr(str: string) {
	return '— ' + kbd(str).join(' ')
}
