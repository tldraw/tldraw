import { useMemo, useRef, useState } from 'react'
import { commentSchemaRecords, createTLSchema, createTLStore } from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'
import { CanvasView } from './CanvasView'
import { exportNodeAsPng } from './export-png'
import { GalleryView } from './GalleryView'
import { BRAND_THEMES, brandThemesCss } from './themes'
import './brand-themes.css'

// The brand registry, serialized once into the stylesheet the app mounts — see themes.ts for
// what a brand is and brand-themes.css for the rules that consume the tokens.
const THEME_CSS = brandThemesCss(BRAND_THEMES)

export default function CommentBrandGalleryExample() {
	const [mode, setMode] = useState<'gallery' | 'canvas'>('gallery')
	const [themeId, setThemeId] = useState('midnight')
	const [exporting, setExporting] = useState(false)
	const stageRefs = useRef(new Map<string, HTMLDivElement>())
	const canvasRef = useRef<HTMLDivElement>(null)

	// The store outlives the mode toggle, so comments you post in canvas mode survive a trip to
	// the gallery and back.
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	// Export rasterizes a DOM node (via html-to-image) at 2x with no background color, so the PNG
	// is transparent everywhere the comment UI didn't paint — ready to drop onto a slide.
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
This example shows how far the commenting UI can be pushed visually: eighteen "brands", each a
complete restyle of the same components, plus transparent-PNG export of any of them.

A brand is pure data — a map of CSS custom properties in themes.ts. Everything the commenting UI
draws is a `tlui-cmt-*` class styled through tldraw's tokens, so redefining `--tl-color-*`, the
radii, and the marker shadows restyles most of the surface; example-level `--brand-*` tokens
(consumed by one generic rule block in brand-themes.css) cover the rest — fonts, borders,
gradients, pin shapes. The registry is serialized into a stylesheet at runtime, which is what
will let a future theme be edited live.

The gallery (GalleryView) renders the same demo thread once per brand using the SDK's
presentational components — no store, no editor, and the tiles are editable working mockups. The
live canvas (CanvasView) is the full commenting experience with the same attribute on its
wrapper, so the two surfaces share every theme.
*/
