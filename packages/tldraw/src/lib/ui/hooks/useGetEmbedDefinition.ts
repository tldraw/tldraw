import { useEditor } from '@tldraw/editor'
import { EmbedShapeUtil } from '../../shapes/embed/EmbedShapeUtil'

/** @internal */
export function useGetEmbedShapeUtil() {
	const editor = useEditor()
	return editor.getShapeUtil('embed') as EmbedShapeUtil | undefined
}

/** @public */
export function useGetEmbedDefinition() {
	const embedUtil = useGetEmbedShapeUtil()
	return (url: string) => {
		return embedUtil ? embedUtil.getEmbedDefinition(url) : undefined
	}
}
