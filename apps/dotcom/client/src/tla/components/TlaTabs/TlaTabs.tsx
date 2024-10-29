import classNames from 'classnames'
import { createContext, ReactNode, useCallback, useContext } from 'react'
import c from './tabs.module.css'

/*
This is a set of primitives for creating tabs in the UI. Structure is:

<Root>
	<Tabs>
		<Tab>
		...
	</Tabs>
	<Page>
	<Page>
	<Page>
</Root>
*/

interface TlaTabsContext {
	activeTab: string
	onTabChange(tab: string): void
}

const tabsContext = createContext({} as TlaTabsContext)

export function TlaTabsRoot({
	activeTab,
	onTabChange,
	children,
}: TlaTabsContext & { children: ReactNode }) {
	return <tabsContext.Provider value={{ activeTab, onTabChange }}>{children}</tabsContext.Provider>
}

export function TlaTabsTabs({ children }: { children: ReactNode }) {
	return (
		<div className={c.tabs}>
			{children}
			<div className={c.line} />
		</div>
	)
}

export function TlaTabsTab({ id, children }: { id: string; children: ReactNode }) {
	const { activeTab, onTabChange } = useContext(tabsContext)

	const handleClick = useCallback(() => {
		onTabChange(id)
	}, [onTabChange, id])

	return (
		<button
			className={classNames(c.tab, 'tla-text_ui__medium')}
			data-active={activeTab === id}
			onClick={handleClick}
		>
			{children}
		</button>
	)
}

export function TlaTabsPage({ id, children }: { id: string; children: ReactNode }) {
	const { activeTab } = useContext(tabsContext)
	if (activeTab !== id) return null
	return <div>{children}</div>
}
