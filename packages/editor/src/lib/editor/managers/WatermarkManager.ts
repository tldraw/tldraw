import { TL_CONTAINER_CLASS } from '../../TldrawEditor'
import { Editor } from '../Editor'
import { LicenseFromKeyResult } from './LicenseManager'

export class WatermarkManager {
	constructor(private editor: Editor) {}

	private createWatermark() {
		const watermark = document.createElement('a')
		this.applyStyles(watermark)
		const canvas = this.getWatermarkParent()

		if (canvas) canvas.appendChild(watermark)
	}

	private getWatermarkParent() {
		return document.getElementsByClassName(TL_CONTAINER_CLASS)[0] as HTMLElement
	}

	private shouldShowWatermark(license: LicenseFromKeyResult) {
		if (!license.isLicenseParseable) return true
		if (!license.isDomainValid) return true
		if (license.isLicenseExpired) return true
		if (license.isDevelopmentKey) return true

		return false
	}

	checkWatermark(license: LicenseFromKeyResult) {
		if (!this.shouldShowWatermark(license)) return false

		this.createWatermark()

		this.editor.timers.setTimeout(() => {
			const canvas = this.getWatermarkParent()
			if (!canvas) return
			const children = [...canvas.children]
			let watermark = children.find(
				(element) => element.innerHTML === 'tldraw.dev'
			) as HTMLAnchorElement

			// Ensure the watermark is still there.
			// We check this once for any naughtiness.
			// Don't be naughty.
			if (!watermark) {
				this.createWatermark()
				watermark = children.find(
					(element) => element.innerHTML === 'tldraw.dev'
				) as HTMLAnchorElement
			}

			this.applyStyles(watermark)

			if (license.isLicenseParseable && license.isDevelopmentKey) {
				// After 5 seconds, in development mode (dev, staging, CI), remove.
				watermark.parentNode?.removeChild(watermark)
			}
		}, 5000)

		return true
	}

	applyStyles(watermark: HTMLAnchorElement) {
		const watermarkStyle = {
			backgroundColor: 'rgb(0, 0, 0)',
			color: 'white',
			padding: '12px',
			fontFamily: 'Arial',
			fontSize: '20px',
		}

		Object.assign(watermark.style, watermarkStyle)
		watermark.style.setProperty('position', 'absolute', 'important')
		watermark.style.setProperty('bottom', '60px', 'important')
		watermark.style.setProperty('right', '20px', 'important')
		watermark.style.setProperty('opacity', '1', 'important')
		watermark.style.setProperty('z-index', '2147483647' /* max */, 'important')
		watermark.style.setProperty('pointer-events', 'all', 'important')
		watermark.innerHTML = 'tldraw.dev'
		watermark.setAttribute('target', '_blank')
		watermark.href = 'https://tldraw.dev'
	}
}
