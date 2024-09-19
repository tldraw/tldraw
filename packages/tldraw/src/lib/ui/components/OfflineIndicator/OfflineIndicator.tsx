import classNames from 'classnames'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'

/** @public @react */
export function OfflineIndicator() {
	const msg = useTranslation()

	return (
		<div className={classNames('tlui-offline-indicator')}>
			{msg('status.offline')}
			<TldrawUiIcon aria-label="offline" icon="status-offline" small />
		</div>
	)
}
