import { useEditor } from '@tldraw/editor'
import { ReactNode, useEffect } from 'react'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'
import { DefaultDebugMenuContent } from './DefaultDebugMenuContent'

/** @public */
export interface TLUiDebugMenuProps {
	children?: ReactNode
}

/** @public @react */
export function DefaultDebugMenu({ children }: TLUiDebugMenuProps) {
	const editor = useEditor()
	const content = children ?? <DefaultDebugMenuContent />

	// While the debug menu is mounted, expose the editor on `window.editor` for
	// console-driven debugging. Host apps often set `window.editor` themselves,
	// so we only claim it when it's free and only clean up the value we set —
	// toggling debug mode off must not delete a global the host app owns.
	useEffect(() => {
		const win = window as any
		if (win.editor) return
		win.editor = editor
		return () => {
			if (win.editor === editor) {
				delete win.editor
			}
		}
	}, [editor])

	return (
		<TldrawUiDropdownMenuRoot id="debug">
			<TldrawUiDropdownMenuTrigger>
				<TldrawUiButton type="icon" title="Debug menu">
					<TldrawUiButtonIcon icon="dots-horizontal" />
				</TldrawUiButton>
			</TldrawUiDropdownMenuTrigger>
			<TldrawUiDropdownMenuContent side="top" align="end" alignOffset={0}>
				<TldrawUiMenuContextProvider type="menu" sourceId="debug-panel">
					{content}
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuContent>
		</TldrawUiDropdownMenuRoot>
	)
}
