import { registerTldrawLibraryVersion } from '@tldraw/utils'
import * as T from './lib/validation'

export {
	ArrayOfValidator,
	DictValidator,
	ObjectValidator,
	UnionValidator,
	Validator,
	type ExtractOptionalKeys,
	type ExtractRequiredKeys,
	type UnionValidatorConfig,
} from './lib/validation'
export { T }

registerTldrawLibraryVersion(
	process.env.TLDRAW_LIBRARY_VERSION_NAME,
	process.env.TLDRAW_LIBRARY_VERSION_VERSION,
	process.env.TLDRAW_LIBRARY_VERSION_MODULES
)
