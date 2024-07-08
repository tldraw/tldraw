import { useValue } from 'tldraw'
import '../../styles/globals.css'
import { TlaFileGridItem } from '../components-tla/TlaFileGridItem'
import { TlaSpacer } from '../components-tla/TlaSpacer'
import { useApp } from '../hooks/useAppState'

export function Component() {
	const app = useApp()
	const files = useValue(
		'starred files',
		() => {
			const session = app.getSession()
			if (!session) return
			return app.getUserFiles(session.userId, session.workspaceId)
		},
		[app]
	)
	if (!files) throw Error('Files not found')

	return (
		<div className="tla_content tla_page">
			<div className="tla_page__header">
				<h2 className="tla_text_ui__title">Drafts</h2>
			</div>
			<div className="tla_page__controls">
				<div className="tla_page__controls_search tla_text_ui__regular">Search</div>
				<div className="tla_page__controls_display">
					<div className="tla_page__controls_sort tla_text_ui__regular">Recent</div>
					<button className="tla_page__controls_grid tla_text_ui__regular">Grid</button>
				</div>
			</div>
			<TlaSpacer height="20" />
			<div className="tla_page__grid">
				{files.map((file) => (
					<TlaFileGridItem key={'grid_' + file.id} {...file} />
				))}
			</div>
		</div>
	)
}
