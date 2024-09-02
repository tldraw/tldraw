import {
	TLFrameShape,
	TLGroupShape,
	TLShape,
	TLShapeId,
	getDefaultColorTheme,
} from '@tldraw/tlschema'
import { promiseWithResolve } from '@tldraw/utils'
import { ComponentType, Fragment, ReactElement, useEffect } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { InnerShape, InnerShapeBackground } from '../components/Shape'
import { Editor } from '../editor/Editor'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import {
	SvgExportContext,
	SvgExportContextProvider,
	SvgExportDef,
} from '../editor/types/SvgExportContext'
import { TLSvgOptions } from '../editor/types/misc-types'
import { useEditor } from '../hooks/useEditor'
import { Box } from '../primitives/Box'
import { Mat } from '../primitives/Mat'
import { ExportDelay } from './ExportDelay'

export async function getSvgJsx(editor: Editor, ids: TLShapeId[], opts: TLSvgOptions = {}) {
	if (!window.document) throw Error('No document')

	const {
		scale = 1,
		background = false,
		padding = editor.options.defaultSvgPadding,
		preserveAspectRatio = false,
	} = opts

	const isDarkMode = opts.darkMode ?? editor.user.getIsDarkMode()
	const theme = getDefaultColorTheme({ isDarkMode })

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

	const defChildren: ReactElement[] = []

	const initialEffectPromise = promiseWithResolve<void>()
	const exportDelay = new ExportDelay()

	const exportDefPromisesById = new Map<string, Promise<void>>()
	const exportContext: SvgExportContext = {
		isDarkMode,
		addExportDef: (def: SvgExportDef) => {
			if (exportDefPromisesById.has(def.key)) return
			const promise = (async () => {
				const element = await def.getElement()
				if (!element) return

				defChildren.push(<Fragment key={defChildren.length}>{element}</Fragment>)
			})()
			exportDefPromisesById.set(def.key, promise)
		},
		waitUntil: (promise) => {
			exportDelay.waitUntil(promise)
		},
	}

	const unorderedShapeElements = (
		await Promise.all(
			renderingShapes.map(async ({ id, opacity, index, backgroundIndex }) => {
				// Don't render the frame if we're only exporting a single frame
				if (id === singleFrameShapeId) return []

				const shape = editor.getShape(id)!

				if (editor.isShapeOfType<TLGroupShape>(shape, 'group')) return []

				const elements = []
				const util = editor.getShapeUtil(shape)

				if (util.toSvg || util.toBackgroundSvg) {
					// If the shape has any sort of custom svg export, let's use that.
					const toSvgResult = await util.toSvg?.(shape, exportContext)
					const toBackgroundSvgResult = await util.toBackgroundSvg?.(shape, exportContext)

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
					const shapeMaskId = `mask_${shape.id.replace(':', '_')}`
					if (shapeMask) {
						// Create a clip path and add it to defs
						defChildren.push(
							<clipPath key={defChildren.length} id={shapeMaskId}>
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
									key={shape.id}
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
									key={shape.id}
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
								key={shape.id}
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
									key={shape.id}
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
			})
		)
	).flat()

	await Promise.all(exportDefPromisesById.values())

	const svg = (
		<SvgExportContextProvider editor={editor} context={exportContext}>
			<svg
				preserveAspectRatio={preserveAspectRatio ? preserveAspectRatio : undefined}
				direction="ltr"
				width={w}
				height={h}
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
				<ResolveInitialEffect onEffect={() => initialEffectPromise.resolve()} />
				<defs>{defChildren}</defs>
				{unorderedShapeElements.sort((a, b) => a.zIndex - b.zIndex).map(({ element }) => element)}
			</svg>
		</SvgExportContextProvider>
	)

	return { jsx: svg, width: w, height: h, exportDelay }
}

function ResolveInitialEffect({ onEffect }: { onEffect(): void }) {
	useEffect(() => {
		onEffect()
	})

	return null
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
