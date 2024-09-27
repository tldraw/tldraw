export async function copyTextToClipboard(text: string) {
	if (navigator?.clipboard?.write) {
		return await navigator.clipboard.write([
			new ClipboardItem({
				'text/plain': new Blob([text], { type: 'text/plain' }),
			}),
		])
	} else if (navigator?.clipboard?.writeText) {
		return await navigator.clipboard.writeText(text)
	}
}
