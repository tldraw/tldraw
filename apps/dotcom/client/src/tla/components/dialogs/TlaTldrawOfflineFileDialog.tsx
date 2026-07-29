import {
	TLDRAW_FILE_EXTENSION,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { F } from '../../utils/i18n'
import { TLDRAW_OFFLINE_FILE_EXTENSION } from '../../utils/tldrawOfflineFiles'
import { ExternalLink } from '../ExternalLink/ExternalLink'

/**
 * The app's name and the two file extensions are passed into the messages as values, so none of
 * them can be translated. The extensions come from the constants the handling itself uses, so the
 * copy can't drift from what we actually accept.
 */
const TLDRAW_OFFLINE_NAME = 'tldraw offline'
const TLDRAW_OFFLINE_URL = 'https://offline.tldraw.com/'

/** Anchors the "Export as .tldr" section of the tldraw offline user manual. */
const TLDRAW_OFFLINE_EXPORT_URL =
	'https://tldraw.notion.site/User-manual-tldraw-offline-39a3e4c324c080e7b2eacc5afd078e85#3aa3e4c324c080669967e2cc3ae2c789'

/**
 * Shown when someone brings in a file saved by tldraw offline. A dialog rather than a toast so the
 * way out — exporting to `.tldr` — can be a link in the sentence that suggests it.
 */
export function TlaTldrawOfflineFileDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F
						defaultMessage="Can’t open {extension} files yet"
						values={{ extension: TLDRAW_OFFLINE_FILE_EXTENSION }}
					/>
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<p>
					<F
						defaultMessage="We’re working on support for files from <a><strong>{appName}</strong></a>."
						values={{
							appName: TLDRAW_OFFLINE_NAME,
							strong: (chunks) => <strong>{chunks}</strong>,
							a: (chunks) => (
								<ExternalLink to={TLDRAW_OFFLINE_URL} eventName="open-tldraw-offline">
									{chunks}
								</ExternalLink>
							),
						}}
					/>
				</p>
				<p>
					<F
						defaultMessage="For now, you can <a>export as a {extension} file</a> to use it here."
						values={{
							extension: TLDRAW_FILE_EXTENSION,
							a: (chunks) => (
								<ExternalLink
									to={TLDRAW_OFFLINE_EXPORT_URL}
									eventName="open-tldraw-offline-export-manual"
								>
									{chunks}
								</ExternalLink>
							),
						}}
					/>
				</p>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="primary" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Got it" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
