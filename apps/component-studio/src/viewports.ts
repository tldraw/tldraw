import { Viewport } from './sketch'

/** Device sizes a scene sketch can be rendered at, to see a flow in situ. */
export const VIEWPORTS: Record<Viewport, { width: number; height: number }> = {
	mobile: { width: 390, height: 780 },
	tablet: { width: 900, height: 680 },
	desktop: { width: 1320, height: 760 },
}
