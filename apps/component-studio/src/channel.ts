/** The studio shell posts this into a sketch's preview iframe to drive its render. */
export const SET_STATE = 'studio:set-state'

/** Global viewing environment, chosen in the studio toolbar. */
export interface Env {
	theme: 'light' | 'dark'
	locale: string
}

export interface SetStateMessage {
	type: typeof SET_STATE
	id: string
	args: Record<string, unknown>
	env: Env
}
