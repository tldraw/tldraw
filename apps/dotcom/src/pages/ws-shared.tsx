import { useValue } from 'tldraw'
import '../../styles/globals.css'
import { TlaFileGridItem } from '../components-tla/TlaFileGridItem'
import { TlaPageControls } from '../components-tla/TlaPageControls'
import { TlaSpacer } from '../components-tla/TlaSpacer'
import { useApp } from '../hooks/useAppState'

export function Component() {
	const app = useApp()
	const files = useValue(
		'starred files',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return
			return app.getUserSharedFiles(auth.userId, auth.workspaceId)
		},
		[app]
	)
	if (!files) throw Error('Files not found')

	return (
		<div className="tla_content tla_page">
			<div className="tla_page__header">
				<h2 className="tla_text_ui__title">Starred</h2>
			</div>
			<TlaPageControls />
			<TlaSpacer height="20" />
			<div className="tla_page__grid">
				{files.map((file) => (
					<TlaFileGridItem key={'grid_' + file.id} {...file} />
				))}
			</div>
		</div>
	)
}
