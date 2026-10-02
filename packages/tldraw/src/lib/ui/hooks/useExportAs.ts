import { assert, defineMessages, TLExportType, TLShapeId, useMaybeEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { exportAs } from '../../utils/export/exportAs'
import { useToasts } from '../context/toasts'
import { useTranslation } from './useTranslation/useTranslation'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	toastErrorExportFailDesc: {
		id: 'toast.error.export-fail.desc',
		defaultMessage: 'Failed to export image',
	},
	toastErrorExportFailTitle: {
		id: 'toast.error.export-fail.title',
		defaultMessage: 'Failed export',
	},
})

/** @public */
export function useExportAs() {
	const editor = useMaybeEditor()
	const { addToast } = useToasts()
	const msg = useTranslation()

	return useCallback(
		(ids: TLShapeId[], opts: { format?: TLExportType; name?: string; scale?: number } = {}) => {
			assert(editor, 'useExportAs: editor is required')
			const { format = 'png', name, scale = 1 } = opts
			exportAs(editor, ids, {
				format,
				name,
				scale,
			}).catch((e) => {
				console.error(e.message)
				addToast({
					id: 'export-fail',
					title: msg(messages.toastErrorExportFailTitle.id),
					description: msg(messages.toastErrorExportFailDesc.id),
					severity: 'error',
				})
			})
		},
		[editor, addToast, msg]
	)
}
