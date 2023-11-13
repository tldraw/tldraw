import { TLShapeId, useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TLCopyType, copyAs } from '../../utils/export/copyAs'
import { useToasts } from './useToastsProvider'
import { useTranslation } from './useTranslation/useTranslation'

/** @public */
export function useCopyAs() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const msg = useTranslation()

	return useCallback(
		(ids: TLShapeId[], format: TLCopyType = 'svg') => {
			copyAs(editor, ids, format).catch(() => {
				addToast({
					id: 'copy-fail',
					icon: 'warning-triangle',
					title: msg('toast.error.copy-fail.title'),
					description: msg('toast.error.copy-fail.desc'),
				})
			})
		},
		[editor, addToast, msg]
	)
}
