import { useMaybeEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { EmbedShapeUtil } from '../../shapes/embed/EmbedShapeUtil'

/** @internal */
export function useGetEmbedShapeUtil() {
	const editor = useMaybeEditor()
	if (!editor) return undefined
	if (editor.hasShapeUtil('embed')) {
		return editor.getShapeUtil('embed') as EmbedShapeUtil
	}
	return undefined
}

/** @public */
export function useGetEmbedDefinition() {
	const embedUtil = useGetEmbedShapeUtil()
	return useCallback(
		(url: string) => (embedUtil ? embedUtil.getEmbedDefinition(url) : undefined),
		[embedUtil]
	)
}
