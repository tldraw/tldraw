/* eslint-disable tldraw/jsx-no-literals */
import { getShapeClusters } from '@tldraw/dotcom-shared'
import { useEditor, useValue } from 'tldraw'
import { clusteringOverlayVisible } from './ClusteringOverlayUtil'

export function ClusteringPanel() {
	const editor = useEditor()
	const isVisible = useValue(clusteringOverlayVisible)
	const clusterCount = useValue(
		'MCP cluster count',
		() => getShapeClusters(editor.getCurrentPageShapes(), editor.getCurrentPageId()).length,
		[editor]
	)

	if (!isVisible) return null

	return (
		<div
			style={{
				position: 'absolute',
				right: 12,
				top: 52,
				padding: '8px 10px',
				borderRadius: 8,
				background: 'var(--tl-color-panel)',
				boxShadow: 'var(--tl-shadow-2)',
				color: 'var(--tl-color-text)',
				fontSize: 12,
				pointerEvents: 'none',
			}}
		>
			<strong>MCP clustering · {clusterCount}</strong>
			<div style={{ marginTop: 2, opacity: 0.65 }}>Top-level shapes with their descendants</div>
		</div>
	)
}
