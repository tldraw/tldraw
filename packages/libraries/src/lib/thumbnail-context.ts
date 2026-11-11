import type { TLLibraryThumbnailContext } from './LibrarySource'

const MAX_DPR = 2

/** Rounds a tile's width up to a power of two, so a few pixels of resizing don't ask again. */
export function stepThumbnailWidth(width: number) {
	return Math.pow(2, Math.ceil(Math.log2(Math.max(width, 1))))
}

export function getThumbnailContext({
	colorMode,
	tileWidth,
	dpr,
	networkEffectiveType,
}: {
	colorMode: 'light' | 'dark'
	tileWidth: number
	dpr: number
	networkEffectiveType: string | null
}): TLLibraryThumbnailContext {
	return {
		colorMode,
		width: stepThumbnailWidth(tileWidth),
		dpr: Math.min(dpr, MAX_DPR),
		networkEffectiveType,
	}
}

export function getNetworkEffectiveType(): string | null {
	return (
		(navigator as { connection?: { effectiveType?: string } }).connection?.effectiveType ?? null
	)
}
