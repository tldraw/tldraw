import { useEffect, useState } from 'react'
import { iconTypes } from '../icon-types'
import { useAssetUrls } from './useAssetUrls'

/** @internal */
export function usePreloadIcons(): boolean {
	const [isLoaded, setIsLoaded] = useState<boolean>(false)
	const assetUrls = useAssetUrls()

	useEffect(() => {
		let cancelled = false
		async function loadImages() {
			// Run through all of the icons and load them. It doesn't matter
			// if any of the images don't load; though we expect that they would.
			// Instead, we just want to make sure that the browser has cached
			// all of the icons it can so that they're available when we need them.

			await Promise.allSettled(
				iconTypes.map((icon) => {
					const image = new Image()
					image.src = assetUrls.icons[icon]
					return image.decode()
				})
			)

			if (cancelled) return
			setIsLoaded(true)
		}

		loadImages()

		return () => {
			cancelled = true
		}
	}, [isLoaded, assetUrls])

	return isLoaded
}
