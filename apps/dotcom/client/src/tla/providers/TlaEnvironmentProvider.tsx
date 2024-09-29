import { createContext, ReactNode, useContext } from 'react'

const environment = {
	isSafari: false,
	isIos: false,
	isChromeForIos: false,
	isFirefox: false,
	isAndroid: false,
}

if (typeof window !== 'undefined' && 'navigator' in window) {
	environment.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
	environment.isIos = !!navigator.userAgent.match(/iPad/i) || !!navigator.userAgent.match(/iPhone/i)
	environment.isChromeForIos = /crios.*safari/i.test(navigator.userAgent)
	environment.isFirefox = /firefox/i.test(navigator.userAgent)
	environment.isAndroid = /android/i.test(navigator.userAgent)
}

const environmentContext = createContext(environment)

export function TlaEnvironmentProvider({ children }: { children: ReactNode }) {
	return <environmentContext.Provider value={environment}>{children}</environmentContext.Provider>
}

export function useEnvironment() {
	return useContext(environmentContext)
}
