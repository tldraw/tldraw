import {
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { Editor, TLHandle, TLSelectionHandle, TLShape, Vec } from 'tldraw'
import {
	createInitialSceneStateMap,
	DEFAULT_SCENE_ID,
	getSceneDefinition,
	sceneDefinitions,
} from './SceneRegistry'
import { AnySceneDefinition, SceneBridge, SceneScreenPoint } from './types'

interface SceneSystemContextValue {
	editor: Editor | null
	scenes: AnySceneDefinition[]
	currentScene: AnySceneDefinition
	currentSceneId: string
	setCurrentSceneId(sceneId: string): void
	currentSceneState: unknown
	setCurrentSceneState(next: unknown | ((prev: unknown) => unknown)): void
	bridge: SceneBridge
}

/**
 * Determine the correct pointer event target for a page point.
 * Checks shape handles (arrow endpoints, etc.), then selection handles,
 * then shapes, then falls back to canvas.
 */
function getPointerTarget(
	editor: Editor,
	pagePoint: { x: number; y: number }
):
	| { target: 'canvas' }
	| { target: 'shape'; shape: TLShape }
	| { target: 'selection'; handle: TLSelectionHandle }
	| { target: 'handle'; shape: TLShape; handle: TLHandle } {
	const selectedIds = editor.getSelectedShapeIds()

	// Check shape-specific handles first (e.g. arrow endpoint/bend handles).
	// These belong to the only-selected shape and take priority over
	// selection-bounds handles.
	if (selectedIds.length === 1) {
		const shape = editor.getShape(selectedIds[0])
		if (shape) {
			const handles = editor.getShapeHandles(shape)
			if (handles) {
				const transform = editor.getShapePageTransform(shape)
				const zoom = editor.getZoomLevel()
				const handleMargin = 14 / zoom
				for (const handle of handles) {
					if (handle.type === 'virtual') continue
					const handlePage = transform.applyToPoint(handle)
					if (
						Math.abs(pagePoint.x - handlePage.x) < handleMargin &&
						Math.abs(pagePoint.y - handlePage.y) < handleMargin
					) {
						return { target: 'handle', shape, handle }
					}
				}
				// Include virtual handles with a smaller hit area so they don't
				// shadow the vertex handles but can still be grabbed to create
				// new bend points on arrows.
				const virtualMargin = 10 / zoom
				for (const handle of handles) {
					if (handle.type !== 'virtual') continue
					const handlePage = transform.applyToPoint(handle)
					if (
						Math.abs(pagePoint.x - handlePage.x) < virtualMargin &&
						Math.abs(pagePoint.y - handlePage.y) < virtualMargin
					) {
						return { target: 'handle', shape, handle }
					}
				}
			}
		}
	}

	// Check selection handles if there's a selection
	if (selectedIds.length > 0) {
		const selBounds = editor.getSelectionRotatedPageBounds()
		if (selBounds) {
			const zoom = editor.getZoomLevel()
			const handleMargin = 12 / zoom
			const rotateMargin = 20 / zoom

			// Expand bounds to include handle zones
			const expanded = selBounds.clone().expandBy(rotateMargin)
			if (expanded.containsPoint(new Vec(pagePoint.x, pagePoint.y))) {
				const { x, y, w, h } = selBounds
				const corners: [TLSelectionHandle, number, number][] = [
					['top_left', x, y],
					['top_right', x + w, y],
					['bottom_left', x, y + h],
					['bottom_right', x + w, y + h],
				]

				// Check rotation handles (outside corners)
				for (const [handle, cx, cy] of corners) {
					const dx = pagePoint.x - cx
					const dy = pagePoint.y - cy
					const dist = Math.sqrt(dx * dx + dy * dy)
					if (dist > handleMargin && dist < rotateMargin) {
						const rotateHandle = (handle + '_rotate') as TLSelectionHandle
						return { target: 'selection', handle: rotateHandle }
					}
				}

				// Check resize corner handles
				for (const [handle, cx, cy] of corners) {
					if (
						Math.abs(pagePoint.x - cx) < handleMargin &&
						Math.abs(pagePoint.y - cy) < handleMargin
					) {
						return { target: 'selection', handle }
					}
				}

				// Check resize edge handles — these span the full edge length
				const px = pagePoint.x
				const py = pagePoint.y
				if (Math.abs(py - y) < handleMargin && px > x + handleMargin && px < x + w - handleMargin) {
					return { target: 'selection', handle: 'top' }
				}
				if (
					Math.abs(py - (y + h)) < handleMargin &&
					px > x + handleMargin &&
					px < x + w - handleMargin
				) {
					return { target: 'selection', handle: 'bottom' }
				}
				if (Math.abs(px - x) < handleMargin && py > y + handleMargin && py < y + h - handleMargin) {
					return { target: 'selection', handle: 'left' }
				}
				if (
					Math.abs(px - (x + w)) < handleMargin &&
					py > y + handleMargin &&
					py < y + h - handleMargin
				) {
					return { target: 'selection', handle: 'right' }
				}
			}
		}
	}

	// Check shapes
	const hitShape = editor.getShapeAtPoint(new Vec(pagePoint.x, pagePoint.y), {
		hitInside: true,
		margin: 0,
	})
	if (hitShape) {
		return { target: 'shape', shape: hitShape }
	}

	return { target: 'canvas' }
}

const SceneSystemContext = createContext<SceneSystemContextValue | null>(null)

export function SceneProvider({
	editor,
	children,
}: {
	editor: Editor | null
	children: ReactNode
}) {
	const [currentSceneId, setCurrentSceneId] = useState(DEFAULT_SCENE_ID)
	const [sceneStates, setSceneStates] = useState(createInitialSceneStateMap)

	const currentScene = useMemo(() => getSceneDefinition(currentSceneId), [currentSceneId])

	const setCurrentSceneState = useCallback(
		(next: unknown | ((prev: unknown) => unknown)) => {
			setSceneStates((prev) => {
				const previousState = prev[currentSceneId]
				const nextState =
					typeof next === 'function' ? (next as (prev: unknown) => unknown)(previousState) : next

				if (Object.is(previousState, nextState)) return prev
				return {
					...prev,
					[currentSceneId]: nextState,
				}
			})
		},
		[currentSceneId]
	)

	// Auto-switch to the flat scene while the user is editing a shape's text,
	// then return to the previous scene when editing ends. The real tldraw
	// contenteditable lives in the hidden canvas and can't be interacted with
	// from inside a 3D scene's cloned DOM.
	const preEditSceneRef = useRef<string | null>(null)
	useEffect(() => {
		if (!editor) return
		let isEditing = editor.getEditingShapeId() !== null
		return editor.store.listen(
			() => {
				const nowEditing = editor.getEditingShapeId() !== null
				if (nowEditing === isEditing) return
				isEditing = nowEditing
				if (nowEditing) {
					setCurrentSceneId((id) => {
						if (id === 'flat') return id
						preEditSceneRef.current = id
						return 'flat'
					})
				} else {
					const prev = preEditSceneRef.current
					preEditSceneRef.current = null
					if (prev) setCurrentSceneId(prev)
				}
			},
			{ scope: 'session' }
		)
	}, [editor])

	// Track the dispatch target established on pointer_down so move/up use the same target
	const activeTargetRef = useRef<
		| { target: 'canvas' }
		| { target: 'shape'; shape: TLShape }
		| { target: 'selection'; handle: TLSelectionHandle }
		| { target: 'handle'; shape: TLShape; handle: TLHandle }
		| null
	>(null)

	const dispatchPointer = useCallback(
		(event: PointerEvent, point: SceneScreenPoint) => {
			if (!editor) return

			editor.markEventAsHandled(event)
			event.preventDefault()
			event.stopPropagation()

			const pointerInfo = {
				point: { x: point.x, y: point.y, z: point.z ?? event.pressure },
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				ctrlKey: event.metaKey || event.ctrlKey,
				metaKey: event.metaKey,
				accelKey: event.ctrlKey || event.metaKey,
				pointerId: event.pointerId,
				button: event.button,
				isPen: event.pointerType === 'pen',
			}

			if (event.type === 'pointerdown') {
				editor.focus()

				if (event.button === 2) {
					editor.dispatch({
						type: 'pointer',
						target: 'canvas',
						name: 'right_click',
						...pointerInfo,
					})
					return
				}

				if (event.button !== 0 && event.button !== 1 && event.button !== 5) return

				// Determine the correct event target for this interaction
				const pagePoint = editor.screenToPage(point)
				const target = getPointerTarget(editor, pagePoint)
				activeTargetRef.current = target

				editor.dispatch({
					type: 'pointer',
					name: 'pointer_down',
					...target,
					...pointerInfo,
				})
				return
			}

			if (
				event.type === 'pointerup' &&
				event.button !== 0 &&
				event.button !== 1 &&
				event.button !== 2 &&
				event.button !== 5
			) {
				return
			}

			const name = event.type === 'pointerup' ? ('pointer_up' as const) : ('pointer_move' as const)

			// Use the target from pointer_down for move/up, fall back to canvas
			const target = activeTargetRef.current ?? { target: 'canvas' as const }

			editor.dispatch({
				type: 'pointer',
				name,
				...target,
				...pointerInfo,
			})

			if (event.type === 'pointerup') {
				activeTargetRef.current = null
			}
		},
		[editor]
	)

	const dispatchWheel = useCallback(
		(event: WheelEvent, point: SceneScreenPoint) => {
			if (!editor) return

			editor.markEventAsHandled(event)
			event.preventDefault()
			event.stopPropagation()

			editor.dispatch({
				type: 'wheel',
				name: 'wheel',
				delta: { x: event.deltaX, y: event.deltaY, z: 0 },
				point: { x: point.x, y: point.y, z: point.z ?? 0 },
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				ctrlKey: event.metaKey || event.ctrlKey,
				metaKey: event.metaKey,
				accelKey: event.ctrlKey || event.metaKey,
			})
		},
		[editor]
	)

	const bridge = useMemo<SceneBridge>(
		() => ({
			editor,
			dispatchPointer,
			dispatchWheel,
		}),
		[editor, dispatchPointer, dispatchWheel]
	)

	const value = useMemo<SceneSystemContextValue>(
		() => ({
			editor,
			scenes: sceneDefinitions,
			currentScene,
			currentSceneId,
			setCurrentSceneId,
			currentSceneState: sceneStates[currentScene.id],
			setCurrentSceneState,
			bridge,
		}),
		[
			bridge,
			currentScene,
			currentSceneId,
			editor,
			sceneStates,
			setCurrentSceneId,
			setCurrentSceneState,
		]
	)

	return <SceneSystemContext.Provider value={value}>{children}</SceneSystemContext.Provider>
}

export function useSceneSystem() {
	const value = useContext(SceneSystemContext)
	if (!value) {
		throw new Error('useSceneSystem must be used within a SceneProvider')
	}

	return value
}
