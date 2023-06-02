import { useEditor } from '@tldraw/editor'
import { LANGUAGES } from './languages'
import { TLUiListedTranslation } from './translations'

/** @internal */
export function useLanguages() {
	const editor = useEditor()
	return {
		languages: LANGUAGES as readonly TLUiListedTranslation[],
		currentLanguage: editor.locale,
	}
}
