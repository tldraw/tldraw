import { TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'
import { useOpenUrlAndTrack } from '../hooks/useOpenUrlAndTrack'

export function LegacyLinks() {
	const openAndTrack = useOpenUrlAndTrack('main-menu')

	return (
		<>
			<TldrawUiMenuGroup id="links">
				<TldrawUiMenuItem
					id="about"
					label="help-menu.terms"
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
					readonlyOk
					onSelect={() => {
						openAndTrack(
							'https://tldraw.dev/?utm_source=dotcom&utm_medium=organic&utm_campaign=learn-more'
						)
					}}
				/>
			</TldrawUiMenuGroup>
		</>
	)
}
