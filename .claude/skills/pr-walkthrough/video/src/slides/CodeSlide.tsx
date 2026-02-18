import { interpolate, useCurrentFrame } from 'remotion'
import { SlideLayout } from '../components/SlideLayout'
import { useHighlight } from '../hooks'
import { COLORS, FONT_FAMILY, FPS, HEIGHT, WIDTH } from '../styles'
import type { CodeSlide as CodeSlideType, FocusPoint } from '../types'

const PADDING = 60
const FILE_HEADER_HEIGHT = 48
const CONTENT_WIDTH = WIDTH - PADDING * 2
const VIEWPORT_HEIGHT = HEIGHT - PADDING * 2 - FILE_HEADER_HEIGHT

const BASE_FONT_SIZE = 20
const LINE_HEIGHT_RATIO = 1.6
const BASE_LINE_HEIGHT = BASE_FONT_SIZE * LINE_HEIGHT_RATIO

const MAX_VISIBLE_LINES = Math.floor(VIEWPORT_HEIGHT / BASE_LINE_HEIGHT)

export const CodeSlide: React.FC<{ slide: CodeSlideType }> = ({ slide }) => {
	const frame = useCurrentFrame()
	const codeLines = slide.code.split('\n')
	const highlighted = useHighlight(slide.code, slide.language)
	const totalFrames = Math.ceil(slide.durationInSeconds * FPS)

	const lineCount = codeLines.length
	const fitsOnScreen = lineCount <= MAX_VISIBLE_LINES

	const fontSize = fitsOnScreen
		? Math.max(
				13,
				Math.min(BASE_FONT_SIZE, Math.floor(VIEWPORT_HEIGHT / (lineCount * LINE_HEIGHT_RATIO)))
			)
		: BASE_FONT_SIZE
	const lineHeight = fontSize * LINE_HEIGHT_RATIO

	const totalContentHeight = lineCount * lineHeight

	let scrollY = 0
	if (!fitsOnScreen && slide.focus && slide.focus.length > 0) {
		scrollY = computeScrollY(slide.focus, frame, totalFrames, lineHeight, totalContentHeight)
	}

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
						fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
						fontSize,
						lineHeight: `${lineHeight}px`,
					}}
				>
					<div
						style={{
							transform: `translateY(${-scrollY}px)`,
						}}
					>
						{codeLines.map((codeLine, i) => {
							const hl = highlighted ? highlighted[i] : null
							return (
								<div
									key={i}
									style={{
										display: 'flex',
										height: lineHeight,
									}}
								>
									<div
										style={{
											width: 50,
											minWidth: 50,
											textAlign: 'right',
											paddingRight: 12,
											color: '#57606a',
											backgroundColor: COLORS.diffGutter,
											fontSize: fontSize * 0.8,
											lineHeight: `${lineHeight}px`,
											userSelect: 'none',
										}}
									>
										{i + 1}
									</div>
									<div
										style={{
											paddingLeft: 12,
											whiteSpace: 'pre',
											overflow: 'hidden',
										}}
									>
										{hl
											? hl.tokens.map((token, j) => (
													<span
														key={j}
														style={{
															color: token.color,
															fontStyle: token.fontStyle,
														}}
													>
														{token.content}
													</span>
												))
											: codeLine}
									</div>
								</div>
							)
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

	const points = sorted.map((fp) => ({
		at: fp.at,
		scrollY: clampScroll(
			fp.line * lineHeight - VIEWPORT_HEIGHT / 2 + lineHeight / 2,
			totalContentHeight
		),
	}))

	if (progress <= points[0].at) return points[0].scrollY
	if (progress >= points[points.length - 1].at) return points[points.length - 1].scrollY

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
