import {
	DefaultColorThemePalette,
	DefaultFontStyle,
	SafeId,
	SvgExportDef,
	TLDefaultColorTheme,
	TLDefaultFillStyle,
	TLShapeUtilCanvasSvgDef,
	debugFlags,
	last,
	suffixSafeId,
	tlenv,
	useEditor,
	useSharedSafeId,
	useUniqueSafeId,
	useValue,
} from '@tldraw/editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDefaultColorTheme } from './useDefaultColorTheme'

type ExportPatternComponent = () => React.JSX.Element

const exportFillComponents: Partial<Record<TLDefaultFillStyle, ExportPatternComponent>> = {
	pattern: HashPatternForExport,
	'dense-dots': DenseDotsPatternForExport,
	dots: DotsPatternForExport,
	'sparse-dots': SparseDotsPatternForExport,
	chevrons: ChevronsPatternForExport,
	crosses: CrossesPatternForExport,
	'lined-pattern': LinedPatternForExport,
	'lined-dense-dots': LinedDenseDotsPatternForExport,
	'lined-chevrons': LinedChevronsPatternForExport,
	'lined-crosses': LinedCrossesPatternForExport,
	'lined-dots': LinedDotsPatternForExport,
	'lined-sparse-dots': LinedSparseDotsPatternForExport,
	'large-check': LargeCheckPatternForExport,
	'small-check': SmallCheckPatternForExport,
}

/** @public */
export function getFillDefForExport(fill: TLDefaultFillStyle): SvgExportDef {
	const Component = exportFillComponents[fill]
	return {
		key: `${DefaultFontStyle.id}:${fill}`,
		async getElement() {
			return Component ? <Component /> : null
		},
	}
}

function HashPatternForExport() {
	const getHashPatternZoomName = useGetHashPatternZoomName()
	const maskId = useUniqueSafeId()
	const theme = useDefaultColorTheme()
	const t = 8 / 12
	return (
		<>
			<mask id={maskId}>
				<rect x="0" y="0" width="8" height="8" fill="white" />
				<g strokeLinecap="round" stroke="black">
					<line x1={t * 1} y1={t * 3} x2={t * 3} y2={t * 1} />
					<line x1={t * 5} y1={t * 7} x2={t * 7} y2={t * 5} />
					<line x1={t * 9} y1={t * 11} x2={t * 11} y2={t * 9} />
				</g>
			</mask>
			<pattern
				id={getHashPatternZoomName(1, theme.id)}
				width="8"
				height="8"
				patternUnits="userSpaceOnUse"
			>
				<rect x="0" y="0" width="8" height="8" fill={theme.solid} mask={`url(#${maskId})`} />
			</pattern>
		</>
	)
}

