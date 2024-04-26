import { Box } from '../../primitives/Box'

/** @public */
export type RequiredKeys<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>
/** @public */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** @public */
export type TLSvgOptions = {
	bounds: Box
	scale: number
	background: boolean
	padding: number
	darkMode?: boolean
	preserveAspectRatio: React.SVGAttributes<SVGSVGElement>['preserveAspectRatio']
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

export type OkResult = { readonly ok: true }
export type OkResultWithValue<T> = { readonly ok: true; readonly value: T }
export type ErrorResult<E> = { readonly ok: false; readonly error: E }

export type EditorResult<T, E> = ErrorResult<E> | OkResult | OkResultWithValue<T>
export const EditorResult = {
	ok(): OkResult {
		return { ok: true }
	},
	okWithValue<T>(value: T): OkResultWithValue<T> {
		return { ok: true, value }
	},
	error<E>(error: E): ErrorResult<E> {
		return { ok: false, error }
	},
}
