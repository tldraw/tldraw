import { NEW_WORKSPACE_TEMPLATE_ID } from '@tldraw/dotcom-shared'
import { hasOwnProperty } from '@tldraw/utils'
import { newWorkspaceTemplateJson } from './newWorkspace'

/**
 * Templates that a new file's content can be seeded from, addressed by a `createSource` of
 * `${TEMPLATE_PREFIX}/<templateId>` on the file record. Unlike the other `createSource`
 * kinds, a template is baked into the worker rather than fetched from another room. Each
 * template is the pre-serialized JSON of a `RoomSnapshot`: the worker writes it to R2
 * verbatim and parses a fresh snapshot per seed.
 *
 * Template ids are persisted forever in `createSource` and may be resolved arbitrarily
 * late (a file's room is materialized on first load). Never rename or remove a shipped id;
 * unknown ids degrade to an empty room.
 */
const templates: { [templateId: string]: string } = {
	// The initial document a user gets when they create a workspace.
	[NEW_WORKSPACE_TEMPLATE_ID]: newWorkspaceTemplateJson,
}

export function getSerializedTemplate(templateId: string): string | null {
	// hasOwnProperty guard: template ids come from client-controlled `createSource` values,
	// so a plain lookup would resolve prototype keys like 'constructor' to truthy
	// non-template values, bypassing the unknown-template fallback
	return hasOwnProperty(templates, templateId) ? (templates[templateId] ?? null) : null
}
