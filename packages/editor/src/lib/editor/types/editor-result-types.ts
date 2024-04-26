// Result types
export type Ok = { readonly ok: true }
export type OkWithValue<T> = { readonly ok: true; readonly value: T }
export type Error<E> = { readonly ok: false; readonly error: E }

export type EditorResult<T, E> = Error<E> | Ok | OkWithValue<T>
export const EditorResult = {
	ok(): Ok {
		return { ok: true }
	},
	okWithValue<T>(value: T): OkWithValue<T> {
		return { ok: true, value }
	},
	error<E>(error: E): Error<E> {
		return { ok: false, error }
	},
}

// General errors
export const READONLY_ROOM_ERROR = { type: 'readonly-room' as const, message: 'Room is readonly' }

// Create shape errors
export const NOT_ARRAY_OF_SHAPES_ERROR = {
	type: 'not-array' as const,
	message: 'Expected an array',
}
export const NO_SHAPES_PROVIDED_ERROR = {
	type: 'no-shapes-provided' as const,
	message: 'No shapes provided',
}
export const MAX_SHAPES_REACHED_ERROR_ERROR = {
	type: 'max-shapes-reached' as const,
	message: 'Max shapes reached',
}

export type CreateShapeErrorType =
	| (typeof READONLY_ROOM_ERROR)['type']
	| (typeof NOT_ARRAY_OF_SHAPES_ERROR)['type']
	| (typeof NO_SHAPES_PROVIDED_ERROR)['type']
	| (typeof MAX_SHAPES_REACHED_ERROR_ERROR)['type']
export type CreateShapeError = { type: CreateShapeErrorType; message: string }
