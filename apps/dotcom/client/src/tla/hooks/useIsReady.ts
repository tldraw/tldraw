import React from 'react'

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
