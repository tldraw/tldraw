import { mergeAttributes } from '@tiptap/core'
import { Mention, type MentionNodeAttrs, type MentionOptions } from '@tiptap/extension-mention'

/**
 * A mention node's display name: the member's current name, resolved live from its id when a
 * resolver is given (so a rename shows through), falling back to the label captured at insert time
 * when no source can name the id — e.g. a deleted account. The stored id is always the source of
 * truth; live resolution only freshens the displayed name over that captured label.
 */
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
 * A factory rather than a shared constant because it's configured differently per context: the
 * read-only render paths pass `resolveName` (so the stored `{ id }` node always shows the member's
 * current name, not a copy frozen at insert time), while an editor passes a `suggestion` (the `@`
 * picker). Shape rich text passes both — the same extension both edits and renders. The node schema
 * is identical either way — only these two levers differ.
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
