import { useMemo, useRef, useState } from 'react'
import { commentSchemaRecords, createTLSchema, createTLStore } from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'
import { CanvasView } from './CanvasView'
import { exportNodeAsPng } from './export-png'
import { GalleryView } from './GalleryView'
import { BRAND_THEMES, brandThemesCss } from './themes'
import './brand-themes.css'

// [1]
const THEME_CSS = brandThemesCss(BRAND_THEMES)

export default function CommentBrandGalleryExample() {
	const [mode, setMode] = useState<'gallery' | 'canvas'>('gallery')
	const [themeId, setThemeId] = useState('midnight')
	const [exporting, setExporting] = useState(false)
	const stageRefs = useRef(new Map<string, HTMLDivElement>())
	const canvasRef = useRef<HTMLDivElement>(null)

	// [2]
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	// [3]
	const registerStage = (id: string, node: HTMLDivElement | null) => {
		if (node) stageRefs.current.set(id, node)
		else stageRefs.current.delete(id)
	}

	const exportOne = async (id: string) => {
		const node = stageRefs.current.get(id)
		if (node) await exportNodeAsPng(node, `comments-${id}`)
	}

	const exportAll = async () => {
		setExporting(true)
		try {
			for (const theme of BRAND_THEMES) {
				await exportOne(theme.id)
				// Browsers throttle bursts of programmatic downloads; a beat between each keeps all
				// eighteen arriving.
				await new Promise((resolve) => setTimeout(resolve, 350))
			}
		} finally {
			setExporting(false)
		}
	}

	const exportOpenThread = async () => {
		const node = canvasRef.current?.querySelector<HTMLElement>('.tlui-cmt-thread')
		if (node) await exportNodeAsPng(node, `comments-${themeId}-thread`)
	}

	return (
		<div className="bcg-root">
			<style>{THEME_CSS}</style>
			<div className="bcg-topbar">
				<span className="bcg-topbar__title">Comment brand gallery</span>
				<div className="bcg-seg">
					<button
						className="bcg-seg__btn"
						data-active={mode === 'gallery'}
						onClick={() => setMode('gallery')}
					>
						Gallery
					</button>
					<button
						className="bcg-seg__btn"
						data-active={mode === 'canvas'}
						onClick={() => setMode('canvas')}
					>
						Live canvas
					</button>
				</div>
				{mode === 'gallery' ? (
					<>
						<button className="bcg-btn" onClick={exportAll} disabled={exporting}>
							{exporting ? 'Exporting…' : 'Export all as PNG'}
						</button>
						<span className="bcg-hint">
							Click text or names to edit the copy, and click reactions to toggle them. Exports are
							transparent PNGs.
						</span>
					</>
				) : (
					<>
						<div className="bcg-chips">
							{BRAND_THEMES.map((theme) => (
								<button
									key={theme.id}
									className="bcg-chip"
									data-active={theme.id === themeId}
									onClick={() => setThemeId(theme.id)}
								>
									{theme.name}
								</button>
							))}
						</div>
						<button className="bcg-btn" onClick={exportOpenThread}>
							Export open thread
						</button>
					</>
				)}
			</div>

			{mode === 'gallery' ? (
				<GalleryView registerStage={registerStage} onExport={exportOne} />
			) : (
				<CanvasView store={store} themeId={themeId} containerRef={canvasRef} />
			)}
		</div>
	)
}

/*
This example shows that the commenting UI has no fixed look: the same components restyle into
eighteen completely different products. Everything the layer draws is a `tlui-cmt-*` class driven
by CSS tokens, so a style is data, not code.

[1]
Each style in themes.ts is a map of custom properties: tldraw's own tokens (`--tl-color-*`,
radii, marker shadows) restyle most of the surface, and example-level `--brand-*` tokens —
consumed by one generic rule block in brand-themes.css — cover fonts, borders, gradients, and
pin shapes. `brandThemesCss` serializes the registry into the stylesheet mounted here, and the
`data-comment-theme` attribute picks which style an element tree gets. One mechanism styles both
surfaces: the gallery's standalone components and the live canvas layer.

[2]
The store outlives the mode toggle, so comments posted in canvas mode survive a trip to the
gallery and back. Comment records are part of the store's schema, exactly like shapes.

[3]
Exports rasterize a styled DOM node (via html-to-image) at 2x with no background color, so the
PNG is transparent everywhere the comment UI didn't paint. The gallery exports any tile — with
whatever copy has been typed into it — and canvas mode exports the open thread in the active
style.
*/
