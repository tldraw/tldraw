import { NEW_WORKSPACE_TEMPLATE_ID } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { newWorkspaceTemplateSnapshot } from './newWorkspace'

/**
 * Templates that a new file's content can be seeded from, addressed by a `createSource` of
 * `${TEMPLATE_PREFIX}/<templateId>` on the file record. Unlike the other `createSource`
 * kinds, a template is baked into the worker rather than fetched from another room.
 */
const templates: { [templateId: string]: RoomSnapshot } = {
	// The initial document a user gets when they create a workspace.
	[NEW_WORKSPACE_TEMPLATE_ID]: newWorkspaceTemplateSnapshot,
}

export function getTemplateSnapshot(templateId: string): RoomSnapshot | null {
	return templates[templateId] ?? null
}
