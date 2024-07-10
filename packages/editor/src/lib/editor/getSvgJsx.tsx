import {
	TLFrameShape,
	TLGroupShape,
	TLShape,
	TLShapeId,
	createShapeId,
	getDefaultColorTheme,
} from '@tldraw/tlschema'
import { FileHelpers, fetch } from '@tldraw/utils'
import { Fragment, ReactElement } from 'react'
import WatermarkDesktop from '../../../assets/watermarks/watermark-desktop.svg'
import { Mat } from '../primitives/Mat'
import { Editor } from './Editor'
import { SvgExportContext, SvgExportContextProvider, SvgExportDef } from './types/SvgExportContext'
import { TLSvgOptions } from './types/misc-types'

let watermarkBase64 = ''

export async function getSvgJsx(
	editor: Editor,
	shapes: TLShapeId[] | TLShape[],
	opts: TLSvgOptions = {}
) {
	const ids =
		typeof shapes[0] === 'string' ? (shapes as TLShapeId[]) : (shapes as TLShape[]).map((s) => s.id)

	if (ids.length === 0) return
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
	let didExpandPadding = false
	if (!singleFrameShapeId) {
		// Expand by an extra 32 pixels
		bbox.expandBy(padding)
		didExpandPadding = true
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
	}

	const createWatermarkShape = async () => {
		const watermarkWidth = 141
		const watermarkHeight = 32
		const watermarkPadding = 8
		const desiredHeight = bbox.height * 0.05
		const scaleFactor = desiredHeight / watermarkHeight

		const isWatermarkBiggerThanTheBoundingBox = bbox.height < watermarkHeight + watermarkPadding
		if (isWatermarkBiggerThanTheBoundingBox) {
			// Meh, not worth it. Don't worry about it, you get a freebie ;)
			return []
		}

		const id = createShapeId()
		const offsetX =
			(watermarkWidth + watermarkPadding) * scaleFactor + (didExpandPadding ? padding : 0)
		const offsetY =
			(watermarkHeight + watermarkPadding) * scaleFactor + (didExpandPadding ? padding : 0)
		const pageTransform = Mat.Identity()
			.translate(bbox.maxX - offsetX, bbox.maxY - offsetY)
			.scale(scaleFactor, scaleFactor)
			.toCssString()

		if (!watermarkBase64) {
			// XXX(mime): this is so weird. Why is fetch needed here?!?
			const watermarkResponse = await fetch(WatermarkDesktop)
			const watermarkBlob = await watermarkResponse.blob()
			watermarkBase64 = await FileHelpers.blobToDataUrl(watermarkBlob)
		}

		return [
			{
				zIndex: 2147483647,
				element: (
					<g key={id} transform={pageTransform} opacity={0.5}>
						<image href={watermarkBase64} width={watermarkWidth} height={watermarkHeight} />
					</g>
				),
			},
		]
	}

	const unorderedShapeElements = (
		await Promise.all(
			renderingShapes
				.map(async ({ id, opacity, index, backgroundIndex }) => {
					// Don't render the frame if we're only exporting a single frame
					if (id === singleFrameShapeId) return []

					const shape = editor.getShape(id)!

					if (editor.isShapeOfType<TLGroupShape>(shape, 'group')) return []

					const util = editor.getShapeUtil(shape)

					let toSvgResult = await util.toSvg?.(shape, exportContext)
					let toBackgroundSvgResult = await util.toBackgroundSvg?.(shape, exportContext)

					if (!toSvgResult && !toBackgroundSvgResult) {
						const bounds = editor.getShapePageBounds(shape)!
						toSvgResult = (
							<rect
								width={bounds.w}
								height={bounds.h}
								fill={theme.solid}
								stroke={theme.grey.pattern}
								strokeWidth={1}
							/>
						)
					}

					let pageTransform = editor.getShapePageTransform(shape)!.toCssString()
					if ('scale' in shape.props) {
						if (shape.props.scale !== 1) {
							pageTransform = `${pageTransform} scale(${shape.props.scale}, ${shape.props.scale})`
						}
					}

					if (toSvgResult) {
						toSvgResult = (
							<g key={shape.id} transform={pageTransform} opacity={opacity}>
								{toSvgResult}
							</g>
						)
					}
					if (toBackgroundSvgResult) {
						toBackgroundSvgResult = (
							<g key={`bg_${shape.id}`} transform={pageTransform} opacity={opacity}>
								{toBackgroundSvgResult}
							</g>
						)
					}

					// Create svg mask if shape has a frame as parent
					const pageMask = editor.getShapeMask(shape.id)
					if (pageMask) {
						// Create a clip path and add it to defs
						const pageMaskId = `mask_${shape.id.replace(':', '_')}`
						defChildren.push(
							<clipPath key={defChildren.length} id={pageMaskId}>
								{/* Create a polyline mask that does the clipping */}
								<path d={`M${pageMask.map(({ x, y }) => `${x},${y}`).join('L')}Z`} />
							</clipPath>
						)

						if (toSvgResult) {
							toSvgResult = (
								<g key={shape.id} clipPath={`url(#${pageMaskId})`}>
									{toSvgResult}
								</g>
							)
						}
						if (toBackgroundSvgResult) {
							toBackgroundSvgResult = (
								<g key={`bg_${shape.id}`} clipPath={`url(#${pageMaskId})`}>
									{toBackgroundSvgResult}
								</g>
							)
						}
					}

					const elements = []
					if (toSvgResult) {
						elements.push({ zIndex: index, element: toSvgResult })
					}
					if (toBackgroundSvgResult) {
						elements.push({ zIndex: backgroundIndex, element: toBackgroundSvgResult })
					}

					return elements
				})
				.concat(editor.isWatermarkShown ? [createWatermarkShape()] : [])
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
			>
				<defs>{defChildren}</defs>
				{unorderedShapeElements.sort((a, b) => a.zIndex - b.zIndex).map(({ element }) => element)}
			</svg>
		</SvgExportContextProvider>
	)

	return { jsx: svg, width: w, height: h }
}
