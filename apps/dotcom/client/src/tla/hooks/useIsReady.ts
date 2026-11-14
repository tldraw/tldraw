import React from 'react'

/*
 * This file implements an optional 'shroud' for initial page loads to fade
 * in the page once all the necessary data has been loaded. This can help
 * avoid flickering in some situations.
 */

export const ReadyContext = React.createContext({
	isReady: true,
	setIsReady: () => {},
	isRoot: true,
})

export function useIsReady() {
	return React.useContext(ReadyContext).isReady
}

export function useSetIsReady() {
	return React.useContext(ReadyContext).setIsReady
}
