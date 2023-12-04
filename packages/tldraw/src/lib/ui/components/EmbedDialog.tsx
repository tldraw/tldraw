import { EMBED_DEFINITIONS, EmbedDefinition, track, useEditor } from '@tldraw/editor'
import { useRef, useState } from 'react'
import { TLEmbedResult, getEmbedInfo } from '../../utils/embeds/embeds'
import { useAssetUrls } from '../hooks/useAssetUrls'
import { TLUiDialogProps } from '../hooks/useDialogsProvider'
import { untranslated, useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'
import * as Dialog from './primitives/Dialog'
import { Icon } from './primitives/Icon'
import { Input } from './primitives/Input'

export const EmbedDialog = track(function EmbedDialog({ onClose }: TLUiDialogProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const assetUrls = useAssetUrls()

	// The embed definition for the user's selected embed (set by the user clicking on an embed in stage 1)
	const [embedDefinition, setEmbedDefinition] = useState<null | EmbedDefinition>(null)

	// The URL that the user has typed into (in stage 2)
	const [url, setUrl] = useState<string>('')

	// The embed info for the user's selected embed (based on the URL they've entered in stage 2)
	const [embedInfoForUrl, setEmbedInfoForUrl] = useState<null | TLEmbedResult>(null)

	// Should we show the "invalid URL" error message?
	const [showError, setShowError] = useState(false)
	const rShowErrorTimeout = useRef<any>(-1)

	return (
		<>
			<Dialog.Header>
				<Dialog.Title>
					{embedDefinition
						? `${msg('embed-dialog.title')} — ${embedDefinition.title}`
						: msg('embed-dialog.title')}
				</Dialog.Title>
				<Dialog.CloseButton />
			</Dialog.Header>
			{embedDefinition ? (
				<>
					<Dialog.Body className="tlui-embed-dialog__enter">
						<Input
							className="tlui-embed-dialog__input"
							label="embed-dialog.url"
							placeholder="http://example.com"
							autofocus
							onValueChange={(value) => {
								// Set the url that the user has typed into the input
								setUrl(value)

								// Set the embed info to either the embed info for the URL (if
								// that embed info can be found and of a type that matches the
								// user's selected definition type)
								const embedInfo = getEmbedInfo(value)
								setEmbedInfoForUrl(
									embedInfo && embedInfo.definition.type === embedDefinition.type ? embedInfo : null
								)

								// We want to hide the error when the user enters text,
								// and then show an error after a short delay if the user
								// has not yet entered a valid URL.
								setShowError(false)
								clearTimeout(rShowErrorTimeout.current)
								rShowErrorTimeout.current = setTimeout(() => setShowError(!embedInfo), 320)
							}}
						/>
						{url === '' ? (
							<div className="tlui-embed-dialog__instruction">
								<span>{msg('embed-dialog.instruction')}</span>{' '}
								{embedDefinition.instructionLink && (
									<a
										target="_blank"
										rel="noopener noreferrer"
										href={embedDefinition.instructionLink}
										className="tlui-embed-dialog__instruction__link"
									>
										Learn more.
										<Icon icon="external-link" small />
									</a>
								)}
							</div>
						) : (
							<div className="tlui-embed-dialog__warning">
								{showError ? msg('embed-dialog.invalid-url') : '\xa0'}
							</div>
						)}
					</Dialog.Body>
					<Dialog.Footer className="tlui-dialog__footer__actions">
						<Button
							type="normal"
							onClick={() => {
								setEmbedDefinition(null)
								setEmbedInfoForUrl(null)
								setUrl('')
							}}
							label="embed-dialog.back"
						/>
						<div className="tlui-embed__spacer" />
						<Button type="normal" label="embed-dialog.cancel" onClick={onClose} />
						<Button
							type="primary"
							disabled={!embedInfoForUrl}
							label="embed-dialog.create"
							onClick={() => {
								if (!embedInfoForUrl) return

								editor.putExternalContent({
									type: 'embed',
									url,
									point: editor.getViewportPageCenter(),
									embed: embedInfoForUrl.definition,
								})

								onClose()
							}}
						/>
					</Dialog.Footer>
				</>
			) : (
				<>
					<Dialog.Body className="tlui-embed-dialog__list">
						{EMBED_DEFINITIONS.map((def) => {
							return (
								<Button
									type="menu"
									key={def.type}
									onClick={() => setEmbedDefinition(def)}
									label={untranslated(def.title)}
								>
									<div
										className="tlui-embed-dialog__item__image"
										style={{ backgroundImage: `url(${assetUrls.embedIcons[def.type]})` }}
									/>
								</Button>
							)
						})}
					</Dialog.Body>
				</>
			)}
		</>
	)
})