export function getFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:pattern`,
		component: PatternFillDefForCanvas,
	}
}
const TILE_PATTERN_SIZE = 8

const generateImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = TILE_PATTERN_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid
		ctx.fillRect(0, 0, size, size)

		// This essentially generates an inverse of the pattern we're drawing.
		ctx.globalCompositeOperation = 'destination-out'

		ctx.lineCap = 'round'
		ctx.lineWidth = 1.25 * currentZoom * dpr

		const t = 8 / 12
		const s = (v: number) => v * currentZoom * dpr

		ctx.beginPath()
		ctx.moveTo(s(t * 1), s(t * 3))
		ctx.lineTo(s(t * 3), s(t * 1))

		ctx.moveTo(s(t * 5), s(t * 7))
		ctx.lineTo(s(t * 7), s(t * 5))

		ctx.moveTo(s(t * 9), s(t * 11))
		ctx.lineTo(s(t * 11), s(t * 9))
		ctx.stroke()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

const DENSE_DOTS_TILE_SIZE = 3
const DOTS_TILE_SIZE = 4
const SPARSE_DOTS_TILE_SIZE = 6
const DOT_RADIUS = 0.7
const LARGE_CHECK_TILE_SIZE = 8
const SMALL_CHECK_TILE_SIZE = 4
const CHEVRONS_TILE_SIZE = 6
const CROSSES_TILE_SIZE = 6
const CROSS_ARM_LENGTH = 1.2

const generateDotsImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = DOTS_TILE_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid
		ctx.fillRect(0, 0, size, size)

		ctx.globalCompositeOperation = 'destination-out'

		const s = (v: number) => v * currentZoom * dpr
		ctx.beginPath()
		ctx.arc(s(DOTS_TILE_SIZE / 2), s(DOTS_TILE_SIZE / 2), s(DOT_RADIUS), 0, Math.PI * 2)
		ctx.fill()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

const generateSparseDotsImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = SPARSE_DOTS_TILE_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid
		ctx.fillRect(0, 0, size, size)

		ctx.globalCompositeOperation = 'destination-out'

		const s = (v: number) => v * currentZoom * dpr
		ctx.beginPath()
		ctx.arc(
			s(SPARSE_DOTS_TILE_SIZE / 2),
			s(SPARSE_DOTS_TILE_SIZE / 2),
			s(DOT_RADIUS),
			0,
			Math.PI * 2
		)
		ctx.fill()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

const generateDenseDotsImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = DENSE_DOTS_TILE_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid
		ctx.fillRect(0, 0, size, size)

		ctx.globalCompositeOperation = 'destination-out'

		const s = (v: number) => v * currentZoom * dpr
		ctx.beginPath()
		ctx.arc(s(DENSE_DOTS_TILE_SIZE / 2), s(DENSE_DOTS_TILE_SIZE / 2), s(DOT_RADIUS), 0, Math.PI * 2)
		ctx.fill()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

const generateChevronsImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = CHEVRONS_TILE_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid
		ctx.fillRect(0, 0, size, size)

		ctx.globalCompositeOperation = 'destination-out'

		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.lineWidth = 1.25 * currentZoom * dpr

		const s = (v: number) => v * currentZoom * dpr

		// Upward-pointing chevron spanning the tile
		ctx.beginPath()
		ctx.moveTo(0, s(CHEVRONS_TILE_SIZE * 0.75))
		ctx.lineTo(s(CHEVRONS_TILE_SIZE / 2), s(CHEVRONS_TILE_SIZE * 0.25))
		ctx.lineTo(size, s(CHEVRONS_TILE_SIZE * 0.75))
		ctx.stroke()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

const generateCrossesImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = CROSSES_TILE_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid
		ctx.fillRect(0, 0, size, size)

		ctx.globalCompositeOperation = 'destination-out'

		ctx.lineCap = 'round'
		ctx.lineWidth = 1.25 * currentZoom * dpr

		const s = (v: number) => v * currentZoom * dpr
		const cx = CROSSES_TILE_SIZE / 2
		const cy = CROSSES_TILE_SIZE / 2

		ctx.beginPath()
		// Vertical arm
		ctx.moveTo(s(cx), s(cy - CROSS_ARM_LENGTH))
		ctx.lineTo(s(cx), s(cy + CROSS_ARM_LENGTH))
		// Horizontal arm
		ctx.moveTo(s(cx - CROSS_ARM_LENGTH), s(cy))
		ctx.lineTo(s(cx + CROSS_ARM_LENGTH), s(cy))
		ctx.stroke()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

const canvasBlob = (size: [number, number], fn: (ctx: CanvasRenderingContext2D) => void) => {
	const canvas = document.createElement('canvas')
	canvas.width = size[0]
	canvas.height = size[1]
	const ctx = canvas.getContext('2d')
	if (!ctx) return ''
	fn(ctx)
	return canvas.toDataURL()
}
interface PatternDef {
	zoom: number
	url: string
	theme: 'light' | 'dark'
}

interface ImagePatternConfig {
	tileSize: number
	getZoomName: (zoom: number, theme: TLDefaultColorTheme['id']) => SafeId
	generate: (dpr: number, currentZoom: number, darkMode: boolean) => Promise<Blob>
}

let defaultPixels: { white: string; black: string } | null = null
function getDefaultPixels() {
	if (!defaultPixels) {
		defaultPixels = {
			white: canvasBlob([1, 1], (ctx) => {
				ctx.fillStyle = '#f8f9fa'
				ctx.fillRect(0, 0, 1, 1)
			}),
			black: canvasBlob([1, 1], (ctx) => {
				ctx.fillStyle = '#212529'
				ctx.fillRect(0, 0, 1, 1)
			}),
		}
	}
	return defaultPixels
}

function getPatternLodForZoomLevel(zoom: number) {
	return Math.ceil(Math.log2(Math.max(1, zoom)))
}

const makeUseGetPatternZoomName = (baseId: string) => {
	return function useGetPatternZoomName() {
		const id = useSharedSafeId(baseId)
		return useCallback(
			(zoom: number, theme: TLDefaultColorTheme['id']) => {
				const lod = getPatternLodForZoomLevel(zoom)
				return suffixSafeId(id, `${theme}_${lod}`)
			},
			[id]
		)
	}
}

export const useGetHashPatternZoomName = makeUseGetPatternZoomName('hash_pattern')
export const useGetDotsPatternZoomName = makeUseGetPatternZoomName('dots_pattern')
export const useGetSparseDotsPatternZoomName = makeUseGetPatternZoomName('sparse_dots_pattern')
export const useGetDenseDotsPatternZoomName = makeUseGetPatternZoomName('dense_dots_pattern')
export const useGetChevronsPatternZoomName = makeUseGetPatternZoomName('chevrons_pattern')
export const useGetCrossesPatternZoomName = makeUseGetPatternZoomName('crosses_pattern')

function getPatternLodsToGenerate(maxZoom: number) {
	const levels = []
	const minLod = 0
	const maxLod = getPatternLodForZoomLevel(maxZoom)
	for (let i = minLod; i <= maxLod; i++) {
		levels.push(Math.pow(2, i))
	}
	return levels
}

function getDefaultPatterns(maxZoom: number): PatternDef[] {
	const defaultPixels = getDefaultPixels()
	return getPatternLodsToGenerate(maxZoom).flatMap((zoom) => [
		{ zoom, url: defaultPixels.white, theme: 'light' },
		{ zoom, url: defaultPixels.black, theme: 'dark' },
	])
}

function useImagePattern({ tileSize, getZoomName, generate }: ImagePatternConfig) {
	const editor = useEditor()
	const dpr = useValue('devicePixelRatio', () => editor.getInstanceState().devicePixelRatio, [
		editor,
	])
	const maxZoom = useValue('maxZoom', () => Math.ceil(last(editor.getCameraOptions().zoomSteps)!), [
		editor,
	])
	const [isReady, setIsReady] = useState(false)
	const [backgroundUrls, setBackgroundUrls] = useState<PatternDef[]>(() =>
		getDefaultPatterns(maxZoom)
	)

	useEffect(() => {
		if (process.env.NODE_ENV === 'test') {
			setIsReady(true)
			return
		}

		const promise = Promise.all(
			getPatternLodsToGenerate(maxZoom).flatMap<Promise<PatternDef>>((zoom) => [
				generate(dpr, zoom, false).then((blob) => ({
					zoom,
					theme: 'light',
					url: URL.createObjectURL(blob),
				})),
				generate(dpr, zoom, true).then((blob) => ({
					zoom,
					theme: 'dark',
					url: URL.createObjectURL(blob),
				})),
			])
		)

		let isCancelled = false
		promise.then((urls) => {
			if (isCancelled) return
			setBackgroundUrls(urls)
			setIsReady(true)
		})
		return () => {
			isCancelled = true
			setIsReady(false)
			promise.then((patterns) => {
				for (const { url } of patterns) {
					URL.revokeObjectURL(url)
				}
			})
		}
	}, [dpr, generate, maxZoom])

	const defs = (
		<>
			{backgroundUrls.map((item) => {
				const id = getZoomName(item.zoom, item.theme)
				return (
					<pattern
						key={id}
						id={id}
						width={tileSize}
						height={tileSize}
						patternUnits="userSpaceOnUse"
					>
						<image href={item.url} width={tileSize} height={tileSize} />
					</pattern>
				)
			})}
		</>
	)

	return { defs, isReady }
}

function useSafariPatternRefresh(containerRef: { current: SVGGElement | null }, isReady: boolean) {
	const editor = useEditor()
	useEffect(() => {
		if (isReady && tlenv.isSafari) {
			const container = containerRef.current
			if (!container) return
			const htmlLayer = findHtmlLayerParent(container)
			if (htmlLayer) {
				editor.timers.requestAnimationFrame(() => {
					htmlLayer.style.display = 'none'
					editor.timers.requestAnimationFrame(() => {
						htmlLayer.style.display = ''
					})
				})
			}
		}
	}, [editor, isReady])
}

function usePattern() {
	const getHashPatternZoomName = useGetHashPatternZoomName()
	return useImagePattern({
		tileSize: TILE_PATTERN_SIZE,
		getZoomName: getHashPatternZoomName,
		generate: generateImage,
	})
}

function PatternFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = usePattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-pattern-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

// --- Dots pattern ---

function useDotsPattern() {
	const getDotsPatternZoomName = useGetDotsPatternZoomName()
	return useImagePattern({
		tileSize: DOTS_TILE_SIZE,
		getZoomName: getDotsPatternZoomName,
		generate: generateDotsImage,
	})
}

function DotsFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useDotsPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-dots-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getDotsFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:dots`,
		component: DotsFillDefForCanvas,
	}
}

