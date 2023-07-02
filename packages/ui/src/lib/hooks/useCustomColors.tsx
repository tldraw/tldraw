import * as React from 'react'

/** @public */
export type TLUiCustomColorsContextType = string[]

/** @internal */
export const CustomColorsContext = React.createContext([] as TLUiCustomColorsContextType)

/** @public */
export type TLUiCustomColorsProviderProps = {
	customColors?: string[]
	children: any
}

export function CustomColorsProvider({ customColors = [], children }: TLUiCustomColorsProviderProps) {
	return <CustomColorsContext.Provider value={customColors}>{children}</CustomColorsContext.Provider>
}

/** @public */
export function useCustomColors() {
	const ctx = React.useContext(CustomColorsContext)

	if (!ctx) {
		throw new Error('useCustomColors must be used within a CustomColorsProvider')
	}

	return ctx
}
