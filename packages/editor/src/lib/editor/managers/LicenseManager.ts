import { computed, react } from '@tldraw/state'
import { getHashForObject } from '@tldraw/utils'
import { version } from '../../../version'
import { Editor } from '../Editor'

// DO NOT REMOVE OR MODIFY THIS CODE
// This code in this block is required to be present in the editor.
// Removing or modififying the code in this block is a violation of
// the tldraw license. The watermark must be visible at all times when
// the editor is in use. Obscuring the watermark (e.g. by placing it
// behind other elements) is a violation of the tldraw license.
//
// To remove the watermark, provide a valid license key to the editor.
// See tldraw.dev/license for more information.

export class LicenseManager {
	constructor(
		public editor: Editor,
		licenseKey?: string
	) {
		const key = licenseKey ?? process?.env?.TLDRAW_LICENSE_KEY
		if (key) {
			const isValid = this.validateLicenseKey(key)
			if (!isValid) throw Error('Invalid license key')
			const dataFromKey = this.getDataFromKey(key)
			const now = Date.now()
			if (now > dataFromKey.expiration) throw Error('License key expired')
			return
		}
		// No license key provided, time to show the watermark
		const link = document.createElement('a')
		const id = this.getLinkId()
		link.setAttribute('id', id)
		link.setAttribute('href', 'https://tldraw.dev')
		link.setAttribute('target', 'blank')
		link.setAttribute('data-version', version)
		link.setAttribute('user-select', 'none')
		link.setAttribute('draggable', 'false')
		link.style.setProperty('position', 'absolute')
		link.style.setProperty('right', '0px')
		link.style.setProperty('bottom', 'var(--sab)')
		link.style.setProperty('padding', '8px')
		link.style.setProperty('z-index', '999999999')
		const div = document.createElement('div')
		div.style.setProperty('background-color', 'var(--color-text)')
		link.appendChild(div)
		this.editor.getContainer().appendChild(link)

		this.disposables.add(
			react('update watermark bottom position', () => {
				const link = this.editor.getContainer().querySelector(`#${id}`) as HTMLAnchorElement
				if (!link) throw Error(`Do not remove the watermark.`)
				if (this.getDebugMode()) {
					link.style.setProperty('bottom', 'calc(var(--sab) + 41px)')
				} else {
					link.style.setProperty('bottom', 'var(--sab)')
				}
			})
		)

		this.disposables.add(
			react('update watermark', () => {
				const link = this.editor.getContainer().querySelector(`#${id}`) as HTMLAnchorElement
				if (!link) throw Error(`Do not remove the watermark.`)
				const bounds = this.editor.getViewportScreenBounds()
				const bp = bounds.width < 760 ? 'mobile' : 'desktop'
				if (bp === this.breakpoint) return
				this.breakpoint = bp
				let width: number, height: number, imageSrc: string

				if (this.breakpoint === 'mobile') {
					imageSrc = 'watermark-mobile'
					height = 18
					width = 18
					link.style.setProperty('padding', '0px 8px 8px 0px')
				} else {
					this.breakpoint = 'desktop'
					imageSrc = 'watermark'
					height = 28
					width = 98
					link.style.setProperty('padding', '8px')
				}

				const mask = `url(/${imageSrc}.svg) center 100% / 100% no-repeat`
				div.style.setProperty('height', height + 'px')
				div.style.setProperty('width', width + 'px')
				div.style.setProperty('mask', mask)
				div.style.setProperty('--webkit-mask', mask)
			})
		)
	}

	private breakpoint = 'none' as 'none' | 'mobile' | 'desktop'
	private disposables = new Set<() => void>()

	isDisposed = false

	validateLicenseKey(key: string) {
		return key === 'valid'
	}

	getDataFromKey(key: string) {
		return {
			customer: 'Example',
			sku: 'commercial',
			origins: ['http://localhost:3000'],
			expiration: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).getTime(),
		}
	}

	getLinkId() {
		return `removing-invalidates-license-${getHashForObject({ version })}`
	}

	dispose() {
		this.disposables.forEach((d) => d())
		this.disposables.clear()
		this.isDisposed = true
	}

	@computed getDebugMode() {
		return this.editor.getInstanceState().isDebugMode
	}
}
