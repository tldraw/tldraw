import { Icon } from './Icon'

export function SidebarCloseButton() {
	return (
		<div className="sidebar__close">
			<span onClick={() => document.body.classList.toggle('sidebar-open')}>Close</span>
			<button
				className="icon-button"
				onClick={() => document.body.classList.toggle('sidebar-open')}
			>
				<Icon icon="close" small />
			</button>
		</div>
	)
}
