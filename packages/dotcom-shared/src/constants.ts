export const MAX_NUMBER_OF_FILES = 200
export const MAX_NUMBER_OF_WORKSPACES = 20

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
