import { useEffect, useMemo, useState } from 'react'

export type FairyPoseType = 'idle' | 'thinking' | 'acting'
export type FairySkinType = 'default' | 'fancy'

export interface FairyOutfit {
	body: FairySkinType
	eyes: FairySkinType
	hat: FairySkinType
	mouth: FairySkinType
	wand: FairySkinType
	wings: FairySkinType
	arms: FairySkinType
	legs: FairySkinType
	head: FairySkinType
}

export interface FairySpriteProps {
	pose: FairyPoseType
	outfit: FairyOutfit
}

export const bakedSpriteSources = new Map<string, string[]>()

export function FairySprite({ pose, outfit }: FairySpriteProps) {
	const [frameNumber, setFrameNumber] = useState(0)

	const frameSources = useMemo(() => {
		const key = JSON.stringify({ pose, outfit })
		if (!bakedSpriteSources.has(key)) {
			const bakedSpriteSource = getBakedSpriteSources({ pose, outfit })
			bakedSpriteSources.set(key, bakedSpriteSource)
		}
		return bakedSpriteSources.get(key)!
	}, [pose, outfit])

	const frameCount = frameSources.length
	const FRAME_DURATION = 400

	useEffect(() => {
		const timer = setInterval(() => {
			setFrameNumber((frameNumber) => (frameNumber + 1) % frameCount)
		}, FRAME_DURATION)
		return () => clearInterval(timer)
	}, [frameCount])

	return <img style={{ width: '100%', height: '100%' }} src={frameSources[frameNumber]} />
}

function getBakedSpriteSources(_props: FairySpriteProps): string[] {
	// TODO
	const src1 = '/fairy/fairy-placeholder-1.svg'
	const src2 = '/fairy/fairy-placeholder-2.svg'

	return [src1, src2]
}
