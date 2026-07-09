import { useEditor } from '@tldraw/editor'
import { TldrawUiButton } from '@tldraw/ui'
import { TldrawUiButtonIcon } from '@tldraw/ui'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '@tldraw/ui'
import { ReactNode, useEffect } from 'react'
import { TldrawUiMenuContextProvider } from '../primitives/menus/TldrawUiMenuContext'
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
	// console-driven debugging. We remove it on unmount so the editor isn't
	// retained when debug mode is turned off.
	useEffect(() => {
		const win = window as any
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
