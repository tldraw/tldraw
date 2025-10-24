export function openUrl(url: string, allowReferrer?: boolean) {
	window.open(url, '_blank', allowReferrer ? 'noopener' : 'noopener noreferrer')
}
