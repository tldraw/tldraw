export const MAX_NUMBER_OF_FILES = 200
export const MAX_NUMBER_OF_WORKSPACES = 20
export const MAX_WORKSPACE_NAME_LENGTH = 100
export const MAX_LIBRARY_NAME_LENGTH = 100
/** How many library items one request to the sync worker may add. */
export const MAX_LIBRARY_ITEMS_PER_REQUEST = 50
/**
 * How many bytes of content and thumbnails one request to the sync worker may add, across its
 * items. Enough for one item of the largest content and thumbnails the worker accepts.
 */
export const MAX_LIBRARY_ITEMS_REQUEST_BYTES = 10_000_000

export const ROOM_SIZE_LIMIT_MB = 25

/**
 * `createSource` value for a new workspace's first file. The sync worker resolves it to the
 * current welcome template's published snapshot (or a committed default if none is set),
 * forking that content into the new file. Unlike the other `createSource` prefixes this is a
 * fixed marker with no id — the worker decides which file is the welcome template — so the
 * client never needs to know the template's slug and an admin can retarget it without a
 * client change.
 */
export const WELCOME_CREATE_SOURCE = 'welcome'
