import { atom } from 'signia'
import { App } from '../Editor'

export class DprManager {
	private _currentMM: MediaQueryList | undefined

	constructor(public app: App) {
		this.rebind()
		// Add this class's dispose method (cancel the listener) to the app's disposables
		this.app.disposables.add(this.dispose)
	}

	// Set a listener to update the dpr when the device pixel ratio changes
	rebind() {
		this.dispose()
		this._currentMM = this.getMedia()
		this._currentMM?.addEventListener('change', this.updateDevicePixelRatio)
	}

	dpr = atom<number>(
		'devicePixelRatio',
		typeof window === 'undefined' ? 1 : window.devicePixelRatio
	)

	// Get the media query list for the device pixel ratio
	getMedia() {
		// NOTE: This ignore is only for the test environment.
		/* @ts-ignore */
		if (window.matchMedia) {
			return matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
		}
	}

	// Update the device pixel ratio atom
	updateDevicePixelRatio = () => {
		this.dpr.set(window.devicePixelRatio)

		this.rebind()
	}

	// Clear the listener
	dispose = () => {
		this._currentMM?.removeEventListener('change', this.updateDevicePixelRatio)
	}
}
