import { ReactNode } from 'react'
import { defineMessages, useTranslation } from 'tldraw'
import { TlaSignInButton } from '../../dialogs/TlaSignInButton'
import { TlaMenuSection } from '../../tla-menu/tla-menu'

const messages = defineMessages({
	signInToShare: { defaultMessage: 'Sign in to share' },
})

/**
 * For the signedOutShare design switch: the Invite and Publish tabs need an account. `children` is
 * for what still works without one, such as copying a shared file's link.
 */
export function TlaSignInTab({ children }: { children?: ReactNode }) {
	const msg = useTranslation()
	return (
		<TlaMenuSection>
			<TlaSignInButton
				label={msg(messages.signInToShare)}
				source="file-share-menu"
				data-testid="tla-share-sign-in-button"
			/>
			{children}
		</TlaMenuSection>
	)
}
