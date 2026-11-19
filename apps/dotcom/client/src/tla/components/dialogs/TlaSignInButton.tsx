import { useDialogs } from 'tldraw'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaSignInDialog } from './TlaSignInDialog'

/** A primary button standing in for something that needs an account: it opens the sign-in dialog. */
export function TlaSignInButton({
	label,
	source,
	'data-testid': testId,
}: {
	label: string
	source: TLAppUiEventSource
	'data-testid'?: string
}) {
	const { addDialog } = useDialogs()
	const trackEvent = useTldrawAppUiEvents()
	return (
		<TlaButton
			variant="primary"
			data-testid={testId}
			onClick={() => {
				trackEvent('sign-up-clicked', { source, ctaMessage: label })
				addDialog({ component: TlaSignInDialog })
			}}
		>
			{label}
		</TlaButton>
	)
}
