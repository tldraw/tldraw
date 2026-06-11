import { defineMessages } from '../../../utils/i18n'

export interface RecentFile {
	fileId: string
	date: number
	isPinned: boolean
}

export const messages = defineMessages({
	create: { defaultMessage: 'Create file' },
	// the name of a workspace's seeded first file
	newWorkspaceFileName: { defaultMessage: 'Welcome to your workspace' },
	toggleSidebar: { defaultMessage: 'Toggle sidebar' },
	accountMenu: { defaultMessage: 'Account menu' },
	fileMenu: { defaultMessage: 'File menu' },
})
