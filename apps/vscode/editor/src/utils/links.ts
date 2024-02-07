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
		id: 't-and-c',
		label: 'help-menu.terms-and-conditions',
		icon: 'external-link',
		readonlyOk: true,
		onSelect() {
			window.open('https://tldraw.dev/community/terms-and-conditions/')
		},
	}),
	menuItem({
		id: 'privacy',
		label: 'help-menu.privacy',
		icon: 'external-link',
		readonlyOk: true,
		onSelect() {
			window.open('https://tldraw.dev/community/privacy-policy/')
		},
	}),
	menuItem({
		id: 'about',
		label: 'help-menu.about',
		icon: 'external-link',
		readonlyOk: true,
		onSelect() {
			openUrl('https://tldraw.dev')
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
