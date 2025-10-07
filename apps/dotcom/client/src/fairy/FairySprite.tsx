import { ReactNode, useEffect, useMemo, useState } from 'react'

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

export const bakedSprites = new Map<string, ReactNode[]>()

export function FairySprite({ pose, outfit }: FairySpriteProps) {
	const [frameNumber, setFrameNumber] = useState(0)

	const frames = useMemo(() => {
		const key = JSON.stringify({ pose, outfit })
		if (!bakedSprites.has(key)) {
			const bakedSprite = getBakedSprite({ pose, outfit })
			bakedSprites.set(key, bakedSprite)
		}
		return bakedSprites.get(key)!
	}, [pose, outfit])

	const frameCount = frames.length
	const FRAME_DURATION = 400

	useEffect(() => {
		const timer = setInterval(() => {
			setFrameNumber((frameNumber) => (frameNumber + 1) % frameCount)
		}, FRAME_DURATION)
		return () => clearInterval(timer)
	}, [frameCount])

	return frames[frameNumber]
}

function getBakedSprite(_props: FairySpriteProps): ReactNode[] {
	// TODO
	const img1 = <img src="/fairy/fairy-placeholder-1.svg" />
	const img2 = <img src="/fairy/fairy-placeholder-2.svg" />

	return [img1, img2]
}
