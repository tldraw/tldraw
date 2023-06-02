import { useEditor } from '@tldraw/editor'
import { LANGUAGES } from './languages'

/** @public */
export function useLanguages() {
	const app = useEditor()
	return { languages: LANGUAGES, currentLanguage: app.locale }
}
