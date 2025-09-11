/*!
 * MIT License: https://github.com/NoHomey/bind-decorator/blob/master/License
 * Copyright (c) 2016 Ivo Stratev
 */

import { assert } from './control'

/**
 * Decorator that binds a method to its class instance (legacy stage-2 TypeScript decorators).
 * When applied to a class method, ensures `this` always refers to the class instance,
 * even when the method is called as a callback or event handler.
 *
 * @param target - The prototype of the class being decorated
 * @param propertyKey - The name of the method being decorated
 * @param descriptor - The property descriptor for the method being decorated
 * @returns The modified property descriptor with bound method access
 * @example
 * ```typescript
 * class MyClass {
 *   name = 'example';
 *
 *   @bind
 *   getName() {
 *     return this.name;
 *   }
 * }
 *
 * const instance = new MyClass();
 * const callback = instance.getName;
 * console.log(callback()); // 'example' (this is properly bound)
 * ```
 * @public
 */
export function bind<T extends (...args: any[]) => any>(
	target: object,
	propertyKey: string,
	descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T>

/**
 * Decorator that binds a method to its class instance (TC39 decorators standard).
 * When applied to a class method, ensures `this` always refers to the class instance,
 * even when the method is called as a callback or event handler.
 *
 * @param originalMethod - The original method being decorated
 * @param context - The decorator context containing metadata about the method
 * @example
 * ```typescript
 * class EventHandler {
 *   message = 'Hello World';
 *
 *   @bind
 *   handleClick() {
 *     console.log(this.message);
 *   }
 * }
 *
 * const handler = new EventHandler();
 * document.addEventListener('click', handler.handleClick); // 'this' is properly bound
 * ```
 * @public
 */
export function bind<This extends object, T extends (...args: any[]) => any>(
	originalMethod: T,
	context: ClassMethodDecoratorContext<This, T>
): void

/**
 * Universal decorator implementation that handles both legacy stage-2 and TC39 decorator formats.
 * Automatically detects the decorator format based on the number of arguments and binds the
 * decorated method to the class instance, preventing common `this` context issues.
 *
 * @param args - Either legacy decorator arguments (target, propertyKey, descriptor) or TC39 decorator arguments (originalMethod, context)
 * @returns Property descriptor for legacy decorators, or void for TC39 decorators
 * @example
 * ```typescript
 * // Works with both decorator formats
 * class Calculator {
 *   multiplier = 2;
 *
 *   @bind
 *   multiply(value: number) {
 *     return value * this.multiplier;
 *   }
 * }
 *
 * const calc = new Calculator();
 * const multiplyFn = calc.multiply;
 * console.log(multiplyFn(5)); // 10 (this.multiplier is accessible)
 *
 * // Useful for event handlers and callbacks
 * setTimeout(calc.multiply, 100, 3); // 6
 * ```
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
