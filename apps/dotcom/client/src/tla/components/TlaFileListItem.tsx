import { Link } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { useLocalThumbnail } from '../hooks/useLocalThumbnail'
import { TldrawAppFile } from '../utils/schema/TldrawAppFile'
import { TldrawAppStarRecordType } from '../utils/schema/TldrawAppStar'
import { getFileUrl } from '../utils/urls'
import { TlaIcon } from './TlaIcon'
import { TlaSpinner } from './TlaSpinner'

export function TlaFileListItem({ id, name, createdAt, workspaceId }: TldrawAppFile) {
	const app = useApp()
	const star = useValue(
		'star',
		() => {
			const { auth } = app.getSessionState()
			if (!auth) return false
			return app.getAll('star').find((r) => r.fileId === id && r.userId === auth.userId)
		},
		[id, app]
	)

	const imageUrl = useLocalThumbnail(id)

	return (
		<div className="tla-page__list_item">
			<div className="tla-page__list_item_content">
				<div
					className="tla-page__list_item_thumbnail"
					style={{ backgroundImage: `url(${imageUrl})` }}
				>
					{imageUrl === null ? <TlaSpinner /> : null}{' '}
				</div>
				<Link to={getFileUrl(workspaceId, id)} className="tla-page__item_link" />
				<div className="tla-page__list_item_left">
					<div className="tla-page__item_title tla-text_ui__regular">
						{name || new Date(createdAt).toLocaleString('en-gb')}
					</div>
					<div className="tla-page__item_details tla-text_ui__small">
						<div>Last edited 2 hours ago</div>
						<div className="tla-page__item_collaborators" />
					</div>
				</div>
				<div className="tla-page__list_item_right">
					<button className="tla-page__item_menu">
						<TlaIcon icon="dots-horizontal" />
					</button>
					<button
						className="tla-page__item_star"
						data-starred={!!star}
						onClick={() => {
							if (star) {
								app.store.remove([star.id])
							} else {
								const { auth } = app.getSessionState()
								if (!auth) return false
								app.store.put([
									TldrawAppStarRecordType.create({
										fileId: id,
										userId: auth.userId,
										workspaceId: workspaceId,
									}),
								])
							}
						}}
					>
						<TlaIcon icon={star ? 'star-fill' : 'star'} />
					</button>
				</div>
			</div>
		</div>
	)
}
