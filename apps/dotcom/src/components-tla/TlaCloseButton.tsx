import { TlaIcon } from './TlaIcon'

export function TlaCloseButton({ onClose }: { onClose: () => void }) {
	return (
		<button className="tla_close_button tla_text_ui__regular" onClick={onClose}>
			<div className="tla_icon_wrapper">
				<TlaIcon icon="close" />
			</div>
			<span>Close</span>
		</button>
	)
}
