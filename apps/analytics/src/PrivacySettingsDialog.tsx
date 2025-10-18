import { Dialog as _Dialog, Switch as _Switch } from 'radix-ui'
import { useCallback, useState } from 'react'
import { useDocumentTheme } from './theme'
import { DOT_DEV_COOKIE_POLICY_URL } from './urls'
import { useCookieConsent } from './useCookieConsent'

/*
The `PrivacySettingsDialog` component is used to display the privacy settings dialog.
It is used to allow the user to change their analytics consent.
*/

export function PrivacySettingsDialog() {
	const theme = useDocumentTheme()
	const [isOpen, setIsOpen] = useState(true)
	const { consent, updateConsent } = useCookieConsent()

	const handleDialogClose = useCallback(() => {
		setIsOpen(false)
	}, [setIsOpen])

	return (
		<_Dialog.Root open={isOpen}>
			<_Dialog.Portal>
				<_Dialog.Overlay className="tl-analytics-dialog" data-theme={theme} />
				<div className="tl-analytics-dialog-wrapper" data-theme={theme}>
					<_Dialog.Content
						onInteractOutside={handleDialogClose}
						onPointerDownOutside={handleDialogClose}
						onEscapeKeyDown={handleDialogClose}
						className="tl-analytics-dialog-content"
					>
						<_Dialog.Title className="tl-analytics-dialog-title">Privacy settings</_Dialog.Title>
						<_Dialog.Description className="tl-analytics-dialog-body">
							This website uses cookies to collect analytics from visitors. Read our{' '}
							<a href={DOT_DEV_COOKIE_POLICY_URL} target="_blank" rel="noreferrer">
								cookie policy
							</a>{' '}
							to learn more.
						</_Dialog.Description>
						<_Dialog.Close className="tl-analytics-dialog-close" asChild>
							<button aria-label="Close" onClick={handleDialogClose}>
								<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</_Dialog.Close>

						<div className="tl-analytics-checkbox-group">
							<label className="tl-analytics-checkbox-label" htmlFor="privacy-analytics">
								<strong>Analytics</strong>
								<br />
								Optional. Help us understand how people use this website so that we can make it
								better.
							</label>
							<div>
								<_Switch.Root
									className="tl-analytics-checkbox"
									id="privacy-analytics"
									checked={consent === 'opted-in'}
									onCheckedChange={updateConsent}
								>
									<_Switch.Thumb />
								</_Switch.Root>
							</div>
						</div>
					</_Dialog.Content>
				</div>
			</_Dialog.Portal>
		</_Dialog.Root>
	)
}
