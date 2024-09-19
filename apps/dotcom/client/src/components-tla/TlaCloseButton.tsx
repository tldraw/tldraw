import { TlaIcon } from './TlaIcon'

export function TlaCloseButton({ onClose }: { onClose: () => void }) {
	return (
		<button className="tla-close_button tla-text_ui__regular" onClick={onClose}>
			<TlaIcon icon="close-strong" />
			<span>Close</span>
		</button>
	)
}
