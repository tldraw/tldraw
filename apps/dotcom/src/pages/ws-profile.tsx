import '../../styles/globals.css'
import { TlaSpacer } from '../components-tla/TlaSpacer'

export function Component() {
	return (
		<div className="tla_content tla_page">
			<div className="tla_page__header">
				<h2 className="tla_text_ui__big">Profile</h2>
			</div>
			<TlaSpacer height={40} />
			<TlaSpacer height="20" />
		</div>
	)
}
