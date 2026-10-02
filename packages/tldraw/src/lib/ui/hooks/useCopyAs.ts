import { assert, defineMessages, TLShapeId, useMaybeEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TLCopyType, copyAs } from '../../utils/export/copyAs'
import { useToasts } from '../context/toasts'
import { useTranslation } from './useTranslation/useTranslation'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	toastErrorCopyFailDesc: {
		id: 'toast.error.copy-fail.desc',
		defaultMessage: 'Failed to copy image',
	},
	toastErrorCopyFailTitle: { id: 'toast.error.copy-fail.title', defaultMessage: 'Failed copy' },
})

/** @public */
export function useCopyAs() {
	const editor = useMaybeEditor()
	const { addToast } = useToasts()
	const msg = useTranslation()

	return useCallback(
		(ids: TLShapeId[], format: TLCopyType = 'svg') => {
			assert(editor, 'useCopyAs: editor is required')
			copyAs(editor, ids, { format }).catch(() => {
				addToast({
					id: 'copy-fail',
					severity: 'warning',
					title: msg(messages.toastErrorCopyFailTitle.id),
					description: msg(messages.toastErrorCopyFailDesc.id),
				})
			})
		},
		[editor, addToast, msg]
	)
}
