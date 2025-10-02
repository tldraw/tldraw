import { useCallback } from 'react'
import { TldrawUiIcon, useLocalStorageState } from 'tldraw'

export function ConfigPanel({ children }: { children: React.ReactNode }) {
	const [isExpanded, setIsExpanded] = useLocalStorageState('shader-config-panel-expanded', false)

	const toggleExpanded = useCallback(() => {
		setIsExpanded((expanded) => !expanded)
	}, [setIsExpanded])

	return (
		<div
			className={`tlui-style-panel__wrapper tlui-style-panel shader-config-panel ${
				isExpanded ? 'shader-config-panel--expanded' : 'shader-config-panel--collapsed'
			}`}
			onWheelCapture={(e) => {
				e.stopPropagation()
			}}
		>
			{/* Header with collapse/expand button */}
			<div className="shader-config-header" onClick={toggleExpanded}>
				<span className="shader-config-title">Configure</span>
				<span
					className={`shader-config-chevron ${
						isExpanded ? 'shader-config-chevron--expanded' : 'shader-config-chevron--collapsed'
					}`}
				>
					<TldrawUiIcon icon="chevron-down" small label="Expand / collapse" />
				</span>
			</div>

			{isExpanded && <div className="shader-config-content">{children}</div>}
		</div>
	)
}