function DotsPatternForExport() {
	const getDotsPatternZoomName = useGetDotsPatternZoomName()
	const maskId = useUniqueSafeId()
	const theme = useDefaultColorTheme()
	return (
		<>
			<mask id={maskId}>
				<rect x="0" y="0" width={DOTS_TILE_SIZE} height={DOTS_TILE_SIZE} fill="white" />
				<circle cx={DOTS_TILE_SIZE / 2} cy={DOTS_TILE_SIZE / 2} r={DOT_RADIUS} fill="black" />
			</mask>
			<pattern
				id={getDotsPatternZoomName(1, theme.id)}
				width={DOTS_TILE_SIZE}
				height={DOTS_TILE_SIZE}
				patternUnits="userSpaceOnUse"
			>
				<rect
					x="0"
					y="0"
					width={DOTS_TILE_SIZE}
					height={DOTS_TILE_SIZE}
					fill={theme.solid}
					mask={`url(#${maskId})`}
				/>
			</pattern>
		</>
	)
}

// --- Sparse dots pattern ---

function useSparseDotsPattern() {
	const getSparseDotsPatternZoomName = useGetSparseDotsPatternZoomName()
	return useImagePattern({
		tileSize: SPARSE_DOTS_TILE_SIZE,
		getZoomName: getSparseDotsPatternZoomName,
		generate: generateSparseDotsImage,
	})
}

function SparseDotsFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useSparseDotsPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-sparse-dots-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getSparseDotsFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:sparse-dots`,
		component: SparseDotsFillDefForCanvas,
	}
}

function SparseDotsPatternForExport() {
	const getSparseDotsPatternZoomName = useGetSparseDotsPatternZoomName()
	const maskId = useUniqueSafeId()
	const theme = useDefaultColorTheme()
	return (
		<>
			<mask id={maskId}>
				<rect
					x="0"
					y="0"
					width={SPARSE_DOTS_TILE_SIZE}
					height={SPARSE_DOTS_TILE_SIZE}
					fill="white"
				/>
				<circle
					cx={SPARSE_DOTS_TILE_SIZE / 2}
					cy={SPARSE_DOTS_TILE_SIZE / 2}
					r={DOT_RADIUS}
					fill="black"
				/>
			</mask>
			<pattern
				id={getSparseDotsPatternZoomName(1, theme.id)}
				width={SPARSE_DOTS_TILE_SIZE}
				height={SPARSE_DOTS_TILE_SIZE}
				patternUnits="userSpaceOnUse"
			>
				<rect
					x="0"
					y="0"
					width={SPARSE_DOTS_TILE_SIZE}
					height={SPARSE_DOTS_TILE_SIZE}
					fill={theme.solid}
					mask={`url(#${maskId})`}
				/>
			</pattern>
		</>
	)
}

// --- Dense dots pattern ---

function useDenseDotsPattern() {
	const getDenseDotsPatternZoomName = useGetDenseDotsPatternZoomName()
	return useImagePattern({
		tileSize: DENSE_DOTS_TILE_SIZE,
		getZoomName: getDenseDotsPatternZoomName,
		generate: generateDenseDotsImage,
	})
}

function DenseDotsFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useDenseDotsPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-dense-dots-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getDenseDotsFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:dense-dots`,
		component: DenseDotsFillDefForCanvas,
	}
}

function DenseDotsPatternForExport() {
	const getDenseDotsPatternZoomName = useGetDenseDotsPatternZoomName()
	const maskId = useUniqueSafeId()
	const theme = useDefaultColorTheme()
	return (
		<>
			<mask id={maskId}>
				<rect x="0" y="0" width={DENSE_DOTS_TILE_SIZE} height={DENSE_DOTS_TILE_SIZE} fill="white" />
				<circle
					cx={DENSE_DOTS_TILE_SIZE / 2}
					cy={DENSE_DOTS_TILE_SIZE / 2}
					r={DOT_RADIUS}
					fill="black"
				/>
			</mask>
			<pattern
				id={getDenseDotsPatternZoomName(1, theme.id)}
				width={DENSE_DOTS_TILE_SIZE}
				height={DENSE_DOTS_TILE_SIZE}
				patternUnits="userSpaceOnUse"
			>
				<rect
					x="0"
					y="0"
					width={DENSE_DOTS_TILE_SIZE}
					height={DENSE_DOTS_TILE_SIZE}
					fill={theme.solid}
					mask={`url(#${maskId})`}
				/>
			</pattern>
		</>
	)
}

// --- Chevrons pattern ---

function useChevronsPattern() {
	const getChevronsPatternZoomName = useGetChevronsPatternZoomName()
	return useImagePattern({
		tileSize: CHEVRONS_TILE_SIZE,
		getZoomName: getChevronsPatternZoomName,
		generate: generateChevronsImage,
	})
}

function ChevronsFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useChevronsPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-chevrons-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getChevronsFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:chevrons`,
		component: ChevronsFillDefForCanvas,
	}
}

function ChevronsPatternForExport() {
	const getChevronsPatternZoomName = useGetChevronsPatternZoomName()
	const maskId = useUniqueSafeId()
	const theme = useDefaultColorTheme()
	return (
		<>
			<mask id={maskId}>
				<rect x="0" y="0" width={CHEVRONS_TILE_SIZE} height={CHEVRONS_TILE_SIZE} fill="white" />
				<polyline
					points={`0,${CHEVRONS_TILE_SIZE * 0.75} ${CHEVRONS_TILE_SIZE / 2},${CHEVRONS_TILE_SIZE * 0.25} ${CHEVRONS_TILE_SIZE},${CHEVRONS_TILE_SIZE * 0.75}`}
					stroke="black"
					strokeWidth="1.25"
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="none"
				/>
			</mask>
			<pattern
				id={getChevronsPatternZoomName(1, theme.id)}
				width={CHEVRONS_TILE_SIZE}
				height={CHEVRONS_TILE_SIZE}
				patternUnits="userSpaceOnUse"
			>
				<rect
					x="0"
					y="0"
					width={CHEVRONS_TILE_SIZE}
					height={CHEVRONS_TILE_SIZE}
					fill={theme.solid}
					mask={`url(#${maskId})`}
				/>
			</pattern>
		</>
	)
}

