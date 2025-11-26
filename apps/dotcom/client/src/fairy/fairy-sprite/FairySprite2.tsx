import { FairyEntity, FairyOutfit, FairyPose } from '@tldraw/fairy-shared'
import { ComponentType, useEffect, useState } from 'react'
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

/**
 * Computes colors for a fairy sprite based on the entity's properties.
 */
function computeFairyColors(
	_entity: FairyEntity,
	outfit: FairyOutfit,
	projectColor?: string,
	isOrchestrator?: boolean
): {
	topWingColor: string
	bottomWingColor: string
	bodyColor: string
	hatColor: string
} {
	return {
		topWingColor: projectColor ?? 'white',
		bottomWingColor: projectColor && isOrchestrator ? projectColor : 'white',
		bodyColor: 'white',
		hatColor: HAT_COLORS[outfit.hat] || 'white',
	}
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

function getItemForKeyFrame<T>(items: T | T[], keyframe: number) {
	if (Array.isArray(items)) {
		return items[keyframe % items.length]
	}
	return items
}

export function FairySpriteComponent2({
	entity,
	outfit,
	animated,
	showShadow,
	isGenerating,
	flipX = false,
	isOrchestrator,
	projectColor,
}: {
	entity: FairyEntity
	outfit: FairyOutfit
	animated?: boolean
	showShadow?: boolean
	flipX?: boolean
	isGenerating?: boolean
	tint?: string | null
	isOrchestrator?: boolean
	projectColor?: string
}) {
	const colors = computeFairyColors(entity, outfit, projectColor, isOrchestrator)

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
						entity={entity}
						colors={colors}
						isGenerating={isGenerating}
					/>
				) : (
					<StaticFairySpriteComponent entity={entity} colors={colors} />
				)}
			</div>
		</div>
	)
}

function AnimatedFairySpriteComponent({
	entity,
	colors,
	isGenerating,
}: {
	entity: FairyEntity
	colors: ReturnType<typeof computeFairyColors>
	isGenerating?: boolean
}) {
	// Gesture takes precedence over pose
	const effectivePose = entity.gesture ?? entity.pose

	const keyframe = useKeyframe({
		pose: effectivePose,
		duration: effectivePose === 'working' ? 100 : isGenerating ? 120 : 160,
	})
	const FSprite = getItemForKeyFrame(FAIRY_SPRITES_WITH_PROPS[effectivePose], keyframe)
	const WSprite = getItemForKeyFrame(WING_SPRITES[effectivePose], keyframe)

	return (
		<svg
			className="fairy-sprite"
			width="108"
			height="108"
			viewBox="0 0 108 108"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			{WSprite && (
				<WSprite topWingColor={colors.topWingColor} bottomWingColor={colors.bottomWingColor} />
			)}
			{FSprite && <FSprite bodyColor={colors.bodyColor} hatColor={colors.hatColor} />}
		</svg>
	)
}

function StaticFairySpriteComponent({
	entity,
	colors,
}: {
	entity: FairyEntity
	colors: ReturnType<typeof computeFairyColors>
	sashColor?: string
}) {
	// Gesture takes precedence over pose
	const effectivePose = entity.gesture ?? entity.pose
	const FSprite = FAIRY_SPRITES_WITH_PROPS[effectivePose][0]
	const WSprite = WING_SPRITES[effectivePose][0]

	return (
		<svg
			className="fairy-sprite"
			width="108"
			height="108"
			viewBox="0 0 108 108"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			{WSprite && (
				<WSprite topWingColor={colors.topWingColor} bottomWingColor={colors.bottomWingColor} />
			)}
			{FSprite && <FSprite bodyColor={colors.bodyColor} hatColor={colors.hatColor} />}
		</svg>
	)
}

export function CleanFairySpriteComponent() {
	const FSprite = FAIRY_SPRITES_WITH_PROPS['idle'][0]
	const WSprite = WING_SPRITES['idle'][0]
	return (
		<div className="fairy-sprite-container">
			<div
				className="fairy-sprite-stack"
				style={{
					transform: 'none',
					filter: 'drop-shadow(2px 2px 0.5px rgba(8, 20, 35, 0.12))',
				}}
			>
				<svg
					className="fairy-sprite"
					width="108"
					height="108"
					viewBox="0 0 108 108"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<WSprite topWingColor="white" bottomWingColor="white" />
					<FSprite bodyColor="white" hatColor="white" />
				</svg>
			</div>
		</div>
	)
}
