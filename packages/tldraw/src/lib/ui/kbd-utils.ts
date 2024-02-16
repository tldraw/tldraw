const isDarwin =
	typeof window === 'undefined'
		? false
		: window.navigator.userAgent.toLowerCase().indexOf('mac') > -1
const cmdKey = isDarwin ? '⌘' : 'Ctrl'
const altKey = isDarwin ? '⌥' : 'Alt'

/** @public */
export function kbd(str: string) {
	return str
		.split(',')[0]
		.split('')
		.map((sub) => {
			const subStr = sub.replace(/\$/g, cmdKey).replace(/\?/g, altKey).replace(/!/g, '⇧')
			return subStr[0].toUpperCase() + subStr.slice(1)
		})
}

/** @public */
export function kbdStr(str: string) {
	return '— ' + kbd(str).join(' ')
}
