import classNames from 'classnames'
import { createContext, HTMLAttributes, ReactNode, useCallback, useContext } from 'react'

/** @public */
export interface TldrawUiTabsContextValue {
	activeTab: string
	onTabChange(tab: string): void
}

const tabsContext = createContext<TldrawUiTabsContextValue | null>(null)

function useTldrawUiTabsContext(): TldrawUiTabsContextValue {
	const ctx = useContext(tabsContext)
	if (!ctx) {
		throw new Error('TldrawUiTabsTab must be used inside TldrawUiTabsRoot')
	}
	return ctx
}

/** @public */
export interface TldrawUiTabsRootProps extends TldrawUiTabsContextValue {
	children: ReactNode
}

/** @public @react */
export function TldrawUiTabsRoot({ activeTab, onTabChange, children }: TldrawUiTabsRootProps) {
	return (
		<div className="tl-tabs">
			<tabsContext.Provider value={{ activeTab, onTabChange }}>{children}</tabsContext.Provider>
		</div>
	)
}

/** @public */
export interface TldrawUiTabsTabsProps {
	children: ReactNode
}

/** @public @react */
export function TldrawUiTabsTabs({ children }: TldrawUiTabsTabsProps) {
	return (
		<div className="tl-tabs__tabs" role="tablist">
			{children}
			<div className="tl-tabs__line" />
		</div>
	)
}

/** @public */
export interface TldrawUiTabsTabProps extends HTMLAttributes<HTMLButtonElement> {
	id: string
	disabled?: boolean
	children: ReactNode
}

/** @public @react */
export function TldrawUiTabsTab({
	id,
	disabled = false,
	children,
	className,
	...props
}: TldrawUiTabsTabProps) {
	const { activeTab, onTabChange } = useTldrawUiTabsContext()
	const isActive = activeTab === id

	const handleClick = useCallback(() => {
		onTabChange(id)
	}, [onTabChange, id])

	return (
		<button
			type="button"
			className={classNames('tl-tabs__tab', isActive && 'tl-tabs__tab--active', className)}
			data-active={isActive}
			onClick={handleClick}
			disabled={disabled}
			aria-selected={isActive}
			aria-controls={`tl-tabpanel-${id}`}
			role="tab"
			{...props}
		>
			{children}
		</button>
	)
}

/** @public */
export interface TldrawUiTabsPageProps extends HTMLAttributes<HTMLDivElement> {
	id: string
}

/** @public @react */
export function TldrawUiTabsPage({ id, className, ...props }: TldrawUiTabsPageProps) {
	const { activeTab } = useTldrawUiTabsContext()
	if (activeTab !== id) return null

	return (
		<div
			id={`tl-tabpanel-${id}`}
			className={classNames('tl-tabs__page', className)}
			role="tabpanel"
			{...props}
		/>
	)
}
