import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	AssetRecordType,
	Box,
	Editor,
	TLAssetId,
	TLImageShape,
	TLShapeId,
	TLShapePartial,
	TLTextShape,
	Tldraw,
	TldrawUiButton,
	createShapeId,
	react,
	toRichText,
	useEditor,
	useSharedSafeId,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	ProjectedRect,
	bookshelfConfig,
	formatIsbn13,
	prettyPrefix,
	relativeIsbnToIsbn13,
} from './projection'
import { PUBLISHERS, PublisherEntry, lookupPublisher, parentToColor } from './publishers'
import { DATASETS, DatasetId, TILE_MANIFEST, tileUrl } from './tile-manifest'
import './isbn-map.css'

// [1]
const PROJECTION = bookshelfConfig({ width: 20000 })
const ZOOM_LEVEL = 3
const TILE_PREFIX = 'isbn-map-tile' as const
const LABEL_PREFIX = 'isbn-map-label' as const

// At what camera zoom we start drawing crisp book-spine rects on top of the
// tile PNG. The initial fit-max zoom is around 0.085 (fitting a 20k-wide
// map into a 1920px viewport), so we set this just above that so the
// initial view shows the clean downsampled tile heatmap, then spines kick
// in as soon as the user starts zooming.
const SPINES_MIN_ZOOM = 0.1
// Target on-screen width for each rendered spine -- the descent keeps
// subdividing until each emitted rect is around this many CSS pixels wide.
// 8-14px is a sweet spot: small enough that you see lots of books, big enough
// to clearly read as individual vertical spines.
const SPINE_TARGET_PX = 10
// Hard cap on how many spine rects we'll draw in a single render. With
// even-depth-only descent + viewport pruning + log10-locked target depth,
// the actual count stays well under this in practice; it's a safety net.
const MAX_SPINES = 20_000

// Language-group blocks for the minimap. Borrowed (and trimmed) from the
// upstream isbn-visualization's DEFAULT_BLOCKS. Only `00` and `01` are
// rendered with full opacity because those are the only prefixes we have
// tiles for; everything else is shown dimmed for context.
interface MinimapBlock {
	prefix: string
	label: string
	color: string
}
const MINIMAP_BLOCKS: MinimapBlock[] = [
	{ prefix: '00', label: 'EN', color: '#4a90e2' },
	{ prefix: '01', label: 'EN', color: '#4a90e2' },
	{ prefix: '02', label: 'FR', color: '#50c878' },
	{ prefix: '03', label: 'DE', color: '#daa520' },
	{ prefix: '04', label: 'JP', color: '#ff6b6b' },
	{ prefix: '05', label: 'RU', color: '#9370db' },
	{ prefix: '07', label: 'CN', color: '#ff4500' },
	{ prefix: '08', label: 'INT', color: '#888' },
	{ prefix: '09', label: 'INT', color: '#888' },
	{ prefix: '110', label: 'FR', color: '#50c878' },
	{ prefix: '111', label: 'KR', color: '#ff8c69' },
	{ prefix: '112', label: 'IT', color: '#6ec96e' },
	{ prefix: '113', label: 'ES', color: '#cc6666' },
	{ prefix: '118', label: 'US', color: '#4169e1' },
]
const HAS_TILES = (prefix: string) => prefix.startsWith('00') || prefix.startsWith('01')

function tileShapeId(prefix: string): TLShapeId {
	return createShapeId(`${TILE_PREFIX}-${prefix}`)
}
function tileAssetId(dataset: DatasetId, zoom: number, prefix: string): TLAssetId {
	return AssetRecordType.createId(`${dataset}-z${zoom}-${prefix}`)
}
function labelShapeId(index: number): TLShapeId {
	return createShapeId(`${LABEL_PREFIX}-${index}`)
}

// Memoised lazily because Box can't be a top-level constant (it'd run before
// the projection is wired up by the import graph in some bundlers).
let _mapBounds: Box | null = null
function getMapBounds(): Box {
	if (_mapBounds) return _mapBounds
	const tiles = TILE_MANIFEST.publishers[ZOOM_LEVEL]
	const rects = tiles.map((p) => PROJECTION.prefixToCoords(p))
	const minX = Math.min(...rects.map((r) => r.x))
	const minY = Math.min(...rects.map((r) => r.y))
	const maxX = Math.max(...rects.map((r) => r.x + r.width))
	const maxY = Math.max(...rects.map((r) => r.y + r.height))
	_mapBounds = new Box(minX, minY, maxX - minX, maxY - minY)
	return _mapBounds
}

