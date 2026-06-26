import { useState } from 'react'
import { Box, TLShapeId, useEditor, useValue } from 'tldraw'
import { GHOST_HEX, GhostShape, hexOf, Proposal } from './actions'
import { acceptProposal, proposals$, rejectProposal } from './proposals'
import { UIComponent } from './UIComponentShape'

// Ghosts are rendered through the `OnTheCanvas` slot, so everything here is in
// page coordinates and scales / pans with the camera, just like a real shape.
// Because the proposals never enter the store, we draw an approximation of each
// shape: built-in kinds get a dashed box or line; `ui` kinds render the *same*
// React component as the accepted shape, so the preview matches the result exactly.

/** Page-space bounding box of a ghost shape. */
function ghostBounds(g: GhostShape): Box {
	if (g.kind === 'arrow') {
		const end = g.end ?? { x: g.x + 120, y: g.y }
		const x = Math.min(g.x, end.x)
		const y = Math.min(g.y, end.y)
		return new Box(x, y, Math.abs(end.x - g.x) || 1, Math.abs(end.y - g.y) || 1)
	}
	return new Box(g.x, g.y, g.w ?? 160, g.h ?? 100)
}

// `OnTheCanvas` renders *behind* the shapes layer (see DefaultCanvas), so without
// this a freshly accepted shape would paint on top of the still-pending ghosts and
// hide them. We lift the whole ghost layer above any real shape with a large
// z-index base, and offset each ghost by its creation order so earlier proposals
// (e.g. a background card) stay behind later ones.
const GHOST_Z_BASE = 100_000

/** The `OnTheCanvas` layer: one ghost per proposal. */
export function GhostLayer() {
	const proposals = useValue('proposals', () => proposals$.get(), [])
	return (
		<>
			{proposals.map((proposal, i) => (
				<GhostProposal key={proposal.id} proposal={proposal} z={GHOST_Z_BASE + i} />
			))}
		</>
	)
}

function GhostProposal({ proposal, z }: { proposal: Proposal; z: number }) {
	const editor = useEditor()
	const [hovered, setHovered] = useState(false)
	// The camera zoom, so we can counter-scale the controls to a constant
	// on-screen size — otherwise they shrink to an un-clickable speck when zoomed
	// out and balloon when zoomed in.
	const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])

	// For create, bounds come from the ghost. For update/delete, bounds come from
	// the targeted real shape (reactive, so the ghost tracks the shape live).
	const bounds = useValue(
		'bounds',
		() => {
			if (proposal.kind === 'create') return ghostBounds(proposal.ghost)
			return editor.getShapePageBounds(proposal.targetId as TLShapeId) ?? null
		},
		[proposal, editor]
	)
	if (!bounds) return null

	const tint =
		proposal.kind === 'delete'
			? GHOST_HEX.red
			: proposal.kind === 'update'
				? GHOST_HEX.blue
				: hexOf(proposal.kind === 'create' ? proposal.ghost.color : undefined)

	// Dim the *visual* on hover (not the whole container) so the controls stay
	// crisp and fully opaque.
	const visualOpacity = hovered ? 1 : 0.55

	return (
		<div
			onPointerEnter={() => setHovered(true)}
			onPointerLeave={() => setHovered(false)}
			onPointerDown={editor.markEventAsHandled}
			style={{
				position: 'absolute',
				left: bounds.x,
				top: bounds.y,
				width: bounds.w,
				height: bounds.h,
				zIndex: z,
				pointerEvents: 'all',
			}}
		>
			{proposal.kind === 'create' && (
				<GhostVisual ghost={proposal.ghost} bounds={bounds} opacity={visualOpacity} />
			)}
			{proposal.kind === 'update' && <Halo color={tint} opacity={visualOpacity} />}
			{proposal.kind === 'delete' && <Halo color={tint} opacity={visualOpacity} struck />}

			{/* Always visible, and counter-scaled to a constant on-screen size, so
			    they're easy to hit regardless of zoom or pointer position. */}
			<Controls
				intent={proposal.intent}
				tint={tint}
				zoom={zoom}
				onAccept={() => acceptProposal(editor, proposal.id)}
				onReject={() => rejectProposal(proposal.id)}
			/>
		</div>
	)
}

