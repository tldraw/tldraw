import { TLEventMapHandler, useEditor } from '@tldraw/editor'
import { useEffect } from 'react'
import { useToasts } from '../context/toasts'
import { useTranslation } from './useTranslation/useTranslation'

/** @internal */
export function useEditorEvents() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const msg = useTranslation()

	useEffect(() => {
		function handleMaxShapes({ name, count }: { name: string; pageId: string; count: number }) {
			addToast({
				title: 'Maximum shapes reached',
				description: `You've reached the maximum number of shapes allowed on ${name} (${count}). Please delete some shapes or move to a different page to continue.`,
				severity: 'warning',
			})
		}

		const handleUnsupportedShapes: TLEventMapHandler<'unsupported-shapes'> = ({ shapeCount }) => {
			addToast({
				title: msg('toast.unsupported-shapes.title'),
				description:
					shapeCount === 1
						? msg('toast.unsupported-shapes.desc-one')
						: msg('toast.unsupported-shapes.desc-many').replace('{count}', String(shapeCount)),
				severity: 'warning',
			})
		}

		editor.addListener('max-shapes', handleMaxShapes)
		editor.addListener('unsupported-shapes', handleUnsupportedShapes)
		return () => {
			editor.removeListener('max-shapes', handleMaxShapes)
			editor.removeListener('unsupported-shapes', handleUnsupportedShapes)
		}
	}, [editor, addToast, msg])
}
