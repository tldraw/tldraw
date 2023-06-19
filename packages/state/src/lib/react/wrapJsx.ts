// This file was copied and adapted with thanks from the preactjs/preact repo.
// https://github.com/preactjs/signals/blob/main/packages/react/src/index.ts

// The MIT License (MIT)

// Copyright (c) 2022-present Preact Team

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Component, type FunctionComponent } from 'react'
import { track } from './track'

const ReactMemoType = Symbol.for('react.memo') // https://github.com/facebook/react/blob/346c7d4c43a0717302d446da9e7423a8e28d8996/packages/shared/ReactSymbols.js#L30
const ReactForwardRefType = Symbol.for('react.forward_ref')
const ProxyInstance = new WeakMap<FunctionComponent<any>, FunctionComponent<any>>()

function proxyFunctionalComponent(Component: FunctionComponent<any>) {
	const existing = ProxyInstance.get(Component)
	if (existing) return existing
	const tracked = track(Component)
	ProxyInstance.set(Component, tracked)
	return tracked
}

/** @internal */
export function wrapJsx<T>(jsx: T): T {
	if (typeof jsx !== 'function') return jsx

	return function (type: any, props: any, ...rest: any[]) {
		if (typeof type === 'function' && !(type instanceof Component)) {
			type = proxyFunctionalComponent(type)
		} else if (type && typeof type === 'object') {
			if (type.$$typeof === ReactMemoType) {
				type = proxyFunctionalComponent(type.type)
			} else if (type.$$typeof === ReactForwardRefType) {
				type = proxyFunctionalComponent(type)
			}
		}

		return jsx.call(jsx, type, props, ...rest)
	} as any as T
}
