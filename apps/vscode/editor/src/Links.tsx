import { runtime, TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'

export function Links() {
	return (
		<>
			<TldrawUiMenuGroup id="links">
				<TldrawUiMenuItem
					id="about"
					label="help-menu.terms"
					readonlyOk
					onSelect={() => {
						runtime.openWindow(
							'https://github.com/tldraw/tldraw/blob/main/apps/dotcom/client/TERMS_OF_SERVICE.md',
							'_blank',
							false
						)
					}}
				/>
				<TldrawUiMenuItem
					id="about"
					label="help-menu.privacy"
					readonlyOk
					onSelect={() => {
						runtime.openWindow(
							'https://github.com/tldraw/tldraw/blob/main/apps/dotcom/client/PRIVACY_POLICY.md',
							'_blank',
							false
						)
					}}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="tldraw">
				<TldrawUiMenuItem
					id="about"
					label="help-menu.about"
					readonlyOk
					onSelect={() => {
						runtime.openWindow('https://tldraw.dev', '_blank', true) // allow referrer
					}}
				/>
			</TldrawUiMenuGroup>
		</>
	)
}
