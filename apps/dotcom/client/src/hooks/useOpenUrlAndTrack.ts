import { TLUiEventSource, useUiEvents } from 'tldraw'

export function useOpenUrlAndTrack(source: TLUiEventSource) {
	const trackEvent = useUiEvents()
	return (url: string, opts = {} as { allowReferrer?: boolean }) => {
		trackEvent('open-url', { source, destinationUrl: url })
		window.open(url, '_blank', opts.allowReferrer ? 'noopener' : 'noopener noreferrer')
	}
}
