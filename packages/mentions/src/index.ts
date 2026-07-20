import { registerTldrawLibraryVersion } from '@tldraw/utils'

// Presentational mention components. These are tldraw-independent and can be used to build custom
// mention UI.
export { Avatar, type AvatarProps } from './avatar'
export { Mention, type MentionProps } from './mention'
export { MentionList, type MentionListProps, type MentionMember } from './mention-list'

// The TipTap mention node + `@`-picker suggestion. Add the node to a rich-text editor's extensions
// (comments composer, shape rich text) to render mention pills and — when a suggestion is provided —
// drive the picker.
export { createMentionExtension, type MentionExtensionOptions } from './mention-extension'
export {
	createMentionSuggestion,
	filterMentionMembers,
	isMentionPickerOpen,
	type MentionSuggestionOptions,
} from './mention-suggestion'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
