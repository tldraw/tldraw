import { useMemo } from 'react'
import { clamp, useEditor, useValue } from 'tldraw'
import { getMapZoom, getTilePageSize } from './mercator'

// [1]
function getTileUrl(z: number, x: number, y: number) {
	return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
}

function renderTiles(mapZoom: number, minX: number, minY: number, maxX: number, maxY: number) {
	const tileSize = getTilePageSize(mapZoom)
	const elements = []
	for (let x = minX; x <= maxX; x++) {
		for (let y = minY; y <= maxY; y++) {
			elements.push(
				<img
					key={`${mapZoom}/${x}/${y}`}
					className="map-tile"
					src={getTileUrl(mapZoom, x, y)}
					alt=""
					draggable={false}
					style={{ left: x * tileSize, top: y * tileSize, width: tileSize, height: tileSize }}
				/>
			)
		}
	}
	return elements
}

export function TileLayer() {
	const editor = useEditor()

	// [2]
	const visibleTiles = useValue(
		'visible tiles',
		() => {
			const dpr = editor.getInstanceState().devicePixelRatio
			const mapZoom = getMapZoom(editor.getZoomLevel(), dpr)
			const tileSize = getTilePageSize(mapZoom)
			const lastTile = 2 ** mapZoom - 1
			const bounds = editor.getViewportPageBounds()
			// [3]
			const minX = clamp(Math.floor(bounds.minX / tileSize) - 1, 0, lastTile)
			const minY = clamp(Math.floor(bounds.minY / tileSize) - 1, 0, lastTile)
			const maxX = clamp(Math.floor(bounds.maxX / tileSize) + 1, 0, lastTile)
			const maxY = clamp(Math.floor(bounds.maxY / tileSize) + 1, 0, lastTile)
			return `${mapZoom},${minX},${minY},${maxX},${maxY}`
		},
		[editor]
	)

	// [4]
	const tiles = useMemo(() => {
		const [mapZoom, minX, minY, maxX, maxY] = visibleTiles.split(',').map(Number)
		// [5]
		const underlay =
			mapZoom > 0 ? renderTiles(mapZoom - 1, minX >> 1, minY >> 1, maxX >> 1, maxY >> 1) : []
		return [...underlay, ...renderTiles(mapZoom, minX, minY, maxX, maxY)]
	}, [visibleTiles])

	return <>{tiles}</>
}

/*
[1]
Tiles come from OpenStreetMap's public tile servers, which are donated infrastructure with a usage
policy attached: attribution is required, and heavy or automated traffic gets blocked. Swap this
function for a provider of your own before putting a tile layer in front of real users.

[2]
The layer renders inside the camera's transform, so panning is already handled for free and a
re-render is only needed when a different set of tiles becomes visible. Returning a string key
rather than an object means `useValue` bails out of the re-render while the same tiles stay on
screen, instead of firing on every frame of a drag.

[3]
One tile of margin on each side. Covering only the viewport means a row is requested at the moment
it scrolls into view, so a fast pan trails an empty strip for as long as the fetch takes.

[4]
Tiles are positioned in page space, so nothing here needs to know where the camera is.

[5]
Crossing a zoom level changes every tile's key, so React swaps the whole grid at once and the
canvas is bare until the new images decode. Painting the next level out underneath first means
there is always something behind the gap: those tiles cover four times the area, and you were
just looking at them, so they come from cache and appear instantly. The sharp tiles land on top
as they arrive. This is what a map library means by keeping a parent layer.
*/