/** The dashed approximation of a created shape, filling the proposal box. */
function GhostVisual({
	ghost,
	bounds,
	opacity,
}: {
	ghost: GhostShape
	bounds: Box
	opacity: number
}) {
	const color = hexOf(ghost.color)

	// `ui` ghosts render the real component, dimmed, with a dashed proposal frame
	// around it — so the preview is pixel-identical to what accepting produces.
	if (ghost.kind === 'ui') {
		return (
			<div
				style={{
					position: 'relative',
					width: '100%',
					height: '100%',
					opacity,
					transition: 'opacity 0.12s ease',
				}}
			>
				<UIComponent
					w={bounds.w}
					h={bounds.h}
					variant={ghost.variant ?? 'button'}
					label={ghost.text ?? ''}
					accent={color}
				/>
				<div className="aga-frame" style={{ inset: -4, borderColor: color }} />
			</div>
		)
	}

	if (ghost.kind === 'arrow') {
		const pts = [{ x: ghost.x, y: ghost.y }, ghost.end ?? { x: ghost.x + 120, y: ghost.y }]
		const rel = pts.map((p) => `${p.x - bounds.x},${p.y - bounds.y}`).join(' ')
		return (
			<svg
				width={bounds.w}
				height={bounds.h}
				style={{ overflow: 'visible', display: 'block', opacity, transition: 'opacity 0.12s ease' }}
				viewBox={`0 0 ${bounds.w} ${bounds.h}`}
			>
				<polyline
					points={rel}
					fill="none"
					stroke={color}
					strokeWidth={3}
					strokeDasharray="6 5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<ArrowHead pts={pts} bounds={bounds} color={color} />
			</svg>
		)
	}

	// Box-like shapes: rectangle, ellipse, text, note.
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				boxSizing: 'border-box',
				border: `2px dashed ${color}`,
				borderRadius: ghost.kind === 'ellipse' ? '50%' : ghost.kind === 'note' ? 4 : 8,
				background: ghost.kind === 'text' ? 'transparent' : `${color}14`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 8,
				color,
				fontSize: 14,
				fontWeight: 500,
				textAlign: 'center',
				overflow: 'hidden',
				opacity,
				transition: 'opacity 0.12s ease',
			}}
		>
			{ghost.text ?? ''}
		</div>
	)
}

function ArrowHead({
	pts,
	bounds,
	color,
}: {
	pts: { x: number; y: number }[]
	bounds: Box
	color: string
}) {
	const a = pts[0]
	const b = pts[pts.length - 1]
	const angle = Math.atan2(b.y - a.y, b.x - a.x)
	const size = 12
	const tip = { x: b.x - bounds.x, y: b.y - bounds.y }
	const left = {
		x: tip.x - size * Math.cos(angle - Math.PI / 6),
		y: tip.y - size * Math.sin(angle - Math.PI / 6),
	}
	const right = {
		x: tip.x - size * Math.cos(angle + Math.PI / 6),
		y: tip.y - size * Math.sin(angle + Math.PI / 6),
	}
	return (
		<polyline
			points={`${left.x},${left.y} ${tip.x},${tip.y} ${right.x},${right.y}`}
			fill="none"
			stroke={color}
			strokeWidth={3}
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	)
}

/** A dashed halo drawn over an existing shape (for update / delete proposals). */
function Halo({ color, opacity, struck }: { color: string; opacity: number; struck?: boolean }) {
	return (
		<div
			style={{
				position: 'absolute',
				inset: -6,
				border: `2px dashed ${color}`,
				borderRadius: 8,
				background: `${color}12`,
				opacity,
				transition: 'opacity 0.12s ease',
			}}
		>
			{struck && (
				<svg width="100%" height="100%" style={{ display: 'block' }} preserveAspectRatio="none">
					<line x1="0" y1="0" x2="100%" y2="100%" stroke={color} strokeWidth={2} />
					<line x1="100%" y1="0" x2="0" y2="100%" stroke={color} strokeWidth={2} />
				</svg>
			)}
		</div>
	)
}

function Controls({
	intent,
	tint,
	zoom,
	onAccept,
	onReject,
}: {
	intent: string
	tint: string
	zoom: number
	onAccept(): void
	onReject(): void
}) {
	return (
		// Anchored to the ghost's top-left corner and scaled by 1/zoom around that
		// corner, so the bar keeps a constant on-screen size and stays pinned just
		// above the ghost at any zoom level.
		<div className="aga-controls" style={{ transform: `scale(${1 / zoom})` }}>
			<span className="aga-pill" style={{ background: tint }}>
				✨ {intent}
			</span>
			<button
				className="aga-ghost-btn aga-ghost-btn--accept"
				style={{ background: tint }}
				onClick={onAccept}
			>
				Accept
			</button>
			<button className="aga-ghost-btn" onClick={onReject}>
				Reject
			</button>
		</div>
	)
}
