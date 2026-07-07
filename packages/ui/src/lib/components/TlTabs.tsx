import classNames from 'classnames'
import { createContext, HTMLAttributes, ReactNode, useCallback, useContext } from 'react'

/** @public */
export interface TlTabsContextValue {
	activeTab: string
	onTabChange(tab: string): void
}

const tabsContext = createContext<TlTabsContextValue | null>(null)

function useTlTabsContext(): TlTabsContextValue {
	const ctx = useContext(tabsContext)
	if (!ctx) {
		throw new Error('TlTabsTab must be used inside TlTabsRoot')
	}
	return ctx
}

/** @public */
export interface TlTabsRootProps extends TlTabsContextValue {
	children: ReactNode
}

/** @public @react */
export function TlTabsRoot({ activeTab, onTabChange, children }: TlTabsRootProps) {
	return (
		<div className="tl-tabs">
			<tabsContext.Provider value={{ activeTab, onTabChange }}>{children}</tabsContext.Provider>
		</div>
	)
}

/** @public */
export interface TlTabsTabsProps {
	children: ReactNode
}

/** @public @react */
export function TlTabsTabs({ children }: TlTabsTabsProps) {
	return (
		<div className="tl-tabs__tabs" role="tablist">
			{children}
			<div className="tl-tabs__line" />
		</div>
	)
}

/** @public */
export interface TlTabsTabProps extends HTMLAttributes<HTMLButtonElement> {
	id: string
	disabled?: boolean
	children: ReactNode
}

/** @public @react */
export function TlTabsTab({ id, disabled = false, children, className, ...props }: TlTabsTabProps) {
	const { activeTab, onTabChange } = useTlTabsContext()
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
export interface TlTabsPageProps extends HTMLAttributes<HTMLDivElement> {
	id: string
}

/** @public @react */
export function TlTabsPage({ id, className, ...props }: TlTabsPageProps) {
	const { activeTab } = useTlTabsContext()
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
