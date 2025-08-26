import { useAtom, useValue } from '@tldraw/state-react'
import {
	TLFrameShape,
	TLGroupShape,
	TLShape,
	TLShapeId,
	getColorValue,
	getDefaultColorTheme,
} from '@tldraw/tlschema'
import { hasOwnProperty, promiseWithResolve, uniqueId } from '@tldraw/utils'
import {
	ComponentType,
	Fragment,
	ReactElement,
	ReactNode,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react'
import { flushSync } from 'react-dom'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { InnerShape, InnerShapeBackground } from '../components/Shape'
import { Editor, TLRenderingShape } from '../editor/Editor'
import { TLFontFace } from '../editor/managers/FontManager/FontManager'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import {
	SvgExportContext,
	SvgExportContextProvider,
	SvgExportDef,
} from '../editor/types/SvgExportContext'
import { TLImageExportOptions } from '../editor/types/misc-types'
import { useEditor } from '../hooks/useEditor'
import { useEvent } from '../hooks/useEvent'
import { suffixSafeId, useUniqueSafeId } from '../hooks/useSafeId'
import { Box } from '../primitives/Box'
import { Mat } from '../primitives/Mat'
import { ExportDelay } from './ExportDelay'

export function getSvgJsx(editor: Editor, ids: TLShapeId[], opts: TLImageExportOptions = {}) {
	if (!window.document) throw Error('No document')

	const {
		scale = 1,
		// should we include the background in the export? or is it transparent?
		background = editor.getInstanceState().exportBackground,
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
	const singleFrameShapeId =
		ids.length === 1 && editor.isShapeOfType<TLFrameShape>(editor.getShape(ids[0])!, 'frame')
			? ids[0]
			: null

	let bbox: null | Box = null
	if (opts.bounds) {
		bbox = opts.bounds.clone().expandBy(padding)
	} else {
		bbox = getExportDefaultBounds(editor, renderingShapes, padding, singleFrameShapeId)
	}

	// no unmasked shapes to export
	if (!bbox) return

	// We want the svg image to be BIGGER THAN USUAL to account for image quality
	const w = bbox.width * scale
	const h = bbox.height * scale

	try {
		document.body.focus?.() // weird but necessary
	} catch {
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
			pixelRatio={opts.pixelRatio ?? null}
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

/**
 * Calculates the default bounds for an SVG export. This function handles:
 * 1. Computing masked page bounds for each shape
 * 2. Container logic: if a shape is marked as an export bounds container and it
 *    contains all other shapes, use its bounds and skip padding
 * 3. Otherwise, create a union of all shape bounds and apply padding
 *
 * The container logic is useful for cases like annotating on an image - if the image
 * contains all annotations, we want to export exactly the image bounds without extra padding.
 *
 * @param editor - The editor instance
 * @param renderingShapes - The shapes to include in the export
 * @param padding - Padding to add around the bounds (only applied if no container bounds)
 * @param singleFrameShapeId - If exporting a single frame, this is its ID (skips padding)
 * @returns The calculated bounds box, or null if no shapes to export
 */
export function getExportDefaultBounds(
	editor: Editor,
	renderingShapes: TLRenderingShape[],
	padding: number,
	singleFrameShapeId: TLShapeId | null
) {
	let isBoundedByContainer = false
	let bbox: null | Box = null

	for (const { id } of renderingShapes) {
		const maskedPageBounds = editor.getShapeMaskedPageBounds(id)
		if (!maskedPageBounds) continue

		// Check if this shape is an export bounds container (e.g., an image being annotated)
		const shape = editor.getShape(id)!
		const isContainer = editor.getShapeUtil(shape).isExportBoundsContainer(shape)

		if (bbox) {
			// Container logic: if this is a container and it contains all shapes processed so far,
			// use the container's bounds instead of the union. This prevents extra padding around
			// things like annotated images.
			if (isContainer && Box.ContainsApproximately(maskedPageBounds, bbox)) {
				isBoundedByContainer = true
				bbox = maskedPageBounds.clone()
			} else {
				// If we were previously bounded by a container but this shape extends outside it,
				// we're no longer bounded by a container
				if (isBoundedByContainer && !Box.ContainsApproximately(bbox, maskedPageBounds)) {
					isBoundedByContainer = false
				}
				// Expand the bounding box to include this shape
				bbox.union(maskedPageBounds)
			}
		} else {
			// First shape sets the initial bounds
			isBoundedByContainer = isContainer
			bbox = maskedPageBounds.clone()
		}
	}

	// No unmasked shapes to export
	if (!bbox) return null

	// Only apply padding if:
	// - Not exporting a single frame (frames have their own padding rules)
	// - Not bounded by a container (containers define their own bounds precisely)
	if (!singleFrameShapeId && !isBoundedByContainer) {
		bbox.expandBy(padding)
	}

	return bbox
}

function SvgExport({
	editor,
	preserveAspectRatio,
	scale,
	pixelRatio,
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
	pixelRatio: number | null
	bbox: Box
	background: boolean
	singleFrameShapeId: TLShapeId | null
	isDarkMode: boolean
	renderingShapes: TLRenderingShape[]
	onMount(): void
	waitUntil(promise: Promise<void>): void
}) {
	const masksId = useUniqueSafeId()
	const theme = getDefaultColorTheme({ isDarkMode })

	const stateAtom = useAtom<{
		defsById: Record<
			string,
			{ pending: false; element: ReactNode } | { pending: true; element: Promise<ReactNode> }
		>
		shapeElements: ReactElement[] | null
	}>('export state', { defsById: {}, shapeElements: null })
	const { defsById, shapeElements } = useValue(stateAtom)

	const addExportDef = useEvent((def: SvgExportDef) => {
		stateAtom.update((state) => {
			if (hasOwnProperty(state.defsById, def.key)) return state

			const promise = Promise.resolve(def.getElement())
			waitUntil(
				promise.then((result) => {
					stateAtom.update((state) => ({
						...state,
						defsById: { ...state.defsById, [def.key]: { pending: false, element: result } },
					}))
				})
			)
			return {
				...state,
				defsById: { ...state.defsById, [def.key]: { pending: true, element: promise } },
			}
		})
	})

	const exportContext = useMemo(
		(): SvgExportContext => ({
			isDarkMode,
			waitUntil,
			addExportDef,
			scale,
			pixelRatio,
			async resolveAssetUrl(assetId, width) {
				const asset = editor.getAsset(assetId)
				if (!asset || (asset.type !== 'image' && asset.type !== 'video')) return null

				return await editor.resolveAssetUrl(assetId, {
					screenScale: scale * (width / asset.props.w),
					shouldResolveToOriginal: pixelRatio === null,
					dpr: pixelRatio ?? undefined,
				})
			},
		}),
		[isDarkMode, waitUntil, addExportDef, scale, pixelRatio, editor]
	)

	const didRenderRef = useRef(false)
	useLayoutEffect(() => {
		if (didRenderRef.current) {
			throw new Error('SvgExport should only render once - do not use with react strict mode')
		}
		didRenderRef.current = true
		;(async () => {
			const shapeDefs: Record<string, { pending: false; element: ReactElement }> = {}

			// Then render everything. The shapes with assets should all hit the cache
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
						let scale = 1
						if ('scale' in shape.props) {
							if (shape.props.scale !== 1) {
								scale = shape.props.scale
								pageTransformString = `${pageTransformString} scale(${shape.props.scale}, ${shape.props.scale})`
							}
						}

						// Create svg mask if shape has a frame as parent
						const pageMask = editor.getShapeMask(shape.id)
						const shapeMask = pageMask
							? Mat.From(Mat.Inverse(pageTransform)).applyToPoints(pageMask)
							: null
						const shapeMaskId = suffixSafeId(masksId, shape.id)
						if (shapeMask) {
							// Create a clip path and add it to defs
							shapeDefs[shapeMaskId] = {
								pending: false,
								element: (
									<clipPath id={shapeMaskId}>
										{/* Create a polyline mask that does the clipping */}
										<path
											d={`M${shapeMask.map(({ x, y }) => `${x / scale},${y / scale}`).join('L')}Z`}
										/>
									</clipPath>
								),
							}
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
				stateAtom.update((state) => ({
					...state,
					shapeElements: unorderedShapeElements
						.sort((a, b) => a.zIndex - b.zIndex)
						.map(({ element }) => element),
					defsById: { ...state.defsById, ...shapeDefs },
				}))
			})
		})()
	}, [bbox, editor, exportContext, masksId, renderingShapes, singleFrameShapeId, stateAtom])

	useEffect(() => {
		const fontsInUse = new Set<TLFontFace>()
		for (const { id } of renderingShapes) {
			for (const font of editor.fonts.getShapeFontFaces(id)) {
				fontsInUse.add(font)
			}
		}

		for (const font of fontsInUse) {
			addExportDef({
				key: uniqueId(),
				getElement: async () => {
					const declaration = await editor.fonts.toEmbeddedCssDeclaration(font)
					return <style nonce={editor.options.nonce}>{declaration}</style>
				},
			})
		}
	}, [editor, renderingShapes, addExportDef])

	useEffect(() => {
		if (shapeElements === null) return
		onMount()
	}, [onMount, shapeElements])

	let backgroundColor = background ? theme.background : 'transparent'

	if (singleFrameShapeId && background) {
		const frameShapeUtil = editor.getShapeUtil('frame') as any as
			| undefined
			| { options: { showColors: boolean } }
		if (frameShapeUtil?.options.showColors) {
			const shape = editor.getShape(singleFrameShapeId)! as TLFrameShape
			backgroundColor = getColorValue(theme, shape.props.color, 'frameFill')
		} else {
			backgroundColor = theme.solid
		}
	}

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
				style={{ backgroundColor }}
				data-color-mode={isDarkMode ? 'dark' : 'light'}
				className={`tl-container tl-theme__force-sRGB ${isDarkMode ? 'tl-theme__dark' : 'tl-theme__light'}`}
			>
				<defs>
					{Object.entries(defsById).map(([key, def]) =>
						def.pending ? null : <Fragment key={key}>{def.element}</Fragment>
					)}
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
				className="tl-shape-foreign-object tl-export-embed-styles"
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
