import { useEditor } from '@tldraw/editor'
import { LANGUAGES } from './languages'
import { TLUiLanguage } from './translations'

/** @internal */
export function useLanguages() {
	const editor = useEditor()
	return {
		languages: LANGUAGES as readonly TLUiLanguage[],
		currentLanguage: editor.locale,
	}
}
