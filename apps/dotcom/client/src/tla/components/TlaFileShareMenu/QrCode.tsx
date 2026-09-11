import { useEffect, useState } from 'react'
import { FileHelpers, useValue } from 'tldraw'
import { useGlobalEditor } from '../../../utils/globalEditor'
import { getLocalSessionState } from '../../utils/local-session-state'
import { createQRCodeImageDataString } from '../../utils/qrcode'
import styles from './file-share-menu.module.css'

export function QrCode({ url }: { url: string }) {
	// Not cached in localStorage: the url carries the viewport, so every camera move would add a
	// new data-url entry that nothing ever evicts.
	const [qrCode, setQrCode] = useState<string | null>(null)

	const theme = useValue('is dark mode', () => getLocalSessionState().theme, [])
	const editor = useGlobalEditor()

	useEffect(() => {
		if (!editor) return

		createQRCodeImageDataString(url).then((svgString) => {
			const blob = new Blob([svgString], { type: 'image/svg+xml' })
			FileHelpers.blobToDataUrl(blob).then(setQrCode)
		})
	}, [url, setQrCode, editor])

	// todo: click qr code to... copy? big modal?

	// We want to use an image element here so that a user can right click and copy / save / drag the qr code
	return (
		<div className={styles.fileShareMenuQrCode}>
			<img
				src={qrCode ?? undefined}
				className={styles.fileShareMenuQrCodeInner}
				data-theme={theme}
			/>
		</div>
	)
}
