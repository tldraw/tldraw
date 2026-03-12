import { interpolate, useCurrentFrame } from 'remotion'
import { DiffLineComponent } from '../components/DiffLine'
import { SlideLayout } from '../components/SlideLayout'
import { useHighlight } from '../hooks'
import { parseDiff } from '../parse-diff'
import { COLORS, FONT_FAMILY, FPS, HEIGHT, WIDTH } from '../styles'
import type { DiffSlide as DiffSlideType, FocusPoint } from '../types'

const PADDING = 60
const FILE_HEADER_HEIGHT = 48
const CONTENT_WIDTH = WIDTH - PADDING * 2
const VIEWPORT_HEIGHT = HEIGHT - PADDING * 2 - FILE_HEADER_HEIGHT

/** Fixed readable font size — never shrink below this */
const BASE_FONT_SIZE = 20
const LINE_HEIGHT_RATIO = 1.6
const BASE_LINE_HEIGHT = BASE_FONT_SIZE * LINE_HEIGHT_RATIO

/** Max lines that fit in the viewport at base font size */
const MAX_VISIBLE_LINES = Math.floor(VIEWPORT_HEIGHT / BASE_LINE_HEIGHT)

export const DiffSlide: React.FC<{ slide: DiffSlideType }> = ({ slide }) => {
	const frame = useCurrentFrame()
	const lines = parseDiff(slide.diff)
	const totalFrames = Math.ceil(slide.durationInSeconds * FPS)

	// Build code string for highlighting (exclude hunk headers)
	const codeLines = lines.filter((l) => l.type !== 'hunk-header').map((l) => l.content)
	const highlighted = useHighlight(codeLines.join('\n'), slide.language)

	const lineCount = lines.length
	const fitsOnScreen = lineCount <= MAX_VISIBLE_LINES

	// For short diffs, optionally shrink font to fit nicely (but never below 13px)
	const fontSize = fitsOnScreen
		? Math.max(
				13,
				Math.min(BASE_FONT_SIZE, Math.floor(VIEWPORT_HEIGHT / (lineCount * LINE_HEIGHT_RATIO)))
			)
		: BASE_FONT_SIZE
	const lineHeight = fontSize * LINE_HEIGHT_RATIO

	// Total rendered height of all diff lines
	const totalContentHeight = lineCount * lineHeight

	// Compute scroll offset for animated viewport
	let scrollY = 0
	if (!fitsOnScreen && slide.focus && slide.focus.length > 0) {
		scrollY = computeScrollY(slide.focus, frame, totalFrames, lineHeight, totalContentHeight)
	}

	// Map highlighted lines back, skipping hunk headers
	let highlightIdx = 0

	return (
		<SlideLayout>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: CONTENT_WIDTH,
					fontFamily: FONT_FAMILY,
				}}
			>
				{/* Segment title */}
				{slide.title && (
					<div
						style={{
							fontSize: 16,
							fontWeight: 600,
							color: COLORS.text,
							marginBottom: 8,
							opacity: 0.7,
						}}
					>
						{slide.title}
					</div>
				)}

				{/* File header */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						height: FILE_HEADER_HEIGHT,
						backgroundColor: COLORS.fileHeaderBg,
						borderTopLeftRadius: 8,
						borderTopRightRadius: 8,
						border: `1px solid ${COLORS.fileHeaderBorder}`,
						paddingLeft: 16,
						paddingRight: 16,
						fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
						fontSize: 14,
						fontWeight: 600,
						color: COLORS.text,
					}}
				>
					{slide.filename}
				</div>

				{/* Scrollable viewport */}
				<div
					style={{
						height: fitsOnScreen ? undefined : VIEWPORT_HEIGHT,
						overflow: 'hidden',
						border: `1px solid ${COLORS.border}`,
						borderTop: 'none',
						borderBottomLeftRadius: 8,
						borderBottomRightRadius: 8,
						position: 'relative',
					}}
				>
					<div
						style={{
							transform: `translateY(${-scrollY}px)`,
						}}
					>
						{lines.map((line, i) => {
							let hl = undefined
							if (line.type !== 'hunk-header' && highlighted) {
								hl = highlighted[highlightIdx]
								highlightIdx++
							}
							return <DiffLineComponent key={i} line={line} highlighted={hl} fontSize={fontSize} />
						})}
					</div>
				</div>
			</div>
		</SlideLayout>
	)
}

function computeScrollY(
	focus: FocusPoint[],
	frame: number,
	totalFrames: number,
	lineHeight: number,
	totalContentHeight: number
): number {
	const sorted = [...focus].sort((a, b) => a.at - b.at)
	const progress = frame / totalFrames

	// Convert focus points to scroll positions
	const points = sorted.map((fp) => ({
		at: fp.at,
		scrollY: clampScroll(
			fp.line * lineHeight - VIEWPORT_HEIGHT / 2 + lineHeight / 2,
			totalContentHeight
		),
	}))

	// Before first point — hold at first position
	if (progress <= points[0].at) {
		return points[0].scrollY
	}
	// After last point — hold at last position
	if (progress >= points[points.length - 1].at) {
		return points[points.length - 1].scrollY
	}

	// Interpolate between surrounding points
	for (let i = 0; i < points.length - 1; i++) {
		if (progress >= points[i].at && progress <= points[i + 1].at) {
			// If two focus points share the same timestamp, snap to the later one
			if (points[i].at === points[i + 1].at) return points[i + 1].scrollY
			return interpolate(
				progress,
				[points[i].at, points[i + 1].at],
				[points[i].scrollY, points[i + 1].scrollY],
				{}
			)
		}
	}

	return points[0].scrollY
}

function clampScroll(y: number, totalContentHeight: number): number {
	const maxScroll = Math.max(0, totalContentHeight - VIEWPORT_HEIGHT)
	return Math.max(0, Math.min(maxScroll, y))
}
