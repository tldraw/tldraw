import { TLShapeId, useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TLExportType, exportAs } from '../../utils/export/exportAs'
import { useToasts } from '../context/toasts'
import { useTranslation } from './useTranslation/useTranslation'

/** @public */
export function useExportAs() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const msg = useTranslation()

	return useCallback(
		(ids: TLShapeId[], format: TLExportType = 'png', name: string | undefined) => {
			exportAs(editor, ids, format, name, {
				scale: 1,
				background: editor.getInstanceState().exportBackground,
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
