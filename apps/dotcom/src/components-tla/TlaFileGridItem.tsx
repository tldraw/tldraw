import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TldrawImage, useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { loadDataFromStore } from '../utils/tla/local-sync'
import { TldrawAppFile } from '../utils/tla/schema/TldrawAppFile'
import { TldrawAppStarRecordType } from '../utils/tla/schema/TldrawAppStar'
import { getCleanId } from '../utils/tla/tldrawApp'
import { TlaIcon } from './TlaIcon'

export function TlaFileGridItem({ id, name, createdAt, workspaceId }: TldrawAppFile) {
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

	const [snapshot, setSnapshot] = useState(null)

	useEffect(() => {
		let didDispose = false
		loadDataFromStore({
			persistenceKey: `tla_1_${id}`,
			didCancel: () => didDispose,
		})
		return () => {
			didDispose = true
		}
	})

	return (
		<div className="tla_page__grid_item">
			<div className="tla_page__grid_item_top">
				{snapshot && <TldrawImage snapshot={snapshot} />}
				<div className="tla_page__grid_item_thumbnail" />
			</div>
			<div className="tla_page__grid_item_bottom">
				<div className="tla_page__item_title">
					{name || new Date(createdAt).toLocaleString('en-gb')}
				</div>
				<div className="tla_page__item_details">
					<div>Last edited 2 hours ago</div>
					<div className="tla_page__grid_item_collaborators" />
				</div>
			</div>
			<Link
				to={`/${getCleanId(workspaceId)}/f/${getCleanId(id)}`}
				className="tla_page__item_link"
			/>
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
			<button className="tla_page__item_menu">
				<TlaIcon icon="more" />
			</button>
		</div>
	)
}
