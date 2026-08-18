import { mergeAttributes } from '@tiptap/core'
import { Mention, type MentionNodeAttrs, type MentionOptions } from '@tiptap/extension-mention'

// The stored id is the source of truth; the live name (so a rename shows through) wins over the label
// captured at insert time, which is only the fallback when nothing can name the id — e.g. a deleted account.
function mentionName(
	attrs: MentionNodeAttrs,
	resolveName?: (id: string) => string | undefined
): string {
	const resolved = attrs.id && resolveName ? resolveName(attrs.id) : undefined
	return resolved ?? attrs.label ?? attrs.id ?? ''
}

/** @public */
export interface MentionExtensionOptions {
	/**
	 * Resolve a member id to its current display name — for the read-only render paths, and for the
	 * editor while a mention is displayed. Returns `undefined` when the id can't be resolved, so the
	 * render falls back to the mention's stored label.
	 */
	resolveName?(id: string): string | undefined
	/** The `@`-picker suggestion config — for editing (omit on read-only render paths). */
	suggestion?: MentionOptions['suggestion']
}

/**
 * The \@-mention node — TipTap's `Mention` configured to render as a `.tlui-cmt-mention` pill.
 *
 * A factory rather than a shared constant because each context configures it differently: read-only
 * render paths pass `resolveName`, an editor passes a `suggestion`, shape rich text passes both. The
 * node schema is identical either way.
 * @public
 */
export function createMentionExtension({ resolveName, suggestion }: MentionExtensionOptions = {}) {
	return Mention.configure({
		HTMLAttributes: { class: 'tlui-cmt-mention' },
		renderText: ({ node }) => `@${mentionName(node.attrs as MentionNodeAttrs, resolveName)}`,
		renderHTML: ({ node, options }) => [
			'span',
			mergeAttributes(options.HTMLAttributes, { 'data-mention-id': node.attrs.id }),
			`@${mentionName(node.attrs as MentionNodeAttrs, resolveName)}`,
		],
		...(suggestion ? { suggestion } : {}),
	})
}
