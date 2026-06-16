import { defineMessages } from './i18n'

// The welcome document's instructional copy as dotcom i18n messages. These flow through the normal
// formatjs/lokalise pipeline (`yarn build-i18n` → public/tla/locales[-compiled]/<locale>.json), the
// same as every other dotcom string — so translators localize them and no machine translation is
// involved.
//
// The ids are explicit and stable, and MUST match WELCOME_COPY in @tldraw/dotcom-shared: that's the
// binding the sync worker uses to fill the right shapes from the compiled catalogs when it generates
// per-locale welcome variants. `<strong>` marks the bold runs the captions use, applied at format
// time via a chunk handler:  intl.formatMessage(msg, { strong: (c) => ({ bold: c.join('') }) }).
export const welcomeMessages = defineMessages({
	title: { id: 'welcome.title', defaultMessage: 'Welcome to your workspace' },
	caption1: {
		id: 'welcome.caption1',
		defaultMessage:
			'A workspace is a <strong>shared space</strong> for your team. Everyone in it can see and edit its files.',
	},
	caption2: {
		id: 'welcome.caption2',
		defaultMessage:
			'Invite your team with an invite link from the workspace menu in the sidebar. Shared it by accident? Revoke it there too.',
	},
	caption3: {
		id: 'welcome.caption3',
		defaultMessage:
			"Move files in by dragging them onto this workspace in the sidebar, or with a file's 'Move to' menu.",
	},
	teamLabel: { id: 'welcome.teamLabel', defaultMessage: 'your team' },
})
