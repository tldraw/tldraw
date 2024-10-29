import { useEditor, usePassThroughWheelEvents } from '@tldraw/editor'
import { memo, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../constants'
import { useBreakpoint } from '../context/breakpoints'
import { useTldrawUiComponents } from '../context/components'

/** @public @react */
export const DefaultMenuPanel = memo(function MenuPanel() {
	const breakpoint = useBreakpoint()

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const { MainMenu, QuickActions, ActionsMenu, DocumentName } = useTldrawUiComponents()

	const editor = useEditor()

	const showQuickActions =
		editor.options.actionShortcutsLocation === 'menu'
			? true
			: editor.options.actionShortcutsLocation === 'toolbar'
				? false
				: breakpoint >= PORTRAIT_BREAKPOINT.TABLET

	if (!MainMenu && !DocumentName && breakpoint < 6) return null

	return (
		<div ref={ref} className="tlui-menu-zone">
			<div className="tlui-buttons__horizontal">
				{MainMenu && <MainMenu />}
				{DocumentName && <DocumentName />}
				{showQuickActions ? (
					<>
						{QuickActions && <QuickActions />}
						{ActionsMenu && <ActionsMenu />}
					</>
				) : null}
			</div>
		</div>
	)
})
