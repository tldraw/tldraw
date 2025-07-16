import {
	Box,
	RotateCorner,
	TLEmbedShape,
	TLSelectionForegroundProps,
	TLTextShape,
	getCursor,
	tlenv,
	toDomPrecision,
	track,
	useEditor,
	useSelectionEvents,
	useTransform,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import { PointerEventHandler, useRef } from 'react'
import { useReadonly } from '../ui/hooks/useReadonly'
import { useTranslation } from '../ui/hooks/useTranslation/useTranslation'
import { TldrawCropHandles } from './TldrawCropHandles'

/** @public */
export const TldrawSelectionForeground = track(function TldrawSelectionForeground({
	bounds,
	rotation,
}: TLSelectionForegroundProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const rSvg = useRef<SVGSVGElement>(null)

	const isReadonlyMode = useReadonly()
	const topEvents = useSelectionEvents('top')
	const rightEvents = useSelectionEvents('right')
	const bottomEvents = useSelectionEvents('bottom')
	const leftEvents = useSelectionEvents('left')
	const topLeftEvents = useSelectionEvents('top_left')
	const topRightEvents = useSelectionEvents('top_right')
	const bottomRightEvents = useSelectionEvents('bottom_right')
	const bottomLeftEvents = useSelectionEvents('bottom_left')

	const isDefaultCursor = editor.getInstanceState().cursor.type === 'default'
	const isCoarsePointer = editor.getInstanceState().isCoarsePointer

	const onlyShape = editor.getOnlySelectedShape()
	const isLockedShape = onlyShape && editor.isShapeOrAncestorLocked(onlyShape)

	// if all shapes have an expandBy for the selection outline, we can expand by the l
	const expandOutlineBy = onlyShape
		? editor.getShapeUtil(onlyShape).expandSelectionOutlinePx(onlyShape)
		: 0

	const expandedBounds =
		expandOutlineBy instanceof Box
			? bounds.clone().expand(expandOutlineBy).zeroFix()
			: bounds.clone().expandBy(expandOutlineBy).zeroFix()

	useTransform(rSvg, bounds?.x, bounds?.y, 1, editor.getSelectionRotation(), {
		x: expandedBounds.x - bounds.x,
		y: expandedBounds.y - bounds.y,
	})

	if (onlyShape && editor.isShapeHidden(onlyShape)) return null

	const zoom = editor.getZoomLevel()
	const isChangingStyle = editor.getInstanceState().isChangingStyle

	const width = expandedBounds.width
	const height = expandedBounds.height

	const size = 8 / zoom
	const isTinyX = width < size * 2
	const isTinyY = height < size * 2

	const isSmallX = width < size * 4
	const isSmallY = height < size * 4
	const isSmallCropX = width < size * 5
	const isSmallCropY = height < size * 5

	const mobileHandleMultiplier = isCoarsePointer ? 1.75 : 1
	const targetSize = (6 / zoom) * mobileHandleMultiplier

	const targetSizeX = (isSmallX ? targetSize / 2 : targetSize) * (mobileHandleMultiplier * 0.75)
	const targetSizeY = (isSmallY ? targetSize / 2 : targetSize) * (mobileHandleMultiplier * 0.75)

	const showSelectionBounds =
		(onlyShape ? !editor.getShapeUtil(onlyShape).hideSelectionBoundsFg(onlyShape) : true) &&
		!isChangingStyle

	let shouldDisplayBox =
		(showSelectionBounds &&
			editor.isInAny(
				'select.idle',
				'select.brushing',
				'select.scribble_brushing',
				'select.pointing_canvas',
				'select.pointing_selection',
				'select.pointing_shape',
				'select.crop.idle',
				'select.crop.pointing_crop',
				'select.crop.pointing_crop_handle',
				'select.pointing_resize_handle'
			)) ||
		(showSelectionBounds &&
			editor.isIn('select.resizing') &&
			onlyShape &&
			editor.isShapeOfType<TLTextShape>(onlyShape, 'text'))

	if (onlyShape && shouldDisplayBox) {
		if (tlenv.isFirefox && editor.isShapeOfType<TLEmbedShape>(onlyShape, 'embed')) {
			shouldDisplayBox = false
		}
	}

	const showCropHandles =
		editor.isInAny(
			'select.crop.idle',
			'select.crop.pointing_crop',
			'select.crop.pointing_crop_handle'
		) &&
		!isChangingStyle &&
		!isReadonlyMode

	const shouldDisplayControls =
		editor.isInAny(
			'select.idle',
			'select.pointing_selection',
			'select.pointing_shape',
			'select.crop.idle'
		) &&
		!isChangingStyle &&
		!isReadonlyMode

	const showCornerRotateHandles =
		!isCoarsePointer &&
		!(isTinyX || isTinyY) &&
		(shouldDisplayControls || showCropHandles) &&
		(onlyShape ? !editor.getShapeUtil(onlyShape).hideRotateHandle(onlyShape) : true) &&
		!isLockedShape

	const showMobileRotateHandle =
		isCoarsePointer &&
		(!isSmallX || !isSmallY) &&
		(shouldDisplayControls || showCropHandles) &&
		(onlyShape ? !editor.getShapeUtil(onlyShape).hideRotateHandle(onlyShape) : true) &&
		!isLockedShape

	const showResizeHandles =
		shouldDisplayControls &&
		(onlyShape
			? editor.getShapeUtil(onlyShape).canResize(onlyShape) &&
				!editor.getShapeUtil(onlyShape).hideResizeHandles(onlyShape)
			: true) &&
		!showCropHandles &&
		!isLockedShape

	const hideAlternateCornerHandles = isTinyX || isTinyY
	const showOnlyOneHandle = isTinyX && isTinyY
	const hideAlternateCropHandles = isSmallCropX || isSmallCropY

	const showHandles = showResizeHandles || showCropHandles
	const hideRotateCornerHandles = !showCornerRotateHandles
	const hideMobileRotateHandle = !shouldDisplayControls || !showMobileRotateHandle
	const hideTopLeftCorner = !shouldDisplayControls || !showHandles
	const hideTopRightCorner = !shouldDisplayControls || !showHandles || hideAlternateCornerHandles
	const hideBottomLeftCorner = !shouldDisplayControls || !showHandles || hideAlternateCornerHandles
	const hideBottomRightCorner =
		!shouldDisplayControls || !showHandles || (showOnlyOneHandle && !showCropHandles)

	// If we're showing crop handles, then show the edges too.
	// If we're showing resize handles, then show the edges only
	// if we're not hiding them for some other reason.
	let hideVerticalEdgeTargets = true
	// The same logic above applies here, except another nuance is that
	// we enable resizing for text on mobile (coarse).
	let hideHorizontalEdgeTargets = true

	if (showCropHandles) {
		hideVerticalEdgeTargets = hideAlternateCropHandles
		hideHorizontalEdgeTargets = hideAlternateCropHandles
	} else if (showResizeHandles) {
		hideVerticalEdgeTargets = hideAlternateCornerHandles || showOnlyOneHandle || isCoarsePointer
		const isMobileAndTextShape = isCoarsePointer && onlyShape && onlyShape.type === 'text'
		hideHorizontalEdgeTargets = hideVerticalEdgeTargets && !isMobileAndTextShape
	}

	const textHandleHeight = Math.min(24 / zoom, height - targetSizeY * 3)
	const showTextResizeHandles =
		shouldDisplayControls &&
		isCoarsePointer &&
		onlyShape &&
		editor.isShapeOfType<TLTextShape>(onlyShape, 'text') &&
		textHandleHeight * zoom >= 4

	return (
		<svg
			className="tl-overlays__item tl-selection__fg"
			data-testid="selection-foreground"
			aria-hidden="true"
		>
			<g ref={rSvg}>
				{shouldDisplayBox && (
					<rect
						className="tl-selection__fg__outline"
						width={toDomPrecision(width)}
						height={toDomPrecision(height)}
					/>
				)}
				<RotateCornerHandle
					data-testid="selection.rotate.top-left"
					cx={0}
					cy={0}
					targetSize={targetSize}
					corner="top_left_rotate"
					cursor={isDefaultCursor ? getCursor('nwse-rotate', rotation) : undefined}
					isHidden={hideRotateCornerHandles}
				/>
				<RotateCornerHandle
					data-testid="selection.rotate.top-right"
					cx={width + targetSize * 3}
					cy={0}
					targetSize={targetSize}
					corner="top_right_rotate"
					cursor={isDefaultCursor ? getCursor('nesw-rotate', rotation) : undefined}
					isHidden={hideRotateCornerHandles}
				/>
				<RotateCornerHandle
					data-testid="selection.rotate.bottom-left"
					cx={0}
					cy={height + targetSize * 3}
					targetSize={targetSize}
					corner="bottom_left_rotate"
					cursor={isDefaultCursor ? getCursor('swne-rotate', rotation) : undefined}
					isHidden={hideRotateCornerHandles}
				/>
				<RotateCornerHandle
					data-testid="selection.rotate.bottom-right"
					cx={width + targetSize * 3}
					cy={height + targetSize * 3}
					targetSize={targetSize}
					corner="bottom_right_rotate"
					cursor={isDefaultCursor ? getCursor('senw-rotate', rotation) : undefined}
					isHidden={hideRotateCornerHandles}
				/>
				<MobileRotateHandle
					data-testid="selection.rotate.mobile"
					cx={isSmallX ? -targetSize * 1.5 : width / 2}
					cy={isSmallX ? height / 2 : -targetSize * 1.5}
					size={size}
					isHidden={hideMobileRotateHandle}
				/>
				{/* Targets */}
				<ResizeHandle
					hide={hideVerticalEdgeTargets}
					dataTestId="selection.resize.top"
					ariaLabel={msg('handle.resize-top')}
					x={0}
					y={toDomPrecision(0 - (isSmallY ? targetSizeY * 2 : targetSizeY))}
					width={toDomPrecision(width)}
					height={toDomPrecision(Math.max(1, targetSizeY * 2))}
					cursor={isDefaultCursor ? getCursor('ns-resize', rotation) : undefined}
					events={topEvents}
				/>
				<ResizeHandle
					hide={hideHorizontalEdgeTargets}
					dataTestId="selection.resize.right"
					ariaLabel={msg('handle.resize-right')}
					x={toDomPrecision(width - (isSmallX ? 0 : targetSizeX))}
					y={0}
					height={toDomPrecision(height)}
					width={toDomPrecision(Math.max(1, targetSizeX * 2))}
					cursor={isDefaultCursor ? getCursor('ew-resize', rotation) : undefined}
					events={rightEvents}
				/>
				<ResizeHandle
					hide={hideVerticalEdgeTargets}
					dataTestId="selection.resize.bottom"
					ariaLabel={msg('handle.resize-bottom')}
					x={0}
					y={toDomPrecision(height - (isSmallY ? 0 : targetSizeY))}
					width={toDomPrecision(width)}
					height={toDomPrecision(Math.max(1, targetSizeY * 2))}
					cursor={isDefaultCursor ? getCursor('ns-resize', rotation) : undefined}
					events={bottomEvents}
				/>
				<ResizeHandle
					hide={hideHorizontalEdgeTargets}
					dataTestId="selection.resize.left"
					ariaLabel={msg('handle.resize-left')}
					x={toDomPrecision(0 - (isSmallX ? targetSizeX * 2 : targetSizeX))}
					y={0}
					height={toDomPrecision(height)}
					width={toDomPrecision(Math.max(1, targetSizeX * 2))}
					cursor={isDefaultCursor ? getCursor('ew-resize', rotation) : undefined}
					events={leftEvents}
				/>
				{/* Corner Targets */}
				<ResizeHandle
					hide={hideTopLeftCorner}
					dataTestId="selection.target.top-left"
					ariaLabel={msg('handle.resize-top-left')}
					x={toDomPrecision(0 - (isSmallX ? targetSizeX * 2 : targetSizeX * 1.5))}
					y={toDomPrecision(0 - (isSmallY ? targetSizeY * 2 : targetSizeY * 1.5))}
					width={toDomPrecision(targetSizeX * 3)}
					height={toDomPrecision(targetSizeY * 3)}
					cursor={isDefaultCursor ? getCursor('nwse-resize', rotation) : undefined}
					events={topLeftEvents}
				/>
				<ResizeHandle
					hide={hideTopRightCorner}
					dataTestId="selection.target.top-right"
					ariaLabel={msg('handle.resize-top-right')}
					x={toDomPrecision(width - (isSmallX ? 0 : targetSizeX * 1.5))}
					y={toDomPrecision(0 - (isSmallY ? targetSizeY * 2 : targetSizeY * 1.5))}
					width={toDomPrecision(targetSizeX * 3)}
					height={toDomPrecision(targetSizeY * 3)}
					cursor={isDefaultCursor ? getCursor('nesw-resize', rotation) : undefined}
					events={topRightEvents}
				/>
				<ResizeHandle
					hide={hideBottomRightCorner}
					dataTestId="selection.target.bottom-right"
					ariaLabel={msg('handle.resize-bottom-right')}
					x={toDomPrecision(width - (isSmallX ? targetSizeX : targetSizeX * 1.5))}
					y={toDomPrecision(height - (isSmallY ? targetSizeY : targetSizeY * 1.5))}
					width={toDomPrecision(targetSizeX * 3)}
					height={toDomPrecision(targetSizeY * 3)}
					cursor={isDefaultCursor ? getCursor('nwse-resize', rotation) : undefined}
					events={bottomRightEvents}
				/>
				<ResizeHandle
					hide={hideBottomLeftCorner}
					dataTestId="selection.target.bottom-left"
					ariaLabel={msg('handle.resize-bottom-left')}
					x={toDomPrecision(0 - (isSmallX ? targetSizeX * 3 : targetSizeX * 1.5))}
					y={toDomPrecision(height - (isSmallY ? 0 : targetSizeY * 1.5))}
					width={toDomPrecision(targetSizeX * 3)}
					height={toDomPrecision(targetSizeY * 3)}
					cursor={isDefaultCursor ? getCursor('nesw-resize', rotation) : undefined}
					events={bottomLeftEvents}
				/>
				{/* Resize Handles */}
				{showResizeHandles && (
					<>
						<rect
							data-testid="selection.resize.top-left"
							className={classNames('tl-corner-handle', {
								'tl-hidden': hideTopLeftCorner,
							})}
							x={toDomPrecision(0 - size / 2)}
							y={toDomPrecision(0 - size / 2)}
							width={toDomPrecision(size)}
							height={toDomPrecision(size)}
						/>
						<rect
							data-testid="selection.resize.top-right"
							className={classNames('tl-corner-handle', {
								'tl-hidden': hideTopRightCorner,
							})}
							x={toDomPrecision(width - size / 2)}
							y={toDomPrecision(0 - size / 2)}
							width={toDomPrecision(size)}
							height={toDomPrecision(size)}
						/>
						<rect
							data-testid="selection.resize.bottom-right"
							className={classNames('tl-corner-handle', {
								'tl-hidden': hideBottomRightCorner,
							})}
							x={toDomPrecision(width - size / 2)}
							y={toDomPrecision(height - size / 2)}
							width={toDomPrecision(size)}
							height={toDomPrecision(size)}
						/>
						<rect
							data-testid="selection.resize.bottom-left"
							className={classNames('tl-corner-handle', {
								'tl-hidden': hideBottomLeftCorner,
							})}
							x={toDomPrecision(0 - size / 2)}
							y={toDomPrecision(height - size / 2)}
							width={toDomPrecision(size)}
							height={toDomPrecision(size)}
						/>
					</>
				)}
				{showTextResizeHandles && (
					<>
						<rect
							data-testid="selection.text-resize.left.handle"
							className="tl-text-handle"
							x={toDomPrecision(0 - size / 4)}
							y={toDomPrecision(height / 2 - textHandleHeight / 2)}
							rx={size / 4}
							width={toDomPrecision(size / 2)}
							height={toDomPrecision(textHandleHeight)}
						/>
						<rect
							data-testid="selection.text-resize.right.handle"
							className="tl-text-handle"
							rx={size / 4}
							x={toDomPrecision(width - size / 4)}
							y={toDomPrecision(height / 2 - textHandleHeight / 2)}
							width={toDomPrecision(size / 2)}
							height={toDomPrecision(textHandleHeight)}
						/>
					</>
				)}
				{/* Crop Handles */}
				{showCropHandles && (
					<TldrawCropHandles
						{...{
							size,
							width,
							height,
							hideAlternateHandles: hideAlternateCropHandles,
						}}
					/>
				)}
			</g>
		</svg>
	)
})

export const ResizeHandle = function ResizeHandle({
	hide,
	dataTestId,
	ariaLabel,
	x,
	y,
	width,
	height,
	cursor,
	events,
}: {
	hide: boolean
	dataTestId: string
	ariaLabel: string
	x: number
	y: number
	width: number
	height: number
	cursor?: string
	events: {
		onPointerUp: PointerEventHandler<Element>
		onPointerMove(e: React.PointerEvent<Element>): void
		onPointerDown: PointerEventHandler<Element>
	}
}) {
	return (
		<rect
			className={classNames('tl-resize-handle', 'tl-transparent', {
				'tl-hidden': hide,
			})}
			data-testid={dataTestId}
			role="button"
			aria-label={ariaLabel}
			pointerEvents="all"
			x={x}
			y={y}
			width={width}
			height={height}
			cursor={cursor}
			{...events}
		/>
	)
}

export const RotateCornerHandle = function RotateCornerHandle({
	cx,
	cy,
	targetSize,
	corner,
	cursor,
	isHidden,
	'data-testid': testId,
}: {
	cx: number
	cy: number
	targetSize: number
	corner: RotateCorner
	cursor?: string
	isHidden: boolean
	'data-testid'?: string
}) {
	const events = useSelectionEvents(corner)
	const msg = useTranslation()
	const label = msg(`handle.rotate.${corner}`)

	return (
		<rect
			className={classNames('tl-transparent', 'tl-rotate-corner', { 'tl-hidden': isHidden })}
			data-testid={testId}
			role="button"
			aria-label={label}
			pointerEvents="all"
			x={toDomPrecision(cx - targetSize * 3)}
			y={toDomPrecision(cy - targetSize * 3)}
			width={toDomPrecision(Math.max(1, targetSize * 3))}
			height={toDomPrecision(Math.max(1, targetSize * 3))}
			cursor={cursor}
			{...events}
		/>
	)
}

const SQUARE_ROOT_PI = Math.sqrt(Math.PI)

export const MobileRotateHandle = function RotateHandle({
	cx,
	cy,
	size,
	isHidden,
	'data-testid': testId,
}: {
	cx: number
	cy: number
	size: number
	isHidden: boolean
	'data-testid'?: string
}) {
	const events = useSelectionEvents('mobile_rotate')

	const editor = useEditor()
	const zoom = useValue('zoom level', () => editor.getZoomLevel(), [editor])
	const bgRadius = Math.max(14 * (1 / zoom), 20 / Math.max(1, zoom))
	const msg = useTranslation()
	return (
		<g role="button" aria-label={msg('handle.rotate.mobile_rotate')}>
			<circle
				data-testid={testId}
				pointerEvents="all"
				className={classNames('tl-transparent', 'tl-mobile-rotate__bg', { 'tl-hidden': isHidden })}
				cx={cx}
				cy={cy}
				r={bgRadius}
				{...events}
			/>
			<circle
				className={classNames('tl-mobile-rotate__fg', { 'tl-hidden': isHidden })}
				cx={cx}
				cy={cy}
				r={size / SQUARE_ROOT_PI}
			/>
		</g>
	)
}
