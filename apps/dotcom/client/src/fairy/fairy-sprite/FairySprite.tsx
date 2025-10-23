import { FAIRY_POSE, FairyEntity, FairyPose } from '@tldraw/fairy-shared'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { FileHelpers, Image } from 'tldraw'
import { FairyOutfit } from './FairyOutfit'
import { FAIRY_VARIANTS, FairyVariantDefinition } from './FairyVariant'

/**
 * This file contains a rough skeleton for some sprite and animation management.
 * It does the boring work of composing different parts of a fairy together using an offscreen canvas.
 * In this version, it pre-renders all frames for each pose and stores them in memory.
 * Depending on what route we go, we can either stick to this approach or do something else using the helpers below, eg: dynamically drawing fairies each frame.
 */

/**
 * A map of fairy sprites loaded into memory.
 */
const fairySpriteMap = new Map<string, FairySprite>()

/**
 * Get a fairy sprite from a definition.
 * If we've already initialized this sprite, get the existing one.
 * If we haven't yet, initialize it and return the new one.
 */
export function getFairySprite(variants: FairyOutfit) {
	const key = JSON.stringify(variants)
	const existingSprite = fairySpriteMap.get(key)
	if (!existingSprite) {
		const newSprite = new FairySprite(variants)
		fairySpriteMap.set(key, newSprite)
		return newSprite
	}

	return existingSprite
}

/**
 * Dispose of a fairy sprite to free up memory.
 */
export function disposeFairySprite(variants: FairyOutfit) {
	const key = JSON.stringify(variants)
	const sprite = fairySpriteMap.get(key)
	if (sprite) {
		sprite.dispose()
	}
}

const OFFSCREEN_CANVAS_SIZE = 1200
const FAIRY_ASSET_SCALE = OFFSCREEN_CANVAS_SIZE / 200

/**
 * An offscreen canvas we used to draw frames.
 */
const offscreenCanvas = new OffscreenCanvas(OFFSCREEN_CANVAS_SIZE, OFFSCREEN_CANVAS_SIZE)
const offscreenContext = offscreenCanvas.getContext('2d')!
offscreenContext.imageSmoothingEnabled = false

/**
 * A fairy sprite that we can render on the screen.
 */
class FairySprite {
	constructor(public definition: FairyOutfit) {
		fairySpriteMap.set(this.getKey(), this)
		this.variants = {
			body: FAIRY_VARIANTS.body[definition.body],
			hat: FAIRY_VARIANTS.hat[definition.hat],
			wings: FAIRY_VARIANTS.wings[definition.wings],
		}

		this.generateAllPosesFrames()
	}

	loadingState: 'not-started' | 'loading' | 'loaded' = 'not-started'

	variants: {
		body: FairyVariantDefinition
		hat: FairyVariantDefinition
		wings: FairyVariantDefinition
	}

	/**
	 * Cached arrays of data urls for each pose.
	 */
	cachedPoses: Partial<Record<FairyPose, string[]>> = Object.fromEntries(
		FAIRY_POSE.map((pose) => [pose, []])
	)

	/**
	 * Generate and store frames for all poses.
	 */
	async generateAllPosesFrames() {
		if (this.loadingState !== 'not-started') {
			return
		}
		this.loadingState = 'loading'
		for (const pose of FAIRY_POSE) {
			await this.generatePoseFrames(pose)
		}
		this.loadingState = 'loaded'
	}

