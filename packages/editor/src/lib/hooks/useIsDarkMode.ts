import { useValue } from '@tldraw/state-react'
import { useSvgExportContext } from '../editor/types/SvgExportContext'
import { useEditor } from './useEditor'

/** @public */
export function useIsDarkMode() {
	const editor = useEditor()
	const exportContext = useSvgExportContext()
	return useValue('isDarkMode', () => exportContext?.isDarkMode ?? editor.user.getIsDarkMode(), [
		exportContext,
		editor,
	])
}
