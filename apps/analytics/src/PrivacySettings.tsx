import { Dialog as _Dialog, Switch as _Switch } from 'radix-ui'
import { useState } from 'react'
import { readStoredConsent, writeConsentCookie } from './cookies'
import { useDocumentTheme } from './theme'

export function PrivacySettings() {
	const theme = useDocumentTheme()
	const [isChecked, setIsChecked] = useState(readStoredConsent() === 'opted-in')

	const onChange = (checked: boolean) => {
		setIsChecked(checked)
		writeConsentCookie(checked ? 'opted-in' : 'opted-out')
	}

	const onHide = () => {
		// Need this for the settings to take effect on the consent banner.
		window.location.reload()
	}

	return (
		<_Dialog.Root open>
			<_Dialog.Portal>
				<_Dialog.Overlay className="tl-analytics-dialog" data-theme={theme} />
				<div className="tl-analytics-dialog-wrapper" data-theme={theme}>
					<_Dialog.Content
						onInteractOutside={onHide}
						onPointerDownOutside={onHide}
						onEscapeKeyDown={onHide}
						className="tl-analytics-dialog-content"
					>
						<_Dialog.Title className="tl-analytics-dialog-title">Privacy settings</_Dialog.Title>
						<_Dialog.Description className="tl-analytics-dialog-body">
							This website uses cookies to collect analytics from visitors. Read our{' '}
							<a href="https://tldraw.notion.site/devcookiepolicy" target="_blank" rel="noreferrer">
								cookie policy
							</a>{' '}
							to learn more.
						</_Dialog.Description>
						<_Dialog.Close className="tl-analytics-dialog-close" asChild>
							<button aria-label="Close" onClick={onHide}>
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
									checked={isChecked}
									onCheckedChange={onChange}
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
