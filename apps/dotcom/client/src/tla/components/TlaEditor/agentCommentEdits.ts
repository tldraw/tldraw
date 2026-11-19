import { MCP_AGENT_COMMENT_META_KEY } from '@tldraw/dotcom-shared'
import { Editor, StoreSideEffects, TLComment } from 'tldraw'

/**
 * A person's edit to a comment an agent posted makes it theirs: the agent badge comes off in the same
 * write, so the byline shows the editor's own name and avatar rather than crediting the agent with
 * words it didn't write. Only an edit (a new `editedAt`) from this client counts: a remote update
 * must keep the badge, and so must a resolve, reaction or delete.
 *
 * The server's comment authorizer refuses a client write that adds or changes `meta.mcpAgent`, but
 * allows one that removes it.
 */
export function dropAgentBylineOnEdit(
	prev: TLComment,
	next: TLComment,
	source: 'user' | 'remote'
): TLComment {
	if (source !== 'user' || next.editedAt === prev.editedAt) return next
	if (!(MCP_AGENT_COMMENT_META_KEY in next.meta)) return next
	const { [MCP_AGENT_COMMENT_META_KEY]: _agent, ...meta } = next.meta
	return { ...next, meta }
}

/** Registers {@link dropAgentBylineOnEdit} on the editor's store; returns the cleanup. */
export function registerAgentBylineEditHandler(editor: Editor) {
	// Comment records live on the editor's store but aren't part of the `TLRecord` union.
	const sideEffects = editor.store.sideEffects as unknown as StoreSideEffects<TLComment>
	return sideEffects.registerBeforeChangeHandler('comment', dropAgentBylineOnEdit)
}
