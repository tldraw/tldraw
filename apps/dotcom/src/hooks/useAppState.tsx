import { ReactNode, createContext, useContext, useState } from 'react'

import { TldrawApp } from '../utils/tla/tldrawApp'

const appContext = createContext<TldrawApp>({} as TldrawApp)

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [app] = useState(() => new TldrawApp())

	return <appContext.Provider value={app}>{children}</appContext.Provider>
}

export function useApp() {
	return useContext(appContext)
}
