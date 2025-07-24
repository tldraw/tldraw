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
import { ComponentMenuContent } from './ComponentMenuContent'
import { MathematicalIcon } from './icons/MathematicalIcon'

export function MathematicalToolbarItem() {
	const id = 'mathematical'
	const labelStr = 'Math'
	const popoverId = 'toolbar mathematical'
	const [isOpen, setIsOpen] = useState(false)
	const editor = useEditor()

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
						tlmenus.deleteOpenMenu(popoverId, editor.contextId)
						setIsOpen(false)
					}}
				>
					<TldrawUiMenuContextProvider type="toolbar-overflow" sourceId="toolbar">
						<ComponentMenuContent hideLabels />
					</TldrawUiMenuContextProvider>
				</TldrawUiToolbar>
			</TldrawUiPopoverContent>
		</TldrawUiPopover>
	)
}
