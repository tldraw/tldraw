import { SmallSpinner } from '@tldraw/fairy-shared'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { ReactNode } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useEditor,
	useValue,
} from 'tldraw'
import { useMsg } from '../tla/utils/i18n'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'
import { fairyMessages } from './fairy-messages'
import { FairyMenuContent } from './FairyMenuContent'
import { $showCanvasFairyTasks } from './FairyTaskList'
import { FairyTaskListMenuContent } from './FairyTaskListMenuContent'

interface FairyPanelHeaderProps {
	agents: FairyAgent[]
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	onClickTodoList(): void
	/** Optional components to display in the center of the header */
	children?: ReactNode
}

export function FairyPanelHeader({
	agents,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
	onClickTodoList,
	children,
}: FairyPanelHeaderProps) {
	const editor = useEditor()
	const showCanvasTasks = useValue('show-canvas-tasks', () => $showCanvasFairyTasks.get(), [
		$showCanvasFairyTasks,
	])
	const showTasksOnCanvas = useMsg(fairyMessages.showTasksOnCanvas)
	const hideTasksOnCanvas = useMsg(fairyMessages.hideTasksOnCanvas)

	return (
		<div className="fairy-toolbar-header">
			<_DropdownMenu.Root dir="ltr" open={menuPopoverOpen} onOpenChange={onMenuPopoverOpenChange}>
				<_DropdownMenu.Trigger asChild dir="ltr">
					<TldrawUiButton type="icon" className="fairy-toolbar-button">
						<TldrawUiButtonIcon icon="menu" />
					</TldrawUiButton>
				</_DropdownMenu.Trigger>
				<_DropdownMenu.Portal container={editor.getContainer()}>
					<_DropdownMenu.Content
						side="bottom"
						align="start"
						className="tlui-menu fairy-sidebar-dropdown"
						collisionPadding={4}
						alignOffset={4}
						sideOffset={4}
						onClick={(e) => e.stopPropagation()}
						style={{ zIndex: 'var(--tl-layer-canvas-in-front)' }}
					>
						<TldrawUiMenuContextProvider type="menu" sourceId="fairy-panel">
							<TldrawUiMenuGroup id="todo-list-menu">
								<TldrawUiMenuSubmenu id="todo-list" label="Todo List">
									<FairyTaskListMenuContent agents={agents} menuType="menu" />
								</TldrawUiMenuSubmenu>
								<TldrawUiMenuItem
									id="view-todo-list"
									onSelect={onClickTodoList}
									label="View Todo List"
								/>
								<TldrawUiMenuItem
									id="toggle-canvas-todos"
									onSelect={() => {
										$showCanvasFairyTasks.update((v) => !v)
									}}
									label={showCanvasTasks ? hideTasksOnCanvas : showTasksOnCanvas}
								/>
							</TldrawUiMenuGroup>
						</TldrawUiMenuContextProvider>
					</_DropdownMenu.Content>
				</_DropdownMenu.Portal>
			</_DropdownMenu.Root>

			{children}
		</div>
	)
}

interface SingleFairyHeaderContentProps {
	agent: FairyAgent
	config: any
}

export function SingleFairyHeaderContent({ agent, config }: SingleFairyHeaderContentProps) {
	return (
		<div className="fairy-id-display">
			{config && (
				<>
					{config.name}
					<div
						className="fairy-spinner-container"
						style={{
							visibility: agent.isGenerating() ? 'visible' : 'hidden',
						}}
					>
						<SmallSpinner />
					</div>
				</>
			)}
		</div>
	)
}

interface SingleFairyPanelHeaderProps {
	agent: FairyAgent
	menuPopoverOpen: boolean
	onMenuPopoverOpenChange(open: boolean): void
	onClickTodoList(): void
}

export function SingleFairyPanelHeader({
	agent,
	menuPopoverOpen,
	onMenuPopoverOpenChange,
	onClickTodoList,
}: SingleFairyPanelHeaderProps) {
	const editor = useEditor()
	const fairyConfig = useValue('fairy config', () => agent?.$fairyConfig.get(), [agent])
	const showCanvasTasks = useValue('show-canvas-tasks', () => $showCanvasFairyTasks.get(), [
		$showCanvasFairyTasks,
	])
	const showTasksOnCanvas = useMsg(fairyMessages.showTasksOnCanvas)
	const hideTasksOnCanvas = useMsg(fairyMessages.hideTasksOnCanvas)

	return (
		<div className="fairy-toolbar-header">
			<_DropdownMenu.Root dir="ltr" open={menuPopoverOpen} onOpenChange={onMenuPopoverOpenChange}>
				<_DropdownMenu.Trigger asChild dir="ltr">
					<TldrawUiButton type="icon" className="fairy-toolbar-button">
						<TldrawUiButtonIcon icon="menu" />
					</TldrawUiButton>
				</_DropdownMenu.Trigger>
				<_DropdownMenu.Portal container={editor.getContainer()}>
					<_DropdownMenu.Content
						side="bottom"
						align="start"
						className="tlui-menu fairy-sidebar-dropdown"
						collisionPadding={4}
						alignOffset={4}
						sideOffset={4}
						onClick={(e) => e.stopPropagation()}
						style={{ zIndex: 'var(--tl-layer-canvas-in-front)' }}
					>
						<TldrawUiMenuContextProvider type="menu" sourceId="fairy-panel">
							<FairyMenuContent agent={agent} menuType="menu" />
							<TldrawUiMenuGroup id="todo-list-menu">
								<TldrawUiMenuItem
									id="view-todo-list"
									onSelect={onClickTodoList}
									label="View Todo List"
								/>
								<TldrawUiMenuItem
									id="toggle-canvas-todos"
									onSelect={() => {
										$showCanvasFairyTasks.update((v) => !v)
									}}
									label={showCanvasTasks ? hideTasksOnCanvas : showTasksOnCanvas}
								/>
							</TldrawUiMenuGroup>
						</TldrawUiMenuContextProvider>
					</_DropdownMenu.Content>
				</_DropdownMenu.Portal>
			</_DropdownMenu.Root>

			<div className="fairy-id-display">
				{fairyConfig && (
					<>
						{fairyConfig.name}
						<div
							className="fairy-spinner-container"
							style={{
								visibility: agent.isGenerating() ? 'visible' : 'hidden',
							}}
						>
							<SmallSpinner />
						</div>
					</>
				)}
			</div>
		</div>
	)
}
