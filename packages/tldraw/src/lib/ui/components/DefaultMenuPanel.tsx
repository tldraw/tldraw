import { useEditor, usePassThroughWheelEvents, useValue } from '@tldraw/editor'
import { memo, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../constants'
import { useBreakpoint } from '../context/breakpoints'
import { useTldrawUiComponents } from '../context/components'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TldrawUiToolbar } from './primitives/TldrawUiToolbar'
import { TldrawUiRow } from './primitives/layout'

/** @public @react */
export const DefaultMenuPanel = memo(function MenuPanel() {
	const breakpoint = useBreakpoint()
	const msg = useTranslation()

	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	const { MainMenu, QuickActions, ActionsMenu, PageMenu } = useTldrawUiComponents()

	const editor = useEditor()
	const isSinglePageMode = useValue('isSinglePageMode', () => editor.options.maxPages <= 1, [
		editor,
	])

	const showQuickActions =
		editor.options.actionShortcutsLocation === 'menu'
			? true
			: editor.options.actionShortcutsLocation === 'toolbar'
				? false
				: breakpoint >= PORTRAIT_BREAKPOINT.TABLET

	if (!MainMenu && !PageMenu && !showQuickActions) return null

	return (
		<nav ref={ref} className="tlui-menu-zone">
			<TldrawUiRow>
				{MainMenu && <MainMenu />}
				{PageMenu && !isSinglePageMode && <PageMenu />}
				{showQuickActions ? (
					<TldrawUiToolbar orientation="horizontal" label={msg('actions-menu.title')}>
						{QuickActions && <QuickActions />}
						{ActionsMenu && <ActionsMenu />}
					</TldrawUiToolbar>
				) : null}
			</TldrawUiRow>
		</nav>
	)
})
