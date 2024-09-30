import {
	TLFrameShape,
	TLGroupShape,
	TLShape,
	TLShapeId,
	getDefaultColorTheme,
} from '@tldraw/tlschema'
import { hasOwnProperty, promiseWithResolve } from '@tldraw/utils'
import {
	ComponentType,
	Fragment,
	ReactElement,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { flushSync } from 'react-dom'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { InnerShape, InnerShapeBackground } from '../components/Shape'
import { Editor, TLRenderingShape } from '../editor/Editor'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import {
	SvgExportContext,
	SvgExportContextProvider,
	SvgExportDef,
} from '../editor/types/SvgExportContext'
import { TLImageExportOptions } from '../editor/types/misc-types'
import { useEditor } from '../hooks/useEditor'
import { useEvent } from '../hooks/useEvent'
import { sanitizeId } from '../hooks/useSafeId'
import { Box } from '../primitives/Box'
import { Mat } from '../primitives/Mat'
import { ExportDelay } from './ExportDelay'

export function getSvgJsx(editor: Editor, ids: TLShapeId[], opts: TLImageExportOptions = {}) {
	if (!window.document) throw Error('No document')

	const {
		scale = 1,
		// should we include the background in the export? or is it transparent?
		background = false,
		padding = editor.options.defaultSvgPadding,
		preserveAspectRatio,
	} = opts

	const isDarkMode = opts.darkMode ?? editor.user.getIsDarkMode()

	// ---Figure out which shapes we need to include
	const shapeIdsToInclude = editor.getShapeAndDescendantIds(ids)
	const renderingShapes = editor
		.getUnorderedRenderingShapes(false)
		.filter(({ id }) => shapeIdsToInclude.has(id))

	// --- Common bounding box of all shapes
	let bbox = null
	if (opts.bounds) {
		bbox = opts.bounds
	} else {
		for (const { id } of renderingShapes) {
			const maskedPageBounds = editor.getShapeMaskedPageBounds(id)
			if (!maskedPageBounds) continue
			if (bbox) {
				bbox.union(maskedPageBounds)
			} else {
				bbox = maskedPageBounds.clone()
			}
		}
	}

	// no unmasked shapes to export
	if (!bbox) return

	const singleFrameShapeId =
		ids.length === 1 && editor.isShapeOfType<TLFrameShape>(editor.getShape(ids[0])!, 'frame')
			? ids[0]
			: null
	if (!singleFrameShapeId) {
		// Expand by an extra 32 pixels
		bbox.expandBy(padding)
	}

	// We want the svg image to be BIGGER THAN USUAL to account for image quality
	const w = bbox.width * scale
	const h = bbox.height * scale

	try {
		document.body.focus?.() // weird but necessary
	} catch (e) {
		// not implemented
	}

	const exportDelay = new ExportDelay(editor.options.maxExportDelayMs)

	const initialEffectPromise = promiseWithResolve<void>()
	exportDelay.waitUntil(initialEffectPromise)

	const svg = (
		<SvgExport
			editor={editor}
			preserveAspectRatio={preserveAspectRatio}
			scale={scale}
			bbox={bbox}
			background={background}
			singleFrameShapeId={singleFrameShapeId}
			isDarkMode={isDarkMode}
			renderingShapes={renderingShapes}
			onMount={initialEffectPromise.resolve}
			waitUntil={exportDelay.waitUntil}
		>
			{}
		</SvgExport>
	)

	return { jsx: svg, width: w, height: h, exportDelay }
}

function SvgExport({
	editor,
	preserveAspectRatio,
	scale,
	bbox,
	background,
	singleFrameShapeId,
	isDarkMode,
	renderingShapes,
	onMount,
	waitUntil,
}: {
	editor: Editor
	preserveAspectRatio?: string
	scale: number
	bbox: Box
	background: boolean
	singleFrameShapeId: TLShapeId | null
	isDarkMode: boolean
	renderingShapes: TLRenderingShape[]
	onMount(): void
	waitUntil(promise: Promise<void>): void
}) {
	const theme = getDefaultColorTheme({ isDarkMode })

	const [defsById, setDefsById] = useState<Record<string, ReactElement>>({})
	const addExportDef = useEvent((def: SvgExportDef) => {
		if (hasOwnProperty(defsById, def.key)) return
		waitUntil(
			(async () => {
				const element = await def.getElement()
				if (!element) return

				flushSync(() => setDefsById((defsById) => ({ ...defsById, [def.key]: element })))
			})()
		)
	})

	const exportContext = useMemo(
		(): SvgExportContext => ({
			isDarkMode,
			waitUntil,
			addExportDef,
		}),
		[isDarkMode, waitUntil, addExportDef]
	)

	const [shapeElements, setShapeElements] = useState<ReactElement[] | null>(null)
	const didRenderRef = useRef(false)
	useLayoutEffect(() => {
		if (didRenderRef.current) {
			throw new Error('SvgExport should only render once - do not use with react strict mode')
		}
		didRenderRef.current = true
		;(async () => {
			const shapeDefs: Record<string, ReactElement> = {}

			const unorderedShapeElementPromises = renderingShapes.map(
				async ({ id, opacity, index, backgroundIndex }) => {
					// Don't render the frame if we're only exporting a single frame and it's children
					if (id === singleFrameShapeId) return []

					const shape = editor.getShape(id)!

					if (editor.isShapeOfType<TLGroupShape>(shape, 'group')) return []

					const elements = []
					const util = editor.getShapeUtil(shape)

					if (util.toSvg || util.toBackgroundSvg) {
						// If the shape has any sort of custom svg export, let's use that.
						const [toSvgResult, toBackgroundSvgResult] = await Promise.all([
							util.toSvg?.(shape, exportContext),
							util.toBackgroundSvg?.(shape, exportContext),
						])

						const pageTransform = editor.getShapePageTransform(shape)
						let pageTransformString = pageTransform!.toCssString()
						if ('scale' in shape.props) {
							if (shape.props.scale !== 1) {
								pageTransformString = `${pageTransformString} scale(${shape.props.scale}, ${shape.props.scale})`
							}
						}

						// Create svg mask if shape has a frame as parent
						const pageMask = editor.getShapeMask(shape.id)
						const shapeMask = pageMask
							? Mat.From(Mat.Inverse(pageTransform)).applyToPoints(pageMask)
							: null
						const shapeMaskId = `mask_${sanitizeId(shape.id)}`
						if (shapeMask) {
							// Create a clip path and add it to defs
							shapeDefs[shapeMaskId] = (
								<clipPath id={shapeMaskId}>
									{/* Create a polyline mask that does the clipping */}
									<path d={`M${shapeMask.map(({ x, y }) => `${x},${y}`).join('L')}Z`} />
								</clipPath>
							)
						}

						if (toSvgResult) {
							elements.push({
								zIndex: index,
								element: (
									<g
										key={`fg_${shape.id}`}
										transform={pageTransformString}
										opacity={opacity}
										clipPath={pageMask ? `url(#${shapeMaskId})` : undefined}
									>
										{toSvgResult}
									</g>
								),
							})
						}
						if (toBackgroundSvgResult) {
							elements.push({
								zIndex: backgroundIndex,
								element: (
									<g
										key={`bg_${shape.id}`}
										transform={pageTransformString}
										opacity={opacity}
										clipPath={pageMask ? `url(#${shapeMaskId})` : undefined}
									>
										{toBackgroundSvgResult}
									</g>
								),
							})
						}
					} else {
						// If the shape doesn't have a custom svg export, we'll use its normal HTML
						// renderer in a foreignObject.
						elements.push({
							zIndex: index,
							element: (
								<ForeignObjectShape
									key={`fg_${shape.id}`}
									shape={shape}
									util={util}
									component={InnerShape}
									className="tl-shape"
									bbox={bbox}
									opacity={opacity}
								/>
							),
						})

						if (util.backgroundComponent) {
							elements.push({
								zIndex: backgroundIndex,
								element: (
									<ForeignObjectShape
										key={`bg_${shape.id}`}
										shape={shape}
										util={util}
										component={InnerShapeBackground}
										className="tl-shape tl-shape-background"
										bbox={bbox}
										opacity={opacity}
									/>
								),
							})
						}
					}

					return elements
				}
			)

			const unorderedShapeElements = (await Promise.all(unorderedShapeElementPromises)).flat()
			flushSync(() => {
				setShapeElements(
					unorderedShapeElements.sort((a, b) => a.zIndex - b.zIndex).map(({ element }) => element)
				)
				setDefsById((defsById) => ({ ...defsById, ...shapeDefs }))
			})
		})()
	}, [bbox, editor, exportContext, renderingShapes, singleFrameShapeId])

	useEffect(() => {
		if (shapeElements === null) return
		onMount()
	}, [onMount, shapeElements])

	return (
		<SvgExportContextProvider editor={editor} context={exportContext}>
			<svg
				preserveAspectRatio={preserveAspectRatio}
				direction="ltr"
				width={bbox.width * scale}
				height={bbox.height * scale}
				viewBox={`${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`}
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{
					backgroundColor: background
						? singleFrameShapeId
							? theme.solid
							: theme.background
						: 'transparent',
				}}
				data-color-mode={isDarkMode ? 'dark' : 'light'}
				className={`tl-container tl-theme__force-sRGB ${isDarkMode ? 'tl-theme__dark' : 'tl-theme__light'}`}
			>
				<defs>
					{Object.entries(defsById).map(([key, def]) => (
						<Fragment key={key}>{def}</Fragment>
					))}
				</defs>
				{shapeElements}
			</svg>
		</SvgExportContextProvider>
	)
}

function ForeignObjectShape({
	shape,
	util,
	className,
	component: Component,
	bbox,
	opacity,
}: {
	shape: TLShape
	util: ShapeUtil
	className?: string
	component: ComponentType<{ shape: TLShape; util: ShapeUtil }>
	bbox: Box
	opacity: number
}) {
	const editor = useEditor()

	const transform = Mat.Translate(-bbox.minX, -bbox.minY).multiply(
		editor.getShapePageTransform(shape.id)!
	)

	const bounds = editor.getShapeGeometry(shape.id).bounds
	const width = Math.max(bounds.width, 1)
	const height = Math.max(bounds.height, 1)

	return (
		<ErrorBoundary fallback={() => null}>
			<foreignObject
				x={bbox.minX}
				y={bbox.minY}
				width={bbox.w}
				height={bbox.h}
				className="tl-shape-foreign-object"
			>
				<div
					className={className}
					data-shape-type={shape.type}
					style={{
						clipPath: editor.getShapeClipPath(shape.id),
						transform: transform.toCssString(),
						width,
						height,
						opacity,
					}}
				>
					<Component shape={shape} util={util} />
				</div>
			</foreignObject>
		</ErrorBoundary>
	)
}
