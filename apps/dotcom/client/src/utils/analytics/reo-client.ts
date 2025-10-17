import { AnalyticsOptions } from './shared'

export function setupReo(options: AnalyticsOptions) {
	if (options.optedIn === false) return

	const user = options.user

	function postToReoIframe(type: 'identify', payload?: any) {
		const iframe = document.getElementById('reo-iframe-loader') as HTMLIFrameElement | null
		if (iframe?.contentWindow) {
			iframe.contentWindow.postMessage({ type, payload })
		}
	}

	const reoIdentify = () =>
		postToReoIframe('identify', {
			firstname: user?.name || '',
			username: user?.email || '',
			type: 'email',
			userId: user?.id || '',
		})

	if (!document.getElementById('reo-iframe-loader')) {
		const iframeTag = document.createElement('iframe')
		iframeTag.id = 'reo-iframe-loader'
		iframeTag.style.display = 'none'
		iframeTag.src = '/reo.html'
		iframeTag.onload = () => reoIdentify()
		document.body.appendChild(iframeTag)
	} else {
		reoIdentify()
	}
}
