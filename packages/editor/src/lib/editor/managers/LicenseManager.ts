import { T } from '@tldraw/validate'
import nacl from 'tweetnacl'
import util from 'tweetnacl-util'

const licenseInfoValidator = T.object({
	expiry: T.number,
	company: T.string,
	hosts: T.arrayOf(T.string),
})

export type LicenseInfo = T.TypeOf<typeof licenseInfoValidator>

export type LicenseFromKeyResult =
	| {
			isLicenseValid: false
			message: string
	  }
	| {
			isLicenseValid: true
			license: LicenseInfo
			isDomainValid: boolean
			isLicenseExpired: boolean
	  }

export class LicenseManager {
	private publicKey = '3UylteUjvvOL4nKfN8KfjnTbSm6ayj23QihX9TsWPIM='
	licenseKey: LicenseFromKeyResult | null = null
	extractLicense(licenseKey: string): LicenseInfo {
		const base64License = util.decodeBase64(licenseKey)

		const decoded = nacl.sign.open(base64License, util.decodeBase64(this.publicKey))

		if (!decoded) {
			throw new Error('Invalid license')
		}
		const licenseInfo = JSON.parse(util.encodeUTF8(decoded))
		return licenseInfoValidator.validate(licenseInfo)
	}

	getLicenseFromKey(licenseKey?: string) {
		let license: LicenseInfo
		if (!licenseKey) {
			this.licenseKey = { isLicenseValid: false, message: 'No license key provided' }
			return this.shouldShowWatermark()
		}

		try {
			license = this.extractLicense(licenseKey)
		} catch (e) {
			// If the license can't be parsed, it's invalid
			this.licenseKey = { isLicenseValid: false, message: 'Invalid license key' }
			return this.shouldShowWatermark()
		}
		this.licenseKey = {
			license,
			isLicenseValid: true,
			isDomainValid: license.hosts.some(
				(host) => host.toLowerCase() === window.location.hostname.toLowerCase()
			),
			isLicenseExpired: license.expiry > Date.now(),
		}
		this.shouldShowWatermark()
	}
	shouldShowWatermark() {
		if (!this.licenseKey?.isLicenseValid) {
			console.log(this.licenseKey?.message)
			this.createWatermark()
		}
		if (this.licenseKey?.isLicenseValid && !this.licenseKey.isDomainValid) {
			console.log('Invalid domain')
			this.createWatermark()
		}
		if (this.licenseKey?.isLicenseValid && this.licenseKey.isLicenseExpired) {
			console.log('License expired')
			this.createWatermark()
		}
	}
	createWatermark() {
		const watermark = document.createElement('div')
		const canvas = document.getElementsByClassName('tldraw__editor')[0].firstChild as HTMLElement
		watermark.style.position = 'absolute'
		watermark.style.bottom = '10'
		watermark.style.right = '10'
		watermark.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'
		watermark.style.padding = '8px'
		watermark.style.fontFamily = 'Arial'
		watermark.style.fontSize = '72px'
		watermark.style.zIndex = '201'
		watermark.innerHTML = 'WATERMARK'
		if (canvas) canvas.appendChild(watermark)
	}
}
