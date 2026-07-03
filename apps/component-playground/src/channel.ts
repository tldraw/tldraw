/** The studio shell posts this into a sketch's preview iframe to set live args. */
export const SET_ARGS = 'studio:set-args'

export interface SetArgsMessage {
	type: typeof SET_ARGS
	id: string
	args: Record<string, unknown>
}
