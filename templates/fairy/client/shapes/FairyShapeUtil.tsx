import { useEffect, useState } from 'react'
import {
	DefaultColorStyle,
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	TLBaseShape,
	TLDefaultColorStyle,
} from 'tldraw'

// Define the fairy shape type with color prop
export type FairyShape = TLBaseShape<
	'fairy',
	{
		color: TLDefaultColorStyle
	}
>

// Fixed size for fairy shapes
const FAIRY_SIZE = 100

// Fairy shape util
export class FairyShapeUtil extends ShapeUtil<FairyShape> {
	static override type = 'fairy' as const
	static override props = {
		color: DefaultColorStyle,
	}

	getDefaultProps(): FairyShape['props'] {
		return {
			color: 'black',
		}
	}

	override canResize() {
		return false
	}

	override canEdit() {
		return false
	}

	getGeometry() {
		return new Rectangle2d({
			width: FAIRY_SIZE,
			height: FAIRY_SIZE,
			isFilled: true,
		})
	}

	component(shape: FairyShape) {
		return <FairyComponent color={shape.props.color} />
	}

	indicator() {
		return <rect width={FAIRY_SIZE} height={FAIRY_SIZE} />
	}
}

// Component that animates between the two fairy frames
function FairyComponent({ color }: { color: TLDefaultColorStyle }) {
	const [frame, setFrame] = useState(1)
	const [svgContent1, setSvgContent1] = useState<string>('')
	const [svgContent2, setSvgContent2] = useState<string>('')

	useEffect(() => {
		// Load both SVG files
		Promise.all([
			fetch('/sequences/idle/fairy-idle-1.svg').then((r) => r.text()),
			fetch('/sequences/idle/fairy-idle-2.svg').then((r) => r.text()),
		]).then(([svg1, svg2]) => {
			setSvgContent1(svg1)
			setSvgContent2(svg2)
		})
	}, [])

	useEffect(() => {
		// Cycle between frames with a random interval between 175ms and 225ms
		let timeoutId: ReturnType<typeof setTimeout>
		const tick = () => {
			setFrame((prev) => (prev === 1 ? 2 : 1))
			const nextDelay = 175 + Math.random() * 50
			timeoutId = setTimeout(tick, nextDelay)
		}
		timeoutId = setTimeout(tick, 200)
		return () => clearTimeout(timeoutId)
	}, [])

	// Map tldraw colors to actual color values
	const getColorValue = (color: TLDefaultColorStyle): string => {
		const colorMap: Record<TLDefaultColorStyle, string> = {
			black: '#1d1d1d',
			white: '#fefefe',
			grey: '#adb5bd',
			'light-violet': '#e7bcf8',
			violet: '#c77fdb',
			blue: '#4d90e6',
			'light-blue': '#7fc5f6',
			yellow: '#ffd43b',
			orange: '#ffa84d',
			green: '#5ebd2e',
			'light-green': '#94dc5d',
			'light-red': '#ffc4c4',
			red: '#ff8887',
		}
		return colorMap[color] || '#1d1d1d'
	}

	// Replace fill colors in SVG with the selected color (only the wings)
	const colorSvg = (svgContent: string, color: string): string => {
		if (!svgContent) return ''
		// Replace the first 4 occurrences of fill="#1d1d1d" (top and bottom wing parts)
		let count = 0
		return svgContent.replace(/fill="#1d1d1d"/g, (match) => {
			count++
			// Replace first 4 occurrences (top left, top right, bottom left, bottom right wings)
			return count <= 4 ? `fill="${color}"` : match
		})
	}

	const currentSvg = frame === 1 ? svgContent1 : svgContent2
	const colorValue = getColorValue(color)
	const coloredSvg = colorSvg(currentSvg, colorValue)

	return (
		<HTMLContainer
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: FAIRY_SIZE,
				height: FAIRY_SIZE,
			}}
		>
			{coloredSvg && (
				<div
					style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
					dangerouslySetInnerHTML={{ __html: coloredSvg }}
				/>
			)}
		</HTMLContainer>
	)
}
