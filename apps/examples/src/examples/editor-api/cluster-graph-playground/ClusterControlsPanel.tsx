import { ReactNode } from 'react'
import { TldrawUiButton, useEditor, useValue } from 'tldraw'
import { ClusterGraphOverlayUtil } from './ClusterGraphOverlayUtil'
import { createDemoBoard } from './createDemoBoard'
import {
	clusterSettings,
	TLBindingClusterMode,
	TLClusterDistanceMetric,
	TLClusterEdgeMode,
	updateClusterSettings,
} from './settings'

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<label className="cluster-panel__row">
			<span>{label}</span>
			{children}
		</label>
	)
}

/**
 * Tuning panel for the cluster playground, plus an "agent view" that shows
 * the JSON an MCP server could return for the hovered cluster node.
 */
export function ClusterControlsPanel() {
	const editor = useEditor()
	const settings = useValue(clusterSettings)

	const util = editor.overlays.getOverlayUtil<ClusterGraphOverlayUtil>('cluster-graph')
	const model = useValue('cluster model', () => util.getModel(), [util])
	const agentView = useValue(
		'agent view',
		() => {
			const hoveredId = util.getHoveredClusterId()
			if (hoveredId === null) return null
			const cluster = util.getModel().clusters[hoveredId]
			if (!cluster) return null
			return {
				node: `c${cluster.id}`,
				label: cluster.info.label,
				keywords: cluster.info.keywords,
				frames: cluster.info.frameNames,
				shapes: cluster.info.shapeCount,
				bounds: {
					w: Math.round(cluster.bounds.w),
					h: Math.round(cluster.bounds.h),
				},
				neighbors: util.getAdjacency(cluster.id).map(({ neighbor, kind }) => ({
					node: `c${neighbor}`,
					label: util.getModel().clusters[neighbor]?.info.label,
					via: kind === 'binding' ? 'arrow' : 'spatial',
				})),
			}
		},
		[util]
	)

	return (
		<div className="cluster-panel">
			<div className="cluster-panel__title">Cluster graph playground</div>
			<div className="cluster-panel__stats">
				{model.atomCount} top-level shapes → {model.clusters.length} clusters · eps{' '}
				{Math.round(model.epsUsed)}
			</div>

			<div className="cluster-panel__section">Clustering</div>
			<Row label="Proximity linkage">
				<input
					type="checkbox"
					checked={settings.proximity}
					onChange={(e) => updateClusterSettings({ proximity: e.currentTarget.checked })}
				/>
			</Row>
			<Row label="Distance">
				<select
					value={settings.distance}
					onChange={(e) =>
						updateClusterSettings({ distance: e.currentTarget.value as TLClusterDistanceMetric })
					}
				>
					<option value="gap">bounds gap</option>
					<option value="center">center to center</option>
				</select>
			</Row>
			<Row label="Auto eps">
				<input
					type="checkbox"
					checked={settings.epsAuto}
					onChange={(e) => updateClusterSettings({ epsAuto: e.currentTarget.checked })}
				/>
			</Row>
			{settings.epsAuto ? (
				<Row label={`Auto eps scale ×${settings.epsMultiplier.toFixed(1)}`}>
					<input
						type="range"
						min={0.3}
						max={3}
						step={0.1}
						value={settings.epsMultiplier}
						onChange={(e) =>
							updateClusterSettings({ epsMultiplier: e.currentTarget.valueAsNumber })
						}
					/>
				</Row>
			) : (
				<Row label={`Manual eps ${settings.eps}`}>
					<input
						type="range"
						min={8}
						max={1200}
						step={8}
						value={settings.eps}
						onChange={(e) => updateClusterSettings({ eps: e.currentTarget.valueAsNumber })}
					/>
				</Row>
			)}
			<Row label="Containment merges">
				<input
					type="checkbox"
					checked={settings.containment}
					onChange={(e) => updateClusterSettings({ containment: e.currentTarget.checked })}
				/>
			</Row>
			<Row label="Arrow bindings">
				<select
					value={settings.bindingMode}
					onChange={(e) =>
						updateClusterSettings({ bindingMode: e.currentTarget.value as TLBindingClusterMode })
					}
				>
					<option value="ignore">ignore</option>
					<option value="merge">merge clusters</option>
					<option value="separate">annotations stay separate</option>
				</select>
			</Row>
			<Row label="Subclusters">
				<input
					type="checkbox"
					checked={settings.subclusters}
					onChange={(e) => updateClusterSettings({ subclusters: e.currentTarget.checked })}
				/>
			</Row>
			{settings.subclusters && (
				<Row label={`Subcluster eps ÷${settings.subclusterFactor}`}>
					<input
						type="range"
						min={2}
						max={8}
						step={0.5}
						value={settings.subclusterFactor}
						onChange={(e) =>
							updateClusterSettings({ subclusterFactor: e.currentTarget.valueAsNumber })
						}
					/>
				</Row>
			)}

			<div className="cluster-panel__section">Graph</div>
			<Row label="Spatial edges">
				<select
					value={settings.edgeMode}
					onChange={(e) =>
						updateClusterSettings({ edgeMode: e.currentTarget.value as TLClusterEdgeMode })
					}
				>
					<option value="delaunay">Delaunay</option>
					<option value="gabriel">Gabriel</option>
					<option value="rng">relative neighborhood</option>
					<option value="mst">minimum spanning tree</option>
					<option value="knn">k nearest neighbors</option>
					<option value="none">none</option>
				</select>
			</Row>
			{settings.edgeMode === 'knn' && (
				<Row label={`k = ${settings.knnK}`}>
					<input
						type="range"
						min={1}
						max={6}
						step={1}
						value={settings.knnK}
						onChange={(e) => updateClusterSettings({ knnK: e.currentTarget.valueAsNumber })}
					/>
				</Row>
			)}
			<Row label="Arrow edges">
				<input
					type="checkbox"
					checked={settings.showBindingEdges}
					onChange={(e) => updateClusterSettings({ showBindingEdges: e.currentTarget.checked })}
				/>
			</Row>
			<Row label="Keyword labels">
				<input
					type="checkbox"
					checked={settings.showLabels}
					onChange={(e) => updateClusterSettings({ showLabels: e.currentTarget.checked })}
				/>
			</Row>

			<div className="cluster-panel__actions">
				<TldrawUiButton type="normal" onClick={() => createDemoBoard(editor)}>
					Seed demo board
				</TldrawUiButton>
				<TldrawUiButton
					type="normal"
					onClick={() => {
						editor.run(() => {
							editor.selectNone()
							editor.deleteShapes(editor.getCurrentPageShapes())
						})
					}}
				>
					Clear canvas
				</TldrawUiButton>
			</div>

			<div className="cluster-panel__section">Agent view</div>
			{agentView ? (
				<pre className="cluster-panel__agent-view">{JSON.stringify(agentView, null, 1)}</pre>
			) : (
				<div className="cluster-panel__hint">
					Hover a cluster to preview the payload an agent would get for that node.
				</div>
			)}
		</div>
	)
}
