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
					title: msg('toast.error.export-fail.title'),
					description: msg('toast.error.export-fail.desc'),
					severity: 'error',
				})
			})
		},
		[editor, addToast, msg]
	)
}
