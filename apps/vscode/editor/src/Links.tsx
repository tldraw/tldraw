import { TldrawUiMenuItem } from '@tldraw/tldraw'
import { openUrl } from './utils/openUrl'

export function Links() {
	return (
		<>
			<TldrawUiMenuItem
				id="github"
				label="help-menu.github"
				readonlyOk
				icon="github"
				onSelect={() => {
					openUrl('https://github.com/tldraw/tldraw')
				}}
			/>
			<TldrawUiMenuItem
				id="twitter"
				label="help-menu.twitter"
				icon="twitter"
				readonlyOk
				onSelect={() => {
					openUrl('https://twitter.com/tldraw')
				}}
			/>
			<TldrawUiMenuItem
				id="discord"
				label="help-menu.discord"
				icon="discord"
				readonlyOk
				onSelect={() => {
					openUrl('https://discord.gg/SBBEVCA4PG')
				}}
			/>
			<TldrawUiMenuItem
				id="about"
				label="help-menu.about"
				icon="external-link"
				readonlyOk
				onSelect={() => {
					openUrl('https://www.tldraw.dev')
				}}
			/>
		</>
	)
}
