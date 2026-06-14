import { createShapeId, TLShapePartial } from 'tldraw'
import { AppLauncherShape, APP_LAUNCHER_SHAPE_TYPE } from './AppLauncherShape'
import { AppId, appIds } from './apps'

export const LAUNCHER_W = 96
export const LAUNCHER_H = 96
const COL_GAP = 24
const ROW_GAP = 16
const MARGIN_LEFT = 48
const MARGIN_TOP = 72
const COLS = 2

function launcherPosition(index: number) {
	const col = index % COLS
	const row = Math.floor(index / COLS)
	return {
		x: MARGIN_LEFT + col * (LAUNCHER_W + COL_GAP),
		y: MARGIN_TOP + row * (LAUNCHER_H + ROW_GAP),
	}
}

export function getLauncherSeedShapes(): TLShapePartial<AppLauncherShape>[] {
	return appIds.map((appId, i) => {
		const pos = launcherPosition(i)
		return {
			id: createShapeId(`launcher-${appId}`),
			type: APP_LAUNCHER_SHAPE_TYPE,
			x: pos.x,
			y: pos.y,
			props: { w: LAUNCHER_W, h: LAUNCHER_H, appId },
		}
	})
}

export function getLauncherScreenPosition(appId: AppId) {
	const index = appIds.indexOf(appId)
	if (index === -1) return null
	// Camera is locked at zoom 1 with no offset, so launcher page
	// coordinates equal screen coordinates within the canvas element.
	return launcherPosition(index)
}
