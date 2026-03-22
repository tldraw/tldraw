import { react } from '@tldraw/state'
import { useStateTracking, useValue } from '@tldraw/state-react'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { useEditorComponents } from '../hooks/EditorComponentsContext'
import { useEditor } from '../hooks/useEditor'
import { OptionalErrorBoundary } from './ErrorBoundary'
import { useShapeContainerManager } from './ShapeContainerManager'

/*
This component renders shapes on the canvas. All container positioning and
styling (transforms, z-index, opacity, clip-path, culling) is handled
imperatively by the ShapeContainerManager.

This component is only responsible for:
1. Registering its container refs with the manager
2. Rendering the shape's JSX content via its shape util's render method

The component receives only an id and util — no layout metadata. It does NOT
subscribe to the shape record reactively, so position/rotation/opacity changes
do not cause re-renders. InnerShape handles its own content reactivity.
*/
export const Shape = memo(function Shape({ id, util }: { id: TLShapeId; util: ShapeUtil }) {
	const editor = useEditor()
	const { ShapeErrorFallback, ShapeWrapper } = useEditorComponents()
	const manager = useShapeContainerManager()

	const containerRef = useRef<HTMLDivElement>(null)
	const bgContainerRef = useRef<HTMLDivElement>(null)

	// Read shape non-reactively for initial render and ShapeWrapper data attributes.
	// InnerShape handles its own reactive content updates.
	const shape = editor.getShape(id)

	// Load fonts required by this shape
	useEffect(() => {
		return react('load fonts', () => {
			const fonts = editor.fonts.getShapeFontFaces(id)
			editor.fonts.requestFonts(fonts)
		})
	}, [editor, id])

	// Register container refs with the imperative manager.
	// The manager handles all transform, z-index, opacity, clip-path, and
	// culling updates via reactive subscriptions — no React lifecycle needed.
	useLayoutEffect(() => {
		const container = containerRef.current
		if (!container) return

		manager.register(id, container, bgContainerRef.current)
		return () => {
			manager.unregister(id)
		}
	}, [manager, id])

	const annotateError = useCallback(
		(error: any) => editor.annotateError(error, { origin: 'shape', willCrashApp: false }),
		[editor]
	)

	if (!shape || !ShapeWrapper) return null

	return (
		<>
			{util.backgroundComponent && (
				<ShapeWrapper ref={bgContainerRef} shape={shape} isBackground={true}>
					<OptionalErrorBoundary fallback={ShapeErrorFallback} onError={annotateError}>
						<InnerShapeBackground id={id} util={util} />
					</OptionalErrorBoundary>
				</ShapeWrapper>
			)}
			<ShapeWrapper ref={containerRef} shape={shape} isBackground={false}>
				<OptionalErrorBoundary fallback={ShapeErrorFallback as any} onError={annotateError}>
					<InnerShape id={id} util={util} />
				</OptionalErrorBoundary>
			</ShapeWrapper>
		</>
	)
})

/**
 * Subscribes to content-only changes for a shape (props and meta references).
 * Position, rotation, and opacity changes do not trigger re-renders.
 * Uses two separate useValue calls since each returns a stable reference
 * that only changes when that specific part of the shape content changes.
 */
function useShapeContent(id: TLShapeId, util: ShapeUtil) {
	useValue('shape props', () => util.editor.getShape(id)?.props, [util, id])
	useValue('shape meta', () => util.editor.getShape(id)?.meta, [util, id])
}

export const InnerShape = memo(function InnerShape({
	id,
	util,
}: {
	id: TLShapeId
	util: ShapeUtil
}) {
	// Subscribe to content-only changes. This re-renders only when props change.
	useShapeContent(id, util)

	return useStateTracking(
		'InnerShape:' + (util.constructor as typeof ShapeUtil).type,
		() => {
			const shape = util.editor.store.unsafeGetWithoutCapture(id) as TLShape | undefined
			if (!shape) return null
			return util.component(shape)
		},
		[util, id]
	)
})

export const InnerShapeBackground = memo(function InnerShapeBackground({
	id,
	util,
}: {
	id: TLShapeId
	util: ShapeUtil
}) {
	useShapeContent(id, util)

	return useStateTracking(
		'InnerShapeBackground:' + (util.constructor as typeof ShapeUtil).type,
		() => {
			const shape = util.editor.store.unsafeGetWithoutCapture(id) as TLShape | undefined
			if (!shape) return null
			return util.backgroundComponent?.(shape) ?? null
		},
		[util, id]
	)
})
