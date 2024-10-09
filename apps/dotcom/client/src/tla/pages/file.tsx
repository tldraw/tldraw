import { useLocation, useParams } from 'react-router-dom'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'

export function Component() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	if (!fileSlug) throw Error('File id not found')
	const app = useMaybeApp()

	const routeState = useLocation().state

	if (!app) {
		return <TlaEditor fileSlug={fileSlug} isCreateMode={false} />
	}

	return (
		<TlaSidebarLayout collapsible>
			<TlaEditor fileSlug={fileSlug} isCreateMode={!!routeState?.isCreateMode} />
		</TlaSidebarLayout>
	)
}
