import { FairyOutfit, FairyPose } from '@tldraw/fairy-shared'
import { ComponentType, useEffect, useState } from 'react'
import { IdleSprite } from './sprites/IdleSprite'
import {
	LoweredWingsSprite1,
	LoweredWingsSprite2,
	LoweredWingsSprite3,
} from './sprites/WingsSprite'

import { PanickingSprite1, PanickingSprite2 } from './sprites/PanickingSprite'
import { PoofSprite1, PoofSprite2, PoofSprite3, PoofSprite4 } from './sprites/PoofSprite'
import { RaisedWingsSprite1, RaisedWingsSprite2, RaisedWingsSprite3 } from './sprites/RaisedWings'
import { ReadingSprite1, ReadingSprite2, ReadingSprite3 } from './sprites/ReadingSprite'
import { SleepingSprite } from './sprites/SleepingSprite'
import { SoaringSprite } from './sprites/SoaringSprite'
import { ThinkingSprite } from './sprites/ThinkingSprite'
import { ReviewingSprite1, ReviewingSprite2, ReviewingSprite3 } from './sprites/WaitingSprite'
import { WorkingSprite1, WorkingSprite2, WorkingSprite3 } from './sprites/WorkingSprite'
import { WritingSprite1, WritingSprite2 } from './sprites/WritingSprite'

interface WingSpriteProps {
	topWingColor: string
	bottomWingColor: string
}

interface FairySpriteProps {
	bodyColor: string
	hatColor: string
	tint: string | null
}

const FLAPPING_HIGH = [
	RaisedWingsSprite1,
	RaisedWingsSprite2,
	RaisedWingsSprite3,
	RaisedWingsSprite2,
]

const FLAPPING_LOW = [
	LoweredWingsSprite1,
	LoweredWingsSprite2,
	LoweredWingsSprite3,
	LoweredWingsSprite2,
]

const WING_SPRITES: Record<FairyPose, ComponentType<WingSpriteProps>[]> = {
	idle: FLAPPING_HIGH,
	waiting: FLAPPING_LOW,
	active: FLAPPING_HIGH,
	reading: FLAPPING_HIGH,
	writing: FLAPPING_HIGH,
	thinking: FLAPPING_LOW,
	working: FLAPPING_HIGH,
	sleeping: [LoweredWingsSprite1],
	panicking: FLAPPING_HIGH,
	reviewing: FLAPPING_HIGH,
	soaring: [LoweredWingsSprite1],
	poof: [],
}

const FAIRY_SPRITES_WITH_PROPS: Record<FairyPose, ComponentType<FairySpriteProps>[]> = {
	idle: [IdleSprite],
	active: [IdleSprite],
	reading: [ReadingSprite1, ReadingSprite2, ReadingSprite3, ReadingSprite2],
	writing: [WritingSprite1, WritingSprite2],
	thinking: [ThinkingSprite],
	working: [WorkingSprite1, WorkingSprite2, WorkingSprite3, WorkingSprite2],
	sleeping: [SleepingSprite],
	waiting: [ReviewingSprite2],
	panicking: [PanickingSprite1, PanickingSprite2],
	reviewing: [ReviewingSprite1, ReviewingSprite2, ReviewingSprite3, ReviewingSprite2],
	soaring: [SoaringSprite],
	poof: [PoofSprite1, PoofSprite2, PoofSprite3, PoofSprite4],
}

const FRAME_DURATIONS: Record<FairyPose, number> = {
	idle: 160,
	active: 160,
	reading: 160,
	writing: 160,
	thinking: 160,
	working: 125,
	sleeping: 160,
	panicking: 65,
	waiting: 160,
	reviewing: 160,
	soaring: 160,
	poof: 100,
}

/**
 * Color mapping for different hat types
 * Using medium chroma, high value colors for good visibility
 */
const HAT_COLORS: Record<string, string> = {
	top: 'var(--tl-color-fairy-pink)', // Medium pink for top hat
	pointy: 'var(--tl-color-fairy-purple)', // Medium purple for wizard hat
	bald: 'var(--tl-color-fairy-peach)', // Medium peach/tan
	antenna: 'var(--tl-color-fairy-coral)', // Medium coral for antenna
	spiky: 'var(--tl-color-fairy-teal)', // Medium teal for spiky
	hair: 'var(--tl-color-fairy-gold)', // Medium gold for hair
	ears: 'var(--tl-color-fairy-rose)', // Medium rose for ears
	propellor: 'var(--tl-color-fairy-green)', // Medium green for propellor
}

