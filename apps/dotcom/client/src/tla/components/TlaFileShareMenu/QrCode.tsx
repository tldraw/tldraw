import { useEffect } from 'react'
import { FileHelpers, useLocalStorageState, useValue } from 'tldraw'
import { useGlobalEditor } from '../../../utils/globalEditor'
import { getLocalSessionState } from '../../utils/local-session-state'
import { createQRCodeImageDataString } from '../../utils/qrcode'
import styles from './file-share-menu.module.css'

export function QrCode({ url }: { url: string }) {
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

	// An image element so the user can right click to copy / save / drag the qr code
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
