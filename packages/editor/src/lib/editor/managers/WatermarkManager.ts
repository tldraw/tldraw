import { releaseDates } from '../../../version'
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
		if (!license.isLicenseValid) {
			return true
		}
		if (!license.isDomainValid) {
			return true
		}
		// We always show a watermark for expired internal licenses
		if (license.isInternalLicense && license.isLicenseExpired) {
			return true
		}
		if (license.isPerpetualLicense) {
			const expiryDate = license.expiryDate
			const expiration = new Date(
				expiryDate.getFullYear(),
				expiryDate.getMonth(),
				expiryDate.getDate() + 1 // Add 1 day to include the expiration day
			)
			const dates = {
				major: new Date(releaseDates.major),
				minor: new Date(releaseDates.minor),
			}
			// We allow patch releases, but the major and minor releases should be within the expiration date
			if (dates.major > expiration || dates.minor > expiration) {
				return true
			}
		}
		if (license.isAnnualLicense && license.isLicenseExpired) {
			return true
		}
		return false
	}

	checkWatermark(license: LicenseFromKeyResult) {
		if (!this.shouldShowWatermark(license)) return
		this.createWatermark()
		this.editor.timers.setTimeout(() => {
			const canvas = this.getWatermarkParent()
			if (!canvas) return
			const children = [...canvas.children]
			const watermark = children.find(
				(element) => element.innerHTML === 'tldraw.dev'
			) as HTMLAnchorElement
			if (!watermark) {
				this.createWatermark()
			}
			this.applyStyles(watermark)
		}, 5000)
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
		watermark.style.setProperty('z-index', '99999', 'important')
		watermark.innerHTML = 'tldraw.dev'
		watermark.href = 'https://tldraw.dev'
	}
}
