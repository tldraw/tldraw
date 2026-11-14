export const ROOM_CONTEXT = {
	PUBLIC_MULTIPLAYER: 'public-multiplayer',
	PUBLIC_READONLY: 'public-readonly',
	PUBLIC_SNAPSHOT: 'public-snapshot',
	HISTORY_SNAPSHOT: 'history-snapshot',
	HISTORY: 'history',
	LOCAL: 'local',
} as const

export type $ROOM_CONTEXT = (typeof ROOM_CONTEXT)[keyof typeof ROOM_CONTEXT]
