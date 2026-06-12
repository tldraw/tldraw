import { NEW_WORKSPACE_TEMPLATE_ID } from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { hasOwnProperty } from '@tldraw/utils'
import { newWorkspaceTemplateSnapshot } from './newWorkspace'

/**
 * Templates that a new file's content can be seeded from, addressed by a `createSource` of
 * `${TEMPLATE_PREFIX}/<templateId>` on the file record. Unlike the other `createSource`
 * kinds, a template is baked into the worker rather than fetched from another room.
 *
 * Template ids are persisted forever in `createSource` and may be resolved arbitrarily
 * late (a file's room is materialized on first load). Never rename or remove a shipped id;
 * unknown ids degrade to an empty room.
 */
const templates: { [templateId: string]: RoomSnapshot } = {
	// The initial document a user gets when they create a workspace.
	[NEW_WORKSPACE_TEMPLATE_ID]: newWorkspaceTemplateSnapshot,
}

export function getTemplateSnapshot(templateId: string): RoomSnapshot | null {
	// hasOwnProperty guard: template ids come from client-controlled `createSource` values,
	// so a plain lookup would resolve prototype keys like 'constructor' to truthy
	// non-snapshot values, bypassing the unknown-template fallback
	return hasOwnProperty(templates, templateId) ? (templates[templateId] ?? null) : null
}
