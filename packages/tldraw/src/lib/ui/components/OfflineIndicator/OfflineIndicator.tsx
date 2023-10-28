import classNames from 'classnames'
import { useRef } from 'react'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Icon } from '../primitives/Icon'

/** @public */
export function OfflineIndicator() {
	const msg = useTranslation()
	const rContainer = useRef<HTMLDivElement>(null)

	return (
		<div className={classNames('tlui-offline-indicator')} ref={rContainer}>
			{msg('status.offline')}
			<Icon aria-label="offline" icon="status-offline" small />
		</div>
	)
}
