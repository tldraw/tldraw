import { defineMessages } from 'tldraw'

/**
 * The toast for an item that couldn't be saved to a library, shown by the panel when adding is
 * refused and by a source whose saving fails after the item was listed.
 * @internal
 */
export const saveErrorMessages = defineMessages({
	saveErrorTitle: {
		id: 'libraries.save-error.title',
		defaultMessage: "Couldn't save to library",
	},
	saveErrorDescription: {
		id: 'libraries.save-error.description',
		defaultMessage: 'You may not be allowed to add to this library, or it no longer exists.',
	},
})
