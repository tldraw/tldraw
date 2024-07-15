import watermarkDesktop from '../../../../assets/watermarks/watermark-desktop.svg'
import { Editor } from '../Editor'
import { LicenseFromKeyResult } from './LicenseManager'

export const WATERMARK_DESKTOP_PATH = 'watermarks/watermark-desktop.svg'

export class WatermarkManager {
	constructor(private editor: Editor) {}

	private _debugForceLocal = false

	private setWatermarkSrc(watermark: HTMLImageElement) {
		const src = watermarkDesktop
		if (src !== watermark.src) {
			watermark.src = src
		}
	}

	private createWatermark(opts: { doReplace?: boolean } = {}) {
		const { doReplace = false } = opts

		let watermark = this.findWatermark()

		if (watermark) {
			if (doReplace) {
				watermark.remove()
			} else {
				return watermark
			}
		}

		watermark = document.createElement('img')
		this.applyStyles(watermark)
		const canvas = this.getWatermarkParent()
		if (canvas) canvas.appendChild(watermark)
		return watermark
	}

	private getWatermarkParent() {
		return this.editor.getContainer().querySelector('.tl-canvas')
	}

	private shouldShowWatermark(license: LicenseFromKeyResult) {
		if (!license.isLicenseParseable) return true
		if (!license.isDomainValid && !license.isDevelopment) return true

		if (license.isPerpetualLicenseExpired || license.isAnnualLicenseExpired) {
			if (license.isInternalLicense) {
				throw new Error('License: Internal license expired.')
			}
			return true
		}

		return false
	}

	private findWatermark() {
		const canvas = this.getWatermarkParent()
		if (!canvas) return
		const children = [...canvas.children]

		return children.find(
			(element) =>
				element instanceof HTMLImageElement && element.src.includes(WATERMARK_DESKTOP_PATH)
		) as HTMLImageElement
	}

	showWatermark() {
		this.createWatermark()

		window.addEventListener('resize', () => {
			// We need to replace the watermark to ensure the correct size is shown.
			const watermark = this.createWatermark({ doReplace: true })
			watermark && this.setWatermarkSrc(watermark)
		})

		this.editor.timers.setTimeout(
			() => {
				// Ensure the watermark is still there.
				// We check this once for any naughtiness.
				// Don't be naughty.
				const watermark = this.createWatermark()
				this.applyStyles(watermark)
			},
			5000 + Math.random() * 1000
		)
	}

	checkWatermark(license: LicenseFromKeyResult) {
		if (!this.shouldShowWatermark(license)) {
			return false
		}
		this.showWatermark()
		return true
	}

	applyStyles(watermark: HTMLImageElement) {
		watermark.style.setProperty('position', 'absolute', 'important')
		watermark.style.setProperty('bottom', '8px', 'important')
		watermark.style.setProperty('right', '8px', 'important')
		watermark.style.setProperty('height', '32px', 'important')
		watermark.style.setProperty('width', '96px', 'important')
		watermark.style.setProperty('opacity', '1', 'important')
		watermark.style.setProperty('z-index', '2147483647' /* max */, 'important')
		watermark.style.setProperty('pointer-events', 'all', 'important')
		watermark.style.setProperty('cursor', 'pointer', 'important')
		watermark.setAttribute('target', '_blank')
		watermark.onerror = () => {
			// In case we're online but it's blocking this specific request,
			// we still fallback to the local watermark.
			this._debugForceLocal = true
			this.setWatermarkSrc(watermark)
			watermark.onerror = null
		}
		watermark.onclick = () => {
			window.open('https://tldraw.dev', '_blank', 'noopener noreferrer')
		}
		this.setWatermarkSrc(watermark)
	}
}
