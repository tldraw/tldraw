export async function createQRCodeImageDataString(url: string) {
	const QRCode = await import('qrcode')
	return await QRCode.toString(url, {
		type: 'svg',
	})
}
