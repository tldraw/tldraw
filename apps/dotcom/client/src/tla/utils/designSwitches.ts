import { Atom, localStorageAtom, useValue } from 'tldraw'
import { useIsUiV3 } from '../hooks/useIsUiV3'

/**
 * Throwaway toggles for trying v3 design ideas side by side, flipped from the beaker menu by the
 * share button. Unlike feature flags they are per browser (localStorage), not per user, and nobody
 * outside `ui_v3` sees them. When an idea is decided, delete its switch and keep the winning code.
 *
 * Labels are plain strings, not translated messages: these come and go too often to send to
 * translators.
 */
export interface DesignSwitch {
	id: string
	label: string
	value: Atom<boolean>
}

function designSwitch(id: string, label: string, initialValue = false): DesignSwitch {
	const [value] = localStorageAtom(`tla-design-switch:${id}`, initialValue)
	return { id, label, value }
}

export const designSwitches = {
	// Settings dialog: tabs in a strip above the page instead of a column beside it.
	settingsHorizontalTabs: designSwitch('settings-horizontal-tabs', 'Horizontal settings tabs'),
	// Lists these switches on a Labs tab in the settings dialog instead of in the beaker menu.
	settingsLabsTab: designSwitch('settings-labs-tab', 'Labs tab in settings'),
	// Gallery and list: avatars of who has opened each board, full opacity for whoever is on it now.
	boardVisitors: designSwitch('board-visitors', 'Board visitor avatars', true),
	// File header: the logo opens the main menu, which loses its own ⋮ button.
	logoMenu: designSwitch('logo-menu', 'Menu on the logo'),
	// File header: the sidebar's create-file button, among the icons beside Share.
	newFileShortcut: designSwitch('new-file-shortcut', 'New file shortcut'),
	// File header: settings as an icon beside Share instead of an item in the main menu.
	settingsIcon: designSwitch('settings-icon', 'Top-level settings icon'),
	// File header: the file name opens the workspace's files, as the page name opens the pages,
	// instead of renaming in place.
	fileSwitcher: designSwitch('file-switcher', 'Breadcrumb file switcher'),
	// Signed out: the one Share button signed-in users have, in place of a share icon beside
	// "Sign in to share", with sign-in moved into its menu's Invite and Publish tabs.
	signedOutShare: designSwitch('signed-out-share', 'Signed-out Share button'),
	// Signed out: "Unsaved file" in the header in a warning colour instead of the text colour.
	unsavedFileColor: designSwitch('unsaved-file-color', 'Warning colour on "Unsaved file"'),
	// Main menu experiments. So far: signed out, a File submenu holding Download, where it is
	// signed in, instead of Download at the top level.
	andysMainMenu: designSwitch('andys-main-menu', "Andy's main menu"),
	// List view: a small thumbnail to the left of each board's name.
	listThumbnails: designSwitch('list-thumbnails', 'Thumbnails in list view'),
} satisfies Record<string, DesignSwitch>

export type DesignSwitchId = keyof typeof designSwitches

/**
 * Whether a design switch is on. Always false outside `ui_v3`, so a value left in localStorage
 * after someone leaves the allowlist can't change their UI.
 */
export function useDesignSwitch(id: DesignSwitchId): boolean {
	const isUiV3 = useIsUiV3()
	const value = useValue(designSwitches[id].value)
	return isUiV3 && value
}
