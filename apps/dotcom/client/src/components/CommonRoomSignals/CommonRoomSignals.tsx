import { useEffect } from 'react'

type SignalMethod = 'page' | 'identify' | 'form'

interface SignalsQueue extends Array<[SignalMethod, IArguments]> {
	_opts: { apiHost: string }
	page(...args: unknown[]): SignalsQueue
	identify(...args: unknown[]): SignalsQueue
	form(...args: unknown[]): SignalsQueue
}

declare global {
	interface Window {
		signals?: SignalsQueue
	}
}

export function CommonRoomSignals() {
	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.signals !== 'undefined') return

		function queue(method: SignalMethod) {
			return function (): SignalsQueue {
				// oxlint-disable-next-line prefer-rest-params -- Preserve the vendor's arguments-object queue format.
				signals.push([method, arguments])
				return signals
			}
		}

		const signals: SignalsQueue = Object.assign(
			[],
			{ _opts: { apiHost: 'https://api.cr-relay.com' } },
			{ page: queue('page'), identify: queue('identify'), form: queue('form') }
		)
		window.signals = signals

		const script = document.createElement('script')
		script.src = 'https://cdn.cr-relay.com/v1/site/3c545a43-a234-4d04-a9d7-8402c4836c53/signals.js'
		script.async = true
		document.head.appendChild(script)
	}, [])

	return null
}
