import { defineMessages } from '@tldraw/editor'

/**
 * Strings the SDK ships translations for but never renders itself: the host app does, through a
 * menu item or an override. tldraw.com supplies the file-open prompts, the VS Code extension the
 * backup ones, and both add their own links to the help menu.
 *
 * They need declaring somewhere, because nothing in `packages/*` mentions them and the catalog is
 * extraction output — an id declared nowhere is an id that disappears, taking 49 translations and
 * any app keyed to it. They live together rather than scattered through files that don't use them.
 *
 * @internal
 */
export const consumerMessages = defineMessages({
	actionSaveCopy: { id: 'action.save-copy', defaultMessage: 'Save a copy' },
	fileSystemConfirmOpenCancel: { id: 'file-system.confirm-open.cancel', defaultMessage: 'Cancel' },
	fileSystemConfirmOpenDescription: {
		id: 'file-system.confirm-open.description',
		defaultMessage:
			'Opening a file will replace your current project and any unsaved changes will be lost. Are you sure you want to continue?',
	},
	fileSystemConfirmOpenOpen: { id: 'file-system.confirm-open.open', defaultMessage: 'Open file' },
	fileSystemConfirmOpenTitle: {
		id: 'file-system.confirm-open.title',
		defaultMessage: 'Overwrite current project?',
	},
	fileSystemSharedDocumentFileOpenErrorDescription: {
		id: 'file-system.shared-document-file-open-error.description',
		defaultMessage: 'Opening files from shared projects is not supported.',
	},
	fileSystemSharedDocumentFileOpenErrorTitle: {
		id: 'file-system.shared-document-file-open-error.title',
		defaultMessage: 'Could not open file',
	},
	helpMenuAbout: { id: 'help-menu.about', defaultMessage: 'About tldraw' },
	helpMenuDiscord: { id: 'help-menu.discord', defaultMessage: 'Discord' },
	helpMenuGithub: { id: 'help-menu.github', defaultMessage: 'GitHub' },
	helpMenuPrivacy: { id: 'help-menu.privacy', defaultMessage: 'Privacy policy' },
	helpMenuTerms: { id: 'help-menu.terms', defaultMessage: 'Terms of service' },
	helpMenuTwitter: { id: 'help-menu.twitter', defaultMessage: 'Twitter' },
	vscodeFileOpenBackup: { id: 'vscode.file-open.backup', defaultMessage: 'Backup' },
	vscodeFileOpenBackupFailed: {
		id: 'vscode.file-open.backup-failed',
		defaultMessage: 'Backup failed: this is not a .tldr file.',
	},
	vscodeFileOpenBackupSaved: {
		id: 'vscode.file-open.backup-saved',
		defaultMessage: 'Backup saved',
	},
	vscodeFileOpenDesc: {
		id: 'vscode.file-open.desc',
		defaultMessage:
			'We’ve updated this document to work with the current version of tldraw. If you’d like to keep the original version (which will work on old.tldraw.com), click below to create a backup.',
	},
	vscodeFileOpenDontShowAgain: {
		id: 'vscode.file-open.dont-show-again',
		defaultMessage: 'Don’t ask again',
	},
	vscodeFileOpenOpen: { id: 'vscode.file-open.open', defaultMessage: 'Continue' },
})
