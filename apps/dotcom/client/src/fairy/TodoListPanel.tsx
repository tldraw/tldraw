import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { TldrawUiButton, TldrawUiButtonIcon, TldrawUiIcon, useValue } from 'tldraw'
import { F, useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { $showCanvasTodos } from './SharedTodoList'
import { SharedTodoListInline } from './SharedTodoListInline'
import { TodoListDropdownContent } from './TodoListDropdownContent'

interface TodoListPanelProps {
	agents: FairyAgent[]
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
}

export function TodoListPanel({
	agents,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
}: TodoListPanelProps) {
	const showCanvasTodos = useValue('show-canvas-todos', () => $showCanvasTodos.get(), [
		$showCanvasTodos,
	])
	const showTodosOnCanvas = useMsg(fairyMessages.showTodosOnCanvas)
	const hideTodosOnCanvas = useMsg(fairyMessages.hideTodosOnCanvas)

	return (
		<div className="fairy-info-view">
			<div className="fairy-toolbar-header">
				{/* Todo Menu Button */}
				<_DropdownMenu.Root dir="ltr" open={menuPopoverOpen} onOpenChange={onMenuPopoverOpenChange}>
					<_DropdownMenu.Trigger asChild dir="ltr">
						<TldrawUiButton type="icon" className="fairy-toolbar-button">
							<TldrawUiButtonIcon icon="menu" />
						</TldrawUiButton>
					</_DropdownMenu.Trigger>
					<TodoListDropdownContent agents={agents} alignOffset={4} sideOffset={4} side="bottom" />
				</_DropdownMenu.Root>

				{/* Todo List Label */}
				<div className="fairy-id-display">
					<F defaultMessage="Todo list" />
				</div>

				{/* Toggle Canvas Todos */}
				<TldrawUiButton
					type="icon"
					className="fairy-toolbar-button"
					onClick={() => $showCanvasTodos.update((v) => !v)}
				>
					<TldrawUiIcon
						icon={showCanvasTodos ? 'toggle-on' : 'toggle-off'}
						label={showCanvasTodos ? hideTodosOnCanvas : showTodosOnCanvas}
					/>
				</TldrawUiButton>
			</div>
			<SharedTodoListInline agents={agents} />
		</div>
	)
}
