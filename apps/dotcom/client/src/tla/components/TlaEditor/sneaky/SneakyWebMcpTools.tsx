import { useEffect } from 'react'
import { useEditor, useValue } from 'tldraw'
import { useMaybeApp } from '../../../hooks/useAppState'
import { registerWebMcpTools } from '../../../utils/webMcp'

export function SneakyWebMcpTools() {
	const editor = useEditor()
	const userId = useMaybeApp()?.userId
	const canEdit = useValue('can edit', () => !editor.getIsReadonly(), [editor])

	useEffect(() => registerWebMcpTools(editor, { canEdit, userId }), [editor, canEdit, userId])

	return null
}
