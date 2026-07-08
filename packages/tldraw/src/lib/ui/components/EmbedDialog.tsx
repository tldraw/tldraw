import { track, useEditor } from '@tldraw/editor'
import { TlButton } from '@tldraw/ui'
import { TlButtonLabel } from '@tldraw/ui'
import {
	TlDialogBody,
	TlDialogCloseButton,
	TlDialogFooter,
	TlDialogHeader,
	TlDialogTitle,
} from '@tldraw/ui'
import { TlInput } from '@tldraw/ui'
import { useRef, useState } from 'react'
import {
	TLEmbedDefinition,
	isCustomEmbedDefinition,
	isDefaultEmbedDefinitionType,
} from '../../defaultEmbedDefinitions'
import { TLEmbedResult } from '../../utils/embeds/embeds'
import { useAssetUrls } from '../context/asset-urls'
import { TLUiDialogProps } from '../context/dialogs'
import { useGetEmbedDefinition } from '../hooks/useGetEmbedDefinition'
import { useGetEmbedDefinitions } from '../hooks/useGetEmbedDefinitions'
import { untranslated, useTranslation } from '../hooks/useTranslation/useTranslation'

export const EmbedDialog = track(function EmbedDialog({ onClose }: TLUiDialogProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const assetUrls = useAssetUrls()

	// The embed definition for the user's selected embed (set by the user clicking on an embed in stage 1)
	const [embedDefinition, setEmbedDefinition] = useState<null | TLEmbedDefinition>(null)

	// The URL that the user has typed into (in stage 2)
	const [url, setUrl] = useState<string>('')

	// The embed info for the user's selected embed (based on the URL they've entered in stage 2)
	const [embedInfoForUrl, setEmbedInfoForUrl] = useState<null | TLEmbedResult>(null)

	// Should we show the "invalid URL" error message?
	const [showError, setShowError] = useState(false)
	const rShowErrorTimeout = useRef<any>(-1)

	const definitions = useGetEmbedDefinitions()
	const getEmbedDefinition = useGetEmbedDefinition()

	return (
		<>
			<TlDialogHeader>
				<TlDialogTitle>
					{embedDefinition
						? `${msg('embed-dialog.title')} — ${embedDefinition.title}`
						: msg('embed-dialog.title')}
				</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			{embedDefinition ? (
				<>
					<TlDialogBody className="tlui-embed-dialog__enter">
						<TlInput
							className="tlui-embed-dialog__input"
							label="embed-dialog.url"
							placeholder="https://example.com"
							autoFocus
							onValueChange={(value) => {
								// Set the url that the user has typed into the input
								setUrl(value)

								// Set the embed info to either the embed info for the URL (if
								// that embed info can be found and of a type that matches the
								// user's selected definition type)
								const embedInfo = getEmbedDefinition(value)
								setEmbedInfoForUrl(
									embedInfo && embedInfo.definition.type === embedDefinition.type ? embedInfo : null
								)

								// We want to hide the error when the user enters text,
								// and then show an error after a short delay if the user
								// has not yet entered a valid URL.
								setShowError(false)
								clearTimeout(rShowErrorTimeout.current)

								rShowErrorTimeout.current = editor.timers.setTimeout(
									() => setShowError(!embedInfo),
									320
								)
							}}
						/>
						{url === '' ? (
							<div className="tlui-embed-dialog__instruction">
								<span>{msg('embed-dialog.instruction')}</span>{' '}
								{embedDefinition.instructionLink && (
									<>
										<a
											target="_blank"
											rel="noopener noreferrer"
											href={embedDefinition.instructionLink}
											className="tlui-embed-dialog__instruction__link"
										>
											Learn more
										</a>
										.
									</>
								)}
							</div>
						) : (
							<div className="tlui-embed-dialog__warning">
								{showError ? msg('embed-dialog.invalid-url') : '\xa0'}
							</div>
						)}
					</TlDialogBody>
					<TlDialogFooter className="tlui-dialog__footer__actions">
						<TlButton
							type="normal"
							onClick={() => {
								setEmbedDefinition(null)
								setEmbedInfoForUrl(null)
								setUrl('')
							}}
						>
							<TlButtonLabel>{msg('embed-dialog.back')}</TlButtonLabel>
						</TlButton>
						<div className="tlui-embed__spacer" />
						<TlButton type="normal" onClick={onClose}>
							<TlButtonLabel>{msg('embed-dialog.cancel')}</TlButtonLabel>
						</TlButton>
						<TlButton
							type="primary"
							disabled={!embedInfoForUrl}
							onClick={() => {
								if (!embedInfoForUrl) return

								editor.putExternalContent({
									type: 'embed',
									url,
									point: editor.getViewportPageBounds().center,
									embed: embedInfoForUrl.definition,
								})

								onClose()
							}}
						>
							<TlButtonLabel>{msg('embed-dialog.create')}</TlButtonLabel>
						</TlButton>
					</TlDialogFooter>
				</>
			) : (
				<>
					<TlDialogBody className="tlui-embed-dialog__list">
						{definitions.map((def) => {
							const url = isDefaultEmbedDefinitionType(def.type)
								? assetUrls.embedIcons[def.type]
								: isCustomEmbedDefinition(def)
									? def.icon
									: undefined
							return (
								<TlButton type="menu" key={def.type} onClick={() => setEmbedDefinition(def)}>
									<TlButtonLabel>{untranslated(def.title)}</TlButtonLabel>
									{url && (
										<div
											className="tlui-embed-dialog__item__image"
											style={{ backgroundImage: `url(${url})` }}
										/>
									)}
								</TlButton>
							)
						})}
					</TlDialogBody>
				</>
			)}
		</>
	)
})
