import { ReactNode, createContext, useContext, useEffect, useState } from 'react'

import { tldrawAppSchema } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { inlineBase64AssetStore } from 'tldraw'
import { MULTIPLAYER_SERVER } from '../../utils/config'
import { TlaErrorPage } from '../components/TlaErrorPage'
import { TlaWrapperCentered } from '../components/TlaWrapperCentered'
import { TldrawApp } from '../utils/TldrawApp'

const appContext = createContext<TldrawApp>({} as TldrawApp)

export function AppStateProvider({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false)
	const [app, setApp] = useState({} as TldrawApp)

	// eslint-disable-next-line no-restricted-syntax
	let userId = localStorage.getItem('userId')
	if (!userId) {
		userId = window.prompt('Please enter your user id (not secure)') ?? 'silly billy'
		// eslint-disable-next-line no-restricted-syntax
		localStorage.setItem('userId', userId)
	}

	const store = useSync({
		schema: tldrawAppSchema as any,
		uri: `${MULTIPLAYER_SERVER}/app/${encodeURIComponent(userId)}`,
		assets: inlineBase64AssetStore,
	})

	useEffect(() => {
		if (store.status !== 'synced-remote') {
			return
		}
		let _app: TldrawApp

		TldrawApp.create({
			store: store.store as any,
			onLoad: () => {
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
	}, [store.status, store.store])

	if (store.status === 'error') {
		return <TlaErrorPage error={'no-user-access'} />
	}

	if (store.status === 'loading' || !ready || !app) {
		return <TlaWrapperCentered>Loading...</TlaWrapperCentered>
	}

	return <appContext.Provider value={app}>{children}</appContext.Provider>
}

export function useApp() {
	return useContext(appContext)
}
