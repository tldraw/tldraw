export const MAX_NUMBER_OF_FILES = 200
export const MAX_NUMBER_OF_WORKSPACES = 20

export const ROOM_SIZE_LIMIT_MB = 25

/**
 * Prefix for a file's `createSource` that seeds the new file's content from a template baked
 * into the sync worker, e.g. `template/new-workspace` for the initial document a user gets
 * when they create a workspace. Unlike the prefixes in routes.ts, this is not a URL path
 * segment.
 */
export const TEMPLATE_PREFIX = 'template'

/** The template id of the initial document a user gets when they create a workspace. */
export const NEW_WORKSPACE_TEMPLATE_ID = 'new-workspace'
