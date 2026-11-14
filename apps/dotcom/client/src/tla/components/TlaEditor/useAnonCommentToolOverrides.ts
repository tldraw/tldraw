import { useMemo } from 'react'
import { defineMessages, TLUiOverrides, useTranslation } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { TlaSignInDialog } from '../dialogs/TlaSignInDialog'

/** For signed-out viewers, the comment tool button and its `c` shortcut open the sign-in dialog
 *  instead of entering the tool. Compose after `commentToolOverrides`, which registers the tool. */
export const signInMessages = defineMessages({
	signInToComment: { defaultMessage: 'Sign in to comment' },
})

export function useAnonCommentToolOverrides(): TLUiOverrides {
	const msg = useTranslation()
	const app = useMaybeApp()
	const trackEvent = useTldrawAppUiEvents()
	const ctaString = msg(signInMessages.signInToComment)
	return useMemo(() => {
		if (app) return {}
		return {
			tools(_editor, tools, { addDialog }) {
				const comment = tools.comment
				if (comment) {
					comment.onSelect = () => {
						trackEvent('sign-up-clicked', { source: 'comments', ctaMessage: ctaString })
						addDialog({ component: TlaSignInDialog })
					}
				}
				return tools
			},
		}
	}, [app, trackEvent, ctaString])
}