export function getHatColor(hat: FairyOutfit['hat']) {
	return HAT_COLORS[hat]
}

export function FairySprite({
	pose,
	gesture,
	flipX,
	hatColor,
	projectColor = 'var(--tl-color-fairy-light)',
	isAnimated,
	showShadow,
	isGenerating,
	isOrchestrator,
	tint,
}: {
	pose: FairyPose
	gesture?: FairyPose | null
	flipX?: boolean
	tint?: string | null
	projectColor?: string
	isAnimated?: boolean
	showShadow?: boolean
	isGenerating?: boolean
	isOrchestrator?: boolean
	hatColor?: string
	padding?: number
}) {
	const bottomWingColor = isOrchestrator ? projectColor : 'var(--tl-color-fairy-light'
	const _pose = gesture || pose
	const duration = FRAME_DURATIONS[_pose]

	return (
		<div className="fairy-sprite-container">
			{isAnimated ? (
				<AnimatedFairySpriteComponent
					pose={_pose}
					speed={isGenerating ? duration * 0.75 : duration}
					topWingColor={projectColor ?? 'var(--tl-color-fairy-light)'}
					bottomWingColor={bottomWingColor ?? 'var(--tl-color-fairy-light)'}
					bodyColor={'var(--tl-color-fairy-light)'}
					hatColor={hatColor ?? 'var(--tl-color-fairy-light)'}
					flipX={flipX}
					showShadow={showShadow}
					tint={tint}
				/>
			) : (
				<FairySpriteSvg
					pose={gesture || pose}
					topWingColor={projectColor ?? 'var(--tl-color-fairy-light)'}
					bottomWingColor={bottomWingColor ?? 'var(--tl-color-fairy-light)'}
					bodyColor="var(--tl-color-fairy-light)"
					hatColor={hatColor ?? 'var(--tl-color-fairy-light)'}
					flipX={flipX}
					showShadow={showShadow}
					tint={tint}
				/>
			)}
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
		return () => {
			clearInterval(timer)
		}
	}, [duration, pose])

	return keyframe
}

function AnimatedFairySpriteComponent({
	speed,
	pose,
	...rest
}: FairySpriteSvgProps & { speed: number }) {
	const keyframe = useKeyframe({
		pose,
		duration: speed,
	})

	return <FairySpriteSvg pose={pose} keyframe={keyframe} {...rest} />
}

export function CleanFairySpriteComponent() {
	return (
		<div className="fairy-sprite-container">
			<FairySpriteSvg
				pose="idle"
				bodyColor="var(--tl-color-fairy-light)"
				hatColor="var(--tl-color-fairy-light)"
			/>
		</div>
	)
}

export interface FairySpriteSvgProps {
	pose: FairyPose
	topWingColor?: string
	bottomWingColor?: string
	bodyColor: string
	hatColor: string
	keyframe?: number
	flipX?: boolean
	showShadow?: boolean
	tint?: string | null
}

function getItemForKeyFrame<T>(items: T | T[], keyframe: number) {
	if (Array.isArray(items)) {
		return items[keyframe % items.length]
	}
	return items
}

function FairySpriteSvg({
	pose,
	topWingColor = 'var(--tl-color-fairy-light)',
	bottomWingColor = 'var(--tl-color-fairy-light)',
	bodyColor = 'var(--tl-color-fairy-light)',
	hatColor = 'var(--tl-color-fairy-light)',
	keyframe = 0,
	flipX = false,
	showShadow = false,
	tint = null,
}: FairySpriteSvgProps) {
	const FSprite = getItemForKeyFrame(FAIRY_SPRITES_WITH_PROPS[pose], keyframe)
	const WSprite = getItemForKeyFrame(WING_SPRITES[pose], keyframe)

	return (
		<div className={`fairy-sprite-stack ${flipX ? 'flip-x' : ''} ${showShadow ? 'shadow' : ''}`}>
			<svg
				className="fairy-sprite"
				width="108"
				height="108"
				viewBox="0 0 108 108"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				{WSprite && <WSprite topWingColor={topWingColor} bottomWingColor={bottomWingColor} />}
				{FSprite && <FSprite bodyColor={bodyColor} hatColor={hatColor} tint={tint} />}
			</svg>
		</div>
	)
}
