import { FairyOutfit, FairyPose } from '@tldraw/fairy-shared'
import { ComponentType, ReactNode, useEffect, useState } from 'react'
import { IdleSprite } from './sprites/IdleSprite'
import { PoofSprite } from './sprites/PoofSprite'
import { RaisedAWingSprite } from './sprites/RaisedAWingSprite'
import { RaisedBWingSprite } from './sprites/RaisedBWingSprite'
import { RaisedCWingSprite } from './sprites/RaisedCWingSprite'
import { ReadingSprite } from './sprites/ReadingSprite'
import { SleepingSprite } from './sprites/SleepingSprite'
import { SleepingWingSprite } from './sprites/SleepingWingSprite'
import { ThinkingSprite } from './sprites/ThinkingSprite'
import { WaitingSprite } from './sprites/WaitingSprite'
import { WorkingSprite1, WorkingSprite2, WorkingSprite3 } from './sprites/WorkingSprite'
import { WritingSprite } from './sprites/WritingSprite'

interface WingSpriteProps {
	topWingColor?: string
	bottomWingColor?: string
}

interface FairySpriteProps {
	bodyColor?: string
	hatColor?: string
}

const WING_SPRITES: Record<FairyPose, ComponentType<WingSpriteProps>[]> = {
	idle: [RaisedAWingSprite, RaisedCWingSprite, RaisedBWingSprite, RaisedCWingSprite],
	waiting: [RaisedAWingSprite, RaisedCWingSprite, RaisedBWingSprite, RaisedCWingSprite],
	active: [RaisedAWingSprite, RaisedCWingSprite, RaisedBWingSprite, RaisedCWingSprite],
	reading: [RaisedAWingSprite, RaisedCWingSprite, RaisedBWingSprite, RaisedCWingSprite],
	writing: [RaisedAWingSprite, RaisedCWingSprite, RaisedBWingSprite, RaisedCWingSprite],
	thinking: [RaisedAWingSprite, RaisedCWingSprite, RaisedBWingSprite, RaisedCWingSprite],
	working: [RaisedAWingSprite, RaisedCWingSprite, RaisedBWingSprite, RaisedCWingSprite],
	sleeping: [SleepingWingSprite],
	poof: [],
}

const FAIRY_SPRITES_WITH_PROPS: Record<FairyPose, ComponentType<FairySpriteProps>[]> = {
	idle: [IdleSprite],
	active: [IdleSprite],
	reading: [ReadingSprite],
	writing: [WritingSprite],
	thinking: [ThinkingSprite],
	working: [WorkingSprite1, WorkingSprite2, WorkingSprite3, WorkingSprite2],
	sleeping: [SleepingSprite],
	waiting: [WaitingSprite],
	poof: [PoofSprite],
}

/**
 * Color mapping for different hat types
 * Using medium chroma, high value colors for good visibility
 */
const HAT_COLORS: Record<string, string> = {
	top: '#E89AC7', // Medium pink for top hat
	pointy: '#B4A7D6', // Medium purple for wizard hat
	bald: '#F5C99B', // Medium peach/tan
	antenna: '#F49FAF', // Medium coral for antenna
	spiky: '#7DD3C0', // Medium teal for spiky
	hair: '#F0C987', // Medium gold for hair
	ears: '#F5A8C6', // Medium rose for ears
	propellor: '#A3D9A5', // Medium green for propellor
}

