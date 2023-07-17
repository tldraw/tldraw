import { menuGroup, menuItem, TLUiOverrides } from '@tldraw/tldraw'
import { openUrl } from './openUrl'

export const GITHUB_URL = 'https://github.com/tldraw/tldraw'

const linksMenuGroup = menuGroup(
	'links',
	menuItem({
		id: 'github',
		label: 'help-menu.github',
		readonlyOk: true,
		icon: 'github',
		onSelect() {
			openUrl(GITHUB_URL)
		},
	}),
	menuItem({
		id: 'twitter',
		label: 'help-menu.twitter',
		icon: 'twitter',
		readonlyOk: true,
		onSelect() {
			openUrl('https://twitter.com/tldraw')
		},
	}),
	menuItem({
		id: 'discord',
		label: 'help-menu.discord',
		icon: 'discord',
		readonlyOk: true,
		onSelect() {
			openUrl('https://discord.gg/SBBEVCA4PG')
		},
	}),
	menuItem({
		id: 'about',
		label: 'help-menu.about',
		icon: 'external-link',
		readonlyOk: true,
		onSelect() {
			openUrl('https://www.tldraw.dev')
		},
	})
)!

export const linksUiOverrides: TLUiOverrides = {
	helpMenu(editor, schema) {
		schema.push(linksMenuGroup)
		return schema
	},
	menu(editor, schema, { isMobile }) {
		if (isMobile) {
			schema.push(linksMenuGroup)
		}
		return schema
	},
}
