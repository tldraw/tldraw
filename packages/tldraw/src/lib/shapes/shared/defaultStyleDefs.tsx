import {
	DefaultFontStyle,
	SvgExportDef,
	TLDefaultFillStyle,
	TLShapeUtilCanvasSvgDef,
	debugFlags,
	getGlobalDocument,
	last,
	suffixSafeId,
	tlenv,
	useEditor,
	useSharedSafeId,
	useUniqueSafeId,
	useValue,
} from '@tldraw/editor'
import { useCallback, useEffect, useRef, useState } from 'react'

/** @public */
export function getFillDefForExport(fill: TLDefaultFillStyle): SvgExportDef {
	return {
		key: `${DefaultFontStyle.id}:${fill}`,
		async getElement() {
			if (fill !== 'pattern') return null

			return <HashPatternForExport />
		},
	}
}

function HashPatternForExport() {
	const getHashPatternZoomName = useGetHashPatternZoomName()
	const maskId = useUniqueSafeId()
	const editor = useEditor()
	const colorMode = editor.getColorMode()
	const colors = editor.getCurrentTheme().colors[colorMode]
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
				id={getHashPatternZoomName(1, colorMode)}
				width="8"
				height="8"
				patternUnits="userSpaceOnUse"
			>
				<rect x="0" y="0" width="8" height="8" fill={colors.solid} mask={`url(#${maskId})`} />
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

const generateImage = (dpr: number, currentZoom: number, solid: string) => {
	return new Promise<Blob>((resolve, reject) => {
		const size = TILE_PATTERN_SIZE * currentZoom * dpr

		const canvasEl = getGlobalDocument().createElement('canvas')
		canvasEl.width = size
		canvasEl.height = size

		const ctx = canvasEl.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = solid
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

const canvasBlob = (size: [number, number], fn: (ctx: CanvasRenderingContext2D) => void) => {
	const canvas = getGlobalDocument().createElement('canvas')
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
	theme: string
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
		(zoom: number, theme: string) => {
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
	// In dynamic size mode, new shapes are created with scale = 1 / zoomLevel.
	// For pattern LOD generation, we use the worst-case effective zoom:
	// a shape created at min zoom and later viewed at max zoom (maxZoom / minZoom)
	const maxEffectiveZoom = useValue(
		'maxEffectiveZoom',
		() => {
			const steps = editor.getCameraOptions().zoomSteps
			return last(steps)! / steps[0]
		},
		[editor]
	)
	const [isReady, setIsReady] = useState(false)
	const [backgroundUrls, setBackgroundUrls] = useState<PatternDef[]>(() =>
		getDefaultPatterns(maxEffectiveZoom)
	)
	const getHashPatternZoomName = useGetHashPatternZoomName()

	useEffect(() => {
		if (process.env.NODE_ENV === 'test') {
			setIsReady(true)
			return
		}

		const definition = editor.getCurrentTheme()
		const lightSolid = definition.colors.light.solid
		const darkSolid = definition.colors.dark.solid

		const promise = Promise.all(
			getPatternLodsToGenerate(maxEffectiveZoom).flatMap<Promise<PatternDef>>((zoom) => [
				generateImage(dpr, zoom, lightSolid).then((blob) => ({
					zoom,
					theme: 'light',
					url: URL.createObjectURL(blob),
				})),
				generateImage(dpr, zoom, darkSolid).then((blob) => ({
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
	}, [dpr, maxEffectiveZoom, editor])

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

function findHtmlLayerParent(element: Element): HTMLElement | null {
	if (element.classList.contains('tl-html-layer')) return element as HTMLElement
	if (element.parentElement) return findHtmlLayerParent(element.parentElement)
	return null
}
