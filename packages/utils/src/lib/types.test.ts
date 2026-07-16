import { expectTypeOf } from 'vitest'
import { MakeUndefinedOptional } from './types'

describe('MakeUndefinedOptional', () => {
	it('makes properties that include undefined optional', () => {
		type Result = MakeUndefinedOptional<{
			name: string
			theme: string | undefined
		}>

		expectTypeOf<Result>().toEqualTypeOf<{ name: string; theme?: string | undefined }>()
	})

	it('keeps required properties required', () => {
		type Result = MakeUndefinedOptional<{ name: string; version: number }>

		expectTypeOf<Result>().toEqualTypeOf<{ name: string; version: number }>()
	})

	it('does not make required `any` properties optional', () => {
		type Result = MakeUndefinedOptional<{ foo: any }>

		expectTypeOf<Result>().toEqualTypeOf<{ foo: any }>()
		// @ts-expect-error - `foo` is required, so an empty object is not assignable
		const value: Result = {}
		void value
	})

	it('keeps already-optional `any` properties optional', () => {
		type Result = MakeUndefinedOptional<{ foo?: any }>

		expectTypeOf<Result>().toEqualTypeOf<{ foo?: any }>()
		const value: Result = {}
		void value
	})
})
