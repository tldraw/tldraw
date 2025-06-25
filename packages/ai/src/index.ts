// The parts of the module that are designed to run on the client.

import { registerTldrawLibraryVersion } from 'tldraw'

// eslint-disable-next-line local/no-export-star
export type * from './lib/types'

export { TldrawAiModule, type TldrawAiModuleOptions } from './lib/TldrawAiModule'
export { TldrawAiTransform, type TldrawAiTransformConstructor } from './lib/TldrawAiTransform'
export {
	useTldrawAi,
	type TldrawAiGenerateFn,
	type TldrawAiOptions,
	type TldrawAiPromptOptions,
	type TldrawAiStreamFn,
} from './lib/useTldrawAi'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
