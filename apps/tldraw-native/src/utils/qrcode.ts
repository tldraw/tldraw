export async function createQRCodeImageDataString(url: string) {
	const QRCode = await import('qrcode')
	return await new Promise<string>((res, rej) => {
		QRCode.toDataURL(url, (err, str) => {
			if (err) rej(err)
			else res(str)
		})
	})
}
