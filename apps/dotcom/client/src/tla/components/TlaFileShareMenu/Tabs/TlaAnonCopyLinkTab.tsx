import { F, useEditor } from 'tldraw'
import { useEditorDeepLink } from '../../../hooks/useDeepLink'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { copyTextToClipboard } from '../../../utils/copy'
import { TlaMenuSection } from '../../tla-menu/tla-menu'
import { TlaShareMenuCopyButton } from '../file-share-menu-primitives'
import { QrCode } from '../QrCode'

export function TlaAnonCopyLinkTab() {
	return (
		<TlaMenuSection>
			<TlaAnonCopyLink />
		</TlaMenuSection>
	)
}

/** The link button and QR code on their own, for a section that holds more than them. */
export function TlaAnonCopyLink({ type }: { type?: 'primary' | 'secondary' }) {
	const url = useEditorDeepLink() ?? ''
	return (
		<>
			<TlaAnonCopyLinkButton url={url} type={type} />
			<QrCode url={url} />
		</>
	)
}

/* ---------------------- Share --------------------- */

function TlaAnonCopyLinkButton({ url, type }: { url: string; type?: 'primary' | 'secondary' }) {
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()

	const handleCopyLinkClick = () => {
		copyTextToClipboard(editor.createDeepLink({ url }).toString())
		// no toasts please
		trackEvent('copy-share-link', { source: 'file-share-menu' })
	}

	return (
		<TlaShareMenuCopyButton onClick={handleCopyLinkClick} type={type}>
			<F defaultMessage="Copy link" />
		</TlaShareMenuCopyButton>
	)
}
