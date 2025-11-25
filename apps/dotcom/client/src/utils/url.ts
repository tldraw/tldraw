export function openUrl(url: string, allowReferrer?: boolean) {
	return window.open(url, '_blank', allowReferrer ? 'noopener' : 'noopener noreferrer')
}
