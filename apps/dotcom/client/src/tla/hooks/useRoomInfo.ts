import {
	PUBLISH_PREFIX,
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_PREFIX,
	SNAPSHOT_PREFIX,
} from '@tldraw/dotcom-shared'
import { useLocation, useParams } from 'react-router-dom'
import { useEditor, useTranslation } from 'tldraw'

export function useGetFileName() {
	const editor = useEditor()
	const msg = useTranslation()
	const defaultPageName = msg('page-menu.new-page-initial-name')

	const documentName = editor.getDocumentSettings().name
	if (documentName?.length > 0) return documentName

	const firstPageName = editor.getPages()[0].name
	if (
		firstPageName.length > 0 &&
		!firstPageName.startsWith('Page 1') &&
		!firstPageName.startsWith(defaultPageName)
	)
		return firstPageName
	return ''
}

function usePrefix() {
	const location = useLocation()
	const roomPrefix = location.pathname.split('/')[1]
	switch (roomPrefix) {
		case ROOM_PREFIX:
		case READ_ONLY_PREFIX:
		case READ_ONLY_LEGACY_PREFIX:
		case SNAPSHOT_PREFIX:
		case PUBLISH_PREFIX:
			return roomPrefix
	}
	return null
}

export function useRoomInfo() {
	// Legacy routes name the param roomId; the publish route (/p/:fileSlug) names it fileSlug.
	const { roomId, fileSlug } = useParams()
	const id = roomId ?? fileSlug
	const prefix = usePrefix()
	if (!id || !prefix) return null
	return { prefix, id }
}
