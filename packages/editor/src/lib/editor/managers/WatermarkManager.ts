import watermarkDesktop from '../../../../assets/watermarks/watermark-desktop.svg'
import watermarkMobile from '../../../../assets/watermarks/watermark-mobile.svg'
import { TL_CONTAINER_CLASS } from '../../TldrawEditor'
import { getDefaultCdnBaseUrl } from '../../utils/assets'
import { Editor } from '../Editor'
import { LicenseFromKeyResult } from './LicenseManager'

const WATERMARK_DESKTOP_FILENAME = 'watermark-desktop.svg'
const WATERMARK_MOBILE_FILENAME = 'watermark-mobile.svg'
const WATERMARKS_FOLDER = 'watermarks'

export class WatermarkManager {
	constructor(private editor: Editor) {}

	private setWatermarkSrc(watermark: HTMLImageElement, forceLocal = false) {
		const isMobile = window.innerWidth < 840 /* PORTRAIT_BREAKPOINTS[TABLET] */

		let src = ''
		const width = isMobile ? '32px' : '120px'
		if (navigator.onLine && !forceLocal) {
			src = `${getDefaultCdnBaseUrl()}/${WATERMARKS_FOLDER}/${isMobile ? WATERMARK_MOBILE_FILENAME : WATERMARK_DESKTOP_FILENAME}`
		} else {
			src = isMobile ? watermarkMobile : watermarkDesktop
		}

		if (src !== watermark.src) {
			watermark.style.width = width
			watermark.src = src
		}
	}

	private createWatermark() {
		const watermark = document.createElement('img')
		this.setWatermarkSrc(watermark)

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

		const findWatermark = () => {
			const canvas = this.getWatermarkParent()
			if (!canvas) return
			const children = [...canvas.children]

			return children.find(
				(element) =>
					element instanceof HTMLImageElement &&
					(element.src.includes(WATERMARK_DESKTOP_FILENAME) ||
						element.src.includes(WATERMARK_MOBILE_FILENAME))
			) as HTMLImageElement
		}

		this.editor.timers.setTimeout(() => {
			// Ensure the watermark is still there.
			// We check this once for any naughtiness.
			// Don't be naughty.
			let watermark = findWatermark()

			if (!watermark) {
				watermark = this.createWatermark()
			}

			this.applyStyles(watermark)

			if (license.isLicenseParseable) {
				// After 5 seconds, in development mode (dev, staging, CI), remove.
				watermark.parentNode?.removeChild(watermark)
			}
		}, 5000)

		window.addEventListener('resize', () => {
			const watermark = findWatermark()
			watermark && this.setWatermarkSrc(watermark)
		})

		return true
	}

	applyStyles(watermark: HTMLImageElement) {
		watermark.style.setProperty('position', 'absolute', 'important')
		watermark.style.setProperty('bottom', '20px', 'important')
		watermark.style.setProperty('right', '20px', 'important')
		watermark.style.setProperty('opacity', '1', 'important')
		watermark.style.setProperty('z-index', '2147483647' /* max */, 'important')
		watermark.style.setProperty('pointer-events', 'all', 'important')
		watermark.style.setProperty('cursor', 'pointer', 'important')
		watermark.setAttribute('target', '_blank')
		watermark.onerror = () => this.setWatermarkSrc(watermark, true /* forceLocal */)
		watermark.onclick = () => {
			window.open('https://tldraw.dev', '_blank', 'noopener noreferrer')
		}
		this.setWatermarkSrc(watermark)
	}
}
