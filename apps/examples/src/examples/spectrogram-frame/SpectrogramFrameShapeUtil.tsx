import { useCallback, useEffect, useRef, useState } from 'react'
import {
	BaseBoxShapeUtil,
	Box,
	Geometry2d,
	Group2d,
	HTMLContainer,
	Rectangle2d,
	SVGContainer,
	TLDragShapesOutInfo,
	TLDragShapesOverInfo,
	TLResizeInfo,
	TLShape,
	TLShapeId,
	compact,
	resizeBox,
	toDomPrecision,
	useEditor,
	useValue,
} from 'tldraw'
import {
	ISpectrogramFrameShape,
	SPECTROGRAM_CONFIG,
	spectrogramFrameShapeProps,
} from './spectrogram-frame-props'
import './spectrogram-frame.css'
import { synthesizeSpectrogramAudio } from './spectrogramSynthesis'
import { WaveformDisplay } from './WaveformDisplay'

// Frequency ticks to display (logarithmic scale)
const FREQ_TICKS = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
const { MIN_FREQ, MAX_FREQ } = SPECTROGRAM_CONFIG

// Convert frequency to Y position (logarithmic scale, top = high freq)
function freqToY(freq: number, height: number): number {
	const logMin = Math.log10(MIN_FREQ)
	const logMax = Math.log10(MAX_FREQ)
	const logFreq = Math.log10(freq)
	const normalized = (logFreq - logMin) / (logMax - logMin)
	return (1 - normalized) * height
}

// Format frequency for display
function formatFreq(freq: number): string {
	if (freq >= 1000) {
		return `${freq / 1000}k`
	}
	return `${freq}`
}

// Get time ticks based on duration
function getTimeTicks(durationSeconds: number): number[] {
	if (durationSeconds <= 1) {
		return [0, 0.25, 0.5, 0.75, 1].filter((t) => t <= durationSeconds)
	} else if (durationSeconds <= 5) {
		return [0, 1, 2, 3, 4, 5].filter((t) => t <= durationSeconds)
	} else {
		const ticks: number[] = []
		for (let t = 0; t <= durationSeconds; t += 2) {
			ticks.push(t)
		}
		return ticks
	}
}

