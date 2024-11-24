import { SignedOut } from '@clerk/clerk-react'
import classNames from 'classnames'
import { forwardRef, useRef } from 'react'
import { PeopleMenu, usePassThroughWheelEvents } from 'tldraw'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { F } from '../../utils/i18n'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import { TlaSignUpButton } from '../TlaSignUpButton/TlaSignUpButton'
import styles from './top.module.css'

export function TlaEditorTopRightPanel({ isAnonUser }: { isAnonUser: boolean }) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	const trackEvent = useTldrawAppUiEvents()
	const fileId = useCurrentFileId()

	if (isAnonUser) {
		return (
			<div ref={ref} className={classNames(styles.topRightPanel, styles.signInButtons)}>
				<SignedOut>
					<TlaSignUpButton
						onClick={() => trackEvent('sign-up-clicked', { source: 'anon-landing-page' })}
						data-testid="tla-signup-button"
						variant="cta"
					>
						<F defaultMessage="Sign in" />
					</TlaSignUpButton>
				</SignedOut>
			</div>
		)
	}

	return (
		<div ref={ref} className={styles.topRightPanel}>
			<PeopleMenu />
			<TlaFileShareMenu fileId={fileId!} source="file-header">
				<ShareButton />
			</TlaFileShareMenu>
		</div>
	)
}

// todo, move styles from globals.css to top.module.css

export const ShareButton = forwardRef<HTMLButtonElement>(function ShareButton(props, ref) {
	const trackEvent = useTldrawAppUiEvents()
	return (
		<button
			ref={ref}
			draggable={false}
			type="button"
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
