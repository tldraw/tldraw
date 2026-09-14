import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { react, useEditor, useValue } from 'tldraw'
import {
	type Corpus,
	detailNodes,
	detailZoom,
	type Layout,
	levelOpacities,
	type PlacedNode,
	rectCentre,
} from './layout'
import { frameRect } from './navigation'

/** Font size every node is laid out at before its own transform scales it. */
const LOGICAL_FONT = 16

/**
 * Writes one opacity per level onto the editor container as a CSS variable.
 * Every node at a depth shares that depth's opacity, so the crossfade costs one
 * style write per camera frame instead of a React render per node.
 */
function useLevelOfDetail(nominals: number[], detailFromDepth: number) {
	const editor = useEditor()
	useLayoutEffect(() => {
		const container = editor.getContainer()
		return react('semantic zoom level of detail', () => {
			const opacities = levelOpacities(nominals, editor.getZoomLevel())
			for (let depth = 0; depth < opacities.length; depth++) {
				const opacity = opacities[depth]
				container.style.setProperty(`--lod-${depth}`, opacity.toFixed(3))
				// Fully faded levels must stop painting, not just go transparent —
				// one level alone can be hundreds of blocks of text.
				container.style.setProperty(`--lod-${depth}-vis`, opacity < 0.005 ? 'hidden' : 'visible')
			}
			// Cross-references need their endpoints to be on the map to mean
			// anything, so they are held back behind the single opening sentence,
			// and dropped again once the reader is inside one passage's own text —
			// where an arc to somewhere off-screen is just noise across the page.
			let framing = opacities[0]
			for (let depth = detailFromDepth; depth < opacities.length; depth++) {
				framing += opacities[depth]
			}
			const links = Math.max(0, 1 - framing)
			container.style.setProperty('--link-opacity', links.toFixed(3))
			// While the arcs are up, keep the grid of leaf cells faintly drawn even
			// at zooms where their text is not. An arc between two cells you cannot
			// see is a line across the page; with the grid behind it, it is a map.
			const leafRules = Math.max(opacities[detailFromDepth - 1] ?? 0, links * 0.35)
			container.style.setProperty('--map-rule', leafRules.toFixed(3))
			container.style.setProperty('--map-rule-vis', leafRules < 0.005 ? 'hidden' : 'visible')
		})
	}, [editor, nominals, detailFromDepth])
}

function NodeView({
	node,
	matched,
	onSelect,
}: {
	node: PlacedNode
	matched: boolean
	onSelect?(node: PlacedNode): void
}) {
	const scale = node.fontSize / LOGICAL_FONT
	return (
		<div
			className={
				`sz-node sz-node--depth-${node.depth}` +
				(node.tint !== undefined ? ` sz-tint-${node.tint % 8}` : '') +
				(matched ? ' sz-node--match' : '')
			}
			style={{
				transform: `translate(${node.textRect.x}px, ${node.textRect.y}px) scale(${scale})`,
				width: node.textRect.w / scale,
				height: node.textRect.h / scale,
				fontSize: LOGICAL_FONT,
				columnCount: node.columns,
				opacity: `var(--lod-${node.depth})`,
				visibility: `var(--lod-${node.depth}-vis)` as CSSProperties['visibility'],
			}}
			onPointerDown={
				onSelect &&
				((e) => {
					e.stopPropagation()
					onSelect(node)
				})
			}
		>
			{node.title && <h2 className="sz-title">{node.title}</h2>}
			{node.text.split('\n\n').map((paragraph, i) => (
				<p key={i}>{paragraph}</p>
			))}
		</div>
	)
}

