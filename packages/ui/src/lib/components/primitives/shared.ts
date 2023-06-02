/** @internal */
export function toStartCase(str: string) {
	return str
		.split(' ')
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join(' ')
}

const isDarwin =
	typeof window === 'undefined'
		? false
		: window.navigator.userAgent.toLowerCase().indexOf('mac') > -1
const cmdKey = isDarwin ? '⌘' : 'Ctrl'
const altKey = isDarwin ? '⌥' : 'Alt'

/** @internal */
export function kbd(str: string) {
	return str
		.split(',')[0]
		.split('')
		.map((sub) => {
			const subStr = sub.replace(/\$/g, cmdKey).replace(/\?/g, altKey).replace(/!/g, '⇧')
			return subStr[0].toUpperCase() + subStr.slice(1)
		})
}

/** @internal */
export function kbdStr(str: string) {
	return (
		'— ' +
		str
			.split(',')[0]
			.split('')
			.map((sub) => {
				const subStr = sub.replace(/\$/g, cmdKey).replace(/\?/g, altKey).replace(/!/g, '⇧')
				return subStr[0].toUpperCase() + subStr.slice(1)
			})
			.join(' ')
	)
}

/** @internal */
export const getBaseUrl = () => {
	if (typeof process === 'undefined') {
		return 'http://localhost:5420'
	}

	if (process.env.NODE_ENV === 'development') {
		return 'http://localhost:3000'
	}

	if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
		return 'https://www.tldraw.com'
	}

	if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') {
		return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
	}

	return 'http://localhost:3000'
}

/** @internal */
export const BASE_URL = getBaseUrl()