// [2]
function loadDataset(editor: Editor, dataset: DatasetId) {
	const tiles = TILE_MANIFEST[dataset][ZOOM_LEVEL]

	editor.run(
		() => {
			editor.createAssets(
				tiles.map((prefix) => {
					const rect = PROJECTION.prefixToCoords(prefix)
					return {
						id: tileAssetId(dataset, ZOOM_LEVEL, prefix),
						typeName: 'asset' as const,
						type: 'image' as const,
						meta: {},
						props: {
							w: rect.width,
							h: rect.height,
							mimeType: 'image/png',
							src: tileUrl(dataset, ZOOM_LEVEL, prefix),
							name: `${dataset}-${prefix}`,
							isAnimated: false,
						},
					}
				})
			)

			const partials: TLShapePartial<TLImageShape>[] = tiles.map((prefix) => {
				const rect = PROJECTION.prefixToCoords(prefix)
				return {
					id: tileShapeId(prefix),
					type: 'image',
					x: rect.x,
					y: rect.y,
					isLocked: true,
					props: {
						assetId: tileAssetId(dataset, ZOOM_LEVEL, prefix),
						w: rect.width,
						h: rect.height,
					},
				}
			})

			const existingIds = new Set(editor.getCurrentPageShapeIds())
			const toCreate = partials.filter((p) => !existingIds.has(p.id))
			const toUpdate = partials.filter((p) => existingIds.has(p.id))

			if (toCreate.length) editor.createShapes(toCreate)
			if (toUpdate.length) editor.updateShapes(toUpdate)
		},
		{ history: 'ignore' }
	)
}

// [3]
function setLabelsVisible(editor: Editor, visible: boolean) {
	const ids = PUBLISHERS.map((_, i) => labelShapeId(i))
	const existing = new Set(editor.getCurrentPageShapeIds())

	editor.run(
		() => {
			if (!visible) {
				const toDelete = ids.filter((id) => existing.has(id))
				if (toDelete.length) editor.deleteShapes(toDelete)
				return
			}

			const partials = PUBLISHERS.map(buildLabelShape).filter((p) => !existing.has(p.id))
			if (partials.length) editor.createShapes(partials)
		},
		{ history: 'ignore' }
	)
}

function buildLabelShape(entry: PublisherEntry, index: number): TLShapePartial<TLTextShape> {
	const rect = PROJECTION.prefixToCoords(entry.relativePrefix)
	const scale = Math.max(0.5, Math.min(rect.width, rect.height) / 60)
	return {
		id: labelShapeId(index),
		type: 'text',
		x: rect.x + rect.width / 2,
		y: rect.y + rect.height / 2,
		isLocked: true,
		opacity: 0.9,
		props: {
			color: 'white',
			size: 's',
			font: 'sans',
			textAlign: 'middle',
			autoSize: true,
			scale,
			richText: toRichText(`${entry.name}\n${prettyPrefix(entry.relativePrefix)}`),
		},
	}
}

function fitMap(editor: Editor) {
	const bounds = getMapBounds()
	editor.zoomToBounds(bounds, { animation: { duration: 250 }, inset: 64 })
}

function TopPanel({
	dataset,
	onChangeDataset,
	showLabels,
	onToggleLabels,
}: {
	dataset: DatasetId
	onChangeDataset(id: DatasetId): void
	showLabels: boolean
	onToggleLabels(): void
}) {
	const editor = useEditor()
	const description = useMemo(
		() => DATASETS.find((d) => d.id === dataset)?.description ?? '',
		[dataset]
	)
	return (
		<div className="tlui-menu isbn-map-top-panel">
			<div className="isbn-map-top-panel__row">
				{DATASETS.map((d) => (
					<TldrawUiButton
						key={d.id}
						type={d.id === dataset ? 'primary' : 'normal'}
						onClick={() => onChangeDataset(d.id)}
					>
						{d.name}
					</TldrawUiButton>
				))}
				<div className="isbn-map-top-panel__divider" />
				<TldrawUiButton type="normal" onClick={onToggleLabels}>
					{showLabels ? 'Hide labels' : 'Show labels'}
				</TldrawUiButton>
				<TldrawUiButton type="normal" onClick={() => fitMap(editor)}>
					Fit map
				</TldrawUiButton>
			</div>
			<div className="isbn-map-top-panel__description">{description}</div>
		</div>
	)
}

// [4] What the cursor is currently pointing at, derived from the editor's
// current page point. Returns null if the cursor is outside the bundled tile
// region (i.e. somewhere we have no data for).
function useHoveredIsbn() {
	const editor = useEditor()
	return useValue(
		'hovered-isbn',
		() => {
			const point = editor.inputs.getCurrentPagePoint()
			const bounds = getMapBounds()
			if (
				point.x < bounds.minX ||
				point.x > bounds.maxX ||
				point.y < bounds.minY ||
				point.y > bounds.maxY
			) {
				return null
			}
			const relative = PROJECTION.coordsToRelativeIsbn(point.x, point.y)
			if (relative == null) return null
			const isbn13 = relativeIsbnToIsbn13(relative)
			const rect = PROJECTION.relativeIsbnToCoords(relative)
			return { relative, isbn13, rect }
		},
		[editor]
	)
}

