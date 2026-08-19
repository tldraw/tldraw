import { useEffect } from 'react'
import { FileHelpers, useLocalStorageState, useValue } from 'tldraw'
import { useGlobalEditor } from '../../../utils/globalEditor'
import { getLocalSessionState } from '../../utils/local-session-state'
import { createQRCodeImageDataString } from '../../utils/qrcode'
import styles from './file-share-menu.module.css'

export function QrCode({ url }: { url: string }) {
	// Save the QR codes in local storage
	const [qrCode, setQrCode] = useLocalStorageState<string | null>(url, null)

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
