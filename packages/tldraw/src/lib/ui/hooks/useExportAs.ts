import { TLExportType, TLShapeId, assert, useMaybeEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { exportAs } from '../../utils/export/exportAs'
import { useToasts } from '../context/toasts'
import { useTranslation } from './useTranslation/useTranslation'

/** @public */
export function useExportAs() {
	const editor = useMaybeEditor()
	const { addToast } = useToasts()
	const msg = useTranslation()

	return useCallback(
		(ids: TLShapeId[], format: TLExportType = 'png', name: string | undefined) => {
			assert(editor, 'useExportAs: editor is required')
			exportAs(editor, ids, {
				format,
				name,
				scale: 1,
			}).catch((e) => {
				console.error(e.message)
				addToast({
					id: 'export-fail',
					title: msg('toast.error.export-fail.title'),
					description: msg('toast.error.export-fail.desc'),
					severity: 'error',
				})
			})
		},
		[editor, addToast, msg]
	)
}
