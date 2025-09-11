/*!
 * MIT License: https://github.com/NoHomey/bind-decorator/blob/master/License
 * Copyright (c) 2016 Ivo Stratev
 */

import { assert } from './control'

/**
 * `@bind` is a decorator that binds the method to the instance of the class (legacy stage-2
 * typescript decorators).
 *
 * @param target - The prototype of the class being decorated
 * @param propertyKey - The name of the method being decorated
 * @param descriptor - The property descriptor for the method
 * @returns The modified property descriptor
 * @public
 */
export function bind<T extends (...args: any[]) => any>(
	target: object,
	propertyKey: string,
	descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T>

/**
 * `@bind` is a decorator that binds the method to the instance of the class (TC39 decorators).
 *
 * @param originalMethod - The original method being decorated
 * @param context - The decorator context for the method
 * @public
 */
export function bind<This extends object, T extends (...args: any[]) => any>(
	originalMethod: T,
	context: ClassMethodDecoratorContext<This, T>
): void

/**
 * `@bind` decorator implementation that handles both legacy and TC39 decorator formats.
 * Automatically binds the decorated method to the class instance.
 *
 * @param args - Either legacy decorator arguments or TC39 decorator arguments
 * @returns Property descriptor for legacy decorators, or void for TC39 decorators
 * @public
 */
export function bind(
	...args: // legacy stage-2 typescript decorators
	| [_target: object, propertyKey: string, descriptor: PropertyDescriptor]
		// TC39 decorators
		| [originalMethod: (...args: any[]) => any, context: ClassMemberDecoratorContext]
): PropertyDescriptor | void {
	if (args.length === 2) {
		const [originalMethod, context] = args
		context.addInitializer(function initializeMethod(this: any) {
			assert(Reflect.isExtensible(this), 'Cannot bind to a non-extensible class.')
			const value = originalMethod.bind(this)
			const ok = Reflect.defineProperty(this, context.name, {
				value,
				writable: true,
				configurable: true,
			})
			assert(ok, 'Cannot bind a non-configurable class method.')
		})
	} else {
		const [_target, propertyKey, descriptor] = args
		if (!descriptor || typeof descriptor.value !== 'function') {
			throw new TypeError(
				`Only methods can be decorated with @bind. <${propertyKey}> is not a method!`
			)
		}

		return {
			configurable: true,
			get(this: any): any {
				const bound = descriptor.value!.bind(this)
				// Credits to https://github.com/andreypopp/autobind-decorator for memoizing the result of bind against a symbol on the instance.
				Object.defineProperty(this, propertyKey, {
					value: bound,
					configurable: true,
					writable: true,
				})
				return bound
			},
		}
	}
}
