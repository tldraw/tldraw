import { registerTldrawLibraryVersion } from '@tldraw/utils'

export { getStroke } from './lib/getStroke'
export { getStrokeOutlinePoints, getStrokeOutlineTracks } from './lib/getStrokeOutlinePoints'
export { getStrokePoints } from './lib/getStrokePoints'
export { setStrokePointRadii } from './lib/setStrokePointRadii'
export { getSvgPathFromStrokePoints } from './lib/svg'
export { svgInk } from './lib/svgInk'
export { type StrokeOptions, type StrokePoint } from './lib/types'
export { Vec, type VecLike, type VecModel } from './vendor'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
