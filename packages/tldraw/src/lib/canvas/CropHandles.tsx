import { toDomPrecision } from '@tldraw/editor'
import classNames from 'classnames'

interface CropHandlesProps {
	size: number
	width: number
	height: number
	hideAlternateHandles: boolean
}

export function CropHandles({ size, width, height, hideAlternateHandles }: CropHandlesProps) {
	const cropStrokeWidth = toDomPrecision(size / 3)
	const offset = cropStrokeWidth / 2

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
				aria-label="top_left handle"
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
				aria-label="top handle"
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
				aria-label="top_right handle"
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
				aria-label="right handle"
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
				aria-label="bottom_right handle"
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
				aria-label="bottom handle"
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
				aria-label="bottom_left handle"
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
				aria-label="left handle"
			/>
		</svg>
	)
}
