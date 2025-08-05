import {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	TldrawUiToolbar,
	TldrawUiToolbarButton,
	tlmenus,
	ToolbarItem,
	useEditor,
	useValue,
} from 'tldraw'
import { MathematicalIcon } from './icons/MathematicalIcon'

export const MATH_MENU_ID = 'toolbar mathematical'

// Custom toolbar item that provides mathematical operation nodeslity
export function MathematicalToolbarItem() {
	const id = 'mathematical'
	const labelStr = 'Math'
	const editor = useEditor()
	const isOpen = useValue('isOpen', () => tlmenus.isMenuOpen(MATH_MENU_ID, editor.contextId), [
		editor,
	])

	return (
		<TldrawUiPopover
			id={MATH_MENU_ID}
			open={isOpen}
			onOpenChange={() => {
				tlmenus.addOpenMenu(MATH_MENU_ID, editor.contextId)
			}}
		>
			<TldrawUiPopoverTrigger>
				<TldrawUiToolbarButton
					aria-label={labelStr}
					data-testid={`tools.${id}`}
					data-value={id}
					title={labelStr}
					type="tool"
				>
					<MathematicalIcon />
				</TldrawUiToolbarButton>
			</TldrawUiPopoverTrigger>
			<TldrawUiPopoverContent side="right" align="center">
				<TldrawUiToolbar label={labelStr} id={`${id}_math`}>
					<ToolbarItem tool="node-add" />
					<ToolbarItem tool="node-subtract" />
					<ToolbarItem tool="node-multiply" />
					<ToolbarItem tool="node-divide" />
				</TldrawUiToolbar>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}
