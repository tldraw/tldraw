import w from '../../../../assets/watermark.png'
import { TL_CONTAINER_CLASS } from '../../TldrawEditor'
import { getDefaultCdnBaseUrl } from '../../utils/assets'
import { Editor } from '../Editor'
import { LicenseFromKeyResult } from './LicenseManager'
const WATERMARK_FILENAME = 'watermark.png'
const WATERMARKS_FOLDER = 'watermarks'

export class WatermarkManager {
	constructor(private editor: Editor) {}

	private createWatermark() {
		const watermark = document.createElement('img')
		if (navigator.onLine) {
			watermark.src = `${getDefaultCdnBaseUrl()}/${WATERMARKS_FOLDER}/${WATERMARK_FILENAME}`
		} else {
			watermark.src = w
		}

		this.applyStyles(watermark)

		const canvas = this.getWatermarkParent()
		if (canvas) canvas.appendChild(watermark)

		return watermark
	}

	private getWatermarkParent() {
		return document.getElementsByClassName(TL_CONTAINER_CLASS)[0] as HTMLElement
	}

	private shouldShowWatermark(license: LicenseFromKeyResult) {
		if (!license.isLicenseParseable) return true
		if (!license.isDomainValid) return true
		if (license.isDevelopmentKey) return true

		if (license.isPerpetualLicenseExpired || license.isAnnualLicenseExpired) {
			if (license.isInternalLicense) {
				throw new Error('License: Internal license expired.')
			}
			return true
		}

		return false
	}

	checkWatermark(license: LicenseFromKeyResult) {
		if (!this.shouldShowWatermark(license)) return false

		this.createWatermark()

		this.editor.timers.setTimeout(() => {
			const canvas = this.getWatermarkParent()
			if (!canvas) return
			const children = [...canvas.children]

			// Ensure the watermark is still there.
			// We check this once for any naughtiness.
			// Don't be naughty.
			let watermark = children.find(
				(element) => element instanceof HTMLImageElement && element.src.includes(WATERMARK_FILENAME)
			) as HTMLImageElement

			if (!watermark) {
				watermark = this.createWatermark()
			}

			this.applyStyles(watermark)

			if (license.isLicenseParseable && license.isDevelopmentKey) {
				// After 5 seconds, in development mode (dev, staging, CI), remove.
				watermark.parentNode?.removeChild(watermark)
			}
		}, 5000)

		return true
	}

	applyStyles(watermark: HTMLImageElement) {
		watermark.style.width = '120px'
		watermark.style.setProperty('position', 'absolute', 'important')
		watermark.style.setProperty('bottom', '60px', 'important')
		watermark.style.setProperty('right', '20px', 'important')
		watermark.style.setProperty('opacity', '1', 'important')
		watermark.style.setProperty('z-index', '2147483647' /* max */, 'important')
		watermark.style.setProperty('pointer-events', 'all', 'important')
		watermark.style.setProperty('cursor', 'pointer', 'important')
		watermark.setAttribute('target', '_blank')
		watermark.onclick = () => {
			window.open('https://tldraw.dev', '_blank', 'noopener noreferrer')
		}
	}
}
