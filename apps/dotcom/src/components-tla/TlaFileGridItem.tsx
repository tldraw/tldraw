import { Link } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { useLocalThumbnail } from '../hooks/useLocalThumbnail'
import { useFlags } from '../tla-hooks/useFlags'
import { TldrawAppFile } from '../utils/tla/schema/TldrawAppFile'
import { TldrawAppStarRecordType } from '../utils/tla/schema/TldrawAppStar'
import { getFileUrl } from '../utils/tla/urls'
import { TlaCollaborators } from './TlaCollaborators'
import { TlaIcon } from './TlaIcon'
import { TlaSpinner } from './TlaSpinner'

export function TlaFileGridItem({ id: fileId, name, createdAt, workspaceId }: TldrawAppFile) {
	const app = useApp()

	const flags = useFlags()

	const star = useValue(
		'star',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) throw Error('no auth')
			return app.getAll('star').find((r) => r.fileId === fileId && r.userId === auth.userId)
		},
		[fileId, app]
	)

	const user = useValue(
		'user',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) throw Error('no auth')
			const user = app.store.get(auth.userId)
			if (!user) throw Error('User not found')
			return user
		},
		[app]
	)

	const owner = useValue(
		'owner',
		() => {
			const file = app.store.get(fileId)
			if (!file) throw Error('File not found')
			const owner = app.store.get(file.owner)
			if (!owner) throw Error('owner not found')
			return owner
		},
		[fileId, app]
	)

	const imageUrl = useLocalThumbnail(fileId)

	return (
		<div className="tla_page__grid_item">
			<div className="tla_page__grid_item__content">
				<div className="tla_page__grid_item_top">
					<div
						className="tla_page__grid_item_thumbnail"
						style={{ backgroundImage: `url(${imageUrl})` }}
					>
						{imageUrl === null ? <TlaSpinner /> : null}
					</div>
				</div>
				<div className="tla_page__grid_item_bottom">
					<div className="tla_page__grid_item-title-row">
						<div className="tla_page__item_title tla_text_ui__regular">
							{name || new Date(createdAt).toLocaleString('en-gb')}
						</div>
						{flags.groups && <TlaCollaborators fileId={fileId} />}
					</div>
					<div className="tla_page__item_details tla_text_ui__small">
						{user.id === owner.id ? '' : owner.name + ' • '}Last edited 2 hours ago
					</div>
				</div>
			</div>
			<Link to={getFileUrl(workspaceId, fileId)} className="tla_page__item_link" />
			{flags.starred && (
				<button
					className="tla_page__item_star"
					data-starred={!!star}
					onClick={() => {
						if (star) {
							app.store.remove([star.id])
						} else {
							const { auth } = app.getSessionState()
							if (!auth) return false
							app.store.put([
								TldrawAppStarRecordType.create({
									fileId: fileId,
									userId: auth.userId,
									workspaceId: workspaceId,
								}),
							])
						}
					}}
				>
					<TlaIcon icon={star ? 'star-fill' : 'star'} />
				</button>
			)}
			<button className="tla_page__item_menu">
				<TlaIcon icon="dots-vertical" />
			</button>
		</div>
	)
}
