import { ROOM_OPEN_MODE } from '@tldraw/dotcom-shared'
import { defineLegacyRoomPage } from './legacy-room'

export const { Component, ErrorBoundary } = defineLegacyRoomPage(ROOM_OPEN_MODE.READ_ONLY)
