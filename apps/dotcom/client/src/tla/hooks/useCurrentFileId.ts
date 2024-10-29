import { TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { useParams } from 'react-router-dom'

export function useCurrentFileId() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const fileId = TldrawAppFileRecordType.createId(fileSlug)
	return fileId
}
