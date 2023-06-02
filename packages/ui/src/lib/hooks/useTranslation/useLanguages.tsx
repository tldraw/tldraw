import { useEditor } from '@tldraw/editor'
import { LANGUAGES } from './languages'

/** @public */
export function useLanguages() {
	const editor = useEditor()
	return { languages: LANGUAGES, currentLanguage: editor.locale }
}
