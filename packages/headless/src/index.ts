import { registerTldrawLibraryVersion } from '@tldraw/utils'

export {
	connectHeadlessEditor,
	type TLHeadlessConnectOptions,
	type TLHeadlessConnection,
} from './lib/connectHeadlessEditor'
export { createHeadlessEditor, type TLHeadlessEditorOptions } from './lib/createHeadlessEditor'
export { ensureHeadlessDocument } from './lib/documentShim'
export {
	NodeWebSocketAdapter,
	type NodeWebSocketAdapterOptions,
	type TLHeadlessClientSocket,
} from './lib/NodeWebSocketAdapter'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
