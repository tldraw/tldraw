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
		if (license.isPerpetualLicenseExpired || license.isAnnualLicenseExpired) {
			if (license.isInternalLicense) {
				throw new Error('Internal license expired.')
			}
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
				(element) => element instanceof HTMLImageElement && element.src.includes(WATERMARK_FILENAME)
			) as HTMLImageElement
			if (!watermark) {
				this.createWatermark()
			}
			this.applyStyles(watermark)
		}, 5000)
	}
	applyStyles(watermark: HTMLImageElement) {
		watermark.style.width = '120px'
		watermark.style.setProperty('position', 'absolute', 'important')
		watermark.style.setProperty('bottom', '60px', 'important')
		watermark.style.setProperty('right', '20px', 'important')
		watermark.style.setProperty('opacity', '1', 'important')
		watermark.style.setProperty('z-index', '2147483647', 'important')
	}
}
