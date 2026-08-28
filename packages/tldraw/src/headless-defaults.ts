/**
 * The default shapes, tools, bindings, and side effects, importable without the main entry's
 * React UI module graph — the barrel pulls scroll-lock and focus machinery through its
 * component exports, which a headless Node process has no use for. `@tldraw/headless`
 * consumes this entry.
 *
 * Note: prepack currently rewrites the published exports map down to the root entry, so this
 * subpath only resolves inside the monorepo. Before `@tldraw/headless` publishes, prepack
 * must learn to preserve it.
 *
 * @internal
 */
export { defaultAssetUtils } from './lib/defaultAssetUtils'
export { defaultBindingUtils } from './lib/defaultBindingUtils'
export {
	registerDefaultExternalContentHandlers,
	type TLDefaultExternalContentHandlerOpts,
} from './lib/defaultExternalContentHandlers'
export { defaultShapeTools } from './lib/defaultShapeTools'
export { defaultShapeUtils } from './lib/defaultShapeUtils'
export { registerDefaultSideEffects } from './lib/defaultSideEffects'
export { defaultTools } from './lib/defaultTools'
export { type TLUiToastsContextType } from './lib/ui/context/toasts'
export { DEFAULT_TRANSLATION } from './lib/ui/hooks/useTranslation/defaultTranslation'
export { parseTldrawJsonFile, serializeTldrawJson } from './lib/utils/tldr/file'
export {
	defaultAddFontsFromNode,
	renderPlaintextFromRichText,
	renderRichTextFromHTML,
	tipTapDefaultExtensions,
} from './lib/utils/text/richText'
