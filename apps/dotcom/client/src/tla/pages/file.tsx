import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { TlaErrorContent } from '../components/TlaErrorContent/TlaErrorContent'
import { TlaFileContent } from '../components/TlaFileContent/TlaFileContent'
import { useApp } from '../hooks/useAppState'
import { TlaErrorLayout } from '../layouts/TlaErrorLayout/TlaErrorLayout'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'
import { TldrawAppFileRecordType } from '../utils/schema/TldrawAppFile'

export function Component() {
	const app = useApp()

	const { fileId } = useParams<{ fileId: string }>()
	if (!fileId) throw Error('File id not found')

	const file = useValue(
		'file',
		() => {
			return app.store.get(TldrawAppFileRecordType.createId(fileId))
		},
		[app, fileId]
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
			<TlaFileContent file={file} />
		</TlaSidebarLayout>
	)
}
