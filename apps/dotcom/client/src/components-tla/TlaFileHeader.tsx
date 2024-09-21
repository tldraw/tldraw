import { useApp } from '../hooks/useAppState'
import { TlaButton } from './TlaButton'
import { TlaIcon } from './TlaIcon'

export function TlaFileHeader() {
	const app = useApp()

	return (
		<div className="tla-file-header">
			<button
				className="tla-top-left-button tla-file-header__collapse"
				onClick={() => app.toggleSidebar()}
			>
				<TlaIcon icon="sidebar" />
			</button>
			<div className="tla-file-header__fileinfo tla-text_ui__section">
				<span className="tla-file-header__folder">My files / </span>
				<span className="tla-file-header__title">My title</span>
			</div>
			<TlaButton>Share</TlaButton>
		</div>
	)
}
