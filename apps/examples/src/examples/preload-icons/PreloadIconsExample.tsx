import { useEffect, useState } from 'react'
import { LoadingScreen, Tldraw, useAssetUrls } from 'tldraw'
import 'tldraw/tldraw.css'

export default function PreloadIconsExample() {
	const iconsAreReady = usePreloadIcons()

	if (!iconsAreReady) {
		return <LoadingScreen>Loading icons</LoadingScreen>
	}

	return (
		<div className="tldraw__editor">
			<Tldraw />
		</div>
	)
}

// This will prevent the editor from appearing until all icons are loaded.
function usePreloadIcons() {
	const [isLoaded, setIsLoaded] = useState<boolean>(false)
	const assetUrls = useAssetUrls()

	useEffect(() => {
		let cancelled = false
		async function loadImages() {
			await Promise.allSettled(
				Object.values(assetUrls.icons).map((src) => {
					const image = new Image()
					image.src = src
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
