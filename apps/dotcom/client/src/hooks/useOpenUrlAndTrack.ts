import { TLUiEventSource, useUiEvents } from 'tldraw'
import { openUrl } from '../utils/url'

export function useOpenUrlAndTrack(source: TLUiEventSource) {
	const trackEvent = useUiEvents()
	return (url: string) => {
		trackEvent('open-url', { source, destinationUrl: url })
		openUrl(url)
	}
}
