import { TldrawAppFileId, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { TlaErrorContent } from '../components/TlaErrorContent/TlaErrorContent'
import { TlaFileContent } from '../components/TlaFileContent/TlaFileContent'
import { useApp } from '../hooks/useAppState'
import { TlaErrorLayout } from '../layouts/TlaErrorLayout/TlaErrorLayout'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'

export function Component() {
	const app = useApp()

	const { fileSlug } = useParams<{ fileSlug: TldrawAppFileId }>()
	if (!fileSlug) throw Error('File id not found')

	const file = useValue(
		'file',
		() => {
			return app.store.get(TldrawAppFileRecordType.createId(fileSlug))
		},
		[app, fileSlug]
	)

	if (!file) {
		return (
			<TlaErrorLayout>
				<TlaErrorContent error="file-not-found" />
			</TlaErrorLayout>
		)
	}

	return (
		<TlaSidebarLayout collapsable>
			<TlaFileContent fileSlug={fileSlug} />
		</TlaSidebarLayout>
	)
}
