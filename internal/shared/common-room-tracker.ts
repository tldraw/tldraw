import { COMMON_ROOM_SNIPPET } from './common-room-signals'

// Common Room's persisted identity: https://www.commonroom.io/docs/signals/website-visitor-tracking/faqs/
const COMMON_ROOM_IDENTITY_COOKIES = ['signals-sdk-user-id', 'signals-sdk-session-id']

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
	private identifiedUser: CommonRoomIdentity | undefined

	private getSignals() {
		return (this.iframe?.contentWindow as CommonRoomWindow | null)?.signals
	}

	private syncPageUrl() {
		const frameWindow = this.iframe?.contentWindow
		if (frameWindow && frameWindow.location.href !== window.location.href) {
			frameWindow.history.replaceState(null, '', window.location.href)
		}
	}

	private clearIdentityCookies() {
		const hostnameParts = window.location.hostname.split('.')
		for (const name of COMMON_ROOM_IDENTITY_COOKIES) {
			const expiredCookie = `${name}=; Max-Age=0; Path=/`
			document.cookie = expiredCookie
			// The SDK may use a parent domain while an older installation used a host-only cookie.
			for (let index = 0; index < hostnameParts.length - 1; index++) {
				const domain = hostnameParts.slice(index).join('.')
				document.cookie = `${expiredCookie}; Domain=${domain}`
			}
		}
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

		// document.open() copies the parent's URL so the SDK can read its domain and query params.
		// https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#document-open-steps
		frameDocument.open()
		const html = frameDocument.createElement('html')
		html.append(frameDocument.createElement('head'), frameDocument.createElement('body'))
		frameDocument.appendChild(html)
		frameDocument.close()
		this.syncPageUrl()

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
		this.identifiedUser = undefined
		this.clearIdentityCookies()
	}

	reset(): boolean {
		const wasEnabled = this.iframe !== null
		const watchPageChanges = this.pageviewInterval !== undefined
		const lastPageUrl = this.lastPageUrl
		this.disable()
		if (!wasEnabled) return false
		// Reset identity without reporting the same page again when rebuilding the SDK context.
		this.lastPageUrl = lastPageUrl
		return this.enable({ watchPageChanges })
	}

	identify(user: CommonRoomIdentity) {
		const signals = this.getSignals()
		if (
			!signals ||
			(this.identifiedUser?.email === user.email && this.identifiedUser.name === user.name)
		) {
			return
		}
		this.syncPageUrl()
		signals.identify(user)
		this.identifiedUser = { ...user }
	}

	form(user: CommonRoomIdentity) {
		this.syncPageUrl()
		this.getSignals()?.form(user)
	}

	page() {
		const signals = this.getSignals()
		if (!signals || this.lastPageUrl === window.location.href) return
		this.syncPageUrl()
		this.lastPageUrl = window.location.href
		signals.page(this.lastPageUrl)
	}
}
