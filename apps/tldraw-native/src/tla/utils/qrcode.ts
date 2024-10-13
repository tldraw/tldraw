export async function createQRCodeImageDataString(url: string) {
	const QRCode = await import('qrcode')
	return await QRCode.toString(url, {
		type: 'svg',
		scale: 1,
		margin: 0,
		color: {
			dark: '#000000',
			light: '#ffffff',
		},
	})
}
