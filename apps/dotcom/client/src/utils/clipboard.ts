/** @internal */
export async function writeToClipboard(result: Promise<Blob | ''>) {
	if (navigator?.clipboard?.write) {
		await navigator.clipboard.write([
			new ClipboardItem({
				'text/plain': result,
			}),
		])
	} else if (navigator?.clipboard?.writeText) {
		const link = await result
		if (link === '') return
		navigator.clipboard.writeText(await link.text())
	}
}
