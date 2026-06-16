// The welcome document's instructional copy, keyed by the stable shape id it lives in. Shared
// between the client — which defines these as i18n messages (see welcomeMessages.ts) and can seed
// the user's locale — and the sync worker, which generates per-locale variants by filling these
// shapes from the compiled translation catalogs. The ids are stable and explicit so both sides
// bind by the same key without importing each other; the matching client `defineMessages` carries
// the same ids into the formatjs/lokalise pipeline. Only these shapes are localized — the comic's
// in-world flavor text (sticky-note labels, drawn file names) is part of the illustration.
//
// `defaultMessage` is the English source and the last-resort fallback when a catalog lacks a key.
export const WELCOME_COPY = {
	'shape:welcome-title': { id: 'welcome.title', defaultMessage: 'Welcome to your workspace' },
	'shape:welcome-caption-1': {
		id: 'welcome.caption1',
		defaultMessage:
			'A workspace is a <strong>shared space</strong> for your team. Everyone in it can see and edit its files.',
	},
	'shape:welcome-caption-2': {
		id: 'welcome.caption2',
		defaultMessage:
			'Invite your team with an invite link from the workspace menu in the sidebar. Shared it by accident? Revoke it there too.',
	},
	'shape:welcome-caption-3': {
		id: 'welcome.caption3',
		defaultMessage:
			"Move files in by dragging them onto this workspace in the sidebar, or with a file's 'Move to' menu.",
	},
	'shape:welcome-team-label': { id: 'welcome.teamLabel', defaultMessage: 'your team' },
} as const

export type WelcomeCopyShapeId = keyof typeof WELCOME_COPY
export type WelcomeCopyEntry = (typeof WELCOME_COPY)[WelcomeCopyShapeId]
