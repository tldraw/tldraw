import React from 'react'
import { App } from '../app/Editor'

export const AppContext = React.createContext({} as App)

/** @public */
export const useEditor = (): App => {
	return React.useContext(AppContext)
}