// --- Crosses pattern ---

function useCrossesPattern() {
	const getCrossesPatternZoomName = useGetCrossesPatternZoomName()
	return useImagePattern({
		tileSize: CROSSES_TILE_SIZE,
		getZoomName: getCrossesPatternZoomName,
		generate: generateCrossesImage,
	})
}

function CrossesFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useCrossesPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-crosses-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getCrossesFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:crosses`,
		component: CrossesFillDefForCanvas,
	}
}

function CrossesPatternForExport() {
	const getCrossesPatternZoomName = useGetCrossesPatternZoomName()
	const maskId = useUniqueSafeId()
	const theme = useDefaultColorTheme()
	const cx = CROSSES_TILE_SIZE / 2
	const cy = CROSSES_TILE_SIZE / 2
	return (
		<>
			<mask id={maskId}>
				<rect x="0" y="0" width={CROSSES_TILE_SIZE} height={CROSSES_TILE_SIZE} fill="white" />
				<g stroke="black" strokeWidth="1.25" strokeLinecap="round">
					<line x1={cx} y1={cy - CROSS_ARM_LENGTH} x2={cx} y2={cy + CROSS_ARM_LENGTH} />
					<line x1={cx - CROSS_ARM_LENGTH} y1={cy} x2={cx + CROSS_ARM_LENGTH} y2={cy} />
				</g>
			</mask>
			<pattern
				id={getCrossesPatternZoomName(1, theme.id)}
				width={CROSSES_TILE_SIZE}
				height={CROSSES_TILE_SIZE}
				patternUnits="userSpaceOnUse"
			>
				<rect
					x="0"
					y="0"
					width={CROSSES_TILE_SIZE}
					height={CROSSES_TILE_SIZE}
					fill={theme.solid}
					mask={`url(#${maskId})`}
				/>
			</pattern>
		</>
	)
}

// --- Lined pattern (inverted crosshatch) ---

const generateLinedPatternImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = TILE_PATTERN_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		// Draw marks directly in background color on transparent canvas
		ctx.lineCap = 'round'
		ctx.lineWidth = 1.25 * currentZoom * dpr
		ctx.strokeStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid

		const t = 8 / 12
		const s = (v: number) => v * currentZoom * dpr

		ctx.beginPath()
		ctx.moveTo(s(t * 1), s(t * 3))
		ctx.lineTo(s(t * 3), s(t * 1))

		ctx.moveTo(s(t * 5), s(t * 7))
		ctx.lineTo(s(t * 7), s(t * 5))

		ctx.moveTo(s(t * 9), s(t * 11))
		ctx.lineTo(s(t * 11), s(t * 9))
		ctx.stroke()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

export const useGetLinedPatternZoomName = makeUseGetPatternZoomName('lined_pattern')

function useLinedPattern() {
	const getLinedPatternZoomName = useGetLinedPatternZoomName()
	return useImagePattern({
		tileSize: TILE_PATTERN_SIZE,
		getZoomName: getLinedPatternZoomName,
		generate: generateLinedPatternImage,
	})
}

function LinedPatternFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useLinedPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-lined-pattern-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getLinedPatternFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:lined-pattern`,
		component: LinedPatternFillDefForCanvas,
	}
}

function LinedPatternForExport() {
	const getLinedPatternZoomName = useGetLinedPatternZoomName()
	const theme = useDefaultColorTheme()
	const t = 8 / 12
	return (
		<pattern
			id={getLinedPatternZoomName(1, theme.id)}
			width="8"
			height="8"
			patternUnits="userSpaceOnUse"
		>
			<g strokeLinecap="round" stroke={theme.solid}>
				<line x1={t * 1} y1={t * 3} x2={t * 3} y2={t * 1} />
				<line x1={t * 5} y1={t * 7} x2={t * 7} y2={t * 5} />
				<line x1={t * 9} y1={t * 11} x2={t * 11} y2={t * 9} />
			</g>
		</pattern>
	)
}

// --- Lined dense dots (inverted dense dots) ---

const generateLinedDenseDotsImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = DENSE_DOTS_TILE_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		// Draw dots directly in background color on transparent canvas
		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid

		const s = (v: number) => v * currentZoom * dpr
		ctx.beginPath()
		ctx.arc(s(DENSE_DOTS_TILE_SIZE / 2), s(DENSE_DOTS_TILE_SIZE / 2), s(DOT_RADIUS), 0, Math.PI * 2)
		ctx.fill()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

export const useGetLinedDenseDotsPatternZoomName = makeUseGetPatternZoomName(
	'lined_dense_dots_pattern'
)

function useLinedDenseDotsPattern() {
	const getLinedDenseDotsPatternZoomName = useGetLinedDenseDotsPatternZoomName()
	return useImagePattern({
		tileSize: DENSE_DOTS_TILE_SIZE,
		getZoomName: getLinedDenseDotsPatternZoomName,
		generate: generateLinedDenseDotsImage,
	})
}

function LinedDenseDotsFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useLinedDenseDotsPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-lined-dense-dots-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getLinedDenseDotsFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:lined-dense-dots`,
		component: LinedDenseDotsFillDefForCanvas,
	}
}

