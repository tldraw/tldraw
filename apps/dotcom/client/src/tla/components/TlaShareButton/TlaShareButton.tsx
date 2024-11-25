import { forwardRef } from 'react'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'

export const TlaShareButton = forwardRef<HTMLButtonElement>(function ShareButton(props, ref) {
	const trackEvent = useTldrawAppUiEvents()
	return (
		<button
			ref={ref}
			draggable={false}
			type="button"
			data-testid="share-button"
			className="tlui-share-zone__button-wrapper"
			{...props}
			onClick={() => trackEvent('open-share-menu', { source: 'file-header' })}
		>
			<div className="tlui-button tlui-button__normal tlui-share-zone__button">
				<span className="tlui-button__label" draggable={false}>
					<F defaultMessage="Share" />
				</span>
			</div>
		</button>
	)
})
