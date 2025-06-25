import { toDomPrecision } from '@tldraw/editor'
import classNames from 'classnames'
import { useTranslation } from '../ui/hooks/useTranslation/useTranslation'

export interface TldrawCropHandlesProps {
	size: number
	width: number
	height: number
	hideAlternateHandles: boolean
}

export function TldrawCropHandles({
	size,
	width,
	height,
	hideAlternateHandles,
}: TldrawCropHandlesProps) {
	const cropStrokeWidth = toDomPrecision(size / 3)
	const offset = cropStrokeWidth / 2
	const msg = useTranslation()

	return (
		<svg className="tl-overlays__item">
			{/* Top left */}
			<polyline
				className="tl-corner-crop-handle"
				points={`
						${toDomPrecision(0 - offset)},${toDomPrecision(size)} 
						${toDomPrecision(0 - offset)},${toDomPrecision(0 - offset)} 
						${toDomPrecision(size)},${toDomPrecision(0 - offset)}`}
				strokeWidth={cropStrokeWidth}
				data-testid="selection.crop.top_left"
				role="button"
				aria-label={msg('handle.crop.top-left')}
			/>
			{/* Top */}
			<line
				className={classNames('tl-corner-crop-edge-handle', {
					'tl-hidden': hideAlternateHandles,
				})}
				x1={toDomPrecision(width / 2 - size)}
				y1={toDomPrecision(0 - offset)}
				x2={toDomPrecision(width / 2 + size)}
				y2={toDomPrecision(0 - offset)}
				strokeWidth={cropStrokeWidth}
				data-testid="selection.crop.top"
				role="button"
				aria-label={msg('handle.crop.top')}
			/>
			{/* Top right */}
			<polyline
				className={classNames('tl-corner-crop-handle', {
					'tl-hidden': hideAlternateHandles,
				})}
				points={`
						${toDomPrecision(width - size)},${toDomPrecision(0 - offset)} 
						${toDomPrecision(width + offset)},${toDomPrecision(0 - offset)} 
						${toDomPrecision(width + offset)},${toDomPrecision(size)}`}
				strokeWidth={cropStrokeWidth}
				data-testid="selection.crop.top_right"
				role="button"
				aria-label={msg('handle.crop.top-right')}
			/>
			{/* Right */}
			<line
				className={classNames('tl-corner-crop-edge-handle', {
					'tl-hidden': hideAlternateHandles,
				})}
				x1={toDomPrecision(width + offset)}
				y1={toDomPrecision(height / 2 - size)}
				x2={toDomPrecision(width + offset)}
				y2={toDomPrecision(height / 2 + size)}
				strokeWidth={cropStrokeWidth}
				data-testid="selection.crop.right"
				role="button"
				aria-label={msg('handle.crop.right')}
			/>
			{/* Bottom right */}
			<polyline
				className="tl-corner-crop-handle"
				points={`
						${toDomPrecision(width + offset)},${toDomPrecision(height - size)} 
						${toDomPrecision(width + offset)},${toDomPrecision(height + offset)}
						${toDomPrecision(width - size)},${toDomPrecision(height + offset)}`}
				strokeWidth={cropStrokeWidth}
				data-testid="selection.crop.bottom_right"
				role="button"
				aria-label={msg('handle.crop.bottom-right')}
			/>
			{/* Bottom */}
			<line
				className={classNames('tl-corner-crop-edge-handle', {
					'tl-hidden': hideAlternateHandles,
				})}
				x1={toDomPrecision(width / 2 - size)}
				y1={toDomPrecision(height + offset)}
				x2={toDomPrecision(width / 2 + size)}
				y2={toDomPrecision(height + offset)}
				strokeWidth={cropStrokeWidth}
				data-testid="selection.crop.bottom"
				role="button"
				aria-label={msg('handle.crop.bottom')}
			/>
			{/* Bottom left */}
			<polyline
				className={classNames('tl-corner-crop-handle', {
					'tl-hidden': hideAlternateHandles,
				})}
				points={`
						${toDomPrecision(0 + size)},${toDomPrecision(height + offset)} 
						${toDomPrecision(0 - offset)},${toDomPrecision(height + offset)}
						${toDomPrecision(0 - offset)},${toDomPrecision(height - size)}`}
				strokeWidth={cropStrokeWidth}
				data-testid="selection.crop.bottom_left"
				role="button"
				aria-label={msg('handle.crop.bottom-left')}
			/>
			{/* Left */}
			<line
				className={classNames('tl-corner-crop-edge-handle', {
					'tl-hidden': hideAlternateHandles,
				})}
				x1={toDomPrecision(0 - offset)}
				y1={toDomPrecision(height / 2 - size)}
				x2={toDomPrecision(0 - offset)}
				y2={toDomPrecision(height / 2 + size)}
				strokeWidth={cropStrokeWidth}
				data-testid="selection.crop.left"
				role="button"
				aria-label={msg('handle.crop.left')}
			/>
		</svg>
	)
}