	/**
	 * Generate and store frames for a pose.
	 */
	async generatePoseFrames(pose: FairyPose) {
		// TODO: Don't generate redundant non-idle frames
		const bodyFrameSources = this.variants.body[pose] ?? this.variants.body.idle
		const hatFrameSources = this.variants.hat[pose] ?? this.variants.hat.idle
		const wingsFrameSources = this.variants.wings[pose] ?? this.variants.wings.idle

		const bodyFrameImages = bodyFrameSources.map((source) => {
			const img = Image()
			img.src = source
			return img
		})

		const hatFrameImages = hatFrameSources.map((source) => {
			const img = Image()
			img.src = source
			return img
		})

		const wingsFrameImages = wingsFrameSources.map((source) => {
			const img = Image()
			img.src = source
			return img
		})

		const allFrameImages = [...bodyFrameImages, ...hatFrameImages, ...wingsFrameImages]
		const allImageLoadPromises = allFrameImages.map((img) => {
			return new Promise((resolve, reject) => {
				img.onload = resolve
				img.onerror = (e) => {
					console.error('Error loading image', e)
					reject(e)
				}
			})
		})

		await Promise.all(allImageLoadPromises)

		const maxFrameCount = Math.max(
			bodyFrameImages.length,
			hatFrameImages.length,
			wingsFrameImages.length
		)

		// Check that all other frame counts are divisible by the max frame count
		const frameCounts = [bodyFrameImages.length, hatFrameImages.length, wingsFrameImages.length]
		if (frameCounts.some((count) => maxFrameCount % count !== 0)) {
			throw new Error(
				"All frame counts must be divisible by the max frame count. If you've encountered this error, it's time to add more configuration to the FairySprite class. Please speak to Lu."
			)
		}

		for (let i = 0; i < maxFrameCount; i++) {
			offscreenContext.clearRect(0, 0, OFFSCREEN_CANVAS_SIZE, OFFSCREEN_CANVAS_SIZE)
			offscreenContext.scale(FAIRY_ASSET_SCALE, FAIRY_ASSET_SCALE)
			offscreenContext.drawImage(wingsFrameImages[i % wingsFrameImages.length], 0, 0)
			offscreenContext.drawImage(bodyFrameImages[i % bodyFrameImages.length], 0, 0)
			offscreenContext.drawImage(hatFrameImages[i % hatFrameImages.length], 0, 0)
			offscreenContext.scale(1 / FAIRY_ASSET_SCALE, 1 / FAIRY_ASSET_SCALE)

			const blob = await offscreenCanvas.convertToBlob()
			const dataUrl = await FileHelpers.blobToDataUrl(blob)
			let cachedPose = this.cachedPoses[pose]
			if (!cachedPose) {
				this.cachedPoses[pose] = []
				cachedPose = this.cachedPoses[pose]
			}
			cachedPose[i] = dataUrl
		}
	}

	LOADING_FRAME = '/fairy/fairy-loading.png'

	/**
	 * Get all frames for a specified pose.
	 *
	 * @returns An array of data urls for the frames, or null if the sprite is not loaded.
	 */
	getPoseFrames(pose: FairyPose): string[] {
		if (this.loadingState === 'not-started') {
			this.generateAllPosesFrames()
		}

		if (this.loadingState !== 'loaded') {
			return [this.LOADING_FRAME]
		}
		const cachedPose = this.cachedPoses[pose]
		if (!cachedPose) {
			return [this.LOADING_FRAME]
		}
		return cachedPose
	}

	/**
	 * Dispose of the fairy sprite.
	 */
	dispose() {
		fairySpriteMap.delete(this.getKey())
	}

	/**
	 * Get the key for the fairy sprite.
	 */
	getKey() {
		return JSON.stringify(this.variants)
	}
}

export function FairySpriteComponent({
	entity,
	outfit,
	onGestureEnd,
	animated,
}: {
	entity: FairyEntity
	outfit: FairyOutfit
	onGestureEnd?(): void
	animated: boolean
}) {
	const { pose, gesture } = entity
	const sprite = useMemo(() => getFairySprite(outfit), [outfit])

	const imageRef = useRef<HTMLImageElement>(null)
	const startTimeRef = useRef(Date.now())

	const FRAME_DURATION = 400
	const INTERVAL_DURATION = 32

	useEffect(() => {
		startTimeRef.current = Date.now()
	}, [gesture, pose])

	const updateFrame = useCallback(
		(timeElapsed: number) => {
			if (!imageRef.current) return
			const poseFrames = sprite.getPoseFrames(pose)
			const gestureFrames = gesture ? sprite.getPoseFrames(gesture) : null
			const unwrappedFrameNumber = Math.floor(timeElapsed / FRAME_DURATION)

			const poseFrame = poseFrames[unwrappedFrameNumber % poseFrames.length]
			const gestureFrame = gestureFrames ? gestureFrames[unwrappedFrameNumber] : null
			if (gesture && !gestureFrame) {
				onGestureEnd?.()
			}

			const frame = gestureFrame ?? poseFrame
			imageRef.current.src = frame
		},
		[pose, gesture, sprite, onGestureEnd]
	)

	useEffect(() => {
		updateFrame(Date.now() - startTimeRef.current)
		if (!animated) return
		const timer = setInterval(() => {
			updateFrame(Date.now() - startTimeRef.current)
		}, INTERVAL_DURATION)
		return () => clearInterval(timer)
	}, [updateFrame, animated])

	return <img className="fairy-sprite" ref={imageRef} />
}
