/* eslint-disable tldraw/jsx-no-literals */
import { CommentPin, CountBadge } from '@tldraw/commenting'
import {
	computeClusterTable,
	createClusterRuntime,
	type LeafInput,
} from '@tldraw/commenting/canvas'
import { useMemo, useState } from 'react'
import { Editor, Tldraw, useValue } from 'tldraw'
import './clustering-demo.css'

// Comment anchors in page space — two loose groups that merge as you zoom out. Driven through
// Megan's real clustering pipeline, so the merge/split behaviour (MST + zMerge/zSplit hysteresis)
// is the actual product logic, not a mock.
const LEAVES: (LeafInput & { label: string })[] = [
	{ id: 'a', label: 'J', point: { x: 250, y: 140 } },
	{ id: 'b', label: 'M', point: { x: 300, y: 170 } },
	{ id: 'c', label: 'A', point: { x: 265, y: 220 } },
	{ id: 'd', label: 'S', point: { x: 470, y: 250 } },
	{ id: 'e', label: 'K', point: { x: 515, y: 285 } },
]

// The editor's zoom range, as the overlay computes it (private there, replicated here).
function zoomBounds(editor: Editor) {
	const opts = editor.getCameraOptions()
	const base = opts.constraints ? editor.getBaseZoom() : 1
	const steps = opts.zoomSteps
	return { minZoom: steps[0] * base, maxZoom: steps[steps.length - 1] * base }
}

export function ClusteringDemo() {
	const [editor, setEditor] = useState<Editor | null>(null)
	return (
		<div className="cd-scene">
			<Tldraw hideUi onMount={(e) => setEditor(e)} />
			{editor && <ClusterLayer editor={editor} />}
			<div className="cd-hint">Zoom out to cluster (⌘/ctrl-scroll or pinch)</div>
		</div>
	)
}

function ClusterLayer({ editor }: { editor: Editor }) {
	const runtime = useMemo(() => {
		const table = computeClusterTable(LEAVES, zoomBounds(editor))
		const rt = createClusterRuntime(table)
		rt.seed(editor.getZoomLevel())
		return rt
	}, [editor])

	const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])
	const nodes = useMemo(() => {
		runtime.onCamera(zoom)
		return Array.from(runtime.getVisible().values())
	}, [runtime, zoom])

	const labelById = useMemo(() => new Map(LEAVES.map((l) => [l.id, l.label])), [])

	return (
		<div className="cd-layer">
			{nodes.map((node) => {
				const p = editor.pageToViewport(node.centroid)
				const style = { left: p.x, top: p.y }
				if (node.count === 1) {
					return (
						<div key={node.id} className="cd-marker" style={style}>
							<CommentPin>{labelById.get(node.members[0]) ?? '?'}</CommentPin>
						</div>
					)
				}
				return (
					<div key={node.id} className="cd-marker" style={style}>
						<CountBadge count={node.count} />
					</div>
				)
			})}
		</div>
	)
}
