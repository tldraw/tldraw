import { useEffect, useRef, useState } from 'react'
import { AbsoluteFill, continueRender, delayRender, interpolate, useCurrentFrame } from 'remotion'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { FPS, HEIGHT, WIDTH } from '../styles'
import type { CameraFocusPoint, TldrawSlide as TldrawSlideType } from '../types'

export const TldrawSlide: React.FC<{ slide: TldrawSlideType }> = ({ slide }) => {
	const frame = useCurrentFrame()
	const totalFrames = Math.ceil(slide.durationInSeconds * FPS)
	const editorRef = useRef<Editor>()
	const [handle] = useState(() => delayRender('Loading tldraw snapshot'))
	const [ready, setReady] = useState(false)

	// Animate camera when focus points are provided
	useEffect(() => {
		const editor = editorRef.current
		if (!editor || !ready || !slide.camera || slide.camera.length === 0) return

		const { x, y, z } = computeCamera(slide.camera, frame, totalFrames)
		editor.setCamera({ x: -x + WIDTH / 2 / z, y: -y + HEIGHT / 2 / z, z })
	}, [frame, ready, slide.camera, totalFrames])

	return (
		<AbsoluteFill
			style={{
				width: WIDTH,
				height: HEIGHT,
				overflow: 'hidden',
			}}
		>
			<Tldraw
				hideUi={!slide.showUi}
				onMount={(editor) => {
					editorRef.current = editor

					// Load snapshot
					if (slide.snapshot) {
						editor.store.loadStoreSnapshot(slide.snapshot as any)
					}

					// Disable interactions — this is a video, not an interactive canvas
					editor.updateInstanceState({ isReadonly: true })

					setReady(true)
					continueRender(handle)
				}}
			/>
		</AbsoluteFill>
	)
}

function computeCamera(
	focus: CameraFocusPoint[],
	frame: number,
	totalFrames: number
): { x: number; y: number; z: number } {
	const sorted = [...focus].sort((a, b) => a.at - b.at)
	const progress = frame / totalFrames

	// Before first point — hold at first position
	if (progress <= sorted[0].at) {
		return { x: sorted[0].x, y: sorted[0].y, z: sorted[0].z }
	}
	// After last point — hold at last position
	if (progress >= sorted[sorted.length - 1].at) {
		const last = sorted[sorted.length - 1]
		return { x: last.x, y: last.y, z: last.z }
	}

	// Interpolate between surrounding points
	for (let i = 0; i < sorted.length - 1; i++) {
		if (progress >= sorted[i].at && progress <= sorted[i + 1].at) {
			const x = interpolate(
				progress,
				[sorted[i].at, sorted[i + 1].at],
				[sorted[i].x, sorted[i + 1].x]
			)
			const y = interpolate(
				progress,
				[sorted[i].at, sorted[i + 1].at],
				[sorted[i].y, sorted[i + 1].y]
			)
			const z = interpolate(
				progress,
				[sorted[i].at, sorted[i + 1].at],
				[sorted[i].z, sorted[i + 1].z]
			)
			return { x, y, z }
		}
	}

	return { x: sorted[0].x, y: sorted[0].y, z: sorted[0].z }
}