function LinedDenseDotsPatternForExport() {
	const getLinedDenseDotsPatternZoomName = useGetLinedDenseDotsPatternZoomName()
	const theme = useDefaultColorTheme()
	return (
		<pattern
			id={getLinedDenseDotsPatternZoomName(1, theme.id)}
			width={DENSE_DOTS_TILE_SIZE}
			height={DENSE_DOTS_TILE_SIZE}
			patternUnits="userSpaceOnUse"
		>
			<circle
				cx={DENSE_DOTS_TILE_SIZE / 2}
				cy={DENSE_DOTS_TILE_SIZE / 2}
				r={DOT_RADIUS}
				fill={theme.solid}
			/>
		</pattern>
	)
}

// --- Lined dots (inverted dots) ---

const generateLinedDotsImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = DOTS_TILE_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid

		const s = (v: number) => v * currentZoom * dpr
		ctx.beginPath()
		ctx.arc(s(DOTS_TILE_SIZE / 2), s(DOTS_TILE_SIZE / 2), s(DOT_RADIUS), 0, Math.PI * 2)
		ctx.fill()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

export const useGetLinedDotsPatternZoomName = makeUseGetPatternZoomName('lined_dots_pattern')

function useLinedDotsPattern() {
	const getLinedDotsPatternZoomName = useGetLinedDotsPatternZoomName()
	return useImagePattern({
		tileSize: DOTS_TILE_SIZE,
		getZoomName: getLinedDotsPatternZoomName,
		generate: generateLinedDotsImage,
	})
}

function LinedDotsFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useLinedDotsPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-lined-dots-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getLinedDotsFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:lined-dots`,
		component: LinedDotsFillDefForCanvas,
	}
}

function LinedDotsPatternForExport() {
	const getLinedDotsPatternZoomName = useGetLinedDotsPatternZoomName()
	const theme = useDefaultColorTheme()
	return (
		<pattern
			id={getLinedDotsPatternZoomName(1, theme.id)}
			width={DOTS_TILE_SIZE}
			height={DOTS_TILE_SIZE}
			patternUnits="userSpaceOnUse"
		>
			<circle cx={DOTS_TILE_SIZE / 2} cy={DOTS_TILE_SIZE / 2} r={DOT_RADIUS} fill={theme.solid} />
		</pattern>
	)
}

// --- Lined sparse dots (inverted sparse dots) ---

const generateLinedSparseDotsImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = SPARSE_DOTS_TILE_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid

		const s = (v: number) => v * currentZoom * dpr
		ctx.beginPath()
		ctx.arc(
			s(SPARSE_DOTS_TILE_SIZE / 2),
			s(SPARSE_DOTS_TILE_SIZE / 2),
			s(DOT_RADIUS),
			0,
			Math.PI * 2
		)
		ctx.fill()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

export const useGetLinedSparseDotsPatternZoomName = makeUseGetPatternZoomName(
	'lined_sparse_dots_pattern'
)

function useLinedSparseDotsPattern() {
	const getLinedSparseDotsPatternZoomName = useGetLinedSparseDotsPatternZoomName()
	return useImagePattern({
		tileSize: SPARSE_DOTS_TILE_SIZE,
		getZoomName: getLinedSparseDotsPatternZoomName,
		generate: generateLinedSparseDotsImage,
	})
}

function LinedSparseDotsFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useLinedSparseDotsPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-lined-sparse-dots-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getLinedSparseDotsFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:lined-sparse-dots`,
		component: LinedSparseDotsFillDefForCanvas,
	}
}

function LinedSparseDotsPatternForExport() {
	const getLinedSparseDotsPatternZoomName = useGetLinedSparseDotsPatternZoomName()
	const theme = useDefaultColorTheme()
	return (
		<pattern
			id={getLinedSparseDotsPatternZoomName(1, theme.id)}
			width={SPARSE_DOTS_TILE_SIZE}
			height={SPARSE_DOTS_TILE_SIZE}
			patternUnits="userSpaceOnUse"
		>
			<circle
				cx={SPARSE_DOTS_TILE_SIZE / 2}
				cy={SPARSE_DOTS_TILE_SIZE / 2}
				r={DOT_RADIUS}
				fill={theme.solid}
			/>
		</pattern>
	)
}

// --- Lined chevrons (inverted chevrons) ---

const generateLinedChevronsImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = CHEVRONS_TILE_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.lineWidth = 1.25 * currentZoom * dpr
		ctx.strokeStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid

		const s = (v: number) => v * currentZoom * dpr

		ctx.beginPath()
		ctx.moveTo(0, s(CHEVRONS_TILE_SIZE * 0.75))
		ctx.lineTo(s(CHEVRONS_TILE_SIZE / 2), s(CHEVRONS_TILE_SIZE * 0.25))
		ctx.lineTo(size, s(CHEVRONS_TILE_SIZE * 0.75))
		ctx.stroke()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

export const useGetLinedChevronsPatternZoomName =
	makeUseGetPatternZoomName('lined_chevrons_pattern')

function useLinedChevronsPattern() {
	const getLinedChevronsPatternZoomName = useGetLinedChevronsPatternZoomName()
	return useImagePattern({
		tileSize: CHEVRONS_TILE_SIZE,
		getZoomName: getLinedChevronsPatternZoomName,
		generate: generateLinedChevronsImage,
	})
}

function LinedChevronsFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useLinedChevronsPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-lined-chevrons-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getLinedChevronsFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:lined-chevrons`,
		component: LinedChevronsFillDefForCanvas,
	}
}

function LinedChevronsPatternForExport() {
	const getLinedChevronsPatternZoomName = useGetLinedChevronsPatternZoomName()
	const theme = useDefaultColorTheme()
	return (
		<pattern
			id={getLinedChevronsPatternZoomName(1, theme.id)}
			width={CHEVRONS_TILE_SIZE}
			height={CHEVRONS_TILE_SIZE}
			patternUnits="userSpaceOnUse"
		>
			<polyline
				points={`0,${CHEVRONS_TILE_SIZE * 0.75} ${CHEVRONS_TILE_SIZE / 2},${CHEVRONS_TILE_SIZE * 0.25} ${CHEVRONS_TILE_SIZE},${CHEVRONS_TILE_SIZE * 0.75}`}
				stroke={theme.solid}
				strokeWidth="1.25"
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
		</pattern>
	)
}

// --- Lined crosses (inverted crosses) ---

const generateLinedCrossesImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = CROSSES_TILE_SIZE * currentZoom * dpr

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.lineCap = 'round'
		ctx.lineWidth = 1.25 * currentZoom * dpr
		ctx.strokeStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid

		const s = (v: number) => v * currentZoom * dpr
		const cx = CROSSES_TILE_SIZE / 2
		const cy = CROSSES_TILE_SIZE / 2

		ctx.beginPath()
		ctx.moveTo(s(cx), s(cy - CROSS_ARM_LENGTH))
		ctx.lineTo(s(cx), s(cy + CROSS_ARM_LENGTH))
		ctx.moveTo(s(cx - CROSS_ARM_LENGTH), s(cy))
		ctx.lineTo(s(cx + CROSS_ARM_LENGTH), s(cy))
		ctx.stroke()

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

export const useGetLinedCrossesPatternZoomName = makeUseGetPatternZoomName('lined_crosses_pattern')

function useLinedCrossesPattern() {
	const getLinedCrossesPatternZoomName = useGetLinedCrossesPatternZoomName()
	return useImagePattern({
		tileSize: CROSSES_TILE_SIZE,
		getZoomName: getLinedCrossesPatternZoomName,
		generate: generateLinedCrossesImage,
	})
}

function LinedCrossesFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useLinedCrossesPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-lined-crosses-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getLinedCrossesFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:lined-crosses`,
		component: LinedCrossesFillDefForCanvas,
	}
}

function LinedCrossesPatternForExport() {
	const getLinedCrossesPatternZoomName = useGetLinedCrossesPatternZoomName()
	const theme = useDefaultColorTheme()
	const cx = CROSSES_TILE_SIZE / 2
	const cy = CROSSES_TILE_SIZE / 2
	return (
		<pattern
			id={getLinedCrossesPatternZoomName(1, theme.id)}
			width={CROSSES_TILE_SIZE}
			height={CROSSES_TILE_SIZE}
			patternUnits="userSpaceOnUse"
		>
			<g stroke={theme.solid} strokeWidth="1.25" strokeLinecap="round">
				<line x1={cx} y1={cy - CROSS_ARM_LENGTH} x2={cx} y2={cy + CROSS_ARM_LENGTH} />
				<line x1={cx - CROSS_ARM_LENGTH} y1={cy} x2={cx + CROSS_ARM_LENGTH} y2={cy} />
			</g>
		</pattern>
	)
}

// --- Large check pattern ---

const generateLargeCheckImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = LARGE_CHECK_TILE_SIZE * currentZoom * dpr
		const half = size / 2

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid
		ctx.fillRect(0, 0, size, size)

		ctx.globalCompositeOperation = 'destination-out'
		ctx.fillStyle = 'black'
		// Punch out top-right and bottom-left quadrants
		ctx.fillRect(half, 0, half, half)
		ctx.fillRect(0, half, half, half)

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

