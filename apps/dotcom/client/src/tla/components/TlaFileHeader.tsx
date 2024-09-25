import { TlaButton } from './TlaButton'
import { TlaSidebarToggle } from './TlaSidebarToggle'

export function TlaFileHeader() {
	return (
		<div className="tla-file-header">
			<TlaSidebarToggle />
			<div className="tla-file-header__fileinfo tla-text_ui__section">
				<span className="tla-file-header__folder">My files / </span>
				<span className="tla-file-header__title">My title</span>
			</div>
			<TlaButton>Share</TlaButton>
		</div>
	)
}
