import { defineMessages } from '../../../utils/i18n'

export interface RecentFile {
	fileId: string
	date: number
	isPinned: boolean
}

export const messages = defineMessages({
	create: { defaultMessage: 'Create file' },
	toggleSidebar: { defaultMessage: 'Toggle sidebar' },
	accountMenu: { defaultMessage: 'Account menu' },
	fileMenu: { defaultMessage: 'File menu' },
	groupEmpty: {
		defaultMessage:
			'Drag files here, <create>create a file</create>, or <invite>copy invite link</invite> to get started.',
	},
})
