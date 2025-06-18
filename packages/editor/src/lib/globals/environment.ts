/**
 * An object that contains information about the current device and environment.
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

if (typeof window !== 'undefined' && 'navigator' in window) {
	tlenv.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
	tlenv.isIos = !!navigator.userAgent.match(/iPad/i) || !!navigator.userAgent.match(/iPhone/i)
	tlenv.isChromeForIos = /crios.*safari/i.test(navigator.userAgent)
	tlenv.isFirefox = /firefox/i.test(navigator.userAgent)
	tlenv.isAndroid = /android/i.test(navigator.userAgent)
	tlenv.isDarwin = window.navigator.userAgent.toLowerCase().indexOf('mac') > -1
	tlenv.hasCanvasSupport =
		typeof window !== 'undefined' && 'Promise' in window && 'HTMLCanvasElement' in window
}

export { tlenv }
