import { Link } from 'react-router-dom'
import { TldrawAppFile, getCleanId } from '../utils/tla/db'
import { TlaIcon } from './TlaIcon'

export function TlaFileGridItem({ id, name, createdAt, workspaceId }: TldrawAppFile) {
	return (
		<div key={id} className="tla_page__grid_item">
			<div className="tla_page__grid_item_top">
				<div className="tla_page__grid_item_thumbnail" />
			</div>
			<div className="tla_page__grid_item_bottom">
				<div className="tla_page__grid_item_title">
					{name || new Date(createdAt).toLocaleString('en-gb')}
				</div>
				<div className="tla_page__grid_item_details">
					<div>Last edited 2 hours ago</div>
					<div className="tla_page__grid_item_collaborators" />
				</div>
			</div>
			<Link
				to={`/${getCleanId(workspaceId)}/f/${getCleanId(id)}`}
				className="tla_page__grid_item_link"
			/>
			<button className="tla_page__grid_item_menu">
				<TlaIcon icon="more" />
			</button>
		</div>
	)
}
