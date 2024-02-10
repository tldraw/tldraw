import { TldrawUiMenuItem } from '@tldraw/tldraw'
import { openUrl } from './utils/openUrl'

export function Links() {
	return (
		<>
			<TldrawUiMenuItem
				actionItem={{
					id: 'github',
					label: 'help-menu.github',
					readonlyOk: true,
					icon: 'github',
					onSelect() {
						openUrl('https://github.com/tldraw/tldraw')
					},
				}}
			/>
			<TldrawUiMenuItem
				actionItem={{
					id: 'twitter',
					label: 'help-menu.twitter',
					icon: 'twitter',
					readonlyOk: true,
					onSelect() {
						openUrl('https://twitter.com/tldraw')
					},
				}}
			/>
			<TldrawUiMenuItem
				actionItem={{
					id: 'discord',
					label: 'help-menu.discord',
					icon: 'discord',
					readonlyOk: true,
					onSelect() {
						openUrl('https://discord.gg/SBBEVCA4PG')
					},
				}}
			/>
			<TldrawUiMenuItem
				actionItem={{
					id: 'about',
					label: 'help-menu.about',
					icon: 'external-link',
					readonlyOk: true,
					onSelect() {
						openUrl('https://www.tldraw.dev')
					},
				}}
			/>
		</>
	)
}
