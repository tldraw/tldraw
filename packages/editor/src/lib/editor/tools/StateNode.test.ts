import { createTLStore } from '../../config/createTLStore'
import { Editor } from '../Editor'
import { StateNode } from './StateNode'

describe('StateNode.addChild', () => {
	// Test state node classes for addChild tests
	class ParentState extends StateNode {
		static override id = 'parent'
		static override initial = 'child1'
		static override children() {
			return [ChildState1]
		}
	}

	class ChildState1 extends StateNode {
		static override id = 'child1'
	}

	class ChildState2 extends StateNode {
		static override id = 'child2'
	}

	class ChildState3 extends StateNode {
		static override id = 'child3'
	}

	class LeafState extends StateNode {
		static override id = 'leaf'
	}

	class RootState extends StateNode {
		static override id = 'root'
		static override initial = 'child1'
		static override children() {
			return [ChildState1]
		}
	}

	class RootStateWithoutChildren extends StateNode {
		static override id = 'rootWithoutChildren'
	}

	let editor: Editor

	beforeEach(() => {
		editor = new Editor({
			initialState: 'parent',
			shapeUtils: [],
			bindingUtils: [],
			tools: [
				ParentState,
				ChildState1,
				ChildState2,
				ChildState3,
				LeafState,
				RootState,
				RootStateWithoutChildren,
			],
			store: createTLStore({ shapeUtils: [], bindingUtils: [] }),
			getContainer: () => document.body,
		})
	})

	it('should add a child to a branch state node', () => {
		const parentState = editor.root.children!['parent'] as ParentState

		// Initially should have one child
		expect(Object.keys(parentState.children!)).toHaveLength(1)
		expect(parentState.children!['child1']).toBeDefined()

		// Add a new child
		parentState.addChild(ChildState2)

		// Should now have two children
		expect(Object.keys(parentState.children!)).toHaveLength(2)
		expect(parentState.children!['child1']).toBeDefined()
		expect(parentState.children!['child2']).toBeDefined()
		expect(parentState.children!['child2']).toBeInstanceOf(ChildState2)
	})

	it('should add a child to a root state node', () => {
		const rootState = editor.root.children!['root'] as RootState

		// Initially should have one child
		expect(Object.keys(rootState.children!)).toHaveLength(1)
		expect(rootState.children!['child1']).toBeDefined()

		// Add a new child
		rootState.addChild(ChildState2)

		// Should now have two children
		expect(Object.keys(rootState.children!)).toHaveLength(2)
		expect(rootState.children!['child1']).toBeDefined()
		expect(rootState.children!['child2']).toBeDefined()
		expect(rootState.children!['child2']).toBeInstanceOf(ChildState2)
	})

	it('should throw an error when trying to add a child to a leaf state node', () => {
		const leafState = editor.root.children!['leaf'] as LeafState

		// Leaf state should not have children
		expect(leafState.children).toBeUndefined()

		// Should throw an error when trying to add a child
		expect(() => {
			leafState.addChild(ChildState2)
		}).toThrow('StateNode.addChild: cannot add child to a leaf node')
	})

	it('should return the parent state node for chaining', () => {
		const parentState = editor.root.children!['parent'] as ParentState

		const result = parentState.addChild(ChildState2)

		expect(result).toBe(parentState)
	})

	it('should create the child with the correct editor and parent', () => {
		const parentState = editor.root.children!['parent'] as ParentState

		parentState.addChild(ChildState2)
		const childState = parentState.children!['child2'] as ChildState2

		expect(childState.editor).toBe(editor)
		expect(childState.parent).toBe(parentState)
	})

	it('should allow adding multiple children', () => {
		const parentState = editor.root.children!['parent'] as ParentState

		// Add multiple children
		parentState.addChild(ChildState2).addChild(ChildState3)

		// Should have three children
		expect(Object.keys(parentState.children!)).toHaveLength(3)
		expect(parentState.children!['child1']).toBeDefined()
		expect(parentState.children!['child2']).toBeDefined()
		expect(parentState.children!['child3']).toBeDefined()
		expect(parentState.children!['child2']).toBeInstanceOf(ChildState2)
		expect(parentState.children!['child3']).toBeInstanceOf(ChildState3)
	})

	it('should allow transitioning to added children', () => {
		const parentState = editor.root.children!['parent'] as ParentState

		// Add a new child
		parentState.addChild(ChildState2)

		// Should be able to transition to the new child
		expect(() => {
			parentState.transition('child2')
		}).not.toThrow()

		// The current state should be the new child
		expect(parentState.getCurrent()?.id).toBe('child2')
	})

	it('should maintain existing children when adding new ones', () => {
		const parentState = editor.root.children!['parent'] as ParentState
		const originalChild = parentState.children!['child1']

		// Add a new child
		parentState.addChild(ChildState2)

		// Original child should still exist and be the same instance
		expect(parentState.children!['child1']).toBe(originalChild)
		expect(parentState.children!['child1']).toBeInstanceOf(ChildState1)
	})

	it('should initialize children object for root nodes without static children', () => {
		// Create a StateNode directly as a root node (no parent)
		const mockEditor = {} as Editor
		const rootStateWithoutChildren = new RootStateWithoutChildren(mockEditor, undefined)

		// Root state without static children should not have children initially
		expect(rootStateWithoutChildren.children).toBeUndefined()

		// Adding a child should initialize the children object
		rootStateWithoutChildren.addChild(ChildState2)

		// Should now have children object with the added child
		expect(rootStateWithoutChildren.children).toBeDefined()
		expect(Object.keys(rootStateWithoutChildren.children!)).toHaveLength(1)
		expect(rootStateWithoutChildren.children!['child2']).toBeDefined()
		expect(rootStateWithoutChildren.children!['child2']).toBeInstanceOf(ChildState2)
	})

	it('should throw an error when trying to add a child with a duplicate ID', () => {
		const parentState = editor.root.children!['parent'] as ParentState

		// Initially should have one child
		expect(Object.keys(parentState.children!)).toHaveLength(1)
		expect(parentState.children!['child1']).toBeDefined()

		// Should throw an error when trying to add a child with the same ID
		expect(() => {
			parentState.addChild(ChildState1)
		}).toThrow("StateNode.addChild: a child with id 'child1' already exists")

		// Should still have only one child
		expect(Object.keys(parentState.children!)).toHaveLength(1)
		expect(parentState.children!['child1']).toBeDefined()
	})

	it('should throw an error when trying to add a child with a duplicate ID to a root state', () => {
		const rootState = editor.root.children!['root'] as RootState

		// Initially should have one child
		expect(Object.keys(rootState.children!)).toHaveLength(1)
		expect(rootState.children!['child1']).toBeDefined()

		// Should throw an error when trying to add a child with the same ID
		expect(() => {
			rootState.addChild(ChildState1)
		}).toThrow("StateNode.addChild: a child with id 'child1' already exists")

		// Should still have only one child
		expect(Object.keys(rootState.children!)).toHaveLength(1)
		expect(rootState.children!['child1']).toBeDefined()
	})

	it('should throw an error when trying to add a child with a duplicate ID to a root state without static children', () => {
		// Create a StateNode directly as a root node (no parent)
		const mockEditor = {} as Editor
		const rootStateWithoutChildren = new RootStateWithoutChildren(mockEditor, undefined)

		// Add a child first
		rootStateWithoutChildren.addChild(ChildState1)

		// Should throw an error when trying to add a child with the same ID
		expect(() => {
			rootStateWithoutChildren.addChild(ChildState1)
		}).toThrow("StateNode.addChild: a child with id 'child1' already exists")

		// Should still have only one child
		expect(Object.keys(rootStateWithoutChildren.children!)).toHaveLength(1)
		expect(rootStateWithoutChildren.children!['child1']).toBeDefined()
	})
})

describe('current tool id mask', () => {
	// Tool mask test classes
	class ToolA extends StateNode {
		static override id = 'A'
	}

	class ToolB extends StateNode {
		static override id = 'B'
	}

	class ToolC extends StateNode {
		static override id = 'C'

		override onEnter() {
			this.setCurrentToolIdMask('A')
		}
	}

	let toolMaskEditor: Editor

	beforeEach(() => {
		toolMaskEditor = new Editor({
			initialState: 'A',
			shapeUtils: [],
			bindingUtils: [],
			tools: [ToolA, ToolB, ToolC],
			store: createTLStore({ shapeUtils: [], bindingUtils: [] }),
			getContainer: () => document.body,
		})
	})

	it('starts with the correct tool id', () => {
		expect(toolMaskEditor.getCurrentToolId()).toBe('A')
	})

	it('updates the current tool id', () => {
		toolMaskEditor.setCurrentTool('B')
		expect(toolMaskEditor.getCurrentToolId()).toBe('B')
	})

	it('masks the current tool id', () => {
		toolMaskEditor.setCurrentTool('C')
		expect(toolMaskEditor.getCurrentToolId()).toBe('A')
	})
})
