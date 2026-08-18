import React, { forwardRef, FunctionComponent, memo } from 'react'
import { useStateTracking } from './useStateTracking'

/**
 * Proxy handlers that wrap a function component's render call in `useStateTracking`.
 *
 * @internal
 */
export const ProxyHandlers = {
	/**
	 * The apply trap fires exactly when React runs `Component()`, so hooks are safe here. All other
	 * property access is forwarded to the target, so we don't need to copy the component's own or
	 * inherited properties (displayName, defaultProps, etc.).
	 *
	 * @see https://github.com/facebook/react/blob/2d80a0cd690bb5650b6c8a6c079a87b5dc42bd15/packages/react-reconciler/src/ReactFiberHooks.old.js#L460
	 */
	apply(Component: FunctionComponent, thisArg: any, argumentsList: any) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		return useStateTracking(Component.displayName ?? Component.name ?? 'tracked(???)', () =>
			Component.apply(thisArg, argumentsList)
		)
	},
}

/** @internal */
export const ReactMemoSymbol = Symbol.for('react.memo')

/** @internal */
export const ReactForwardRefSymbol = Symbol.for('react.forward_ref')

/**
 * Returns a tracked version of the given component.
 * Any signals whose values are read while the component renders will be tracked.
 * If any of the tracked signals change later it will cause the component to re-render.
 *
 * This also wraps the component in a React.memo() call, so it will only re-render
 * when props change OR when any tracked signals change. This provides optimal
 * performance by preventing unnecessary re-renders while maintaining reactivity.
 *
 * The function handles special React component types like forwardRef and memo
 * components automatically, preserving their behavior while adding reactivity.
 *
 * @param baseComponent - The React functional component to make reactive to signal changes
 * @returns A memoized component that re-renders when props or tracked signals change
 *
 * @example
 * ```ts
 * import { atom } from '@tldraw/state'
 * import { track, useAtom } from '@tldraw/state-react'
 *
 * const Counter = track(function Counter(props: CounterProps) {
 *   const count = useAtom('count', 0)
 *   const increment = useCallback(() => count.set(count.get() + 1), [count])
 *   return <button onClick={increment}>{count.get()}</button>
 * })
 *
 * // Component automatically re-renders when count signal changes
 * ```
 *
 * @example
 * ```ts
 * // Works with forwardRef components
 * const TrackedInput = track(React.forwardRef<HTMLInputElement, InputProps>(
 *   function TrackedInput(props, ref) {
 *     const theme = useValue(themeSignal)
 *     return <input ref={ref} style={{ color: theme.textColor }} {...props} />
 *   }
 * ))
 * ```
 *
 * @public
 */
export function track<T extends FunctionComponent<any>>(
	baseComponent: T
): React.NamedExoticComponent<React.ComponentProps<T>> {
	let compare = null
	const $$typeof = baseComponent['$$typeof' as keyof typeof baseComponent]
	if ($$typeof === ReactMemoSymbol) {
		baseComponent = (baseComponent as any).type
		compare = (baseComponent as any).compare
	}
	if ($$typeof === ReactForwardRefSymbol) {
		return memo(forwardRef(new Proxy((baseComponent as any).render, ProxyHandlers) as any)) as any
	}

	return memo(new Proxy(baseComponent, ProxyHandlers) as any, compare) as any
}
