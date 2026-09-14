import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { react, useEditor, useValue } from 'tldraw'
import { nominalFonts, placedNodes } from './book'
import { chapterTextZoom, layoutChapterText, levelOpacities, type PlacedNode } from './layout'

/** Font size every node is laid out at before its own transform scales it. */
const LOGICAL_FONT = 16

interface Chapter {
	n: number
	title: string
	text: string
}

let chaptersPromise: Promise<Chapter[]> | null = null
function loadChapters() {
	// 1.2MB of Melville, fetched once and only if someone zooms in that far.
	chaptersPromise ??= import('./chapters.json').then((m) => m.default as Chapter[])
	return chaptersPromise
}

/**
 * Writes one opacity per level onto the editor container as a CSS variable.
 * Every node at a depth shares that depth's opacity, so the crossfade costs one
 * style write per camera frame instead of a React render per node.
 */
function useLevelOfDetail(nominals: number[]) {
	const editor = useEditor()
	useLayoutEffect(() => {
		const container = editor.getContainer()
		return react('book level of detail', () => {
			const opacities = levelOpacities(nominals, editor.getZoomLevel())
			for (let depth = 0; depth < opacities.length; depth++) {
				const opacity = opacities[depth]
				container.style.setProperty(`--lod-${depth}`, opacity.toFixed(3))
				// Fully faded levels must stop painting, not just go transparent —
				// the chapter level alone is 136 blocks of text.
				container.style.setProperty(`--lod-${depth}-vis`, opacity < 0.005 ? 'hidden' : 'visible')
			}
		})
	}, [editor, nominals])
}

function NodeView({ node }: { node: PlacedNode }) {
	const scale = node.fontSize / LOGICAL_FONT
	return (
		<div
			className={`mdz-node mdz-node--depth-${node.depth}`}
			style={{
				transform: `translate(${node.rect.x}px, ${node.rect.y}px) scale(${scale})`,
				width: node.rect.w / scale,
				height: node.rect.h / scale,
				fontSize: LOGICAL_FONT,
				columnCount: node.columns,
				opacity: `var(--lod-${node.depth})`,
				visibility: `var(--lod-${node.depth}-vis)` as CSSProperties['visibility'],
			}}
		>
			{node.title && <h2 className="mdz-title">{node.title}</h2>}
			{node.text.split('\n\n').map((paragraph, i) => (
				<p key={i}>{paragraph}</p>
			))}
		</div>
	)
}

export function BookLayer() {
	const editor = useEditor()

	const leaves = useMemo(() => placedNodes.filter((node) => node.chapter !== undefined), [])
	const loadZoom = useMemo(() => chapterTextZoom(nominalFonts), [])

	useLevelOfDetail(nominalFonts)

	const isDeep = useValue('is deep', () => editor.getZoomLevel() >= loadZoom, [editor, loadZoom])

	const [chapters, setChapters] = useState<Chapter[] | null>(null)
	useEffect(() => {
		if (!isDeep || chapters) return
		let cancelled = false
		loadChapters().then((loaded) => {
			if (!cancelled) setChapters(loaded)
		})
		return () => {
			cancelled = true
		}
	}, [isDeep, chapters])

	// Returns a string so that panning within the same few chapters doesn't
	// produce a new array identity and re-render the whole layer.
	const visibleChapterIds = useValue(
		'visible chapters',
		() => {
			if (editor.getZoomLevel() < loadZoom) return ''
			const viewport = editor.getViewportPageBounds()
			return leaves
				.filter(
					({ rect }) =>
						rect.x < viewport.maxX &&
						rect.x + rect.w > viewport.minX &&
						rect.y < viewport.maxY &&
						rect.y + rect.h > viewport.minY
				)
				.map((leaf) => leaf.chapter)
				.join(',')
		},
		[editor, leaves, loadZoom]
	)

	const chapterTexts = useMemo(() => {
		if (!chapters || !visibleChapterIds) return []
		const wanted = new Set(visibleChapterIds.split(',').map(Number))
		return leaves
			.filter((leaf) => wanted.has(leaf.chapter!))
			.map((leaf) => layoutChapterText(leaf, chapters[leaf.chapter! - 1].text))
	}, [chapters, visibleChapterIds, leaves])

	return (
		<div className="mdz-layer">
			{placedNodes.map((node) => (
				<NodeView key={node.id} node={node} />
			))}
			{chapterTexts.map((node) => (
				<NodeView key={node.id} node={node} />
			))}
		</div>
	)
}
