import { useParams } from 'react-router-dom'

export function useCurrentFileId() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	return fileSlug
}
