import { useEditor } from '@tldraw/editor'
import { LANGUAGES } from './languages'
import { TLLanguage } from './translations'

/** @internal */
export function useLanguages() {
	const editor = useEditor()
	return {
		languages: LANGUAGES as readonly TLLanguage[],
		currentLanguage: editor.locale,
	}
}
