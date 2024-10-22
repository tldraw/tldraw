import { assertExists } from '@tldraw/utils'
import { createContext, useContext, useId } from 'react'

/**
 * The DOM requires that all IDs are unique. We often use e.g. shape IDs in the dom, but this isn't
 * safe: if tldraw is rendered twice, or an SVG export is taking place, the IDs will clash and the
 * browser will do weird things. This type is used to mark IDs that are unique and safe to use.
 *
 * Use {@link useUniqueSafeId} to generate a unique safe ID. Use {@link useSharedSafeId} to generate
 * the same ID across multiple components, but unique within a single tldraw/editor instance.
 *
 * @public
 */
export type SafeId = string & { __brand: 'SafeId' }

declare module 'react' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface HTMLProps<T> {
		id?: SafeId
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface SVGProps<T> {
		id?: SafeId
	}
}

/** @public */
export function suffixSafeId(id: SafeId, suffix: string): SafeId {
	return sanitizeId(`${id}_${suffix}`) as SafeId
}

/**
 * React's useId hook returns a unique id for the component. However, it uses a colon in the id,
 * which is not valid for CSS selectors. This hook replaces the colon with an underscore.
 *
 * @public
 */
export function useUniqueSafeId(suffix?: string): SafeId {
	return sanitizeId(`${useId()}${suffix ?? ''}`) as SafeId
}

/**
 * React's useId hook returns a unique id for the component. However, it uses a colon in the id,
 * which is not valid for CSS selectors. This hook replaces the colon with an underscore.
 *
 * @public
 */
export function useSharedSafeId(id: string): SafeId {
	const idScope = assertExists(useContext(IdContext))
	return sanitizeId(`${idScope}_${id}`) as SafeId
}

/** @public */
export function sanitizeId(id: string): string {
	return id.replace(/:/g, '_')
}

const IdContext = createContext<SafeId | null>(null)
export function IdProvider({ children }: { children: React.ReactNode }) {
	const id = useUniqueSafeId()
	return <IdContext.Provider value={id}>{children}</IdContext.Provider>
}
