import {
	DefaultColorThemePalette,
	DefaultFontStyle,
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

/** @public */
export function getFillDefForExport(fill: TLDefaultFillStyle): SvgExportDef {
	return {
		key: `${DefaultFontStyle.id}:${fill}`,
		async getElement() {
			if (fill === 'pattern') return <HashPatternForExport />
			if (fill === 'dense-dots') return <DenseDotsPatternForExport />
			if (fill === 'dots') return <DotsPatternForExport />
			if (fill === 'sparse-dots') return <SparseDotsPatternForExport />
			if (fill === 'chevrons') return <ChevronsPatternForExport />
			if (fill === 'crosses') return <CrossesPatternForExport />
			return null
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
const SPARSE_DOTS_TILE_SIZE = 8
const DOT_RADIUS = 0.7
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

export function useGetHashPatternZoomName() {
	const id = useSharedSafeId('hash_pattern')
	return useCallback(
		(zoom: number, theme: TLDefaultColorTheme['id']) => {
			const lod = getPatternLodForZoomLevel(zoom)
			return suffixSafeId(id, `${theme}_${lod}`)
		},
		[id]
	)
}

export function useGetDotsPatternZoomName() {
	const id = useSharedSafeId('dots_pattern')
	return useCallback(
		(zoom: number, theme: TLDefaultColorTheme['id']) => {
			const lod = getPatternLodForZoomLevel(zoom)
			return suffixSafeId(id, `${theme}_${lod}`)
		},
		[id]
	)
}

export function useGetSparseDotsPatternZoomName() {
	const id = useSharedSafeId('sparse_dots_pattern')
	return useCallback(
		(zoom: number, theme: TLDefaultColorTheme['id']) => {
			const lod = getPatternLodForZoomLevel(zoom)
			return suffixSafeId(id, `${theme}_${lod}`)
		},
		[id]
	)
}

export function useGetDenseDotsPatternZoomName() {
	const id = useSharedSafeId('dense_dots_pattern')
	return useCallback(
		(zoom: number, theme: TLDefaultColorTheme['id']) => {
			const lod = getPatternLodForZoomLevel(zoom)
			return suffixSafeId(id, `${theme}_${lod}`)
		},
		[id]
	)
}

export function useGetChevronsPatternZoomName() {
	const id = useSharedSafeId('chevrons_pattern')
	return useCallback(
		(zoom: number, theme: TLDefaultColorTheme['id']) => {
			const lod = getPatternLodForZoomLevel(zoom)
			return suffixSafeId(id, `${theme}_${lod}`)
		},
		[id]
	)
}

export function useGetCrossesPatternZoomName() {
	const id = useSharedSafeId('crosses_pattern')
	return useCallback(
		(zoom: number, theme: TLDefaultColorTheme['id']) => {
			const lod = getPatternLodForZoomLevel(zoom)
			return suffixSafeId(id, `${theme}_${lod}`)
		},
		[id]
	)
}

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

function usePattern() {
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
	const getHashPatternZoomName = useGetHashPatternZoomName()

	useEffect(() => {
		if (process.env.NODE_ENV === 'test') {
			setIsReady(true)
			return
		}

		const promise = Promise.all(
			getPatternLodsToGenerate(maxZoom).flatMap<Promise<PatternDef>>((zoom) => [
				generateImage(dpr, zoom, false).then((blob) => ({
					zoom,
					theme: 'light',
					url: URL.createObjectURL(blob),
				})),
				generateImage(dpr, zoom, true).then((blob) => ({
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
	}, [dpr, maxZoom])

	const defs = (
		<>
			{backgroundUrls.map((item) => {
				const id = getHashPatternZoomName(item.zoom, item.theme)
				return (
					<pattern
						key={id}
						id={id}
						width={TILE_PATTERN_SIZE}
						height={TILE_PATTERN_SIZE}
						patternUnits="userSpaceOnUse"
					>
						<image href={item.url} width={TILE_PATTERN_SIZE} height={TILE_PATTERN_SIZE} />
					</pattern>
				)
			})}
		</>
	)

	return { defs, isReady }
}

function PatternFillDefForCanvas() {
	const editor = useEditor()
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = usePattern()

	useEffect(() => {
		if (isReady && tlenv.isSafari) {
			const htmlLayer = findHtmlLayerParent(containerRef.current!)
			if (htmlLayer) {
				// Wait for `patternContext` to be picked up
				editor.timers.requestAnimationFrame(() => {
					htmlLayer.style.display = 'none'

					// Wait for 'display = "none"' to take effect
					editor.timers.requestAnimationFrame(() => {
						htmlLayer.style.display = ''
					})
				})
			}
		}
	}, [editor, isReady])

	return (
		<g ref={containerRef} data-testid={isReady ? 'ready-pattern-fill-defs' : undefined}>
			{defs}
		</g>
	)
}

// --- Dots pattern ---

function useDotsPattern() {
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
	const getDotsPatternZoomName = useGetDotsPatternZoomName()

	useEffect(() => {
		if (process.env.NODE_ENV === 'test') {
			setIsReady(true)
			return
		}

		const promise = Promise.all(
			getPatternLodsToGenerate(maxZoom).flatMap<Promise<PatternDef>>((zoom) => [
				generateDotsImage(dpr, zoom, false).then((blob) => ({
					zoom,
					theme: 'light',
					url: URL.createObjectURL(blob),
				})),
				generateDotsImage(dpr, zoom, true).then((blob) => ({
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
	}, [dpr, maxZoom])

	const defs = (
		<>
			{backgroundUrls.map((item) => {
				const id = getDotsPatternZoomName(item.zoom, item.theme)
				return (
					<pattern
						key={id}
						id={id}
						width={DOTS_TILE_SIZE}
						height={DOTS_TILE_SIZE}
						patternUnits="userSpaceOnUse"
					>
						<image href={item.url} width={DOTS_TILE_SIZE} height={DOTS_TILE_SIZE} />
					</pattern>
				)
			})}
		</>
	)

	return { defs, isReady }
}

function DotsFillDefForCanvas() {
	const editor = useEditor()
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useDotsPattern()

	useEffect(() => {
		if (isReady && tlenv.isSafari) {
			const htmlLayer = findHtmlLayerParent(containerRef.current!)
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
	const getSparseDotsPatternZoomName = useGetSparseDotsPatternZoomName()

	useEffect(() => {
		if (process.env.NODE_ENV === 'test') {
			setIsReady(true)
			return
		}

		const promise = Promise.all(
			getPatternLodsToGenerate(maxZoom).flatMap<Promise<PatternDef>>((zoom) => [
				generateSparseDotsImage(dpr, zoom, false).then((blob) => ({
					zoom,
					theme: 'light',
					url: URL.createObjectURL(blob),
				})),
				generateSparseDotsImage(dpr, zoom, true).then((blob) => ({
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
	}, [dpr, maxZoom])

	const defs = (
		<>
			{backgroundUrls.map((item) => {
				const id = getSparseDotsPatternZoomName(item.zoom, item.theme)
				return (
					<pattern
						key={id}
						id={id}
						width={SPARSE_DOTS_TILE_SIZE}
						height={SPARSE_DOTS_TILE_SIZE}
						patternUnits="userSpaceOnUse"
					>
						<image href={item.url} width={SPARSE_DOTS_TILE_SIZE} height={SPARSE_DOTS_TILE_SIZE} />
					</pattern>
				)
			})}
		</>
	)

	return { defs, isReady }
}

function SparseDotsFillDefForCanvas() {
	const editor = useEditor()
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useSparseDotsPattern()

	useEffect(() => {
		if (isReady && tlenv.isSafari) {
			const htmlLayer = findHtmlLayerParent(containerRef.current!)
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
	const getDenseDotsPatternZoomName = useGetDenseDotsPatternZoomName()

	useEffect(() => {
		if (process.env.NODE_ENV === 'test') {
			setIsReady(true)
			return
		}

		const promise = Promise.all(
			getPatternLodsToGenerate(maxZoom).flatMap<Promise<PatternDef>>((zoom) => [
				generateDenseDotsImage(dpr, zoom, false).then((blob) => ({
					zoom,
					theme: 'light',
					url: URL.createObjectURL(blob),
				})),
				generateDenseDotsImage(dpr, zoom, true).then((blob) => ({
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
	}, [dpr, maxZoom])

	const defs = (
		<>
			{backgroundUrls.map((item) => {
				const id = getDenseDotsPatternZoomName(item.zoom, item.theme)
				return (
					<pattern
						key={id}
						id={id}
						width={DENSE_DOTS_TILE_SIZE}
						height={DENSE_DOTS_TILE_SIZE}
						patternUnits="userSpaceOnUse"
					>
						<image href={item.url} width={DENSE_DOTS_TILE_SIZE} height={DENSE_DOTS_TILE_SIZE} />
					</pattern>
				)
			})}
		</>
	)

	return { defs, isReady }
}

function DenseDotsFillDefForCanvas() {
	const editor = useEditor()
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useDenseDotsPattern()

	useEffect(() => {
		if (isReady && tlenv.isSafari) {
			const htmlLayer = findHtmlLayerParent(containerRef.current!)
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
	const getChevronsPatternZoomName = useGetChevronsPatternZoomName()

	useEffect(() => {
		if (process.env.NODE_ENV === 'test') {
			setIsReady(true)
			return
		}

		const promise = Promise.all(
			getPatternLodsToGenerate(maxZoom).flatMap<Promise<PatternDef>>((zoom) => [
				generateChevronsImage(dpr, zoom, false).then((blob) => ({
					zoom,
					theme: 'light',
					url: URL.createObjectURL(blob),
				})),
				generateChevronsImage(dpr, zoom, true).then((blob) => ({
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
	}, [dpr, maxZoom])

	const defs = (
		<>
			{backgroundUrls.map((item) => {
				const id = getChevronsPatternZoomName(item.zoom, item.theme)
				return (
					<pattern
						key={id}
						id={id}
						width={CHEVRONS_TILE_SIZE}
						height={CHEVRONS_TILE_SIZE}
						patternUnits="userSpaceOnUse"
					>
						<image href={item.url} width={CHEVRONS_TILE_SIZE} height={CHEVRONS_TILE_SIZE} />
					</pattern>
				)
			})}
		</>
	)

	return { defs, isReady }
}

function ChevronsFillDefForCanvas() {
	const editor = useEditor()
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useChevronsPattern()

	useEffect(() => {
		if (isReady && tlenv.isSafari) {
			const htmlLayer = findHtmlLayerParent(containerRef.current!)
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
	const getCrossesPatternZoomName = useGetCrossesPatternZoomName()

	useEffect(() => {
		if (process.env.NODE_ENV === 'test') {
			setIsReady(true)
			return
		}

		const promise = Promise.all(
			getPatternLodsToGenerate(maxZoom).flatMap<Promise<PatternDef>>((zoom) => [
				generateCrossesImage(dpr, zoom, false).then((blob) => ({
					zoom,
					theme: 'light',
					url: URL.createObjectURL(blob),
				})),
				generateCrossesImage(dpr, zoom, true).then((blob) => ({
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
	}, [dpr, maxZoom])

	const defs = (
		<>
			{backgroundUrls.map((item) => {
				const id = getCrossesPatternZoomName(item.zoom, item.theme)
				return (
					<pattern
						key={id}
						id={id}
						width={CROSSES_TILE_SIZE}
						height={CROSSES_TILE_SIZE}
						patternUnits="userSpaceOnUse"
					>
						<image href={item.url} width={CROSSES_TILE_SIZE} height={CROSSES_TILE_SIZE} />
					</pattern>
				)
			})}
		</>
	)

	return { defs, isReady }
}

function CrossesFillDefForCanvas() {
	const editor = useEditor()
	const containerRef = useRef<SVGGElement>(null)
	const { defs, isReady } = useCrossesPattern()

	useEffect(() => {
		if (isReady && tlenv.isSafari) {
			const htmlLayer = findHtmlLayerParent(containerRef.current!)
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

function findHtmlLayerParent(element: Element): HTMLElement | null {
	if (element.classList.contains('tl-html-layer')) return element as HTMLElement
	if (element.parentElement) return findHtmlLayerParent(element.parentElement)
	return null
}