export function FairySprite({
	pose,
	outfit,
	isAnimated: animated,
	showShadow,
	isGenerating,
	flipX = false,
	isOrchestrator,
	projectColor = 'white',
}: {
	outfit: FairyOutfit // todo: replace
	pose: FairyPose
	flipX?: boolean
	tint?: string | null
	projectColor?: string
	isAnimated?: boolean
	showShadow?: boolean
	isGenerating?: boolean
	isOrchestrator?: boolean
}) {
	const topWingColor = projectColor
	const bottomWingColor = isOrchestrator ? projectColor : 'white'
	const bodyColor = 'white'
	const hatColor = HAT_COLORS[outfit.hat]

	return (
		<div className="fairy-sprite-container">
			<div
				className="fairy-sprite-stack"
				style={{
					transform: flipX ? 'scaleX(-1)' : 'none',
					filter: showShadow
						? flipX
							? 'drop-shadow(-2px 2px 0.5px rgba(8, 20, 35, 0.12))'
							: 'drop-shadow(2px 2px 0.5px rgba(8, 20, 35, 0.12))'
						: 'none',
				}}
			>
				{animated ? (
					<AnimatedFairySpriteComponent
						pose={pose}
						speed={pose === 'working' ? 100 : isGenerating ? 120 : 160}
						topWingColor={topWingColor}
						bottomWingColor={bottomWingColor}
						bodyColor={bodyColor}
						hatColor={hatColor}
						flipX={flipX}
					/>
				) : (
					<StaticFairySpriteComponent
						pose={pose}
						topWingColor={topWingColor}
						bottomWingColor={bottomWingColor}
						bodyColor={bodyColor}
						hatColor={hatColor}
						flipX={flipX}
					/>
				)}
			</div>
		</div>
	)
}

function useKeyframe({ pose, duration }: { pose: FairyPose; duration: number }) {
	const [keyframe, setKeyframe] = useState<number>(0)

	useEffect(() => {
		const startTime = Date.now()
		function updateFrame() {
			setKeyframe(Math.floor((Date.now() - startTime) / duration))
		}
		updateFrame()
		const timer = setInterval(updateFrame, duration)
		return () => clearInterval(timer)
	}, [duration, pose])

	return keyframe
}

function AnimatedFairySpriteComponent({
	speed,
	pose,
	...rest
}: FairySpriteSvgProps & { speed: number }) {
	// Gesture takes precedence over pose
	const keyframe = useKeyframe({
		pose,
		duration: speed,
	})

	return <FairySpriteSvg pose={pose} keyframe={keyframe} {...rest} />
}

function StaticFairySpriteComponent(props: FairySpriteSvgProps) {
	return <FairySpriteSvg {...props} />
}

export function CleanFairySpriteComponent() {
	return (
		<div className="fairy-sprite-container">
			<FairySpriteSvg pose="idle" />
		</div>
	)
}

export interface FairySpriteSvgProps {
	pose: FairyPose
	topWingColor?: string
	bottomWingColor?: string
	bodyColor?: string
	hatColor?: string
	keyframe?: number
	flipX?: boolean
	showShadow?: boolean
}

function getItemForKeyFrame<T>(items: T | T[], keyframe: number) {
	if (Array.isArray(items)) {
		return items[keyframe % items.length]
	}
	return items
}

function FairySpriteSvg({
	pose,
	topWingColor = 'white',
	bottomWingColor = 'white',
	bodyColor = 'white',
	hatColor = 'white',
	keyframe = 0,
	flipX = false,
	showShadow = false,
}: FairySpriteSvgProps) {
	const FSprite = getItemForKeyFrame(FAIRY_SPRITES_WITH_PROPS[pose], keyframe)
	const WSprite = getItemForKeyFrame(WING_SPRITES[pose], keyframe)

	return (
		<svg
			className="fairy-sprite"
			width="108"
			height="108"
			viewBox="0 0 108 108"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<FairyShadow flipX={flipX} showShadow={showShadow}>
				{WSprite && <WSprite topWingColor={topWingColor} bottomWingColor={bottomWingColor} />}
				{FSprite && <FSprite bodyColor={bodyColor} hatColor={hatColor} />}
			</FairyShadow>
		</svg>
	)
}

function FairyShadow({
	children,
	flipX = false,
	showShadow = true,
}: {
	children: ReactNode
	flipX?: boolean
	showShadow?: boolean
}) {
	if (!showShadow) return children
	return (
		<div
			className="fairy-sprite-stack"
			style={{
				transform: flipX ? 'scaleX(-1)' : 'none',
				filter: showShadow
					? flipX
						? 'drop-shadow(-2px 2px 0.5px rgba(8, 20, 35, 0.12))'
						: 'drop-shadow(2px 2px 0.5px rgba(8, 20, 35, 0.12))'
					: 'none',
			}}
		>
			{children}
		</div>
	)
}
