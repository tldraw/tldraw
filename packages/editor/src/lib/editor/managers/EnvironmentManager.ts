import { Editor } from '../Editor'

export class EnvironmentManager {
	constructor(public editor: Editor) {
		if (typeof window !== 'undefined' && 'navigator' in window) {
			this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
			this.isIos = !!navigator.userAgent.match(/iPad/i) || !!navigator.userAgent.match(/iPhone/i)
			this.isChromeForIos = /crios.*safari/i.test(navigator.userAgent)
			this.isFirefox = /firefox/i.test(navigator.userAgent)
			this.isAndroid = /android/i.test(navigator.userAgent)
		} else {
			this.isSafari = false
			this.isIos = false
			this.isChromeForIos = false
			this.isFirefox = false
			this.isAndroid = false
		}
	}

	/**
	 * Whether the editor is running in Safari.
	 *
	 * @public
	 */
	readonly isSafari: boolean

	/**
	 * Whether the editor is running on iOS.
	 *
	 * @public
	 */
	readonly isIos: boolean

	/**
	 * Whether the editor is running on iOS.
	 *
	 * @public
	 */
	readonly isChromeForIos: boolean

	/**
	 * Whether the editor is running on Firefox.
	 *
	 * @public
	 */
	readonly isFirefox: boolean

	/**
	 * Whether the editor is running on Android.
	 *
	 * @public
	 */
	readonly isAndroid: boolean
}
