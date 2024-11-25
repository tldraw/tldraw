import { defineMessages } from '../../../utils/i18n'

export interface RecentFile {
	fileId: string
	date: number
}

export const messages = defineMessages({
	create: { defaultMessage: 'Create file' },
	toggleSidebar: { defaultMessage: 'Toggle sidebar' },
	accountMenu: { defaultMessage: 'Account menu' },
	fileMenu: { defaultMessage: 'File menu' },
})
