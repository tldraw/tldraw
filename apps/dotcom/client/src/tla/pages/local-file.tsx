import { useParams } from 'react-router-dom'
import { LocalEditor } from '../../components/LocalEditor'

export function Component() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<LocalEditor persistenceKey={fileSlug} />
		</div>
	)
}
