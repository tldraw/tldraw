import { useEditor, usePassThroughWheelEvents, useValue } from '@tldraw/editor'
import { memo, useRef } from 'react'
import { useBreakpoint } from '../context/breakpoints'
import { useTldrawUiComponents } from '../context/components'

/** @public @react */
export const DefaultMenuPanel = memo(function MenuPanel() {
	const breakpoint = useBreakpoint()

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const { MainMenu, QuickActions, ActionsMenu, PageMenu } = useTldrawUiComponents()

	const editor = useEditor()
	const isSinglePageMode = useValue('isSinglePageMode', () => editor.options.maxPages <= 1, [
		editor,
	])

	if (!MainMenu && !PageMenu && breakpoint < 6) return null

	return (
		<div ref={ref} className="tlui-menu-zone">
			<div className="tlui-buttons__horizontal">
				{MainMenu && <MainMenu />}
				{PageMenu && !isSinglePageMode && <PageMenu />}
				{breakpoint < 6 ? null : (
					<>
						{QuickActions && <QuickActions />}
						{ActionsMenu && <ActionsMenu />}
					</>
				)}
			</div>
		</div>
	)
})
