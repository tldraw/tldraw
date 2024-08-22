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
							'https://github.com/tldraw/tldraw/blob/main/apps/dotcom/TERMS_OF_SERVICE.md'
						)
					}}
				/>
				<TldrawUiMenuItem
					id="about"
					label="help-menu.privacy"
					icon="external-link"
					readonlyOk
					onSelect={() => {
						openAndTrack('https://github.com/tldraw/tldraw/blob/main/apps/dotcom/PRIVACY_POLICY.md')
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
