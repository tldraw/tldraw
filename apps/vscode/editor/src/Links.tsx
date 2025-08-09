import { TldrawUiMenuGroup, TldrawUiMenuItem, useUiEvents } from 'tldraw'
import { openUrl } from './utils/url'

export function Links() {
	const trackEvent = useUiEvents()

	const handleAboutClick = () => {
		const url = 'https://tldraw.dev'

		// Track using the existing 'open-url' event
		trackEvent('open-url', { source: 'help-menu', url })

		// Dispatch custom event for enhanced transition tracking
		if (typeof window !== 'undefined') {
			window.dispatchEvent(
				new CustomEvent('tldraw-vscode-to-dev-transition', {
					detail: {
						source: 'help-menu',
						url,
						transition_type: 'vscode-to-dev',
						destination_domain: 'tldraw.dev',
						context: 'vscode-help-menu-about',
						timestamp: Date.now(),
					},
				})
			)
		}

		openUrl(url)
	}

	return (
		<>
			<TldrawUiMenuGroup id="links">
				<TldrawUiMenuItem
					id="about"
					label="help-menu.terms"
					readonlyOk
					onSelect={() => {
						openUrl(
							'https://github.com/tldraw/tldraw/blob/main/apps/dotcom/client/TERMS_OF_SERVICE.md'
						)
					}}
				/>
				<TldrawUiMenuItem
					id="about"
					label="help-menu.privacy"
					readonlyOk
					onSelect={() => {
						openUrl(
							'https://github.com/tldraw/tldraw/blob/main/apps/dotcom/client/PRIVACY_POLICY.md'
						)
					}}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="tldraw">
				<TldrawUiMenuItem
					id="about"
					label="help-menu.about"
					readonlyOk
					onSelect={handleAboutClick}
				/>
			</TldrawUiMenuGroup>
		</>
	)
}
