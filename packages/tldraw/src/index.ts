/// <reference types="react" />

/** @internal */
import '@tldraw/polyfills'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/editor'
export { Tldraw } from './lib/Tldraw'
export { defaultShapeTools } from './lib/defaultShapeTools'
export { defaultShapeUtils } from './lib/defaultShapeUtils'
export { defaultTools } from './lib/defaultTools'
// eslint-disable-next-line local/no-export-star
export * from './lib/ui'
export { buildFromV1Document } from './lib/utils/buildFromV1Document'
export {
	parseAndLoadDocument,
	parseTldrawJsonFile,
	serializeTldrawJson,
	type TldrawFile,
} from './lib/utils/file'
