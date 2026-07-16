import {
	CommentPin,
	computeClusterTable,
	CountBadge,
	createClusterRuntime,
	type LeafInput,
} from '@tldraw/commenting'
import { useMemo } from 'react'
import { Editor, TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './comment-clustering.css'

// Comment anchors in page space: two loose groups that merge into single badges as you zoom out.
const LEAVES: (LeafInput & { label: string })[] = [
	{ id: 'a', label: 'J', point: { x: 250, y: 140 } },
	{ id: 'b', label: 'M', point: { x: 300, y: 170 } },
	{ id: 'c', label: 'A', point: { x: 265, y: 220 } },
	{ id: 'd', label: 'S', point: { x: 470, y: 250 } },
	{ id: 'e', label: 'K', point: { x: 515, y: 285 } },
]

// The editor's zoom range, matching how the commenting overlay derives it.
function zoomBounds(editor: Editor) {
	const opts = editor.getCameraOptions()
	const base = opts.constraints ? editor.getBaseZoom() : 1
	const steps = opts.zoomSteps
	return { minZoom: steps[0] * base, maxZoom: steps[steps.length - 1] * base }
}

// Rendered as a tldraw component slot, so it lives inside the editor's themed container — that's
// what gives `CommentPin`/`CountBadge` their colors, since those read tldraw's CSS tokens.
function ClusterLayer() {
	const editor = useEditor()

	// `computeClusterTable` precomputes, for the full zoom range, which anchors merge and at what
	// zoom. The runtime then just looks up the current zoom — cheap enough to run every camera move.
	const runtime = useMemo(() => {
		const rt = createClusterRuntime(computeClusterTable(LEAVES, zoomBounds(editor)))
		rt.seed(editor.getZoomLevel())
		return rt
	}, [editor])

	// Track the whole camera, not just zoom: clustering re-flows on zoom, but the pins' screen
	// positions must also follow x/y so they stay glued to the page as you pan.
	const camera = useValue('camera', () => editor.getCamera(), [editor])
	const nodes = useMemo(() => {
		runtime.onCamera(camera.z)
		return Array.from(runtime.getVisible().values())
	}, [runtime, camera.z])

	const labelById = useMemo(() => new Map(LEAVES.map((l) => [l.id, l.label])), [])

	return (
		<div className="comment-clustering__layer">
			{nodes.map((node) => {
				const p = editor.pageToViewport(node.centroid)
				const style = { left: p.x, top: p.y }
				// A single-member node renders as a pin; a merged node as a count badge.
				return (
					<div key={node.id} className="comment-clustering__marker" style={style}>
						{node.count === 1 ? (
							<CommentPin>{labelById.get(node.members[0]) ?? '?'}</CommentPin>
						) : (
							<CountBadge count={node.count} />
						)}
					</div>
				)
			})}
			<div className="comment-clustering__hint">Zoom out to cluster (⌘/ctrl-scroll or pinch)</div>
		</div>
	)
}

export default function CommentClusteringExample() {
	const components = useMemo<TLComponents>(() => ({ InFrontOfTheCanvas: ClusterLayer }), [])
	return (
		<div className="tldraw__editor">
			<Tldraw hideUi components={components} />
		</div>
	)
}
