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
			'Drag files here, <create>Create a file</create>, or <invite>Copy invite link</invite> to get started.',
	},
})
