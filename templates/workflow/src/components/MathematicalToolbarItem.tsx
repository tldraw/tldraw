import {
	TlPopover,
	TlPopoverContent,
	TlPopoverTrigger,
	TlToolbar,
	TlToolbarButton,
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
		<TlPopover
			id={MATH_MENU_ID}
			open={isOpen}
			onOpenChange={() => {
				tlmenus.addOpenMenu(MATH_MENU_ID, editor.contextId)
			}}
		>
			<TlPopoverTrigger>
				<TlToolbarButton
					aria-label={labelStr}
					data-testid={`tools.${id}`}
					data-value={id}
					title={labelStr}
					type="tool"
				>
					<MathematicalIcon />
				</TlToolbarButton>
			</TlPopoverTrigger>
			<TlPopoverContent side="right" align="center">
				<TlToolbar label={labelStr} id={`${id}_math`}>
					<ToolbarItem tool="node-add" />
					<ToolbarItem tool="node-subtract" />
					<ToolbarItem tool="node-multiply" />
					<ToolbarItem tool="node-divide" />
				</TlToolbar>
			</TlPopoverContent>
		</TlPopover>
	)
}
