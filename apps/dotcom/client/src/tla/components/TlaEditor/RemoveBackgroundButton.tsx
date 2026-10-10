import { fetch } from '@tldraw/utils'
import { useEffect, useState } from 'react'
import {
	MediaHelpers,
	TLImageAsset,
	TLImageShape,
	TLShapeId,
	TldrawUiButtonIcon,
	TldrawUiToolbarButton,
	track,
	useEditor,
	useToasts,
	useUiEvents,
	useValue,
} from 'tldraw'
import {
	HAS_TRANSPARENT_PIXELS,
	imageBlobHasTransparentPixels,
	imageCanBeScannedForTransparency,
	isOpaqueImageMimeType,
	readBackgroundRemovalPair,
	readHasTransparentPixels,
	shouldOfferBackgroundRemoval,
	staleBackgroundRemovalMeta,
	toggleImageBackground,
	userContentObjectName,
} from '../../../utils/backgroundRemoval'
import { isDevelopmentEnv } from '../../../utils/env'
import { defineMessages, useMsg } from '../../utils/i18n'

const messages = defineMessages({
	removeBackground: { defaultMessage: 'Remove background' },
	restoreBackground: { defaultMessage: 'Restore background' },
	failed: { defaultMessage: 'Could not remove the background' },
})

export const RemoveBackgroundButton = track(function RemoveBackgroundButton({
	imageShapeId,
}: {
	imageShapeId: TLShapeId
}) {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const { addToast } = useToasts()
	const removeLabel = useMsg(messages.removeBackground)
	const restoreLabel = useMsg(messages.restoreBackground)
	const failedLabel = useMsg(messages.failed)
	const [pending, setPending] = useState(false)

	const state = useValue(
		'remove background',
		() => {
			const shape = editor.getShape<TLImageShape>(imageShapeId)
			if (!shape || editor.getIsReadonly()) return null
			const assetId = shape.props.assetId
			const asset = assetId ? editor.getAsset<TLImageAsset>(assetId) : null
			if (!asset || asset.type !== 'image') return null
			const pair = readBackgroundRemovalPair(shape.meta)
			const hasPair = !!(pair.originalAssetId && pair.removedAssetId)
			const hasTransparentPixels =
				readHasTransparentPixels(asset.meta) ??
				(isOpaqueImageMimeType(asset.props.mimeType) ? false : null)
			const objectName = isDevelopmentEnv ? null : userContentObjectName(asset.props.src)
			return {
				asset,
				hasPair,
				showingRemoved: hasPair && shape.props.assetId === pair.removedAssetId,
				visible: shouldOfferBackgroundRemoval({
					objectName,
					isAnimated:
						asset.props.isAnimated || MediaHelpers.isAnimatedImageType(asset.props.mimeType),
					isVector: MediaHelpers.isVectorImageType(asset.props.mimeType),
					hasTransparentPixels,
					hasPair,
				}),
			}
		},
		[editor, imageShapeId]
	)

	useEffect(() => {
		const asset = state?.asset
		if (!asset || !imageCanBeScannedForTransparency(asset)) return
		if (isDevelopmentEnv || !userContentObjectName(asset.props.src)) return
		let cancelled = false
		const assetId = asset.id
		void (async () => {
			try {
				const url = await editor.resolveAssetUrl(assetId, { shouldResolveToOriginal: true })
				if (!url || cancelled) return
				const response = await fetch(url)
				if (!response.ok || cancelled) return
				const transparent = await imageBlobHasTransparentPixels(await response.blob())
				if (cancelled) return
				const current = editor.getAsset<TLImageAsset>(assetId)
				if (!current) return
				editor.updateAssets([
					{
						id: assetId,
						type: 'image',
						meta: { ...current.meta, [HAS_TRANSPARENT_PIXELS]: transparent },
					},
				])
			} catch {
				// Leave the flag unset so a later selection can try again.
			}
		})()
		return () => {
			cancelled = true
		}
	}, [editor, state?.asset])

	if (!state?.visible) return null

	return (
		<TldrawUiToolbarButton
			type="icon"
			title={state.showingRemoved ? restoreLabel : removeLabel}
			data-testid="tool.remove-background"
			isActive={state.showingRemoved}
			disabled={pending}
			onClick={() => {
				if (pending) return
				setPending(true)
				void toggleImageBackground(editor, imageShapeId)
					.then((changed) => {
						if (changed) trackEvent('remove-background', { source: 'image-toolbar' })
					})
					.catch(() => {
						addToast({ title: failedLabel, severity: 'error' })
					})
					.finally(() => {
						setPending(false)
					})
			}}
		>
			<TldrawUiButtonIcon small icon="fill-none" />
		</TldrawUiToolbarButton>
	)
})

/** Clears the original/cutout pair when the image is replaced with a different asset. */
export function BackgroundRemovalSideEffects() {
	const editor = useEditor()
	useEffect(() => {
		return editor.sideEffects.register({
			shape: {
				afterChange(prev, next) {
					if (prev.type !== 'image' || next.type !== 'image') return
					const meta = staleBackgroundRemovalMeta(
						(prev as TLImageShape).props.assetId,
						(next as TLImageShape).props.assetId,
						next.meta
					)
					if (!meta) return
					editor.updateShape({ id: next.id, type: 'image', meta })
				},
			},
		})
	}, [editor])
	return null
}
