import { useState } from 'react'
import {
	TldrawUiMenuContextProvider,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	TldrawUiToolbar,
	TldrawUiToolbarButton,
	tlmenus,
	useEditor,
} from 'tldraw'
import { AddNode } from '../nodes/types/AddNode'
import { DivideNode } from '../nodes/types/DivideNode'
import { MultiplyNode } from '../nodes/types/MultiplyNode'
import { SubtractNode } from '../nodes/types/SubtractNode'
import { CreateNodeToolbarButton } from './CreateNodeToobarButton'
import { MathematicalIcon } from './icons/MathematicalIcon'

// Custom toolbar item that provides mathematical operation nodeslity
export function MathematicalToolbarItem() {
	const id = 'mathematical'
	const labelStr = 'Math'
	const popoverId = 'toolbar mathematical'
	const [isOpen, setIsOpen] = useState(false)
	const editor = useEditor()

	const onClose = () => setIsOpen(false)

	return (
		<TldrawUiPopover id={popoverId} open={isOpen} onOpenChange={setIsOpen}>
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
				<TldrawUiToolbar
					className="tlui-buttons__grid"
					data-testid="tools.math-options"
					label={labelStr}
					id={`${id}_math`}
					onClick={() => {
						// Close the menu when a tool is selected
						tlmenus.deleteOpenMenu(popoverId, editor.contextId)
						setIsOpen(false)
					}}
				>
					<TldrawUiMenuContextProvider type="toolbar-overflow" sourceId="toolbar">
						<CreateNodeToolbarButton definition={AddNode} onClose={onClose} type="menu" />
						<CreateNodeToolbarButton definition={SubtractNode} onClose={onClose} type="menu" />
						<CreateNodeToolbarButton definition={MultiplyNode} onClose={onClose} type="menu" />
						<CreateNodeToolbarButton definition={DivideNode} onClose={onClose} type="menu" />
					</TldrawUiMenuContextProvider>
				</TldrawUiToolbar>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}
