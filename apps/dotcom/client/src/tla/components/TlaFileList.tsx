import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TldrawAppFile } from '../utils/schema/TldrawAppFile'
import { TlaFileGridItem } from './TlaFileGridItem'
import { TlaFileListItem } from './TlaFileListItem'

export function TlaFileList({ viewName, files }: { viewName: string; files: TldrawAppFile[] }) {
	const app = useApp()
	const view = useValue(
		'view',
		() => {
			const sessionState = app.getSessionState()
			const view = sessionState.views[viewName] ?? {
				sort: 'recent',
				view: 'grid',
				search: '',
			}
			return view.view
		},
		[app, viewName]
	)

	if (files.length === 0) {
		return <div className="tla-page__empty tla-text_ui__regular">Nothing to see here.</div>
	}

	if (view === 'grid') {
		return (
			<div className="tla-page__grid">
				{files.map((file) => (
					<TlaFileGridItem key={'file_' + file.id} {...file} />
				))}
			</div>
		)
	}

	if (view === 'list') {
		return (
			<div className="tla-page__list">
				{files.map((file) => (
					<TlaFileListItem key={'file_' + file.id} {...file} />
				))}
			</div>
		)
	}
}
