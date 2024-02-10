import { TLFrameShape, useEditor, useValue } from '@tldraw/editor'
import { useAllowGroup, useAllowUngroup } from '../../hooks/menuHelpers'
import { useActions } from '../../hooks/useActions'
import { useHasLinkShapeSelected } from '../../hooks/useHasLinkShapeSelected'
import { useShowAutoSizeToggle } from '../../hooks/useShowAutoSizeToggle'
import { useUnlockedSelectedShapesCount } from '../../hooks/useUnlockedSelectedShapesCount'
import { TldrawUiMenuCheckboxItem } from './TldrawUiMenuCheckboxItem'
import { TldrawUiMenuItem } from './TldrawUiMenuItem'

/* -------------------- Selection ------------------- */

export function ToggleAutoSizeMenuItem() {
	const actions = useActions()
	const shouldDisplay = useShowAutoSizeToggle()
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem actionItem={actions['toggle-auto-size']} />
}

export function EditLinkMenuItem() {
	const actions = useActions()
	const shouldDisplay = useHasLinkShapeSelected()
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem actionItem={actions['edit-link']} />
}

export function DuplicateMenuItem() {
	const actions = useActions()
	const shouldDisplay = useUnlockedSelectedShapesCount(1)
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem actionItem={actions['duplicate']} />
}

export function GroupMenuItem() {
	const actions = useActions()
	const shouldDisplay = useAllowGroup()
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem actionItem={actions['group']} />
}

export function UngroupMenuItem() {
	const actions = useActions()
	const shouldDisplay = useAllowUngroup()
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem actionItem={actions['ungroup']} />
}

export function RemoveFrameMenuItem() {
	const editor = useEditor()
	const actions = useActions()
	const shouldDisplay = useValue(
		'allow unframe',
		() => {
			const selectedShapes = editor.getSelectedShapes()
			if (selectedShapes.length === 0) return false
			return selectedShapes.every((shape) => editor.isShapeOfType<TLFrameShape>(shape, 'frame'))
		},
		[editor]
	)
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem actionItem={actions['remove-frame']} />
}

export function FitFrameToContentMenuItem() {
	const editor = useEditor()
	const actions = useActions()
	const shouldDisplay = useValue(
		'allow fit frame to content',
		() => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape) return false
			return editor.getSortedChildIdsForParent(onlySelectedShape).length > 0
		},
		[editor]
	)
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem actionItem={actions['fit-frame-to-content']} />
}

export function ToggleLockMenuItem() {
	const editor = useEditor()
	const actions = useActions()
	const shouldDisplay = useValue('selected shapes', () => editor.getSelectedShapes().length > 0, [
		editor,
	])
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem actionItem={actions['toggle-lock']} />
}

export function ToggleTransparentBgMenuItem() {
	const actions = useActions()
	const editor = useEditor()
	const isTransparentBg = useValue(
		'isTransparentBg',
		() => editor.getInstanceState().exportBackground,
		[editor]
	)
	return (
		<TldrawUiMenuCheckboxItem
			actionItem={actions['toggle-transparent']}
			checked={isTransparentBg}
		/>
	)
}