export const useGetLargeCheckPatternZoomName = makeUseGetPatternZoomName('large_check_pattern')

function useLargeCheckPattern() {
	const getLargeCheckPatternZoomName = useGetLargeCheckPatternZoomName()
	return useImagePattern({
		tileSize: LARGE_CHECK_TILE_SIZE,
		getZoomName: getLargeCheckPatternZoomName,
		generate: generateLargeCheckImage,
	})
}

function LargeCheckFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useLargeCheckPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-large-check-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getLargeCheckFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:large-check`,
		component: LargeCheckFillDefForCanvas,
	}
}

function LargeCheckPatternForExport() {
	const getLargeCheckPatternZoomName = useGetLargeCheckPatternZoomName()
	const maskId = useUniqueSafeId()
	const theme = useDefaultColorTheme()
	const half = LARGE_CHECK_TILE_SIZE / 2
	return (
		<>
			<mask id={maskId}>
				<rect
					x="0"
					y="0"
					width={LARGE_CHECK_TILE_SIZE}
					height={LARGE_CHECK_TILE_SIZE}
					fill="white"
				/>
				<rect x={half} y="0" width={half} height={half} fill="black" />
				<rect x="0" y={half} width={half} height={half} fill="black" />
			</mask>
			<pattern
				id={getLargeCheckPatternZoomName(1, theme.id)}
				width={LARGE_CHECK_TILE_SIZE}
				height={LARGE_CHECK_TILE_SIZE}
				patternUnits="userSpaceOnUse"
			>
				<rect
					x="0"
					y="0"
					width={LARGE_CHECK_TILE_SIZE}
					height={LARGE_CHECK_TILE_SIZE}
					fill={theme.solid}
					mask={`url(#${maskId})`}
				/>
			</pattern>
		</>
	)
}

// --- Small check pattern ---

const generateSmallCheckImage = (dpr: number, currentZoom: number, darkMode: boolean) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = SMALL_CHECK_TILE_SIZE * currentZoom * dpr
		const half = size / 2

		const canvasEl = document.createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = darkMode
			? DefaultColorThemePalette.darkMode.solid
			: DefaultColorThemePalette.lightMode.solid
		ctx.fillRect(0, 0, size, size)

		ctx.globalCompositeOperation = 'destination-out'
		ctx.fillStyle = 'black'
		ctx.fillRect(half, 0, half, half)
		ctx.fillRect(0, half, half, half)

		canvasEl.toBlob((blob) => {
			if (!blob || debugFlags.throwToBlob.get()) {
				reject()
			} else {
				resolve(blob)
			}
		})
	})
}

export const useGetSmallCheckPatternZoomName = makeUseGetPatternZoomName('small_check_pattern')

function useSmallCheckPattern() {
	const getSmallCheckPatternZoomName = useGetSmallCheckPatternZoomName()
	return useImagePattern({
		tileSize: SMALL_CHECK_TILE_SIZE,
		getZoomName: getSmallCheckPatternZoomName,
		generate: generateSmallCheckImage,
	})
}

function SmallCheckFillDefForCanvas() {
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useSmallCheckPattern()

	useSafariPatternRefresh(containerRef, isReady)

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-small-check-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

export function getSmallCheckFillDefForCanvas(): TLShapeUtilCanvasSvgDef {
	return {
		key: `${DefaultFontStyle.id}:small-check`,
		component: SmallCheckFillDefForCanvas,
	}
}

function SmallCheckPatternForExport() {
	const getSmallCheckPatternZoomName = useGetSmallCheckPatternZoomName()
	const maskId = useUniqueSafeId()
	const theme = useDefaultColorTheme()
	const half = SMALL_CHECK_TILE_SIZE / 2
	return (
		<>
			<mask id={maskId}>
				<rect
					x="0"
					y="0"
					width={SMALL_CHECK_TILE_SIZE}
					height={SMALL_CHECK_TILE_SIZE}
					fill="white"
				/>
				<rect x={half} y="0" width={half} height={half} fill="black" />
				<rect x="0" y={half} width={half} height={half} fill="black" />
			</mask>
			<pattern
				id={getSmallCheckPatternZoomName(1, theme.id)}
				width={SMALL_CHECK_TILE_SIZE}
				height={SMALL_CHECK_TILE_SIZE}
				patternUnits="userSpaceOnUse"
			>
				<rect
					x="0"
					y="0"
					width={SMALL_CHECK_TILE_SIZE}
					height={SMALL_CHECK_TILE_SIZE}
					fill={theme.solid}
					mask={`url(#${maskId})`}
				/>
			</pattern>
		</>
	)
}

function findHtmlLayerParent(element: Element): HTMLElement | null {
	if (element.classList.contains('tl-html-layer')) return element as HTMLElement
	if (element.parentElement) return findHtmlLayerParent(element.parentElement)
	return null
}
