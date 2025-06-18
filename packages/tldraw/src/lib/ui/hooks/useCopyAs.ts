import { TLShapeId, assert, useMaybeEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TLCopyType, copyAs } from '../../utils/export/copyAs'
import { useToasts } from '../context/toasts'
import { useTranslation } from './useTranslation/useTranslation'

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
					title: msg('toast.error.copy-fail.title'),
					description: msg('toast.error.copy-fail.desc'),
				})
			})
		},
		[editor, addToast, msg]
	)
}