// Format time for display
function formatTime(seconds: number): string {
	if (seconds === 0) return '0'
	if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`
	return `${seconds.toFixed(1)}s`
}

// Playback state stored outside React to avoid re-renders during animation
interface PlaybackState {
	isPlaying: boolean
	startTime: number
	duration: number
	audioContext: AudioContext | null
	source: AudioBufferSourceNode | null
	audioBuffer: AudioBuffer | null
}

const playbackStates = new Map<TLShapeId, PlaybackState>()

function getPlaybackState(shapeId: TLShapeId): PlaybackState {
	if (!playbackStates.has(shapeId)) {
		playbackStates.set(shapeId, {
			isPlaying: false,
			startTime: 0,
			duration: 0,
			audioContext: null,
			source: null,
			audioBuffer: null,
		})
	}
	return playbackStates.get(shapeId)!
}

export class SpectrogramFrameShapeUtil extends BaseBoxShapeUtil<ISpectrogramFrameShape> {
	static override type = 'spectrogram-frame' as const
	static override props = spectrogramFrameShapeProps

	override getDefaultProps(): ISpectrogramFrameShape['props'] {
		return {
			w: 400,
			h: 200,
			name: '',
		}
	}

	override canResize() {
		return true
	}

	// Frame-like parenting behavior
	override providesBackgroundForChildren(): boolean {
		return true
	}

	override getClipPath(shape: ISpectrogramFrameShape) {
		return this.editor.getShapeGeometry(shape.id).vertices
	}

	override canReceiveNewChildrenOfType(shape: TLShape) {
		return !shape.isLocked
	}

	override isExportBoundsContainer(): boolean {
		return true
	}

	override getGeometry(shape: ISpectrogramFrameShape): Geometry2d {
		const headingHeight = 32

		return new Group2d({
			children: [
				new Rectangle2d({
					width: shape.props.w,
					height: shape.props.h,
					isFilled: false,
				}),
				// Header/label area
				new Rectangle2d({
					x: 0,
					y: -headingHeight - 4,
					width: Math.max(100, shape.props.w),
					height: headingHeight,
					isFilled: true,
					isLabel: true,
					excludeFromShapeBounds: true,
				}),
			],
		})
	}

	override component(shape: ISpectrogramFrameShape) {
		return <SpectrogramFrameComponent shape={shape} />
	}

	indicator(shape: ISpectrogramFrameShape) {
		return (
			<rect
				width={toDomPrecision(shape.props.w)}
				height={toDomPrecision(shape.props.h)}
				className="tl-frame-indicator"
			/>
		)
	}

	override onResize(shape: ISpectrogramFrameShape, info: TLResizeInfo<ISpectrogramFrameShape>) {
		return resizeBox(shape, info)
	}

	override onDragShapesIn(
		shape: ISpectrogramFrameShape,
		draggingShapes: TLShape[],
		{ initialParentIds, initialIndices }: TLDragShapesOverInfo
	) {
		const { editor } = this

		if (draggingShapes.every((s) => s.parentId === shape.id)) return

		// Check to see whether any of the shapes can have their old index restored
		let canRestoreOriginalIndices = false
		const previousChildren = draggingShapes.filter((s) => shape.id === initialParentIds.get(s.id))

		if (previousChildren.length > 0) {
			const currentChildren = compact(
				editor.getSortedChildIdsForParent(shape).map((id) => editor.getShape(id))
			)
			if (previousChildren.every((s) => !currentChildren.find((c) => c.index === s.index))) {
				canRestoreOriginalIndices = true
			}
		}

		// Prevent circular parenting
		if (draggingShapes.some((s) => editor.hasAncestor(shape, s.id))) return

		// Reparent the shapes to the new parent
		editor.reparentShapes(draggingShapes, shape.id)

		// If we can restore the original indices, then do so
		if (canRestoreOriginalIndices) {
			for (const prevChild of previousChildren) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				editor.updateShape({
					id: prevChild.id,
					type: prevChild.type,
					index: initialIndices.get(prevChild.id),
				} as any)
			}
		}
	}

	override onDragShapesOut(
		shape: ISpectrogramFrameShape,
		draggingShapes: TLShape[],
		info: TLDragShapesOutInfo
	): void {
		const { editor } = this
		// When a user drags shapes out of a frame, reparent them to the current page
		if (!info.nextDraggingOverShapeId) {
			editor.reparentShapes(
				draggingShapes.filter(
					(s) => s.parentId === shape.id && this.canReceiveNewChildrenOfType(s)
				),
				editor.getCurrentPageId()
			)
		}
	}
}

// The React component for rendering the spectrogram frame
function SpectrogramFrameComponent({ shape }: { shape: ISpectrogramFrameShape }) {
	const editor = useEditor()
	const [playheadPosition, setPlayheadPosition] = useState(0)
	const [isPlaying, setIsPlaying] = useState(false)
	const [waveformData, setWaveformData] = useState<Float32Array | null>(null)
	const [isGenerating, setIsGenerating] = useState(false)
	const animationFrameRef = useRef<number>(0)

	const isCreating = useValue(
		'is creating this shape',
		() => {
			const resizingState = editor.getStateDescendant('select.resizing')
			if (!resizingState) return false
			if (!resizingState.getIsActive()) return false
			const info = (resizingState as typeof resizingState & { info: { isCreating: boolean } })?.info
			if (!info) return false
			return info.isCreating && editor.getOnlySelectedShapeId() === shape.id
		},
		[shape.id]
	)

	// Calculate duration from width
	const durationMs = shape.props.w * SPECTROGRAM_CONFIG.MS_PER_PIXEL
	const durationSeconds = durationMs / 1000

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cancelAnimationFrame(animationFrameRef.current)
			const state = getPlaybackState(shape.id)
			if (state.source) {
				try {
					state.source.stop()
				} catch {
					// ignore
				}
			}
			if (state.audioContext) {
				state.audioContext.close()
			}
			playbackStates.delete(shape.id)
		}
	}, [shape.id])

	const handlePlay = useCallback(async () => {
		const state = getPlaybackState(shape.id)

		// If already playing, stop
		if (state.isPlaying) {
			if (state.source) {
				try {
					state.source.stop()
				} catch {
					// ignore
				}
			}
			state.isPlaying = false
			setIsPlaying(false)
			setPlayheadPosition(0)
			cancelAnimationFrame(animationFrameRef.current)
			return
		}

		setIsGenerating(true)

		try {
			// Get child shapes
			const childIds = editor.getSortedChildIdsForParent(shape.id)

			if (childIds.length === 0) {
				setIsGenerating(false)
				return
			}

			// Get the shape's page transform to calculate absolute bounds
			const shapeBounds = editor.getShapePageBounds(shape)
			if (!shapeBounds) {
				setIsGenerating(false)
				return
			}

			// Capture the frame contents as an image
			const result = await editor.toImage(childIds, {
				format: 'png',
				bounds: new Box(shapeBounds.x, shapeBounds.y, shape.props.w, shape.props.h),
				background: true,
				padding: 0,
			})

			if (!result) {
				setIsGenerating(false)
				return
			}

			// Convert blob to ImageData
			const imageData = await blobToImageData(result.blob)

			// Synthesize audio from image (white background = silence)
			const audioBuffer = await synthesizeSpectrogramAudio(imageData, durationMs, '#ffffff')

			// Store waveform data for display
			setWaveformData(audioBuffer.getChannelData(0))

			// Create audio context and play
			const audioContext = new AudioContext()
			const source = audioContext.createBufferSource()
			source.buffer = audioBuffer
			source.connect(audioContext.destination)

			// Update playback state
			state.isPlaying = true
			state.startTime = audioContext.currentTime
			state.duration = audioBuffer.duration
			state.audioContext = audioContext
			state.source = source
			state.audioBuffer = audioBuffer

			setIsPlaying(true)
			setIsGenerating(false)

			// Animate playhead
			const updatePlayhead = () => {
				const elapsed = audioContext.currentTime - state.startTime
				const position = Math.min(elapsed / state.duration, 1)
				setPlayheadPosition(position)

				if (position < 1 && state.isPlaying) {
					animationFrameRef.current = requestAnimationFrame(updatePlayhead)
				} else if (position >= 1) {
					state.isPlaying = false
					setIsPlaying(false)
					setPlayheadPosition(0)
				}
			}

			source.onended = () => {
				state.isPlaying = false
				setIsPlaying(false)
				setPlayheadPosition(0)
				cancelAnimationFrame(animationFrameRef.current)
			}

			source.start()
			updatePlayhead()
		} catch (error) {
			console.error('Failed to play spectrogram:', error)
			setIsGenerating(false)
			setIsPlaying(false)
		}
	}, [editor, shape.id, shape.props.w, shape.props.h, durationMs])

	const displayName = shape.props.name

	return (
		<>
			{/* Frame body */}
			<SVGContainer>
				<rect
					className="spectrogram-frame__body"
					style={{
						width: `calc(${shape.props.w}px + 1px / var(--tl-zoom))`,
						height: `calc(${shape.props.h}px + 1px / var(--tl-zoom))`,
						transform: `translate(calc(-0.5px / var(--tl-zoom)), calc(-0.5px / var(--tl-zoom)))`,
					}}
				/>
			</SVGContainer>

			{/* Playhead line */}
			{isPlaying && (
				<div
					className="spectrogram-frame__playhead"
					style={{
						left: `${playheadPosition * shape.props.w}px`,
						height: `${shape.props.h}px`,
					}}
				/>
			)}

			{/* Header with play button */}
			{!isCreating && (
				<HTMLContainer
					className="spectrogram-frame__header"
					style={{
						width: Math.max(200, shape.props.w),
					}}
				>
					<button
						className="spectrogram-frame__play-button"
						onClick={handlePlay}
						onPointerDown={(e) => e.stopPropagation()}
						disabled={isGenerating}
					>
						{isGenerating ? '...' : isPlaying ? '■' : '▶'}
					</button>
					<span className="spectrogram-frame__name">{displayName}</span>
					<span className="spectrogram-frame__duration">{durationSeconds.toFixed(1)}s</span>
				</HTMLContainer>
			)}

			{/* Frequency ticks (Y-axis) */}
			{!isCreating && (
				<div className="spectrogram-frame__freq-ticks">
					{FREQ_TICKS.map((freq) => {
						const y = freqToY(freq, shape.props.h)
						return (
							<div
								key={freq}
								className="spectrogram-frame__tick spectrogram-frame__tick--freq"
								style={{ top: y }}
							>
								<span className="spectrogram-frame__tick-label">{formatFreq(freq)}</span>
							</div>
						)
					})}
				</div>
			)}

			{/* Time ticks (X-axis) */}
			{!isCreating && (
				<div
					className="spectrogram-frame__time-ticks"
					style={{ top: shape.props.h }}
				>
					{getTimeTicks(durationSeconds).map((time) => {
						const x = (time / durationSeconds) * shape.props.w
						return (
							<div
								key={time}
								className="spectrogram-frame__tick spectrogram-frame__tick--time"
								style={{ left: x }}
							>
								<span className="spectrogram-frame__tick-label">{formatTime(time)}</span>
							</div>
						)
					})}
				</div>
			)}

			{/* Waveform debug display (commented out)
			{waveformData && (
				<div
					className="spectrogram-frame__waveform-container"
					style={{
						top: `${shape.props.h + 8}px`,
						width: shape.props.w,
					}}
				>
					<WaveformDisplay data={waveformData} width={shape.props.w} height={40} />
				</div>
			)}
			*/}
		</>
	)
}

// Helper function to convert a blob to ImageData
async function blobToImageData(blob: Blob): Promise<ImageData> {
	const bitmap = await createImageBitmap(blob)
	const canvas = document.createElement('canvas')
	canvas.width = bitmap.width
	canvas.height = bitmap.height
	const ctx = canvas.getContext('2d')!
	ctx.drawImage(bitmap, 0, 0)
	return ctx.getImageData(0, 0, canvas.width, canvas.height)
}
