import { defineMessages, type TLUiToast, type useTranslation } from 'tldraw'
import { LibraryItemContentTooNewError } from '../lib/schema'

const messages = defineMessages({
	title: { id: 'libraries.too-new.title', defaultMessage: 'Made with a newer version of tldraw' },
	description: {
		id: 'libraries.too-new.description',
		defaultMessage: 'Reload tldraw to use this item.',
	},
})

/**
 * The toast for an item whose content this version of tldraw can't load, or undefined when the
 * error has another cause.
 */
export function getContentTooNewToast(
	error: unknown,
	msg: ReturnType<typeof useTranslation>
): Omit<TLUiToast, 'id'> | undefined {
	if (!(error instanceof LibraryItemContentTooNewError)) return undefined
	return { title: msg(messages.title), description: msg(messages.description), severity: 'error' }
}
