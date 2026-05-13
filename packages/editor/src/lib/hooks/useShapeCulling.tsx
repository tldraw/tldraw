import { TLShapeId } from '@tldraw/tlschema'
import { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import { setStyleProperty } from '../utils/dom'

interface ShapeContainerEntry {
	container: HTMLDivElement
	bgContainer: HTMLDivElement | null
	isCulled: boolean
}

interface ShapeCullingContextValue {
	register(
		id: TLShapeId,
		container: HTMLDivElement,
		bgContainer: HTMLDivElement | null,
		isCulled: boolean
	): void
	unregister(id: TLShapeId): void
	updateCulling(culledShapes: Set<TLShapeId>): void
}

const ShapeCullingContext = createContext<ShapeCullingContextValue | null>(null)

/** @internal */
export interface ShapeCullingProviderProps {
	children: React.ReactNode
}

/**
 * Provides centralized culling management for shape containers.
 * This allows a single reactor to update all shape display states
 * instead of each shape having its own subscription.
 *
 * @internal
 */
export function ShapeCullingProvider({ children }: ShapeCullingProviderProps) {
	const containersRef = useRef(new Map<TLShapeId, ShapeContainerEntry>())

	const register = useCallback(
		(
			id: TLShapeId,
			container: HTMLDivElement,
			bgContainer: HTMLDivElement | null,
			isCulled: boolean
		) => {
			const display = isCulled ? 'none' : 'block'
			setStyleProperty(container, 'display', display)
			setStyleProperty(bgContainer, 'display', display)

			containersRef.current.set(id, {
				container,
				bgContainer,
				isCulled,
			})
		},
		[]
	)

	const unregister = useCallback((id: TLShapeId) => {
		containersRef.current.delete(id)
	}, [])

	const updateCulling = useCallback((culledShapes: Set<TLShapeId>) => {
		let shouldBeCulled: boolean

		for (const [id, entry] of containersRef.current) {
			shouldBeCulled = culledShapes.has(id)
			if (shouldBeCulled !== entry.isCulled) {
				const display = shouldBeCulled ? 'none' : 'block'
				setStyleProperty(entry.container, 'display', display)
				setStyleProperty(entry.bgContainer, 'display', display)
				entry.isCulled = shouldBeCulled
			}
		}
	}, [])

	const value = useMemo(
		() => ({
			register,
			unregister,
			updateCulling,
		}),
		[register, unregister, updateCulling]
	)

	return <ShapeCullingContext.Provider value={value}>{children}</ShapeCullingContext.Provider>
}

const NOOP_CULLING: ShapeCullingContextValue = {
	register: () => {},
	unregister: () => {},
	updateCulling: () => {},
}

/**
 * Hook to access the shape culling context for container registration. Returns a
 * no-op value when used outside a `ShapeCullingProvider` (e.g. inside the
 * viewer, where culling is handled by filtering shapes at render time).
 *
 * @internal
 */
export function useShapeCulling(): ShapeCullingContextValue {
	return useContext(ShapeCullingContext) ?? NOOP_CULLING
}
