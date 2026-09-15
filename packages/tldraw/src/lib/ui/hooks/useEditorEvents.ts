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

		const handleUnsupportedShapes: TLEventMapHandler<'unsupported-shapes'> = ({
			droppedCount,
			pastedCount,
		}) => {
			// "some were left out" and "none of this could be pasted" are different enough
			// outcomes that sharing one message would misdescribe one of them
			if (pastedCount === 0) {
				addToast({
					title: msg('toast.unsupported-shapes.none.title'),
					description: msg('toast.unsupported-shapes.none.desc'),
					severity: 'warning',
				})
				return
			}

			addToast({
				title: msg('toast.unsupported-shapes.some.title'),
				description:
					droppedCount === 1
						? msg('toast.unsupported-shapes.some.desc-one')
						: msg('toast.unsupported-shapes.some.desc-many').replace(
								'{count}',
								String(droppedCount)
							),
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
