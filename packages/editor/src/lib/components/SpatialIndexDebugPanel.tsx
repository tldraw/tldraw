import { track } from '@tldraw/state-react'
import { debugFlags } from '../utils/debug-flags'

/**
 * Debug panel for testing spatial index feature and performance logging.
 * Add to Tldraw via components=\{\{ InFrontOfTheCanvas: SpatialIndexDebugPanel \}\}
 *
 * @public
 */
export const SpatialIndexDebugPanel = track(() => {
	return (
		<div
			style={{
				position: 'absolute',
				top: 200,
				left: 8,
				padding: '12px',
				background: 'white',
				border: '1px solid #e0e0e0',
				borderRadius: '4px',
				boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
				fontSize: '12px',
				fontFamily: 'system-ui, sans-serif',
				zIndex: 1000,
				pointerEvents: 'all',
				minWidth: '200px',
			}}
		>
			<div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Spatial Index</div>

			{/* Main feature toggle */}
			<label
				style={{
					display: 'flex',
					alignItems: 'center',
					cursor: 'pointer',
					padding: '6px',
					background: debugFlags.useSpatialIndex.get() ? '#e8f5e9' : '#fff3e0',
					borderRadius: '3px',
					marginBottom: '8px',
				}}
			>
				<input
					type="checkbox"
					checked={debugFlags.useSpatialIndex.get()}
					onChange={(e) => debugFlags.useSpatialIndex.set(e.target.checked)}
					style={{ marginRight: '8px' }}
				/>
				<span style={{ fontWeight: 500 }}>
					{debugFlags.useSpatialIndex.get() ? 'Enabled' : 'Disabled'}
				</span>
			</label>

			{/* Performance logging section */}
			<div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '8px' }}>
				<div style={{ fontWeight: 500, marginBottom: '8px', fontSize: '11px' }}>
					Performance Logging
				</div>
				<div
					style={{
						fontSize: '11px',
					}}
				>
					<PerfFlagCheckbox
						flag={debugFlags.perfLogCulling}
						label="Culling"
						description="Viewport shape culling"
					/>
					<PerfFlagCheckbox
						flag={debugFlags.perfLogSelection}
						label="Selection"
						description="Brushing, erasing, scribble"
					/>
					<PerfFlagCheckbox
						flag={debugFlags.perfLogGetShapeAtPoint}
						label="GetShapeAtPoint"
						description="Single shape queries"
					/>
					<PerfFlagCheckbox
						flag={debugFlags.perfLogGetShapesAtPoint}
						label="GetShapesAtPoint"
						description="Multiple shape queries"
					/>
					<PerfFlagCheckbox
						flag={debugFlags.perfLogSpatialIndex}
						label="Spatial Index"
						description="R-tree operations"
					/>
					<PerfFlagCheckbox
						flag={debugFlags.perfLogPageChange}
						label="Page Change"
						description="Page switching"
					/>
				</div>
			</div>
		</div>
	)
})

const PerfFlagCheckbox = track(
	({ flag, label, description }: { flag: any; label: string; description: string }) => {
		return (
			<label
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					cursor: 'pointer',
					padding: '4px 6px',
					gap: '6px',
				}}
			>
				<input
					type="checkbox"
					checked={flag.get()}
					onChange={(e) => flag.set(e.target.checked)}
					style={{ marginTop: '2px' }}
				/>
				<div style={{ flex: 1 }}>
					<div style={{ fontWeight: 500 }}>{label}</div>
					<div style={{ color: '#666', fontSize: '10px' }}>{description}</div>
				</div>
			</label>
		)
	}
)
