import { LANGUAGES, TLLanguage } from '@tldraw/tlschema'
import { useEditor } from '../../../editor'

/** @internal */
export function useLanguages() {
	const editor = useEditor()
	return {
		languages: LANGUAGES as readonly TLLanguage[],
		currentLanguage: editor.user.locale,
	}
}
