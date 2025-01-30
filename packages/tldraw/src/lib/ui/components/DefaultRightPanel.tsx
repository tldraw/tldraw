import { memo } from 'react'
import { PORTRAIT_BREAKPOINT } from '../constants'
import { useBreakpoint } from '../context/breakpoints'
import { useTldrawUiComponents } from '../context/components'
import { useReadonly } from '../hooks/useReadonly'

export const DefaultRightPanel = memo(function DefaultRightPanel() {
	const { SharePanel, StylePanel } = useTldrawUiComponents()
	const breakpoint = useBreakpoint()
	const isReadonlyMode = useReadonly()

	return (
		<>
			{SharePanel && <SharePanel />}
			{StylePanel && breakpoint >= PORTRAIT_BREAKPOINT.TABLET_SM && !isReadonlyMode && (
				<StylePanel />
			)}
		</>
	)
})
