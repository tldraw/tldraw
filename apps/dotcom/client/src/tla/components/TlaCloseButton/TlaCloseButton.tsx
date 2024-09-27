import classNames from 'classnames'
import { TlaIcon } from '../TlaIcon'
import styles from './close.module.css'

export function TlaCloseButton({ onClose }: { onClose(): void }) {
	return (
		<button className={classNames(styles.button, 'tla-text_ui__regular')} onClick={onClose}>
			<TlaIcon icon="close-strong" />
			<span>Close</span>
		</button>
	)
}
