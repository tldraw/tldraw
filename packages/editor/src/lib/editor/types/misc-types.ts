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

export type TLEditorErrorType = keyof typeof TLEditorErrorTypeMap

export type TLEditorError = { message: string; type: TLEditorErrorType }

const TLEditorErrorTypeMap = {
	'not-an-array-of-shapes': {
		message: 'createShapes requires an array of shapes',
		type: 'not-an-array-of-shapes' as const,
	},
	'no-shapes-provied': {
		message: 'No shapes provided',
		type: 'no-shapes-provied' as const,
	},
	'readonly-room': {
		message: 'Room is readonly',
		type: 'readonly-room' as const,
	},
	'max-shapes-reached': {
		message: 'Max shapes reached',
		type: 'max-shapes-reached' as const,
	},
}

export type ErrorResult = { ok: false; error: TLEditorError }
export type OkResult = { ok: true }
export type OkResultWithValue<T> = { ok: true; value: T }

export type EditorResult<T> = ErrorResult | OkResult | OkResultWithValue<T>
export const EditorResult = {
	ok(): OkResult {
		return { ok: true }
	},
	okWithValue<T>(value: T): OkResultWithValue<T> {
		return { ok: true, value }
	},
	error(errorType: TLEditorErrorType): ErrorResult {
		return { ok: false, error: TLEditorErrorTypeMap[errorType] }
	},
}
