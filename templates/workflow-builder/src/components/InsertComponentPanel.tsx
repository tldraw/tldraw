import {
	PORTRAIT_BREAKPOINT,
	TldrawUiMenuContextProvider,
	useBreakpoint,
	useReadonly,
} from 'tldraw'
import { ComponentMenuContent } from './ComponentMenuContent'

export function InsertComponentPanel() {
	const breakpoint = useBreakpoint()

	const isReadonly = useReadonly()
	if (isReadonly) return null

	if (breakpoint < PORTRAIT_BREAKPOINT.TABLET) {
		return null
	}

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				transition: 'left 0.16s ease-in',
				height: '100%',
				pointerEvents: 'none',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 'var(--layer-menus)',
			}}
		>
			<div
				style={{
					borderTopRightRadius: 8,
					borderBottomRightRadius: 8,
					width: 'fit-content',
					border: '1px solid var(--color-panel-contrast)',
					borderLeft: 'none',
					backgroundColor: 'var(--color-panel)',
					boxShadow: 'var(--shadow-2)',
					pointerEvents: 'all',
					overflowY: 'auto',
				}}
			>
				<TldrawUiMenuContextProvider sourceId="menu" type="menu">
					<ComponentMenuContent />
				</TldrawUiMenuContextProvider>
			</div>
		</div>
	)
}
