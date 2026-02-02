import { createContext, memo, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { useEditor, useToasts, useValue } from 'tldraw'
import { TldrawAgent } from './TldrawAgent'
import { TldrawAgentApp } from './TldrawAgentApp'

const TldrawAgentAppContext = createContext<TldrawAgentApp | null>(null)

export interface TldrawAgentAppProviderProps {
	children?: ReactNode
	/**
	 * Callback fired when the app is created. Use this to pass the app
	 * to components outside the Tldraw component via TldrawAgentAppContextProvider.
	 */
	onMount?: (app: TldrawAgentApp) => void
	/**
	 * Callback fired when the app is disposed.
	 */
	onUnmount?: () => void
}

/**
 * Provider component that creates and manages a TldrawAgentApp instance for the current editor.
 *
 * This component should be rendered inside a `<Tldraw>` component to have access to the editor context.
 * It creates a TldrawAgentApp instance, provides it via context, and cleans up on unmount.
 *
 * The provider waits until the app and agent exist before rendering children,
 * ensuring useAgent() always returns a valid agent.
 *
 * For components defined in Tldraw's `components` prop, use `onMount` to get the app instance
 * and wrap them with `TldrawAgentAppContextProvider`.
 *
 * @example
 * ```tsx
 * function App() {
 *   const [app, setApp] = useState<TldrawAgentApp | null>(null)
 *
 *   const components = useMemo(() => ({
 *     InFrontOfTheCanvas: () => app && (
 *       <TldrawAgentAppContextProvider app={app}>
 *         <AgentHighlights />
 *       </TldrawAgentAppContextProvider>
 *     ),
 *   }), [app])
 *
 *   return (
 *     <Tldraw components={components}>
 *       <TldrawAgentAppProvider onMount={setApp} onUnmount={() => setApp(null)} />
 *     </Tldraw>
 *   )
 * }
 * ```
 */
export const TldrawAgentAppProvider = memo(function TldrawAgentAppProvider({
	children,
	onMount,
	onUnmount,
}: TldrawAgentAppProviderProps) {
	const editor = useEditor()
	const toasts = useToasts()
	const [app, setApp] = useState<TldrawAgentApp | null>(null)

	// Error handler for agent errors
	const handleError = useCallback(
		(e: any) => {
			const message = typeof e === 'string' ? e : e instanceof Error && e.message
			toasts.addToast({
				title: 'Error',
				description: message || 'An error occurred',
				severity: 'error',
			})
			console.error(e)
		},
		[toasts]
	)

	// Create the TldrawAgentApp instance
	useEffect(() => {
		const instance = new TldrawAgentApp(editor, { onError: handleError })

		// Load persisted state first (this will create agents from persisted data)
		instance.persistence.loadState()

		// Ensure at least one agent exists (creates one if none were loaded)
		const defaultAgent = instance.agents.ensureAtLeastOneAgent()

		// Start auto-saving (must be after loadState to avoid saving during load)
		instance.persistence.startAutoSave()

		setApp(instance)

		// Notify parent
		onMount?.(instance)

		// Expose to window for debugging
		;(window as any).agentApp = instance
		;(window as any).agent = defaultAgent
		;(window as any).editor = editor

		return () => {
			instance.dispose()
			setApp(null)
			onUnmount?.()
			delete (window as any).agentApp
			delete (window as any).agent
			delete (window as any).editor
		}
	}, [editor, handleError, onMount, onUnmount])

	// Don't render children until app exists
	if (!app) {
		return null
	}

	return <TldrawAgentAppContext.Provider value={app}>{children}</TldrawAgentAppContext.Provider>
})

/**
 * Context provider that wraps children with the TldrawAgentApp context.
 * Use this to provide the app context to components defined in Tldraw's `components` prop.
 *
 * @example
 * ```tsx
 * const components = useMemo(() => ({
 *   InFrontOfTheCanvas: () => app && (
 *     <TldrawAgentAppContextProvider app={app}>
 *       <AgentHighlights />
 *     </TldrawAgentAppContextProvider>
 *   ),
 * }), [app])
 * ```
 */
export function TldrawAgentAppContextProvider({
	app,
	children,
}: {
	app: TldrawAgentApp
	children: ReactNode
}) {
	return <TldrawAgentAppContext.Provider value={app}>{children}</TldrawAgentAppContext.Provider>
}

/**
 * Hook to get the TldrawAgentApp instance from context.
 * Must be used inside a TldrawAgentAppProvider or TldrawAgentAppContextProvider.
 *
 * @throws Error if called outside of a provider
 * @returns The TldrawAgentApp instance (guaranteed non-null)
 *
 * @example
 * ```tsx
 * const app = useTldrawAgentApp()
 * // app is guaranteed to exist here
 * const agent = app.agents.getAgent()
 * ```
 */
export function useTldrawAgentApp(): TldrawAgentApp {
	const app = useContext(TldrawAgentAppContext)
	if (!app) {
		throw new Error('useTldrawAgentApp must be used inside a TldrawAgentAppProvider')
	}
	return app
}

/**
 * Hook to get the default TldrawAgent instance from the app context.
 * Must be used inside a TldrawAgentAppProvider or TldrawAgentAppContextProvider.
 *
 * @throws Error if called outside of a provider or if agent doesn't exist
 * @returns The default TldrawAgent instance (guaranteed non-null)
 *
 * @example
 * ```tsx
 * function ChatPanel() {
 *   const agent = useAgent()
 *   // agent is guaranteed to exist here
 *   agent.prompt('Draw a cat')
 * }
 * ```
 */
export function useAgent(): TldrawAgent {
	const app = useTldrawAgentApp()
	const agent = useValue('agent', () => app.agents.getAgent(), [app])
	if (!agent) {
		throw new Error('No agent found. Make sure an agent has been created.')
	}
	return agent
}

/**
 * Hook to get all TldrawAgent instances from the app context.
 * Returns a reactive array that updates when agents are added or removed.
 * Must be used inside a TldrawAgentAppProvider or TldrawAgentAppContextProvider.
 *
 * @throws Error if called outside of a provider
 * @returns Array of all TldrawAgent instances
 *
 * @example
 * ```tsx
 * function AgentList() {
 *   const agents = useAgents()
 *   return (
 *     <ul>
 *       {agents.map(agent => <li key={agent.id}>{agent.id}</li>)}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useAgents(): TldrawAgent[] {
	const app = useTldrawAgentApp()
	return useValue('agents', () => app.agents.getAgents(), [app])
}
