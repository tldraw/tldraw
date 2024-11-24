import { useTranslation } from 'tldraw'
import { TlaSidebar } from '../components/TlaSidebar/TlaSidebar'

export function Component() {
	const raw = useTranslation()
	return (
		<div style={{ padding: '1em' }}>
			<h1>{raw('Playground')}</h1>
			<TlaSidebar />
		</div>
	)
}
