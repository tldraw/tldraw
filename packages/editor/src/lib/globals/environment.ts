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
	// Whether the user's device has a coarse pointer. This is dynamic on many systems, especially
	// on touch-screen laptops, which will become "coarse" if the user touches the screen.
	// See https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/pointer#coarse
	isCoarsePointer: false,
})

if (typeof window !== 'undefined') {
	const mql = window.matchMedia && window.matchMedia('(any-pointer: coarse)')
	if (mql) {
		mql.addEventListener('change', () => {
			tlenvReactive.update((prev) => ({ ...prev, isCoarsePointer: mql.matches }))
		})
	}

	// Update the coarse pointer state when a pointer down event occurs. We need `capture: true`
	// here because the tldraw component itself stops propagation on pointer events it receives.
	window.addEventListener(
		'pointerdown',
		(e: PointerEvent) => {
			// when the user interacts with a mouse, we assume they have a fine pointer.
			// otherwise, we assume they have a coarse pointer.
			const isCoarseEvent = e.pointerType !== 'mouse'
			if (tlenvReactive.get().isCoarsePointer === isCoarseEvent) return
			tlenvReactive.update((prev) => ({ ...prev, isCoarsePointer: isCoarseEvent }))
		},
		{ capture: true }
	)
}

export { tlenv, tlenvReactive }
