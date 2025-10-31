import { StateNode, TLKeyboardEventInfo } from 'tldraw'
import { $sharedTodoList } from './SharedTodoList'

export class TodoDragTool extends StateNode {
	static override id = 'todo-drag'
	static override children() {
		return [PointingState, DraggingState]
	}
	static override initial = 'pointing'

	static override isLockable = false

	todoId: number | null = null

	override onEnter() {
		this.setCurrentToolIdMask('select')
	}

	override onExit() {
		this.editor.setCursor({ type: 'default', rotation: 0 })
	}

	setTodoId(todoId: number) {
		this.todoId = todoId
	}
}

class PointingState extends StateNode {
	static override id = 'pointing'

	override onPointerDown() {
		// User clicked on canvas - transition to dragging
		this.parent.transition('dragging')
	}

	override onPointerMove() {
		// User started moving while pointing - transition to dragging
		this.parent.transition('dragging')
	}

	override onPointerUp() {
		// User released without interacting - cancel the tool
		this.editor.setCurrentTool('select')
	}

	override onKeyDown(info: TLKeyboardEventInfo): void {
		if (info.key === 'Escape') {
			this.editor.setCurrentTool('select')
		}
	}
}

class DraggingState extends StateNode {
	static override id = 'dragging'

	override onEnter() {
		// Update cursor to show dragging
		this.editor.setCursor({ type: 'grab', rotation: 0 })
	}

	override onPointerMove() {
		const tool = this.parent as TodoDragTool
		if (tool.todoId === null) return

		// Get current pointer position and convert to page space
		const screenPoint = this.editor.inputs.currentScreenPoint
		const { screenBounds } = this.editor.getInstanceState()
		const pagePoint = this.editor.screenToPage({
			x: screenPoint.x + screenBounds.x,
			y: screenPoint.y + screenBounds.y,
		})

		// Update todo coordinates continuously during drag
		$sharedTodoList.update((todos) =>
			todos.map((t) => (t.id === tool.todoId ? { ...t, x: pagePoint.x, y: pagePoint.y } : t))
		)
	}

	override onPointerUp() {
		// Return to select tool (coordinates already updated in onPointerMove)
		this.editor.setCurrentTool('select')
	}

	override onKeyDown(info: TLKeyboardEventInfo): void {
		if (info.key === 'Escape') {
			this.editor.setCurrentTool('select')
		}
	}
}
