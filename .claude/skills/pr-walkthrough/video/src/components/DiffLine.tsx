import { CSSProperties } from 'react'
import type { HighlightedLine } from '../highlight'
import type { DiffLine as DiffLineData } from '../parse-diff'
import { COLORS } from '../styles'

interface DiffLineProps {
	line: DiffLineData
	highlighted?: HighlightedLine
	fontSize: number
}

const GUTTER_WIDTH = 80

export const DiffLineComponent: React.FC<DiffLineProps> = ({ line, highlighted, fontSize }) => {
	const lineHeight = fontSize * 1.6

	if (line.type === 'hunk-header') {
		return (
			<div
				style={{
					display: 'flex',
					height: lineHeight,
					backgroundColor: COLORS.diffHunkBg,
					color: COLORS.diffHunkText,
					fontSize: fontSize * 0.85,
					fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
					lineHeight: `${lineHeight}px`,
					borderTop: `1px solid ${COLORS.border}`,
					borderBottom: `1px solid ${COLORS.border}`,
				}}
			>
				<div
					style={{
						width: GUTTER_WIDTH,
						minWidth: GUTTER_WIDTH,
						backgroundColor: COLORS.diffHunkBg,
					}}
				/>
				<div style={{ paddingLeft: 12 }}>{line.content}</div>
			</div>
		)
	}

	const bgColor =
		line.type === 'add'
			? COLORS.diffAdd
			: line.type === 'remove'
				? COLORS.diffRemove
				: 'transparent'

	const gutterBg =
		line.type === 'add' ? '#ccffd8' : line.type === 'remove' ? '#ffd7d5' : COLORS.diffGutter

	const marker = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '

	const gutterStyle: CSSProperties = {
		width: GUTTER_WIDTH / 2,
		minWidth: GUTTER_WIDTH / 2,
		textAlign: 'right',
		paddingRight: 8,
		color: '#57606a',
		backgroundColor: gutterBg,
		fontSize: fontSize * 0.8,
		lineHeight: `${lineHeight}px`,
		userSelect: 'none',
	}

	return (
		<div
			style={{
				display: 'flex',
				height: lineHeight,
				backgroundColor: bgColor,
				fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
				fontSize,
				lineHeight: `${lineHeight}px`,
			}}
		>
			<div style={gutterStyle}>{line.type !== 'add' ? line.oldNum : ''}</div>
			<div style={gutterStyle}>{line.type !== 'remove' ? line.newNum : ''}</div>
			<div
				style={{
					width: 20,
					minWidth: 20,
					textAlign: 'center',
					color:
						line.type === 'add'
							? COLORS.diffAddText
							: line.type === 'remove'
								? COLORS.diffRemoveText
								: '#57606a',
					fontWeight: line.type !== 'context' ? 700 : 400,
				}}
			>
				{marker}
			</div>
			<div style={{ paddingLeft: 4, whiteSpace: 'pre', overflow: 'hidden' }}>
				{highlighted
					? highlighted.tokens.map((token, i) => (
							<span
								key={i}
								style={{
									color: token.color,
									fontStyle: token.fontStyle,
								}}
							>
								{token.content}
							</span>
						))
					: line.content}
			</div>
		</div>
	)
}
