import { T } from '@tldraw/validate'
import nacl from 'tweetnacl'
import util from 'tweetnacl-util'
import { Editor } from '../Editor'

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
	constructor(private editor: Editor) {}
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
			this.shouldShowWatermark()
			return this.checkWatermark()
		}

		try {
			license = this.extractLicense(licenseKey)
		} catch (e) {
			// If the license can't be parsed, it's invalid
			this.licenseKey = { isLicenseValid: false, message: 'Invalid license key' }
			this.shouldShowWatermark()
			return this.checkWatermark()
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
		this.checkWatermark()
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
		const watermark = document.createElement('a')
		const canvas = document.getElementsByClassName('tldraw__editor')[0].firstChild as HTMLElement
		watermark.style.position = 'absolute'
		watermark.style.bottom = '60px'
		watermark.style.right = '20px'
		watermark.style.backgroundColor = 'rgb(0, 0, 0)'
		watermark.style.color = 'white'
		watermark.style.padding = '12px'
		watermark.style.fontFamily = 'Arial'
		watermark.style.fontSize = '20px'
		watermark.style.zIndex = '201'
		watermark.innerHTML = 'tldraw.dev'
		watermark.href = 'https://tldraw.dev'
		watermark.id = 'tldraw-watermark'
		if (canvas) canvas.appendChild(watermark)
	}
	checkWatermark() {
		// check on an interval if the watermark is still there, if it isn't then add it back

		this.editor.timers.setInterval(() => {
			const canvas = document.getElementsByClassName('tldraw__editor')[0].firstChild as HTMLElement
			const children = [...canvas.children]
			const watermark = children.find(
				(element) => element.innerHTML === 'tldraw.dev'
			) as HTMLAnchorElement
			if (!watermark) {
				this.createWatermark()
			}
			// check the style of the watermark is exactly what we want
			watermark.style.position = 'absolute'
			watermark.style.opacity = '1'
			watermark.style.bottom = '60px'
			watermark.style.right = '20px'
			watermark.style.backgroundColor = 'rgb(0, 0, 0)'
			watermark.style.color = 'white'
			watermark.style.padding = '12px'
			watermark.style.fontFamily = 'Arial'
			watermark.style.fontSize = '20px'
			watermark.style.zIndex = '201'
			watermark.innerHTML = 'tldraw.dev'
			watermark.href = 'https://tldraw.dev'
		}, 5000)
	}
}