interface BookInfo {
	title?: string
	subtitle?: string
	authors?: string[]
	publishedDate?: string
	publisher?: string
	thumbnail?: string
	description?: string
	link?: string
}

type BookInfoState = BookInfo | null | 'pending' | 'rate-limited'

// In-memory cache: `null` means "we asked Google Books and there was no
// match". `undefined` (key missing) means "we haven't asked yet". Module-level
// so it's shared across React re-mounts of the same example.
const bookInfoCache = new Map<string, BookInfo | null>()

// Google Books rate-limits anonymous requests aggressively (~100/day per IP).
// When we hit a 429 we pause further requests for a while so subsequent hovers
// don't make things worse.
let rateLimitedUntil = 0

// [5] Fetch book metadata from Google Books, debounced so casual mousing over
// the map doesn't fire hundreds of requests. Only fetches once the cursor has
// stayed on the same ISBN for FETCH_DELAY_MS, and only one request is ever in
// flight at a time.
const FETCH_DELAY_MS = 800

function useBookInfo(isbn13: string | null) {
	const [info, setInfo] = useState<BookInfoState>('pending')

	useEffect(() => {
		if (!isbn13) {
			setInfo('pending')
			return
		}
		const cached = bookInfoCache.get(isbn13)
		if (cached !== undefined) {
			setInfo(cached)
			return
		}
		if (Date.now() < rateLimitedUntil) {
			setInfo('rate-limited')
			return
		}
		setInfo('pending')
		let cancelled = false
		const handle = setTimeout(() => {
			fetchBookInfo(isbn13)
				.then((next) => {
					if (next === 'rate-limited') {
						if (!cancelled) setInfo('rate-limited')
						return
					}
					bookInfoCache.set(isbn13, next)
					if (!cancelled) setInfo(next)
				})
				.catch(() => {
					bookInfoCache.set(isbn13, null)
					if (!cancelled) setInfo(null)
				})
		}, FETCH_DELAY_MS)
		return () => {
			cancelled = true
			clearTimeout(handle)
		}
	}, [isbn13])

	return info
}

async function fetchBookInfo(isbn13: string): Promise<BookInfo | null | 'rate-limited'> {
	const res = await fetch(
		`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}&maxResults=1`
	)
	if (res.status === 429) {
		// Back off for a minute on rate-limit responses so we don't churn.
		rateLimitedUntil = Date.now() + 60_000
		return 'rate-limited'
	}
	if (!res.ok) return null
	const data = await res.json()
	const v = data.items?.[0]
	const vi = v?.volumeInfo
	if (!vi) return null
	return {
		title: vi.title,
		subtitle: vi.subtitle,
		authors: vi.authors,
		publishedDate: vi.publishedDate,
		publisher: vi.publisher,
		thumbnail: vi.imageLinks?.thumbnail?.replace('http://', 'https://'),
		description: vi.description,
		link: vi.infoLink,
	}
}

