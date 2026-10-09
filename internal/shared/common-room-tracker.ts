import { COMMON_ROOM_SNIPPET } from './common-room-signals'

interface CommonRoomIdentity {
	email: string
	name?: string
}

interface CommonRoomTrackerOptions {
	watchPageChanges?: boolean
}

interface CommonRoomWindow extends Window {
	signals?: {
		_opts: { apiHost: string; autoTracking?: boolean }
		identify(user: CommonRoomIdentity): void
		form(user: CommonRoomIdentity): void
		page(url: string): void
	}
}

export class CommonRoomTracker {
	private iframe: HTMLIFrameElement | null = null
	private lastPageUrl: string | null = null
	private pageviewInterval: ReturnType<typeof setInterval> | undefined

	private getSignals() {
		return (this.iframe?.contentWindow as CommonRoomWindow | null)?.signals
	}

	enable(options: CommonRoomTrackerOptions = {}): boolean {
		if (this.iframe) return true

		const iframe = document.createElement('iframe')
		iframe.id = 'common-room-iframe-loader'
		iframe.hidden = true
		iframe.referrerPolicy = 'no-referrer'
		document.body.appendChild(iframe)
		this.iframe = iframe

		const frameDocument = iframe.contentDocument
		if (!frameDocument) {
			this.disable()
			return false
		}

		const script = frameDocument.createElement('script')
		script.textContent = COMMON_ROOM_SNIPPET
		frameDocument.head.appendChild(script)

		const signals = this.getSignals()
		if (!signals) {
			this.disable()
			return false
		}

		// The CDN script is async: disable automatic iframe tracking before it executes.
		signals._opts.autoTracking = false
		this.page()
		if (options.watchPageChanges) {
			// Hosted consumers do not share a router; watch their URL without patching history.
			this.pageviewInterval = setInterval(() => this.page(), 1000)
		}
		return true
	}

	disable() {
		clearInterval(this.pageviewInterval)
		this.pageviewInterval = undefined
		// Removing the iframe stops running vendor code, unlike removing its script tag.
		this.iframe?.remove()
		this.iframe = null
		this.lastPageUrl = null
	}

	identify(user: CommonRoomIdentity) {
		this.getSignals()?.identify(user)
	}

	form(user: CommonRoomIdentity) {
		this.getSignals()?.form(user)
	}

	page() {
		const signals = this.getSignals()
		if (!signals || this.lastPageUrl === window.location.href) return
		this.lastPageUrl = window.location.href
		signals.page(this.lastPageUrl)
	}
}
