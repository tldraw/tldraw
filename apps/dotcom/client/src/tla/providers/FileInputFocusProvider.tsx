import React, { useContext, useRef } from 'react'

const context = React.createContext({
	shouldRenameNextNewFile: false,
})

export function useFileSidebarFocusContext() {
	return useContext(context)
}

export function FileSidebarFocusContextProvider({ children }: { children: React.ReactNode }) {
	const shouldRenameNextNewFileRef = useRef({ shouldRenameNextNewFile: false })

	return <context.Provider value={shouldRenameNextNewFileRef.current}>{children}</context.Provider>
}
