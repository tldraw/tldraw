import { useValue } from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'

export function useEditorDeepLink() {
	return useValue(
		'deepLink',
		() => {
			const editor = globalEditor.get()
			if (!editor) return null
			return editor.createDeepLink().toString()
		},
		[]
	)
}
