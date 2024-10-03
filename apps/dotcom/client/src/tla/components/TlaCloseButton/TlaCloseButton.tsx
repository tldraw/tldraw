import classNames from 'classnames'
import { useRaw } from '../../hooks/useRaw'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './close.module.css'

export function TlaCloseButton({ onClose }: { onClose(): void }) {
	const raw = useRaw()
	return (
		<button className={classNames(styles.button, 'tla-text_ui__regular')} onClick={onClose}>
			<TlaIcon icon="close-strong" />
			<span>{raw('Close')}</span>
		</button>
	)
}
