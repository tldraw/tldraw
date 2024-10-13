import { TldrawAppFileId } from '@tldraw/dotcom-shared'
import { useParams } from 'react-router-dom'
import { TlaFileContent } from '../components/TlaFileContent/TlaFileContent'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'

export function Component() {
	const { fileSlug } = useParams<{ fileSlug: TldrawAppFileId }>()
	if (!fileSlug) throw Error('File id not found')

	return (
		<TlaSidebarLayout collapsable>
			<TlaFileContent fileSlug={fileSlug} />
		</TlaSidebarLayout>
	)
}
