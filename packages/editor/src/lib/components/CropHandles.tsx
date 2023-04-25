import { toDomPrecision } from '@tldraw/primitives'
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
		<>
			{/* Top left */}
			<polyline
				className="rs-corner-crop-handle"
				points={`
						${toDomPrecision(0 - offset)},${toDomPrecision(size)} 
						${toDomPrecision(0 - offset)},${toDomPrecision(0 - offset)} 
						${toDomPrecision(size)},${toDomPrecision(0 - offset)}`}
				strokeWidth={cropStrokeWidth}
				data-wd="selection.crop.top_left"
				aria-label="top_left handle"
			/>
			{/* Top */}
			<line
				className={classNames('rs-corner-crop-edge-handle', {
					'rs-hidden': hideAlternateHandles,
				})}
				x1={toDomPrecision(width / 2 - size)}
				y1={toDomPrecision(0 - offset)}
				x2={toDomPrecision(width / 2 + size)}
				y2={toDomPrecision(0 - offset)}
				strokeWidth={cropStrokeWidth}
				data-wd="selection.crop.top"
				aria-label="top handle"
			/>
			{/* Top right */}
			<polyline
				className={classNames('rs-corner-crop-handle', {
					'rs-hidden': hideAlternateHandles,
				})}
				points={`
						${toDomPrecision(width - size)},${toDomPrecision(0 - offset)} 
						${toDomPrecision(width + offset)},${toDomPrecision(0 - offset)} 
						${toDomPrecision(width + offset)},${toDomPrecision(size)}`}
				strokeWidth={cropStrokeWidth}
				data-wd="selection.crop.top_right"
				aria-label="top_right handle"
			/>
			{/* Right */}
			<line
				className={classNames('rs-corner-crop-edge-handle', {
					'rs-hidden': hideAlternateHandles,
				})}
				x1={toDomPrecision(width + offset)}
				y1={toDomPrecision(height / 2 - size)}
				x2={toDomPrecision(width + offset)}
				y2={toDomPrecision(height / 2 + size)}
				strokeWidth={cropStrokeWidth}
				data-wd="selection.crop.right"
				aria-label="right handle"
			/>
			{/* Bottom right */}
			<polyline
				className="rs-corner-crop-handle"
				points={`
						${toDomPrecision(width + offset)},${toDomPrecision(height - size)} 
						${toDomPrecision(width + offset)},${toDomPrecision(height + offset)}
						${toDomPrecision(width - size)},${toDomPrecision(height + offset)}`}
				strokeWidth={cropStrokeWidth}
				data-wd="selection.crop.bottom_right"
				aria-label="bottom_right handle"
			/>
			{/* Bottom */}
			<line
				className={classNames('rs-corner-crop-edge-handle', {
					'rs-hidden': hideAlternateHandles,
				})}
				x1={toDomPrecision(width / 2 - size)}
				y1={toDomPrecision(height + offset)}
				x2={toDomPrecision(width / 2 + size)}
				y2={toDomPrecision(height + offset)}
				strokeWidth={cropStrokeWidth}
				data-wd="selection.crop.bottom"
				aria-label="bottom handle"
			/>
			{/* Bottom left */}
			<polyline
				className={classNames('rs-corner-crop-handle', {
					'rs-hidden': hideAlternateHandles,
				})}
				points={`
						${toDomPrecision(0 + size)},${toDomPrecision(height + offset)} 
						${toDomPrecision(0 - offset)},${toDomPrecision(height + offset)}
						${toDomPrecision(0 - offset)},${toDomPrecision(height - size)}`}
				strokeWidth={cropStrokeWidth}
				data-wd="selection.crop.bottom_left"
				aria-label="bottom_left handle"
			/>
			{/* Left */}
			<line
				className={classNames('rs-corner-crop-edge-handle', {
					'rs-hidden': hideAlternateHandles,
				})}
				x1={toDomPrecision(0 - offset)}
				y1={toDomPrecision(height / 2 - size)}
				x2={toDomPrecision(0 - offset)}
				y2={toDomPrecision(height / 2 + size)}
				strokeWidth={cropStrokeWidth}
				data-wd="selection.crop.left"
				aria-label="left handle"
			/>
		</>
	)
}
