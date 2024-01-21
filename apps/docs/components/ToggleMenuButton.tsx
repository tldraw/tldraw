import { Icon } from './Icon'

export function ToggleMenuButton() {
	return (
		<button
			className="menu__button icon-button"
			onClick={() => document.body.classList.toggle('sidebar-open')}
		>
			<Icon icon="menu" small />
		</button>
	)
}
