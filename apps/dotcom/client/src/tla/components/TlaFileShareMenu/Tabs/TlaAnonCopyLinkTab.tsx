import { useCallback } from 'react'
import { useEditor } from 'tldraw'
import { useEditorDeepLink } from '../../../hooks/useDeepLink'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { copyTextToClipboard } from '../../../utils/copy'
import { F } from '../../../utils/i18n'
import { TlaMenuSection } from '../../tla-menu/tla-menu'
import { QrCode } from '../QrCode'
import { TlaShareMenuCopyButton } from '../file-share-menu-primitives'

export function TlaAnonCopyLinkTab() {
	const url = useEditorDeepLink()
	return (
		<>
			<TlaMenuSection>
				<TlaAnonCopyLinkButton url={url ?? ''} />
				<QrCode url={url ?? ''} />
			</TlaMenuSection>
		</>
	)
}

/* ---------------------- Share --------------------- */

function TlaAnonCopyLinkButton({ url }: { url: string }) {
	const editor = useEditor()
	const trackEvent = useTldrawAppUiEvents()

	const handleCopyLinkClick = useCallback(() => {
		copyTextToClipboard(editor.createDeepLink({ url }).toString())
		// no toasts please
		trackEvent('copy-share-link', { source: 'file-share-menu' })
	}, [url, editor, trackEvent])

	return (
		<TlaShareMenuCopyButton onClick={handleCopyLinkClick}>
			<F defaultMessage="Copy link" />
		</TlaShareMenuCopyButton>
	)
}
