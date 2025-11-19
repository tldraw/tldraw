import { atom } from '@tldraw/state'

/**
 * An object that contains information about the current device and environment.
 * This object is not reactive and will not update automatically when the environment changes,
 * so only include values that are fixed, such as the user's browser and operating system.
 *
 * @public
 */
const tlenv = {
	isSafari: false,
	isIos: false,
	isChromeForIos: false,
	isFirefox: false,
	isAndroid: false,
	isWebview: false,
	isDarwin: false,
	hasCanvasSupport: false,
}

if (typeof window !== 'undefined') {
	if ('navigator' in window) {
		tlenv.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
		tlenv.isIos = !!navigator.userAgent.match(/iPad/i) || !!navigator.userAgent.match(/iPhone/i)
		tlenv.isChromeForIos = /crios.*safari/i.test(navigator.userAgent)
		tlenv.isFirefox = /firefox/i.test(navigator.userAgent)
		tlenv.isAndroid = /android/i.test(navigator.userAgent)
		tlenv.isDarwin = window.navigator.userAgent.toLowerCase().indexOf('mac') > -1
	}
	tlenv.hasCanvasSupport = 'Promise' in window && 'HTMLCanvasElement' in window
}

/**
 * An atom that contains information about the current device and environment.
 * This object is reactive and will update automatically when the environment changes.
 * Use it for values that may change over time, such as the pointer type.
 *
 * @public
 */
const tlenvReactive = atom('tlenvReactive', {
	isCoarsePointer: false,
})

const disposables: (() => void)[] = []

if (typeof window !== 'undefined') {
	const mql = window.matchMedia && window.matchMedia('(any-pointer: coarse)')
	if (mql) {
		function handleMediaQueryChange() {
			tlenvReactive.update((prev) => ({ ...prev, isCoarsePointer: mql.matches }))
		}
		mql.addEventListener('change', handleMediaQueryChange)
		disposables.push(() => mql.removeEventListener('change', handleMediaQueryChange))
	}
}

function dispose() {
	disposables.forEach((dispose) => dispose())
	disposables.length = 0
}

export { dispose, tlenv, tlenvReactive }
