import { TLEventMapHandler, defineMessages, useEditor } from '@tldraw/editor'
import { useEffect } from 'react'
import { useToasts } from '../context/toasts'
import { useTranslation } from './useTranslation/useTranslation'

const messages = defineMessages({
	someTitle: {
		id: 'toast.unsupported-shapes.some.title',
		defaultMessage: 'Some shapes couldn’t be pasted',
	},
	someDesc: {
		id: 'toast.unsupported-shapes.some.desc',
		defaultMessage:
			'{count, plural, one {# shape uses a type that isn’t supported here, so it was left out.} other {# shapes use a type that isn’t supported here, so they were left out.}}',
	},
	noneTitle: {
		id: 'toast.unsupported-shapes.none.title',
		defaultMessage: 'No shapes could be pasted',
	},
	noneDesc: {
		id: 'toast.unsupported-shapes.none.desc',
		defaultMessage: 'This content uses shape types that aren’t supported here.',
	},
})

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
					title: msg(messages.noneTitle),
					description: msg(messages.noneDesc),
					severity: 'warning',
				})
				return
			}

			addToast({
				title: msg(messages.someTitle),
				description: msg(messages.someDesc, { count: droppedCount }),
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
