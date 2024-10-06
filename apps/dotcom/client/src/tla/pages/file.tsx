import { TldrawAppFileId } from '@tldraw/dotcom-shared'
import { useParams } from 'react-router-dom'
import { TlaEditor } from '../components/TlaEditor/TlaEditor'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'

export function Component() {
	const { fileSlug } = useParams<{ fileSlug: TldrawAppFileId }>()
	if (!fileSlug) throw Error('File id not found')

	return (
		<TlaSidebarLayout collapsable>
			<TlaEditor fileSlug={fileSlug} />
		</TlaSidebarLayout>
	)
}
