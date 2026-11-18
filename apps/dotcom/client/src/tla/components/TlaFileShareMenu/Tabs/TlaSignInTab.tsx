import { ReactNode } from 'react'
import { defineMessages, useDialogs, useTranslation } from 'tldraw'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { TlaSignInDialog } from '../../dialogs/TlaSignInDialog'
import { TlaMenuSection } from '../../tla-menu/tla-menu'
import { TlaButton } from '../../TlaButton/TlaButton'

const messages = defineMessages({
	signInToShare: { defaultMessage: 'Sign in to share' },
})

/**
 * What a signed-out visitor gets in the share menu's Invite and Publish tabs, which need an
 * account, with the signedOutShare design switch on. `children` is for what still works without
 * one, such as copying a shared file's link.
 */
export function TlaSignInTab({ children }: { children?: ReactNode }) {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	const label = msg(messages.signInToShare)
	return (
		<TlaMenuSection>
			<TlaButton
				variant="primary"
				data-testid="tla-share-sign-in-button"
				onClick={() => {
					trackEvent('sign-up-clicked', { source: 'file-share-menu', ctaMessage: label })
					addDialog({ component: TlaSignInDialog })
				}}
			>
				{label}
			</TlaButton>
			{children}
		</TlaMenuSection>
	)
}
