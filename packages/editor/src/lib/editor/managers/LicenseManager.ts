import { T } from '@tldraw/validate'
import nacl from 'tweetnacl'
import util from 'tweetnacl-util'
import { Editor } from '../Editor'
import { WatermarkManager } from './WatermarkManager'

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
	watermarkManager: WatermarkManager
	constructor(private editor: Editor) {
		this.watermarkManager = new WatermarkManager(editor)
	}
	extractLicense(licenseKey: string): LicenseInfo {
		const base64License = util.decodeBase64(licenseKey)

		const decoded = nacl.sign.open(base64License, util.decodeBase64(this.publicKey))

		if (!decoded) {
			throw new Error('Invalid license')
		}
		const licenseInfo = JSON.parse(util.encodeUTF8(decoded))
		// console.log('extractLicense', licenseInfo)
		return licenseInfoValidator.validate(licenseInfo)
	}

	getLicenseFromKey(licenseKey?: string) {
		let license: LicenseInfo
		if (!licenseKey) {
			this.licenseKey = { isLicenseValid: false, message: 'No license key provided' }
			this.shouldShowWatermark()
			this.watermarkManager.checkWatermark()
			return this.licenseKey
		}

		try {
			license = this.extractLicense(licenseKey)
		} catch (e) {
			// If the license can't be parsed, it's invalid
			this.licenseKey = { isLicenseValid: false, message: 'Invalid license key' }
			this.shouldShowWatermark()
			this.watermarkManager.checkWatermark()
			return this.licenseKey
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
		this.watermarkManager.checkWatermark()
		return this.licenseKey
	}
	shouldShowWatermark() {
		if (!this.licenseKey?.isLicenseValid) {
			// console.log(this.licenseKey?.message)
			this.watermarkManager.createWatermark()
		}
		if (this.licenseKey?.isLicenseValid && !this.licenseKey.isDomainValid) {
			// console.log('Invalid domain')
			this.watermarkManager.createWatermark()
		}
		if (this.licenseKey?.isLicenseValid && this.licenseKey.isLicenseExpired) {
			// console.log('License expired')
			this.watermarkManager.createWatermark()
		}
	}
}
