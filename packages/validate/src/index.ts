import { registerTldrawLibraryVersion } from '@tldraw/utils'
import * as T from './lib/validation'

export {
	ArrayOfValidator,
	DictValidator,
	ObjectValidator,
	UnionValidator,
	Validator,
	type UnionValidatorConfig,
} from './lib/validation'
export { T }

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
