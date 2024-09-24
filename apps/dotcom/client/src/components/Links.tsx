import { TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'
import { useOpenUrlAndTrack } from '../hooks/useOpenUrlAndTrack'

export function Links() {
	const openAndTrack = useOpenUrlAndTrack('main-menu')

	return (
		<>
			<TldrawUiMenuGroup id="links">
				<TldrawUiMenuItem
					id="about"
					label="help-menu.terms"
					icon="external-link"
					readonlyOk
					onSelect={() => {
						openAndTrack(
							'https://github.com/tldraw/tldraw/blob/main/apps/dotcom/client/TERMS_OF_SERVICE.md'
						)
					}}
				/>
				<TldrawUiMenuItem
					id="about"
					label="help-menu.privacy"
					icon="external-link"
					readonlyOk
					onSelect={() => {
						openAndTrack(
							'https://github.com/tldraw/tldraw/blob/main/apps/dotcom/client/PRIVACY_POLICY.md'
						)
					}}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="tldraw">
				<TldrawUiMenuItem
					id="about"
					label="help-menu.about"
					icon="external-link"
					readonlyOk
					onSelect={() => {
						openAndTrack('https://tldraw.dev')
					}}
				/>
			</TldrawUiMenuGroup>
		</>
	)
}
