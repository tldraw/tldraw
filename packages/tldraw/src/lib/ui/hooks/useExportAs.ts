import { TLShapeId, useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TLExportType, exportAs } from '../../utils/export/exportAs'
import { useToasts } from './useToastsProvider'
import { useTranslation } from './useTranslation/useTranslation'

/** @public */
export function useExportAs() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const msg = useTranslation()

	return useCallback(
		(ids: TLShapeId[], format: TLExportType = 'png') => {
			exportAs(editor, ids, format, {
				scale: 1,
				background: editor.getInstanceState().exportBackground,
			}).catch((e) => {
				console.error(e.message)
				addToast({
					id: 'export-fail',
					// icon: 'error',
					title: msg('toast.error.export-fail.title'),
					description: msg('toast.error.export-fail.desc'),
				})
			})
		},
		[editor, addToast, msg]
	)
}
