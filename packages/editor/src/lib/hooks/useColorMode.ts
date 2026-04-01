import { useValue } from '@tldraw/state-react'
import { useSvgExportContext } from '../editor/types/SvgExportContext'
import { useEditor } from './useEditor'

/** @public */
export function useColorMode(): 'light' | 'dark' {
	const editor = useEditor()
	const exportContext = useSvgExportContext()
	return useValue(
		'colorMode',
		() => {
			if (exportContext) return exportContext.themeId === 'dark' ? 'dark' : 'light'
			return editor._themeManager.getColorMode()
		},
		[exportContext, editor]
	)
}
