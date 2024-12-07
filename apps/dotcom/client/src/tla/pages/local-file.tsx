import { useParams } from 'react-router-dom'
import { LocalEditor } from '../../components/LocalEditor'

export function Component() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	return <LocalEditor persistenceKey={fileSlug} />
}