// [6] The bottom-of-screen info panel. Always shows the hovered ISBN +
// publisher synthesised from our local prefix table; opportunistically shows
// the title/author/thumbnail from Google Books once a fetch settles.
function HoverPanel() {
	const hovered = useHoveredIsbn()
	const isbn13 = hovered?.isbn13 ?? null
	const info = useBookInfo(isbn13)

	if (!hovered) return null

	const relativeStr = String(hovered.relative).padStart(10, '0')
	const publisher = lookupPublisher(relativeStr)
	const publisherColor = parentToColor(publisher?.parent, 0.85)

	return (
		<div className="isbn-map-hover-panel">
			<div className="isbn-map-hover-panel__primary">
				<div className="isbn-map-hover-panel__isbn">{formatIsbn13(hovered.isbn13)}</div>
				<div className="isbn-map-hover-panel__publisher" style={{ color: publisherColor }}>
					{publisher
						? `${publisher.name}${publisher.parent && publisher.parent !== publisher.name ? ` (${publisher.parent})` : ''}`
						: 'Unknown / unallocated range'}
				</div>
				<div className="isbn-map-hover-panel__prefix">
					prefix {prettyPrefix(publisher?.relativePrefix ?? relativeStr.slice(0, 4))}
				</div>
			</div>
			<div className="isbn-map-hover-panel__book">
				{info === 'pending' ? (
					<div className="isbn-map-hover-panel__status">Hold steady to look up…</div>
				) : info === 'rate-limited' ? (
					<div className="isbn-map-hover-panel__status">
						Google Books rate-limited — please wait a minute.
					</div>
				) : info === null ? (
					<div className="isbn-map-hover-panel__status">No book found at this ISBN.</div>
				) : (
					<>
						{info.thumbnail && (
							<img
								src={info.thumbnail}
								alt=""
								className="isbn-map-hover-panel__thumb"
								loading="lazy"
								referrerPolicy="no-referrer"
							/>
						)}
						<div className="isbn-map-hover-panel__bookbody">
							<div className="isbn-map-hover-panel__title">{info.title ?? '(no title)'}</div>
							{info.subtitle && (
								<div className="isbn-map-hover-panel__subtitle">{info.subtitle}</div>
							)}
							{info.authors && info.authors.length > 0 && (
								<div className="isbn-map-hover-panel__authors">{info.authors.join(', ')}</div>
							)}
							{(info.publisher || info.publishedDate) && (
								<div className="isbn-map-hover-panel__meta">
									{[info.publisher, info.publishedDate?.slice(0, 4)].filter(Boolean).join(' · ')}
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	)
}

// [7] Page-coords SVG that draws an outlined rect at the hovered book's exact
// projection rectangle. With vector-effect="non-scaling-stroke" the outline
// stays a constant 1.5px on screen regardless of zoom, so even when the rect
// itself is sub-pixel small it remains visible as a dot.
function HoveredBookHighlight() {
	const hovered = useHoveredIsbn()
	if (!hovered) return null
	const { rect } = hovered
	return (
		<svg
			className="isbn-map-highlight"
			style={{
				position: 'absolute',
				left: rect.x,
				top: rect.y,
				width: rect.width,
				height: rect.height,
				overflow: 'visible',
				pointerEvents: 'none',
			}}
			viewBox={`0 0 ${rect.width} ${rect.height}`}
		>
			<rect
				x={0}
				y={0}
				width={rect.width}
				height={rect.height}
				fill="rgba(255, 255, 255, 0.18)"
				stroke="white"
				strokeWidth={1.5}
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	)
}

// [8] Synthesised book-spine layer. At low zoom this returns null and the tile
// PNGs are the only thing visible. At high zoom we recursively descend the
// bookshelf projection, pruning subtrees that fall outside the viewport, and
// stop when each prefix's rect is small enough to count as a single "book".
// Each leaf is drawn as a vertical spine rect, coloured by its publisher.
function BookSpinesLayer() {
	const editor = useEditor()
	const cameraZoom = useValue('cam-z', () => editor.getCamera().z, [editor])
	// Coarse-grained viewport key. We pad the visible viewport by ~25% in
	// each direction *and* snap to a grid that's a quarter of the viewport
	// size, so small pans (where the camera moves within the padded zone)
	// produce the *same* key -- meaning the expensive descent + the React
	// reconciliation of thousands of <rect>s gets reused. Only meaningful
	// pans or zoom changes invalidate the cache.
	const viewportKey = useValue(
		'vp-key',
		() => {
			const vp = editor.getViewportPageBounds()
			const grid = Math.max(vp.width, vp.height) / 4
			const padX = vp.width * 0.25
			const padY = vp.height * 0.25
			const minX = Math.floor((vp.minX - padX) / grid) * grid
			const minY = Math.floor((vp.minY - padY) / grid) * grid
			const maxX = Math.ceil((vp.maxX + padX) / grid) * grid
			const maxY = Math.ceil((vp.maxY + padY) / grid) * grid
			return `${minX},${minY},${maxX},${maxY}`
		},
		[editor]
	)

	// Resolve the (padded) viewport bounds -- used both for descent pruning
	// and for sizing the output SVG to just the visible area. CRITICAL for
	// perf: otherwise the SVG element would be the size of the whole map in
	// page coords, which at deep zoom becomes a multi-million-pixel composite
	// layer and grinds the browser to a halt.
	const viewport = useMemo(() => {
		const [a, b, c, d] = viewportKey.split(',').map(Number)
		return { minX: a, minY: b, maxX: c, maxY: d, width: c - a, height: d - b }
	}, [viewportKey])

	const result = useMemo(() => {
		if (cameraZoom < SPINES_MIN_ZOOM) return null

		// Bookshelf projection cell aspects alternate by prefix length:
		//   even depths (2, 4, 6, 8, 10): tall vertical 0.32:1 -- book-shaped
		//   odd  depths (1, 3, 5, 7, 9):  wide horizontal 3.16:1 -- shelf-shaped
		// We ONLY emit rects at even depths so every visible spine looks
		// vertical, never "lying on its side".
		//
		// Choosing the right "even depth" for the current zoom: each pair of
		// digits divides cell width by 10, so the natural step between even
		// depths is 10x. We lock the rendered depth to the *shallowest* even
		// depth where cells are still no wider than SPINE_TARGET_PX * 10
		// CSS px. Using floor(log10) (rather than picking the first depth
		// that fits a tight bound) means the spine count stays in a narrow
		// band -- roughly ~600-6000 spines per viewport regardless of zoom,
		// which is what makes the spines layer fast at deep zoom.
		const cellWidthAtDepth2 = 2000 // page units; constant for the projection
		const idealK = Math.log10((cellWidthAtDepth2 * cameraZoom) / SPINE_TARGET_PX)
		const targetDepth = Math.min(10, Math.max(2, 2 * Math.max(1, Math.floor(idealK) + 1)))

		const out: { isbn: number; rect: ProjectedRect; entry: PublisherEntry | null }[] = []

		function emit(prefix: string, rect: ProjectedRect) {
			const padded = prefix.padEnd(10, '0')
			out.push({ isbn: +padded, rect, entry: lookupPublisher(padded) })
		}

		function descend(prefix: string) {
			if (out.length >= MAX_SPINES) return
			const rect = PROJECTION.prefixToCoords(prefix)
			if (
				rect.x + rect.width < viewport.minX ||
				rect.x > viewport.maxX ||
				rect.y + rect.height < viewport.minY ||
				rect.y > viewport.maxY
			) {
				return
			}
			if (prefix.length >= targetDepth || prefix.length === 10) {
				emit(prefix, rect)
				return
			}
			for (let d = 0; d < 10; d++) descend(prefix + d)
		}

		// Descend from each EAN prefix. Top digit '0' = 978, '1' = 979,
		// covering the entire valid ISBN space. (Other top digits 2-9 are
		// not used by ISBN-13.)
		descend('0')
		descend('1')
		return { books: out, targetDepth }
	}, [cameraZoom, viewport])

	const shadeId = useSharedSafeId('isbn-spine-shade')

	if (!result || result.books.length === 0) return null
	const { books, targetDepth } = result
	// Show an identifier down the centre of each spine whenever it's tall
	// enough on screen to fit a few readable characters -- not just at the
	// leaf depth. The label content adapts: at deep zoom (leaf depth 10) it
	// shows the book's distinctive last 5 ISBN-13 digits; at shallower
	// zooms it shows the spine's prefix tail (the digits that actually vary
	// between adjacent spines at that depth), so the labels still read as
	// distinct codes rather than identical "00000"s.
	const SPINE_TEXT_MIN_CSS_HEIGHT = 24

	// Borrowed (in spirit) from the upstream WebGL shader: each spine has
	// slightly variable width + height so adjacent books don't look
	// identical, sits on a red "shelf" cell-background (so the gaps between
	// spines and between rows form the iconic red gutter look), and gets a
	// single gradient overlay darkening the top + bottom so each rect reads
	// as a 3D book binding rather than a flat coloured rectangle.
	return (
		<svg
			className="isbn-map-spines"
			style={{
				position: 'absolute',
				// Size the SVG to the viewport, not the full map. This is the
				// big perf win at deep zoom -- the SVG element is now bounded
				// by the visible area instead of being the size of all of
				// ISBN space.
				left: viewport.minX,
				top: viewport.minY,
				width: viewport.width,
				height: viewport.height,
				overflow: 'visible',
				pointerEvents: 'none',
				// We share the .tl-html-layer parent with tldraw's shape
				// divs (the tile PNGs), which set z-index dynamically
				// starting at ~maxShapesPerPage. Set our z-index very high
				// so spines paint on top of the tile PNGs, otherwise the
				// upscaled blurry tile would cover the spines in the
				// English-language quadrants of the map.
				zIndex: 999_999,
				// Fade from 0 -> 1 over the first 2x of zoom past the
				// threshold, so the transition from tile heatmap to spines is
				// gradual instead of a hard pop.
				opacity: Math.min(1, (cameraZoom - SPINES_MIN_ZOOM) / SPINES_MIN_ZOOM),
			}}
			viewBox={`${viewport.minX} ${viewport.minY} ${viewport.width} ${viewport.height}`}
		>
			<defs>
				{/* Single object-bounding-box gradient reused by every spine
					to darken the head + tail of the book. One def, thousands
					of references -- much cheaper than baking shading into
					each rect's fill. */}
				<linearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="black" stopOpacity="0.7" />
					<stop offset="9%" stopColor="black" stopOpacity="0" />
					<stop offset="91%" stopColor="black" stopOpacity="0" />
					<stop offset="100%" stopColor="black" stopOpacity="0.75" />
				</linearGradient>
			</defs>
			{books.map(({ isbn, rect, entry }) => {
				// Per-book deterministic jitter so adjacent spines vary in
				// width and height. The leftover horizontal space becomes the
				// vertical gutter between spines, the leftover vertical space
				// (always at the bottom) becomes the red shelf strip.
				const r1 = hashFloat01(isbn * 2.3)
				const r2 = hashFloat01(isbn * 3.7)
				const wFrac = 0.78 + r1 * 0.18
				const hFrac = 0.84 + r2 * 0.14
				const w = rect.width * wFrac
				const h = rect.height * hFrac
				const x = rect.x + (rect.width - w) / 2
				const y = rect.y + (rect.height - h)
				const color = entry
					? parentToColor(entry.parent, 1)
					: `hsl(${(isbn * 137) % 360}, 35%, 55%)`
				const rx = w * 0.12
				// On-spine label: drawn down the centre of the spine, rotated
				// -90deg so it reads bottom-to-top (the convention used by
				// physical book spines on a shelf). Label is the up-to-5
				// digits of the spine's prefix that *change* between
				// adjacent spines at the current target depth, so neighbouring
				// labels are visibly different rather than identical.
				const spineHeightCss = h * cameraZoom
				let label: string | null = null
				let fontSize = 0
				if (spineHeightCss >= SPINE_TEXT_MIN_CSS_HEIGHT) {
					const padded = String(isbn).padStart(10, '0')
					const start = Math.max(0, targetDepth - 5)
					label = padded.slice(start, targetDepth)
					// Font size in page units: ~55% of spine width so a 5-char
					// label fits comfortably. The viewBox is in page units so
					// the font scales with camera zoom for free.
					fontSize = w * 0.55
				}
				const cx = rect.x + rect.width / 2
				const cy = rect.y + rect.height / 2
				// React fragment, not a <g>: no shared transform/opacity is
				// needed, and skipping the <g> saves one DOM node per spine
				// (thousands at deep zoom).
				return (
					<Fragment key={isbn}>
						{/* Cell-background: the visible red gutters + shelf line. */}
						<rect
							x={rect.x}
							y={rect.y}
							width={rect.width}
							height={rect.height}
							fill={SHELF_COLOR}
						/>
						{/* Spine body. */}
						<rect x={x} y={y} width={w} height={h} fill={color} rx={rx} ry={rx} />
						{/* Head + tail shading. */}
						<rect x={x} y={y} width={w} height={h} fill={`url(#${shadeId})`} rx={rx} ry={rx} />
						{label && (
							<text
								x={cx}
								y={cy}
								fill="rgba(255,255,255,0.9)"
								fontSize={fontSize}
								fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
								fontWeight={600}
								textAnchor="middle"
								dominantBaseline="central"
								transform={`rotate(-90 ${cx} ${cy})`}
								style={{ paintOrder: 'stroke', letterSpacing: '0.05em' }}
								stroke="rgba(0,0,0,0.55)"
								strokeWidth={fontSize * 0.12}
							>
								{label}
							</text>
						)}
					</Fragment>
				)
			})}
		</svg>
	)
}

// The "shelf" colour, lifted verbatim from the upstream's
// config.bookshelfColorHex. Showing it as the cell background turns every
// gap between two spines and every gap between two rows of spines into the
// iconic red bookshelf gutter.
const SHELF_COLOR = '#7f1a1a'

// Stable [0,1) hash for a numeric seed -- used to give each book deterministic
// but unique jitter on its width/height. Same formula as the upstream shader's
// rand() so neighbouring spines vary in the same way.
function hashFloat01(seed: number): number {
	const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
	return v - Math.floor(v)
}

// [9] Mini-map widget, modelled after the upstream isbn-visualization
// minimap. It shows the full 978/979 ISBN space (most of which we don't have
// tiles for, dimmed) with the major language groups labelled, plus an overlay
// rect for the current camera viewport. Clicking on a block we have tiles for
// flies the camera there; the viewport rect can also be dragged to pan.
function MiniMap() {
	const editor = useEditor()
	const viewport = useValue('mm-viewport', () => editor.getViewportPageBounds(), [editor])
	const mapWidth = PROJECTION.pixelWidth
	const mapHeight = PROJECTION.pixelHeight
	const dataBounds = getMapBounds()

	const flyTo = useCallback(
		(rect: { x: number; y: number; width: number; height: number }) => {
			const box = new Box(rect.x, rect.y, rect.width, rect.height)
			editor.zoomToBounds(box, { animation: { duration: 320 }, inset: 32 })
		},
		[editor]
	)

	const dragRef = useRef<{ active: boolean; svg: SVGSVGElement | null }>({
		active: false,
		svg: null,
	})

	const onPointerDown = useCallback(
		(e: React.PointerEvent<SVGSVGElement>) => {
			e.preventDefault()
			dragRef.current.active = true
			dragRef.current.svg = e.currentTarget
			e.currentTarget.setPointerCapture(e.pointerId)
			moveCameraToSvgPoint(e)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[editor]
	)
	const onPointerMove = useCallback(
		(e: React.PointerEvent<SVGSVGElement>) => {
			if (!dragRef.current.active) return
			moveCameraToSvgPoint(e)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[editor]
	)
	const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
		dragRef.current.active = false
		e.currentTarget.releasePointerCapture(e.pointerId)
	}, [])

	function moveCameraToSvgPoint(e: React.PointerEvent<SVGSVGElement>) {
		const svg = e.currentTarget
		const ctm = svg.getScreenCTM()
		if (!ctm) return
		const pt = svg.createSVGPoint()
		pt.x = e.clientX
		pt.y = e.clientY
		const local = pt.matrixTransform(ctm.inverse())
		// Centre the viewport on the clicked point, clamping to our data
		// region so users can't drag the camera off into the void.
		const halfW = viewport.width / 2
		const halfH = viewport.height / 2
		const cx = Math.max(dataBounds.minX + halfW, Math.min(dataBounds.maxX - halfW, local.x))
		const cy = Math.max(dataBounds.minY + halfH, Math.min(dataBounds.maxY - halfH, local.y))
		editor.zoomToBounds(new Box(cx - halfW, cy - halfH, viewport.width, viewport.height), {
			animation: { duration: 120 },
			inset: 0,
		})
	}

	return (
		<div className="isbn-map-minimap">
			<div className="isbn-map-minimap__title">ISBN map</div>
			<svg
				viewBox={`0 0 ${mapWidth} ${mapHeight}`}
				preserveAspectRatio="xMidYMid meet"
				className="isbn-map-minimap__svg"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			>
				{/* Faint backdrop showing the full ISBN space */}
				<rect x={0} y={0} width={mapWidth} height={mapHeight} fill="#181818" />
				{MINIMAP_BLOCKS.map((b) => {
					const rect = PROJECTION.prefixToCoords(b.prefix)
					const hasData = HAS_TILES(b.prefix)
					return (
						<g
							key={b.prefix}
							className="isbn-map-minimap__block"
							onClick={(e) => {
								if (!hasData) return
								e.stopPropagation()
								flyTo(rect)
							}}
							style={{ cursor: hasData ? 'pointer' : 'default' }}
						>
							<rect
								x={rect.x}
								y={rect.y}
								width={rect.width}
								height={rect.height}
								fill={b.color}
								opacity={hasData ? 0.85 : 0.22}
								stroke="rgba(255,255,255,0.15)"
								strokeWidth={mapWidth * 0.0015}
							/>
							<text
								x={rect.x + rect.width / 2}
								y={rect.y + rect.height / 2}
								textAnchor="middle"
								dominantBaseline="central"
								// Pick a readable font size that fits the block. The
								// 2-digit blocks are tall thin columns so they're bounded
								// by width; the 3-digit blocks are short wide rows so
								// they're bounded by height.
								fontSize={Math.min(rect.width * 0.5, rect.height * 0.5, 1200)}
								fill="white"
								opacity={hasData ? 1 : 0.4}
								pointerEvents="none"
								fontWeight={600}
							>
								{b.label}
							</text>
						</g>
					)
				})}
				{/* Current viewport overlay -- shows where the camera is. */}
				<rect
					x={viewport.minX}
					y={viewport.minY}
					width={viewport.width}
					height={viewport.height}
					fill="rgba(255,255,255,0.18)"
					stroke="white"
					strokeWidth={mapWidth * 0.004}
					pointerEvents="none"
				/>
			</svg>
		</div>
	)
}

export default function IsbnMapExample() {
	const [dataset, setDataset] = useState<DatasetId>('publishers')
	const [showLabels, setShowLabels] = useState(false)
	const editorRef = useRef<Editor | null>(null)

	const onMount = useCallback((editor: Editor) => {
		editorRef.current = editor

		// [9]
		editor.setCameraOptions({
			constraints: {
				bounds: getMapBounds(),
				padding: { x: 64, y: 64 },
				origin: { x: 0.5, y: 0.5 },
				initialZoom: 'fit-max',
				baseZoom: 'default',
				behavior: 'contain',
			},
			// Go all the way up to 128x so users can zoom in to where each
			// ISBN occupies several pixels on screen. The BookSpinesLayer
			// kicks in around 8x and renders crisp individual books from that
			// point on.
			zoomSteps: [0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128],
		})
		// Reset the camera so the new constraints' initialZoom (fit-max) is
		// applied immediately, the same trick the PDF editor uses.
		editor.setCamera(editor.getCamera(), { reset: true })

		editor.sideEffects.registerBeforeChangeHandler('shape', (_prev, next) => {
			if (!isOurShape(next.id)) return next
			if (next.isLocked) return next
			return { ...next, isLocked: true }
		})

		loadDataset(editor, 'publishers')

		return react('keep tiles below user shapes', () => {
			const allIds = editor.getSortedChildIdsForParent(editor.getCurrentPageId())
			const tileIds = allIds.filter((id) => id.startsWith(`shape:${TILE_PREFIX}`))
			if (tileIds.length === 0) return
			const firstNonTileIndex = allIds.findIndex((id) => !id.startsWith(`shape:${TILE_PREFIX}`))
			if (firstNonTileIndex === -1 || firstNonTileIndex >= tileIds.length) return
			editor.sendToBack(tileIds)
		})
	}, [])

	useEffect(() => {
		const editor = editorRef.current
		if (!editor) return
		loadDataset(editor, dataset)
	}, [dataset])

	useEffect(() => {
		const editor = editorRef.current
		if (!editor) return
		setLabelsVisible(editor, showLabels)
	}, [showLabels])

	const components = useMemo(
		() => ({
			// Keep just our custom UI: TopPanel for the dataset switcher, the
			// page-coords spine + highlight overlays, and the screen-coords
			// minimap + hover panel. Everything else from the default tldraw
			// UI shell is nulled out so the map reads as a focused, immersive
			// viewer rather than a drawing app.
			TopPanel: () => (
				<TopPanel
					dataset={dataset}
					onChangeDataset={setDataset}
					showLabels={showLabels}
					onToggleLabels={() => setShowLabels((v) => !v)}
				/>
			),
			OnTheCanvas: () => (
				<>
					<BookSpinesLayer />
					<HoveredBookHighlight />
				</>
			),
			InFrontOfTheCanvas: () => (
				<>
					<MiniMap />
					<HoverPanel />
				</>
			),
			MainMenu: null,
			Toolbar: null,
			StylePanel: null,
			ActionsMenu: null,
			PageMenu: null,
			NavigationPanel: null,
			QuickActions: null,
			HelperButtons: null,
			HelpMenu: null,
			DebugPanel: null,
			DebugMenu: null,
			ZoomMenu: null,
			SharePanel: null,
			MenuPanel: null,
		}),
		[dataset, showLabels]
	)

	return (
		<div className="tldraw__editor isbn-map-root">
			<Tldraw onMount={onMount} components={components} />
		</div>
	)
}

function isOurShape(id: TLShapeId): boolean {
	return id.startsWith(`shape:${TILE_PREFIX}`) || id.startsWith(`shape:${LABEL_PREFIX}`)
}

/*
[1] We use the same "bookshelf" projection as the upstream isbn-visualization
project, with width=20000 (matching the canvas size used to generate the
zoom-3 tiles). Each tile PNG is a snapshot of one prefix-aligned slice of
that 2D map; we just need to compute (x, y, w, h) for each.

[2] The PDF editor pattern: create one image asset and one image shape per
tile, locked so the user can't accidentally move them. Switching datasets
just updates the existing shapes' assetId props in place.

[3] A hand-curated set of well-known publisher labels rendered as ordinary
tldraw text shapes -- so users can edit, delete, or restyle them like any
other shape.

[4] useHoveredIsbn turns the editor's current page-point signal into a
concrete (relative, isbn13, rect) tuple. Returning a fresh object on every
movement is fine because useValue compares by equality at render time.

[5] Google Books gives us free, CORS-friendly metadata lookup by ISBN. We
debounce by FETCH_DELAY_MS so flicking over the map doesn't fire hundreds
of requests; results are cached in a module-level Map.

[6] The fixed-position panel lives in InFrontOfTheCanvas (so it doesn't
scale or pan with the camera). It always shows the projected ISBN +
publisher synthesised from our local table, and opportunistically renders
title/author/thumbnail once Google Books resolves.

[7] HoveredBookHighlight is placed in OnTheCanvas so its rect is positioned
in page coords and scales with the camera; the stroke uses non-scaling-
stroke so it stays crisp at every zoom level.

[8] BookSpinesLayer renders individual book rects by recursively descending
the projection's prefix tree, pruning subtrees outside the viewport. It
only renders above SPINES_MIN_ZOOM (where there are <~8000 books in view),
and stops subdividing once a prefix rect is smaller than half a screen
pixel -- so the work scales with what's actually visible, not with the
total ISBN count.

[9] Constrain the camera to the bounded map (similar to the PDF example),
with a wide range of zoomSteps so users can pull all the way back or zoom
deep enough to see individual book spines.

[10] MiniMap borrows the upstream isbn-visualization minimap idea: a small
overview of the full 978/979 ISBN space, with language groups labelled and
the current viewport drawn on top. Clicking on a block we have tile data
for flies the camera there; dragging anywhere on the minimap pans the main
camera while keeping it clamped to the data region. Blocks we don't have
tiles for are dimmed so it's clear they're out of scope for this example.
*/
