import '../../styles/globals.css'
import { TlaFileGridItem } from '../components-tla/TlaFileGridItem'
import { TlaSpacer } from '../components-tla/TlaSpacer'
import { useAppApi, useAppState } from '../hooks/useAppState'

export function Component() {
	const { db, session } = useAppState()
	if (!session) throw Error('Session not found')

	const { getUserSharedFiles } = useAppApi()

	const files = getUserSharedFiles(db, session.userId, session.workspaceId)
	files.sort((a, b) => b.updatedAt - a.updatedAt)

	return (
		<div className="tla_content tla_page">
			<div className="tla_page__header">
				<h2 className="tla_text_ui__title">Starred</h2>
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
					<TlaFileGridItem key={file.id} {...file} />
				))}
			</div>
		</div>
	)
}
