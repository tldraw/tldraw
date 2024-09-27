import { ReactNode, createContext, useContext, useEffect, useState } from 'react'

import { TlaWrapperCentered } from '../layouts/TlaWrapperCentered'
import { TldrawApp } from '../utils/TldrawApp'
import { TLA_VERSION } from '../utils/tla-version'

const appContext = createContext<TldrawApp>({} as TldrawApp)

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false)
	const [app, setApp] = useState({} as TldrawApp)

	useEffect(() => {
		let _app: TldrawApp

		TldrawApp.create({
			persistenceKey: 'tla' + TLA_VERSION,
			onLoad: () => {
				// todo
			},
			onLoadError: () => {
				// todo
			},
		}).then((app) => {
			_app = app
			setApp(app)
			setReady(true)
		})

		return () => {
			if (_app) {
				_app.dispose()
			}
		}
	}, [])

	if (!ready || !app) {
		return <TlaWrapperCentered>Loading...</TlaWrapperCentered>
	}

	return <appContext.Provider value={app}>{children}</appContext.Provider>
}

export function useApp() {
	return useContext(appContext)
}
