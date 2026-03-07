import { useValue } from '@tldraw/state-react'
import { useSvgExportContext } from '../editor/types/SvgExportContext'
import { useEditor } from './useEditor'

/** @public */
export function useCurrentThemeId(): string {
	const editor = useEditor()
	const exportContext = useSvgExportContext()
	return useValue(
		'currentThemeId',
		() => {
			if (exportContext) return exportContext.isDarkMode ? 'dark' : 'light'
			return editor._themeManager.getCurrentThemeId()
		},
		[exportContext, editor]
	)
}
