import { useMaybeEditor } from '@tldraw/editor'
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
	return (url: string) => {
		return embedUtil ? embedUtil.getEmbedDefinition(url) : undefined
	}
}
