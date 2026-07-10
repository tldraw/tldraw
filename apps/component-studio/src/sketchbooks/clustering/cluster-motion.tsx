/* eslint-disable tldraw/jsx-no-literals */
import { CommentPin, CountBadge } from '@tldraw/commenting'
import {
	computeClusterTable,
	createClusterRuntime,
	type LeafInput,
} from '@tldraw/commenting/canvas'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import './cluster-motion.css'

const LEAVES: (LeafInput & { label: string })[] = [
	{ id: 'a', label: 'J', point: { x: 250, y: 140 } },
	{ id: 'b', label: 'M', point: { x: 300, y: 170 } },
	{ id: 'c', label: 'A', point: { x: 265, y: 220 } },
	{ id: 'd', label: 'S', point: { x: 470, y: 250 } },
	{ id: 'e', label: 'K', point: { x: 515, y: 285 } },
]

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
// Fraction of the remaining gap each pin closes per frame — the spring stiffness.
const EASE = 0.18
// Page-space distance over which a merging pin fades out and its badge fades in.
const FADE = 34

function zoomBounds(editor: Editor) {
	const opts = editor.getCameraOptions()
	const base = opts.constraints ? editor.getBaseZoom() : 1
	const steps = opts.zoomSteps
	return { minZoom: steps[0] * base, maxZoom: steps[steps.length - 1] * base }
}

interface PinFrame {
	id: string
	label: string
	x: number
	y: number
	opacity: number
}
interface BadgeFrame {
	id: string
	count: number
	x: number
	y: number
	opacity: number
}

/**
 * Spike: Megan's clustering decision + a convergence animation. Her runtime decides which cluster
 * each pin is in at the current zoom (hysteresis and all); a per-frame spring in page space glides
 * each pin toward its cluster's centroid, and the count badge fades in as they gather. Rendering
 * through `pageToViewport` each frame keeps camera tracking instant.
 */
export function ClusterMotion() {
	const [editor, setEditor] = useState<Editor | null>(null)
	return (
		<div className="cm-scene">
			<Tldraw hideUi onMount={(e) => setEditor(e)} />
			{editor && <MotionLayer editor={editor} />}
			<div className="cm-hint">Zoom to merge / split (⌘/ctrl-scroll or pinch)</div>
		</div>
	)
}

function MotionLayer({ editor }: { editor: Editor }) {
	const runtime = useMemo(() => {
		const table = computeClusterTable(LEAVES, zoomBounds(editor))
		const rt = createClusterRuntime(table)
		rt.seed(editor.getZoomLevel())
		return rt
	}, [editor])

	// Each leaf's animated page-space position (mutated in place by the spring).
	const posRef = useRef(new Map(LEAVES.map((l) => [l.id, { ...l.point }])))
	// Seed the first frame synchronously (pins at their anchors) so there's never a blank frame
	// before rAF starts — rAF only drives the animation from here.
	const [frame, setFrame] = useState<{ pins: PinFrame[]; badges: BadgeFrame[] }>(() => ({
		pins: LEAVES.map((l) => {
			const s = editor.pageToViewport(l.point)
			return { id: l.id, label: l.label, x: s.x, y: s.y, opacity: 1 }
		}),
		badges: [],
	}))

	useEffect(() => {
		const labels = new Map(LEAVES.map((l) => [l.id, l.label]))
		const pos = posRef.current
		let raf = 0

		const step = () => {
			runtime.onCamera(editor.getZoomLevel())
			const visible = runtime.getVisible()

			// Megan's decision: which cluster each leaf is in now (its centroid, and whether merged).
			const info = new Map<string, { centroid: { x: number; y: number }; merged: boolean }>()
			for (const node of visible.values()) {
				for (const id of node.members)
					info.set(id, { centroid: node.centroid, merged: node.count > 1 })
			}

			// Spring each leaf toward its cluster centroid, in page space.
			for (const leaf of LEAVES) {
				const to = info.get(leaf.id)?.centroid ?? leaf.point
				const cur = pos.get(leaf.id)!
				cur.x += (to.x - cur.x) * EASE
				cur.y += (to.y - cur.y) * EASE
			}

			// A pin in a merged cluster fades out as it nears the centroid; a singleton stays solid.
			const pins: PinFrame[] = LEAVES.map((leaf) => {
				const cur = pos.get(leaf.id)!
				const s = editor.pageToViewport(cur)
				const leafInfo = info.get(leaf.id)
				const gap = leafInfo
					? Math.hypot(cur.x - leafInfo.centroid.x, cur.y - leafInfo.centroid.y)
					: 0
				const opacity = leafInfo?.merged ? clamp01(gap / FADE) : 1
				return { id: leaf.id, label: labels.get(leaf.id)!, x: s.x, y: s.y, opacity }
			})

			const badges: BadgeFrame[] = []
			for (const node of visible.values()) {
				if (node.count <= 1) continue
				// the badge fades in as its members gather under it — crossfading with the pins
				let maxGap = 0
				for (const id of node.members) {
					const cur = pos.get(id)!
					maxGap = Math.max(maxGap, Math.hypot(cur.x - node.centroid.x, cur.y - node.centroid.y))
				}
				const s = editor.pageToViewport(node.centroid)
				badges.push({
					id: node.id,
					count: node.count,
					x: s.x,
					y: s.y,
					opacity: clamp01(1 - maxGap / FADE),
				})
			}

			setFrame({ pins, badges })
			raf = requestAnimationFrame(step)
		}

		raf = requestAnimationFrame(step)
		return () => cancelAnimationFrame(raf)
	}, [editor, runtime])

	return (
		<div className="cm-layer">
			{frame.pins.map((p) => (
				<div key={p.id} className="cm-marker" style={{ left: p.x, top: p.y, opacity: p.opacity }}>
					<CommentPin>{p.label}</CommentPin>
				</div>
			))}
			{frame.badges.map((b) => (
				<div key={b.id} className="cm-marker" style={{ left: b.x, top: b.y, opacity: b.opacity }}>
					<CountBadge count={b.count} />
				</div>
			))}
		</div>
	)
}