/** Cross-references, drawn as arcs between the centres of two cells. */
function LinkLayer({ layout, corpus }: { layout: Layout; corpus: Corpus }) {
	const arcs = useMemo(() => {
		if (!corpus.links?.length) return []
		return corpus.links.flatMap((link) => {
			const from = layout.byId.get(link.from)
			const to = layout.byId.get(link.to)
			if (!from || !to) return []
			const a = rectCentre(from.rect)
			const b = rectCentre(to.rect)
			// Bow each arc perpendicular to its own chord so that links sharing an
			// endpoint stay distinguishable instead of collapsing onto one line.
			const mx = (a.x + b.x) / 2
			const my = (a.y + b.y) / 2
			const dx = b.x - a.x
			const dy = b.y - a.y
			const length = Math.hypot(dx, dy) || 1
			const bow = Math.min(length * 0.22, 140)
			const cx = mx - (dy / length) * bow
			const cy = my + (dx / length) * bow
			return [{ ...link, d: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}` }]
		})
	}, [layout, corpus.links])

	if (!arcs.length) return null

	const { x, y, w, h } = layout.bounds
	const pad = w * 0.5
	return (
		<svg
			className="sz-links"
			viewBox={`${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`}
			style={{
				left: x - pad,
				top: y - pad,
				width: w + pad * 2,
				height: h + pad * 2,
			}}
		>
			{arcs.map((arc) => (
				<path key={`${arc.from}->${arc.to}`} className="sz-link" d={arc.d}>
					<title>{arc.label}</title>
				</path>
			))}
		</svg>
	)
}

export function ContentLayer({
	layout,
	corpus,
	matches,
}: {
	layout: Layout
	corpus: Corpus
	matches: ReadonlySet<string>
}) {
	const editor = useEditor()
	const detailFromDepth = layout.hasDetail ? layout.leaves[0].depth + 1 : layout.nominals.length
	useLevelOfDetail(layout.nominals, detailFromDepth)

	const loadZoom = useMemo(() => detailZoom(layout.nominals), [layout])
	const isDeep = useValue('is deep', () => editor.getZoomLevel() >= loadZoom, [editor, loadZoom])

	const [detail, setDetail] = useState<Record<string, string> | null>(null)
	useEffect(() => {
		if (!isDeep || detail || !corpus.loadDetail) return
		let cancelled = false
		corpus.loadDetail().then((loaded) => {
			if (!cancelled) setDetail(loaded)
		})
		return () => {
			cancelled = true
		}
	}, [isDeep, detail, corpus])

	// Returns a string so that panning within the same few leaves doesn't produce
	// a new array identity and re-render the whole layer.
	const visibleLeafIds = useValue(
		'visible leaves',
		() => {
			if (editor.getZoomLevel() < loadZoom) return ''
			const viewport = editor.getViewportPageBounds()
			return layout.leaves
				.filter(
					({ rect }) =>
						rect.x < viewport.maxX &&
						rect.x + rect.w > viewport.minX &&
						rect.y < viewport.maxY &&
						rect.y + rect.h > viewport.minY
				)
				.map((leaf) => leaf.id)
				.join(',')
		},
		[editor, layout, loadZoom]
	)

	const detailLevels = useMemo(() => {
		if (!detail || !visibleLeafIds) return []
		const wanted = new Set(visibleLeafIds.split(','))
		return layout.leaves
			.filter((leaf) => wanted.has(leaf.id))
			.flatMap((leaf) => {
				const text = detail[leaf.detailKey!]
				return text ? detailNodes(leaf, text, layout.excerptChars) : []
			})
	}, [detail, visibleLeafIds, layout])

	// Clicking text navigates, but only while the select tool is active. With any
	// drawing tool the layer stops taking pointers, so the whole book stays a
	// surface you can annotate rather than a wall of buttons.
	const isSelecting = useValue('is selecting', () => editor.getCurrentToolId() === 'select', [
		editor,
	])
	// Framing the cell, rather than settling at the level it belongs to, is what
	// makes a click mean "open this". Settling would be a no-op on the very node
	// the reader is already looking at, which is exactly the one they clicked.
	const onSelect = isSelecting ? (node: PlacedNode) => frameRect(editor, node.rect) : undefined

	return (
		<div className={`sz-layer${isSelecting ? ' sz-layer--interactive' : ''}`}>
			<LinkLayer layout={layout} corpus={corpus} />
			{layout.separators.map((rule, i) => {
				const isLeafGrid = rule.depth === detailFromDepth - 1
				return (
					<div
						key={i}
						className="sz-rule"
						style={{
							transform: `translate(${rule.x}px, ${rule.y}px)`,
							width: rule.w,
							height: rule.h,
							opacity: isLeafGrid ? 'var(--map-rule)' : `var(--lod-${rule.depth})`,
							visibility: (isLeafGrid
								? 'var(--map-rule-vis)'
								: `var(--lod-${rule.depth}-vis)`) as CSSProperties['visibility'],
						}}
					/>
				)
			})}
			{layout.nodes.map((node) => (
				<NodeView key={node.id} node={node} matched={matches.has(node.id)} onSelect={onSelect} />
			))}
			{detailLevels.map((node) => (
				<NodeView key={node.id} node={node} matched={false} />
			))}
		</div>
	)
}
