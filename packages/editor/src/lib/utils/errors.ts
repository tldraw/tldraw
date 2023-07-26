import { TLUnknownShape } from '@tldraw/tlschema'
import { annotateError } from '@tldraw/utils'
import { Editor } from '../editor/Editor'

/** @public */
export function handleEditorError(
	editor: Editor,
	error: unknown,
	{
		origin,
		willCrashApp,
		tags,
		extras,
	}: {
		origin: string
		willCrashApp: boolean
		tags?: Record<string, string | boolean | number>
		extras?: Record<string, unknown>
	}
) {
	const defaultAnnotations = createEditorErrorAnnotations(editor, origin, willCrashApp)
	annotateError(error, {
		tags: { ...defaultAnnotations.tags, ...tags },
		extras: { ...defaultAnnotations.extras, ...extras },
	})
	if (willCrashApp) {
		editor.crash(error)
	}
}

/** @internal */
export function createEditorErrorAnnotations(
	editor: Editor,
	origin: string,
	willCrashApp: boolean | 'unknown'
): {
	tags: { origin: string; willCrashApp: boolean | 'unknown' }
	extras: {
		activeStateNode?: string
		selectedShapes?: TLUnknownShape[]
		editingShape?: TLUnknownShape
		inputs?: Record<string, unknown>
	}
} {
	try {
		return {
			tags: {
				origin: origin,
				willCrashApp,
			},
			extras: {
				activeStateNode: editor.root.path.value,
				selectedShapes: editor.selectedShapes,
				editingShape: editor.editingShapeId ? editor.getShape(editor.editingShapeId) : undefined,
				inputs: editor.inputs,
			},
		}
	} catch {
		return {
			tags: {
				origin: origin,
				willCrashApp,
			},
			extras: {},
		}
	}
}
