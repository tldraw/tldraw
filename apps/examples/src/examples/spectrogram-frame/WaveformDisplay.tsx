import { useEffect, useRef } from 'react'

interface WaveformDisplayProps {
	data: Float32Array
	width: number
	height?: number
}

/**
 * Canvas-based waveform visualization component.
 * Displays audio sample data as a line graph.
 */
export function WaveformDisplay({ data, width, height = 40 }: WaveformDisplayProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas || !data || data.length === 0) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		// Handle device pixel ratio for sharp rendering
		const dpr = window.devicePixelRatio || 1
		canvas.width = width * dpr
		canvas.height = height * dpr
		ctx.scale(dpr, dpr)

		// Clear canvas
		ctx.clearRect(0, 0, width, height)

		// Draw background
		ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
		ctx.fillRect(0, 0, width, height)

		// Draw center line
		ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)'
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.moveTo(0, height / 2)
		ctx.lineTo(width, height / 2)
		ctx.stroke()

		// Draw waveform
		ctx.strokeStyle = '#3b82f6'
		ctx.lineWidth = 1
		ctx.beginPath()

		// Sample the audio data to match canvas width
		const step = Math.ceil(data.length / width)

		for (let x = 0; x < width; x++) {
			// Find min and max values in this sample window for better visualization
			const startIdx = x * step
			const endIdx = Math.min(startIdx + step, data.length)

			let min = 1
			let max = -1

			for (let i = startIdx; i < endIdx; i++) {
				const sample = data[i]
				if (sample < min) min = sample
				if (sample > max) max = sample
			}

			// Draw a vertical line from min to max
			const yMin = ((1 - max) / 2) * height
			const yMax = ((1 - min) / 2) * height

			if (x === 0) {
				ctx.moveTo(x, (yMin + yMax) / 2)
			}

			// Draw filled area between min and max
			ctx.lineTo(x, yMin)
		}

		// Draw the bottom half
		for (let x = width - 1; x >= 0; x--) {
			const startIdx = x * step
			const endIdx = Math.min(startIdx + step, data.length)

			let min = 1

			for (let i = startIdx; i < endIdx; i++) {
				const sample = data[i]
				if (sample < min) min = sample
			}

			const yMax = ((1 - min) / 2) * height
			ctx.lineTo(x, yMax)
		}

		ctx.closePath()
		ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
		ctx.fill()
		ctx.stroke()
	}, [data, width, height])

	return (
		<canvas
			ref={canvasRef}
			style={{
				width: width,
				height: height,
				display: 'block',
			}}
			className="spectrogram-frame__waveform"
		/>
	)
}
