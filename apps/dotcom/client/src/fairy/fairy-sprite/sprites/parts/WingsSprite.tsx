import { modulate } from 'tldraw'
import { WingSpriteProps } from '../sprite-types'

export function LoweredWingsSprite1(props: WingSpriteProps) {
	return <LoweredWingsSprite frame={0} {...props} />
}

export function LoweredWingsSprite2({
	topWingColor,
	bottomWingColor,
}: {
	topWingColor: string
	bottomWingColor: string
}) {
	return (
		<LoweredWingsSprite frame={1} topWingColor={topWingColor} bottomWingColor={bottomWingColor} />
	)
}

export function LoweredWingsSprite3({
	topWingColor,
	bottomWingColor,
}: {
	topWingColor: string
	bottomWingColor: string
}) {
	return (
		<LoweredWingsSprite frame={2} topWingColor={topWingColor} bottomWingColor={bottomWingColor} />
	)
}

export function SoaringWingsSprite1(props: WingSpriteProps) {
	return <SoaringWingsSprite frame={0} {...props} />
}

export function SoaringWingsSprite2({
	topWingColor,
	bottomWingColor,
}: {
	topWingColor: string
	bottomWingColor: string
}) {
	return (
		<SoaringWingsSprite frame={1} topWingColor={topWingColor} bottomWingColor={bottomWingColor} />
	)
}

function SoaringWingsSprite({
	frame,
	topWingColor = 'var(--tl-color-fairy-light)',
	bottomWingColor = 'var(--tl-color-fairy-light)',
}: {
	frame: number
	topWingColor?: string
	bottomWingColor?: string
}) {
	const bwRotation = modulate(frame, [0, 2], [-20, -35])
	const bwOffsetX = modulate(frame, [0, 2], [0, -1])
	const bwOffsetY = modulate(frame, [0, 2], [0, 0])

	const twRotation = modulate(frame, [0, 2], [22, 32])
	const twOffsetX = modulate(frame, [0, 2], [0, 0])
	const twOffsetY = modulate(frame, [0, 2], [-8, -8])

	return (
		<BaseWingsSprite
			rotation={10}
			topWingColor={topWingColor}
			bottomWingColor={bottomWingColor}
			bwRotation={bwRotation}
			bwOffsetX={bwOffsetX}
			bwOffsetY={bwOffsetY}
			twRotation={twRotation}
			twOffsetX={twOffsetX}
			twOffsetY={twOffsetY}
		/>
	)
}

function LoweredWingsSprite({
	frame,
	topWingColor = 'var(--tl-color-fairy-light)',
	bottomWingColor = 'var(--tl-color-fairy-light)',
}: {
	frame: number
	topWingColor?: string
	bottomWingColor?: string
}) {
	const bwRotation = modulate(frame, [0, 2], [0, 6])
	const bwOffsetX = modulate(frame, [0, 2], [0, -1])
	const bwOffsetY = modulate(frame, [0, 2], [0, -2])

	const twRotation = modulate(frame, [0, 2], [5, -9])
	const twOffsetX = modulate(frame, [0, 2], [0, 0])
	const twOffsetY = modulate(frame, [0, 2], [-5, 0])
	return (
		<BaseWingsSprite
			topWingColor={topWingColor}
			bottomWingColor={bottomWingColor}
			rotation={0}
			bwRotation={bwRotation}
			bwOffsetX={bwOffsetX}
			bwOffsetY={bwOffsetY}
			twRotation={twRotation}
			twOffsetX={twOffsetX}
			twOffsetY={twOffsetY}
		/>
	)
}

export function BaseWingsSprite({
	rotation,
	topWingColor,
	bottomWingColor,
	bwRotation,
	twRotation,
	bwOffsetX,
	bwOffsetY,
	twOffsetX,
	twOffsetY,
}: {
	rotation: number
	topWingColor: string
	bottomWingColor: string
	bwRotation: number
	twRotation: number
	bwOffsetX: number
	bwOffsetY: number
	twOffsetX: number
	twOffsetY: number
}) {
	return (
		<g transform={`rotate(${rotation}, 55, 55)`}>
			{/* Bottom left wing */}
			<path
				d="M76.704 80.505C75.6457 77.7148 70.2496 71.7015 67.4457 68.6916C66.8328 68.0336 65.7644 68.4713 65.7849 69.3703C65.8856 73.8009 66.2643 82.8929 67.6837 85.6768C72.0879 94.3147 80.0998 89.4582 76.704 80.505Z"
				fill={bottomWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				transform={`translate(${-bwOffsetX}, ${bwOffsetY}) rotate(${-bwRotation}, 64, 70) `}
			/>
			{/* Bottom right wing */}
			<path
				d="M27.8885 80.505C28.9468 77.7148 34.3429 71.7015 37.1468 68.6916C37.7597 68.0336 38.8281 68.4713 38.8077 69.3703C38.7069 73.8009 38.3283 82.8929 36.9088 85.6768C32.5046 94.3147 24.4927 89.4582 27.8885 80.505Z"
				fill={bottomWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				transform={`translate(${bwOffsetX}, ${bwOffsetY}) rotate(${bwRotation}, 37, 70) `}
			/>
			{/* Top left wing */}
			<path
				d="M8.47308 56.0936C13.1053 46.9164 40.8655 48.0513 45.876 56.3843C50.8865 64.7174 25.2493 92.1075 17.2965 78.881C13.2008 72.0693 20.0845 66.5801 20.0845 66.5801C20.0845 66.5801 3.84085 65.2707 8.47308 56.0936Z"
				fill={topWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinejoin="round"
				transform={`translate(${twOffsetX}, ${twOffsetY}) rotate(${-twRotation}, 45, 55) `}
			/>
			{/* Top right wing */}
			<path
				d="M96.1194 56.0936C91.4872 46.9164 63.727 48.0513 58.7166 56.3843C53.7061 64.7174 79.3433 92.1075 87.2961 78.881C91.3918 72.0693 84.5081 66.5801 84.5081 66.5801C84.5081 66.5801 100.752 65.2707 96.1194 56.0936Z"
				fill={topWingColor}
				stroke="var(--tl-color-fairy-dark)"
				strokeWidth="5"
				strokeLinejoin="round"
				transform={`translate(${-twOffsetX}, ${twOffsetY}) rotate(${twRotation}, 57, 55) `}
			/>
		</g>
	)
}
