import { registerTldrawLibraryVersion } from '@tldraw/utils'

export { Avatar, type AvatarProps } from './avatar'
export { type CommentAuthor } from './comment-author'
export { Mention, type MentionProps } from './mention'
export { MentionList, type MentionListProps, type MentionMember } from './mention-list'

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
