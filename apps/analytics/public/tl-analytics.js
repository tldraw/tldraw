;(function (bs) {
	typeof define == 'function' && define.amd ? define(bs) : bs()
})(function () {
	'use strict'
	function bs(i, n) {
		for (var r = 0; r < n.length; r++) {
			const o = n[r]
			if (typeof o != 'string' && !Array.isArray(o)) {
				for (const l in o)
					if (l !== 'default' && !(l in i)) {
						const u = Object.getOwnPropertyDescriptor(o, l)
						u && Object.defineProperty(i, l, u.get ? u : { enumerable: !0, get: () => o[l] })
					}
			}
		}
		return Object.freeze(Object.defineProperty(i, Symbol.toStringTag, { value: 'Module' }))
	}
	function Na(i) {
		return i && i.__esModule && Object.prototype.hasOwnProperty.call(i, 'default') ? i.default : i
	}
	var Fa = { exports: {} },
		_e = {}
	/**
	 * @license React
	 * react.production.min.js
	 *
	 * Copyright (c) Facebook, Inc. and its affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */ var id
	function Pm() {
		if (id) return _e
		id = 1
		var i = Symbol.for('react.element'),
			n = Symbol.for('react.portal'),
			r = Symbol.for('react.fragment'),
			o = Symbol.for('react.strict_mode'),
			l = Symbol.for('react.profiler'),
			u = Symbol.for('react.provider'),
			d = Symbol.for('react.context'),
			p = Symbol.for('react.forward_ref'),
			h = Symbol.for('react.suspense'),
			g = Symbol.for('react.memo'),
			m = Symbol.for('react.lazy'),
			w = Symbol.iterator
		function _(x) {
			return x === null || typeof x != 'object'
				? null
				: ((x = (w && x[w]) || x['@@iterator']), typeof x == 'function' ? x : null)
		}
		var S = {
				isMounted: function () {
					return !1
				},
				enqueueForceUpdate: function () {},
				enqueueReplaceState: function () {},
				enqueueSetState: function () {},
			},
			M = Object.assign,
			k = {}
		function F(x, L, X) {
			;(this.props = x), (this.context = L), (this.refs = k), (this.updater = X || S)
		}
		;(F.prototype.isReactComponent = {}),
			(F.prototype.setState = function (x, L) {
				if (typeof x != 'object' && typeof x != 'function' && x != null)
					throw Error(
						'setState(...): takes an object of state variables to update or a function which returns an object of state variables.'
					)
				this.updater.enqueueSetState(this, x, L, 'setState')
			}),
			(F.prototype.forceUpdate = function (x) {
				this.updater.enqueueForceUpdate(this, x, 'forceUpdate')
			})
		function j() {}
		j.prototype = F.prototype
		function q(x, L, X) {
			;(this.props = x), (this.context = L), (this.refs = k), (this.updater = X || S)
		}
		var G = (q.prototype = new j())
		;(G.constructor = q), M(G, F.prototype), (G.isPureReactComponent = !0)
		var Q = Array.isArray,
			ue = Object.prototype.hasOwnProperty,
			ve = { current: null },
			ae = { key: !0, ref: !0, __self: !0, __source: !0 }
		function le(x, L, X) {
			var ee,
				ge = {},
				he = null,
				Se = null
			if (L != null)
				for (ee in (L.ref !== void 0 && (Se = L.ref), L.key !== void 0 && (he = '' + L.key), L))
					ue.call(L, ee) && !ae.hasOwnProperty(ee) && (ge[ee] = L[ee])
			var we = arguments.length - 2
			if (we === 1) ge.children = X
			else if (1 < we) {
				for (var Ie = Array(we), Be = 0; Be < we; Be++) Ie[Be] = arguments[Be + 2]
				ge.children = Ie
			}
			if (x && x.defaultProps)
				for (ee in ((we = x.defaultProps), we)) ge[ee] === void 0 && (ge[ee] = we[ee])
			return { $$typeof: i, type: x, key: he, ref: Se, props: ge, _owner: ve.current }
		}
		function pe(x, L) {
			return { $$typeof: i, type: x.type, key: L, ref: x.ref, props: x.props, _owner: x._owner }
		}
		function Ce(x) {
			return typeof x == 'object' && x !== null && x.$$typeof === i
		}
		function He(x) {
			var L = { '=': '=0', ':': '=2' }
			return (
				'$' +
				x.replace(/[=:]/g, function (X) {
					return L[X]
				})
			)
		}
		var Re = /\/+/g
		function Ne(x, L) {
			return typeof x == 'object' && x !== null && x.key != null ? He('' + x.key) : L.toString(36)
		}
		function z(x, L, X, ee, ge) {
			var he = typeof x
			;(he === 'undefined' || he === 'boolean') && (x = null)
			var Se = !1
			if (x === null) Se = !0
			else
				switch (he) {
					case 'string':
					case 'number':
						Se = !0
						break
					case 'object':
						switch (x.$$typeof) {
							case i:
							case n:
								Se = !0
						}
				}
			if (Se)
				return (
					(Se = x),
					(ge = ge(Se)),
					(x = ee === '' ? '.' + Ne(Se, 0) : ee),
					Q(ge)
						? ((X = ''),
							x != null && (X = x.replace(Re, '$&/') + '/'),
							z(ge, L, X, '', function (Be) {
								return Be
							}))
						: ge != null &&
							(Ce(ge) &&
								(ge = pe(
									ge,
									X +
										(!ge.key || (Se && Se.key === ge.key)
											? ''
											: ('' + ge.key).replace(Re, '$&/') + '/') +
										x
								)),
							L.push(ge)),
					1
				)
			if (((Se = 0), (ee = ee === '' ? '.' : ee + ':'), Q(x)))
				for (var we = 0; we < x.length; we++) {
					he = x[we]
					var Ie = ee + Ne(he, we)
					Se += z(he, L, X, Ie, ge)
				}
			else if (((Ie = _(x)), typeof Ie == 'function'))
				for (x = Ie.call(x), we = 0; !(he = x.next()).done; )
					(he = he.value), (Ie = ee + Ne(he, we++)), (Se += z(he, L, X, Ie, ge))
			else if (he === 'object')
				throw (
					((L = String(x)),
					Error(
						'Objects are not valid as a React child (found: ' +
							(L === '[object Object]'
								? 'object with keys {' + Object.keys(x).join(', ') + '}'
								: L) +
							'). If you meant to render a collection of children, use an array instead.'
					))
				)
			return Se
		}
		function I(x, L, X) {
			if (x == null) return x
			var ee = [],
				ge = 0
			return (
				z(x, ee, '', '', function (he) {
					return L.call(X, he, ge++)
				}),
				ee
			)
		}
		function A(x) {
			if (x._status === -1) {
				var L = x._result
				;(L = L()),
					L.then(
						function (X) {
							;(x._status === 0 || x._status === -1) && ((x._status = 1), (x._result = X))
						},
						function (X) {
							;(x._status === 0 || x._status === -1) && ((x._status = 2), (x._result = X))
						}
					),
					x._status === -1 && ((x._status = 0), (x._result = L))
			}
			if (x._status === 1) return x._result.default
			throw x._result
		}
		var D = { current: null },
			T = { transition: null },
			$ = { ReactCurrentDispatcher: D, ReactCurrentBatchConfig: T, ReactCurrentOwner: ve }
		function W() {
			throw Error('act(...) is not supported in production builds of React.')
		}
		return (
			(_e.Children = {
				map: I,
				forEach: function (x, L, X) {
					I(
						x,
						function () {
							L.apply(this, arguments)
						},
						X
					)
				},
				count: function (x) {
					var L = 0
					return (
						I(x, function () {
							L++
						}),
						L
					)
				},
				toArray: function (x) {
					return (
						I(x, function (L) {
							return L
						}) || []
					)
				},
				only: function (x) {
					if (!Ce(x))
						throw Error('React.Children.only expected to receive a single React element child.')
					return x
				},
			}),
			(_e.Component = F),
			(_e.Fragment = r),
			(_e.Profiler = l),
			(_e.PureComponent = q),
			(_e.StrictMode = o),
			(_e.Suspense = h),
			(_e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = $),
			(_e.act = W),
			(_e.cloneElement = function (x, L, X) {
				if (x == null)
					throw Error(
						'React.cloneElement(...): The argument must be a React element, but you passed ' +
							x +
							'.'
					)
				var ee = M({}, x.props),
					ge = x.key,
					he = x.ref,
					Se = x._owner
				if (L != null) {
					if (
						(L.ref !== void 0 && ((he = L.ref), (Se = ve.current)),
						L.key !== void 0 && (ge = '' + L.key),
						x.type && x.type.defaultProps)
					)
						var we = x.type.defaultProps
					for (Ie in L)
						ue.call(L, Ie) &&
							!ae.hasOwnProperty(Ie) &&
							(ee[Ie] = L[Ie] === void 0 && we !== void 0 ? we[Ie] : L[Ie])
				}
				var Ie = arguments.length - 2
				if (Ie === 1) ee.children = X
				else if (1 < Ie) {
					we = Array(Ie)
					for (var Be = 0; Be < Ie; Be++) we[Be] = arguments[Be + 2]
					ee.children = we
				}
				return { $$typeof: i, type: x.type, key: ge, ref: he, props: ee, _owner: Se }
			}),
			(_e.createContext = function (x) {
				return (
					(x = {
						$$typeof: d,
						_currentValue: x,
						_currentValue2: x,
						_threadCount: 0,
						Provider: null,
						Consumer: null,
						_defaultValue: null,
						_globalName: null,
					}),
					(x.Provider = { $$typeof: u, _context: x }),
					(x.Consumer = x)
				)
			}),
			(_e.createElement = le),
			(_e.createFactory = function (x) {
				var L = le.bind(null, x)
				return (L.type = x), L
			}),
			(_e.createRef = function () {
				return { current: null }
			}),
			(_e.forwardRef = function (x) {
				return { $$typeof: p, render: x }
			}),
			(_e.isValidElement = Ce),
			(_e.lazy = function (x) {
				return { $$typeof: m, _payload: { _status: -1, _result: x }, _init: A }
			}),
			(_e.memo = function (x, L) {
				return { $$typeof: g, type: x, compare: L === void 0 ? null : L }
			}),
			(_e.startTransition = function (x) {
				var L = T.transition
				T.transition = {}
				try {
					x()
				} finally {
					T.transition = L
				}
			}),
			(_e.unstable_act = W),
			(_e.useCallback = function (x, L) {
				return D.current.useCallback(x, L)
			}),
			(_e.useContext = function (x) {
				return D.current.useContext(x)
			}),
			(_e.useDebugValue = function () {}),
			(_e.useDeferredValue = function (x) {
				return D.current.useDeferredValue(x)
			}),
			(_e.useEffect = function (x, L) {
				return D.current.useEffect(x, L)
			}),
			(_e.useId = function () {
				return D.current.useId()
			}),
			(_e.useImperativeHandle = function (x, L, X) {
				return D.current.useImperativeHandle(x, L, X)
			}),
			(_e.useInsertionEffect = function (x, L) {
				return D.current.useInsertionEffect(x, L)
			}),
			(_e.useLayoutEffect = function (x, L) {
				return D.current.useLayoutEffect(x, L)
			}),
			(_e.useMemo = function (x, L) {
				return D.current.useMemo(x, L)
			}),
			(_e.useReducer = function (x, L, X) {
				return D.current.useReducer(x, L, X)
			}),
			(_e.useRef = function (x) {
				return D.current.useRef(x)
			}),
			(_e.useState = function (x) {
				return D.current.useState(x)
			}),
			(_e.useSyncExternalStore = function (x, L, X) {
				return D.current.useSyncExternalStore(x, L, X)
			}),
			(_e.useTransition = function () {
				return D.current.useTransition()
			}),
			(_e.version = '18.3.1'),
			_e
		)
	}
	var sd
	function Ma() {
		return sd || ((sd = 1), (Fa.exports = Pm())), Fa.exports
	}
	var R = Ma()
	const La = Na(R),
		od = bs({ __proto__: null, default: La }, [R])
	var Rs = {},
		Da = { exports: {} },
		mt = {},
		Aa = { exports: {} },
		$a = {}
	/**
	 * @license React
	 * scheduler.production.min.js
	 *
	 * Copyright (c) Facebook, Inc. and its affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */ var ad
	function bm() {
		return (
			ad ||
				((ad = 1),
				(function (i) {
					function n(T, $) {
						var W = T.length
						T.push($)
						e: for (; 0 < W; ) {
							var x = (W - 1) >>> 1,
								L = T[x]
							if (0 < l(L, $)) (T[x] = $), (T[W] = L), (W = x)
							else break e
						}
					}
					function r(T) {
						return T.length === 0 ? null : T[0]
					}
					function o(T) {
						if (T.length === 0) return null
						var $ = T[0],
							W = T.pop()
						if (W !== $) {
							T[0] = W
							e: for (var x = 0, L = T.length, X = L >>> 1; x < X; ) {
								var ee = 2 * (x + 1) - 1,
									ge = T[ee],
									he = ee + 1,
									Se = T[he]
								if (0 > l(ge, W))
									he < L && 0 > l(Se, ge)
										? ((T[x] = Se), (T[he] = W), (x = he))
										: ((T[x] = ge), (T[ee] = W), (x = ee))
								else if (he < L && 0 > l(Se, W)) (T[x] = Se), (T[he] = W), (x = he)
								else break e
							}
						}
						return $
					}
					function l(T, $) {
						var W = T.sortIndex - $.sortIndex
						return W !== 0 ? W : T.id - $.id
					}
					if (typeof performance == 'object' && typeof performance.now == 'function') {
						var u = performance
						i.unstable_now = function () {
							return u.now()
						}
					} else {
						var d = Date,
							p = d.now()
						i.unstable_now = function () {
							return d.now() - p
						}
					}
					var h = [],
						g = [],
						m = 1,
						w = null,
						_ = 3,
						S = !1,
						M = !1,
						k = !1,
						F = typeof setTimeout == 'function' ? setTimeout : null,
						j = typeof clearTimeout == 'function' ? clearTimeout : null,
						q = typeof setImmediate < 'u' ? setImmediate : null
					typeof navigator < 'u' &&
						navigator.scheduling !== void 0 &&
						navigator.scheduling.isInputPending !== void 0 &&
						navigator.scheduling.isInputPending.bind(navigator.scheduling)
					function G(T) {
						for (var $ = r(g); $ !== null; ) {
							if ($.callback === null) o(g)
							else if ($.startTime <= T) o(g), ($.sortIndex = $.expirationTime), n(h, $)
							else break
							$ = r(g)
						}
					}
					function Q(T) {
						if (((k = !1), G(T), !M))
							if (r(h) !== null) (M = !0), A(ue)
							else {
								var $ = r(g)
								$ !== null && D(Q, $.startTime - T)
							}
					}
					function ue(T, $) {
						;(M = !1), k && ((k = !1), j(le), (le = -1)), (S = !0)
						var W = _
						try {
							for (G($), w = r(h); w !== null && (!(w.expirationTime > $) || (T && !He())); ) {
								var x = w.callback
								if (typeof x == 'function') {
									;(w.callback = null), (_ = w.priorityLevel)
									var L = x(w.expirationTime <= $)
									;($ = i.unstable_now()),
										typeof L == 'function' ? (w.callback = L) : w === r(h) && o(h),
										G($)
								} else o(h)
								w = r(h)
							}
							if (w !== null) var X = !0
							else {
								var ee = r(g)
								ee !== null && D(Q, ee.startTime - $), (X = !1)
							}
							return X
						} finally {
							;(w = null), (_ = W), (S = !1)
						}
					}
					var ve = !1,
						ae = null,
						le = -1,
						pe = 5,
						Ce = -1
					function He() {
						return !(i.unstable_now() - Ce < pe)
					}
					function Re() {
						if (ae !== null) {
							var T = i.unstable_now()
							Ce = T
							var $ = !0
							try {
								$ = ae(!0, T)
							} finally {
								$ ? Ne() : ((ve = !1), (ae = null))
							}
						} else ve = !1
					}
					var Ne
					if (typeof q == 'function')
						Ne = function () {
							q(Re)
						}
					else if (typeof MessageChannel < 'u') {
						var z = new MessageChannel(),
							I = z.port2
						;(z.port1.onmessage = Re),
							(Ne = function () {
								I.postMessage(null)
							})
					} else
						Ne = function () {
							F(Re, 0)
						}
					function A(T) {
						;(ae = T), ve || ((ve = !0), Ne())
					}
					function D(T, $) {
						le = F(function () {
							T(i.unstable_now())
						}, $)
					}
					;(i.unstable_IdlePriority = 5),
						(i.unstable_ImmediatePriority = 1),
						(i.unstable_LowPriority = 4),
						(i.unstable_NormalPriority = 3),
						(i.unstable_Profiling = null),
						(i.unstable_UserBlockingPriority = 2),
						(i.unstable_cancelCallback = function (T) {
							T.callback = null
						}),
						(i.unstable_continueExecution = function () {
							M || S || ((M = !0), A(ue))
						}),
						(i.unstable_forceFrameRate = function (T) {
							0 > T || 125 < T
								? console.error(
										'forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported'
									)
								: (pe = 0 < T ? Math.floor(1e3 / T) : 5)
						}),
						(i.unstable_getCurrentPriorityLevel = function () {
							return _
						}),
						(i.unstable_getFirstCallbackNode = function () {
							return r(h)
						}),
						(i.unstable_next = function (T) {
							switch (_) {
								case 1:
								case 2:
								case 3:
									var $ = 3
									break
								default:
									$ = _
							}
							var W = _
							_ = $
							try {
								return T()
							} finally {
								_ = W
							}
						}),
						(i.unstable_pauseExecution = function () {}),
						(i.unstable_requestPaint = function () {}),
						(i.unstable_runWithPriority = function (T, $) {
							switch (T) {
								case 1:
								case 2:
								case 3:
								case 4:
								case 5:
									break
								default:
									T = 3
							}
							var W = _
							_ = T
							try {
								return $()
							} finally {
								_ = W
							}
						}),
						(i.unstable_scheduleCallback = function (T, $, W) {
							var x = i.unstable_now()
							switch (
								(typeof W == 'object' && W !== null
									? ((W = W.delay), (W = typeof W == 'number' && 0 < W ? x + W : x))
									: (W = x),
								T)
							) {
								case 1:
									var L = -1
									break
								case 2:
									L = 250
									break
								case 5:
									L = 1073741823
									break
								case 4:
									L = 1e4
									break
								default:
									L = 5e3
							}
							return (
								(L = W + L),
								(T = {
									id: m++,
									callback: $,
									priorityLevel: T,
									startTime: W,
									expirationTime: L,
									sortIndex: -1,
								}),
								W > x
									? ((T.sortIndex = W),
										n(g, T),
										r(h) === null && T === r(g) && (k ? (j(le), (le = -1)) : (k = !0), D(Q, W - x)))
									: ((T.sortIndex = L), n(h, T), M || S || ((M = !0), A(ue))),
								T
							)
						}),
						(i.unstable_shouldYield = He),
						(i.unstable_wrapCallback = function (T) {
							var $ = _
							return function () {
								var W = _
								_ = $
								try {
									return T.apply(this, arguments)
								} finally {
									_ = W
								}
							}
						})
				})($a)),
			$a
		)
	}
	var ld
	function Rm() {
		return ld || ((ld = 1), (Aa.exports = bm())), Aa.exports
	}
	/**
	 * @license React
	 * react-dom.production.min.js
	 *
	 * Copyright (c) Facebook, Inc. and its affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */ var ud
	function Im() {
		if (ud) return mt
		ud = 1
		var i = Ma(),
			n = Rm()
		function r(e) {
			for (
				var t = 'https://reactjs.org/docs/error-decoder.html?invariant=' + e, s = 1;
				s < arguments.length;
				s++
			)
				t += '&args[]=' + encodeURIComponent(arguments[s])
			return (
				'Minified React error #' +
				e +
				'; visit ' +
				t +
				' for the full message or use the non-minified dev environment for full errors and additional helpful warnings.'
			)
		}
		var o = new Set(),
			l = {}
		function u(e, t) {
			d(e, t), d(e + 'Capture', t)
		}
		function d(e, t) {
			for (l[e] = t, e = 0; e < t.length; e++) o.add(t[e])
		}
		var p = !(
				typeof window > 'u' ||
				typeof window.document > 'u' ||
				typeof window.document.createElement > 'u'
			),
			h = Object.prototype.hasOwnProperty,
			g =
				/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
			m = {},
			w = {}
		function _(e) {
			return h.call(w, e) ? !0 : h.call(m, e) ? !1 : g.test(e) ? (w[e] = !0) : ((m[e] = !0), !1)
		}
		function S(e, t, s, a) {
			if (s !== null && s.type === 0) return !1
			switch (typeof t) {
				case 'function':
				case 'symbol':
					return !0
				case 'boolean':
					return a
						? !1
						: s !== null
							? !s.acceptsBooleans
							: ((e = e.toLowerCase().slice(0, 5)), e !== 'data-' && e !== 'aria-')
				default:
					return !1
			}
		}
		function M(e, t, s, a) {
			if (t === null || typeof t > 'u' || S(e, t, s, a)) return !0
			if (a) return !1
			if (s !== null)
				switch (s.type) {
					case 3:
						return !t
					case 4:
						return t === !1
					case 5:
						return isNaN(t)
					case 6:
						return isNaN(t) || 1 > t
				}
			return !1
		}
		function k(e, t, s, a, c, f, v) {
			;(this.acceptsBooleans = t === 2 || t === 3 || t === 4),
				(this.attributeName = a),
				(this.attributeNamespace = c),
				(this.mustUseProperty = s),
				(this.propertyName = e),
				(this.type = t),
				(this.sanitizeURL = f),
				(this.removeEmptyString = v)
		}
		var F = {}
		'children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style'
			.split(' ')
			.forEach(function (e) {
				F[e] = new k(e, 0, !1, e, null, !1, !1)
			}),
			[
				['acceptCharset', 'accept-charset'],
				['className', 'class'],
				['htmlFor', 'for'],
				['httpEquiv', 'http-equiv'],
			].forEach(function (e) {
				var t = e[0]
				F[t] = new k(t, 1, !1, e[1], null, !1, !1)
			}),
			['contentEditable', 'draggable', 'spellCheck', 'value'].forEach(function (e) {
				F[e] = new k(e, 2, !1, e.toLowerCase(), null, !1, !1)
			}),
			['autoReverse', 'externalResourcesRequired', 'focusable', 'preserveAlpha'].forEach(
				function (e) {
					F[e] = new k(e, 2, !1, e, null, !1, !1)
				}
			),
			'allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope'
				.split(' ')
				.forEach(function (e) {
					F[e] = new k(e, 3, !1, e.toLowerCase(), null, !1, !1)
				}),
			['checked', 'multiple', 'muted', 'selected'].forEach(function (e) {
				F[e] = new k(e, 3, !0, e, null, !1, !1)
			}),
			['capture', 'download'].forEach(function (e) {
				F[e] = new k(e, 4, !1, e, null, !1, !1)
			}),
			['cols', 'rows', 'size', 'span'].forEach(function (e) {
				F[e] = new k(e, 6, !1, e, null, !1, !1)
			}),
			['rowSpan', 'start'].forEach(function (e) {
				F[e] = new k(e, 5, !1, e.toLowerCase(), null, !1, !1)
			})
		var j = /[\-:]([a-z])/g
		function q(e) {
			return e[1].toUpperCase()
		}
		'accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height'
			.split(' ')
			.forEach(function (e) {
				var t = e.replace(j, q)
				F[t] = new k(t, 1, !1, e, null, !1, !1)
			}),
			'xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type'
				.split(' ')
				.forEach(function (e) {
					var t = e.replace(j, q)
					F[t] = new k(t, 1, !1, e, 'http://www.w3.org/1999/xlink', !1, !1)
				}),
			['xml:base', 'xml:lang', 'xml:space'].forEach(function (e) {
				var t = e.replace(j, q)
				F[t] = new k(t, 1, !1, e, 'http://www.w3.org/XML/1998/namespace', !1, !1)
			}),
			['tabIndex', 'crossOrigin'].forEach(function (e) {
				F[e] = new k(e, 1, !1, e.toLowerCase(), null, !1, !1)
			}),
			(F.xlinkHref = new k(
				'xlinkHref',
				1,
				!1,
				'xlink:href',
				'http://www.w3.org/1999/xlink',
				!0,
				!1
			)),
			['src', 'href', 'action', 'formAction'].forEach(function (e) {
				F[e] = new k(e, 1, !1, e.toLowerCase(), null, !0, !0)
			})
		function G(e, t, s, a) {
			var c = F.hasOwnProperty(t) ? F[t] : null
			;(c !== null
				? c.type !== 0
				: a ||
					!(2 < t.length) ||
					(t[0] !== 'o' && t[0] !== 'O') ||
					(t[1] !== 'n' && t[1] !== 'N')) &&
				(M(t, s, c, a) && (s = null),
				a || c === null
					? _(t) && (s === null ? e.removeAttribute(t) : e.setAttribute(t, '' + s))
					: c.mustUseProperty
						? (e[c.propertyName] = s === null ? (c.type === 3 ? !1 : '') : s)
						: ((t = c.attributeName),
							(a = c.attributeNamespace),
							s === null
								? e.removeAttribute(t)
								: ((c = c.type),
									(s = c === 3 || (c === 4 && s === !0) ? '' : '' + s),
									a ? e.setAttributeNS(a, t, s) : e.setAttribute(t, s))))
		}
		var Q = i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
			ue = Symbol.for('react.element'),
			ve = Symbol.for('react.portal'),
			ae = Symbol.for('react.fragment'),
			le = Symbol.for('react.strict_mode'),
			pe = Symbol.for('react.profiler'),
			Ce = Symbol.for('react.provider'),
			He = Symbol.for('react.context'),
			Re = Symbol.for('react.forward_ref'),
			Ne = Symbol.for('react.suspense'),
			z = Symbol.for('react.suspense_list'),
			I = Symbol.for('react.memo'),
			A = Symbol.for('react.lazy'),
			D = Symbol.for('react.offscreen'),
			T = Symbol.iterator
		function $(e) {
			return e === null || typeof e != 'object'
				? null
				: ((e = (T && e[T]) || e['@@iterator']), typeof e == 'function' ? e : null)
		}
		var W = Object.assign,
			x
		function L(e) {
			if (x === void 0)
				try {
					throw Error()
				} catch (s) {
					var t = s.stack.trim().match(/\n( *(at )?)/)
					x = (t && t[1]) || ''
				}
			return (
				`
` +
				x +
				e
			)
		}
		var X = !1
		function ee(e, t) {
			if (!e || X) return ''
			X = !0
			var s = Error.prepareStackTrace
			Error.prepareStackTrace = void 0
			try {
				if (t)
					if (
						((t = function () {
							throw Error()
						}),
						Object.defineProperty(t.prototype, 'props', {
							set: function () {
								throw Error()
							},
						}),
						typeof Reflect == 'object' && Reflect.construct)
					) {
						try {
							Reflect.construct(t, [])
						} catch (O) {
							var a = O
						}
						Reflect.construct(e, [], t)
					} else {
						try {
							t.call()
						} catch (O) {
							a = O
						}
						e.call(t.prototype)
					}
				else {
					try {
						throw Error()
					} catch (O) {
						a = O
					}
					e()
				}
			} catch (O) {
				if (O && a && typeof O.stack == 'string') {
					for (
						var c = O.stack.split(`
`),
							f = a.stack.split(`
`),
							v = c.length - 1,
							y = f.length - 1;
						1 <= v && 0 <= y && c[v] !== f[y];

					)
						y--
					for (; 1 <= v && 0 <= y; v--, y--)
						if (c[v] !== f[y]) {
							if (v !== 1 || y !== 1)
								do
									if ((v--, y--, 0 > y || c[v] !== f[y])) {
										var E =
											`
` + c[v].replace(' at new ', ' at ')
										return (
											e.displayName &&
												E.includes('<anonymous>') &&
												(E = E.replace('<anonymous>', e.displayName)),
											E
										)
									}
								while (1 <= v && 0 <= y)
							break
						}
				}
			} finally {
				;(X = !1), (Error.prepareStackTrace = s)
			}
			return (e = e ? e.displayName || e.name : '') ? L(e) : ''
		}
		function ge(e) {
			switch (e.tag) {
				case 5:
					return L(e.type)
				case 16:
					return L('Lazy')
				case 13:
					return L('Suspense')
				case 19:
					return L('SuspenseList')
				case 0:
				case 2:
				case 15:
					return (e = ee(e.type, !1)), e
				case 11:
					return (e = ee(e.type.render, !1)), e
				case 1:
					return (e = ee(e.type, !0)), e
				default:
					return ''
			}
		}
		function he(e) {
			if (e == null) return null
			if (typeof e == 'function') return e.displayName || e.name || null
			if (typeof e == 'string') return e
			switch (e) {
				case ae:
					return 'Fragment'
				case ve:
					return 'Portal'
				case pe:
					return 'Profiler'
				case le:
					return 'StrictMode'
				case Ne:
					return 'Suspense'
				case z:
					return 'SuspenseList'
			}
			if (typeof e == 'object')
				switch (e.$$typeof) {
					case He:
						return (e.displayName || 'Context') + '.Consumer'
					case Ce:
						return (e._context.displayName || 'Context') + '.Provider'
					case Re:
						var t = e.render
						return (
							(e = e.displayName),
							e ||
								((e = t.displayName || t.name || ''),
								(e = e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')),
							e
						)
					case I:
						return (t = e.displayName || null), t !== null ? t : he(e.type) || 'Memo'
					case A:
						;(t = e._payload), (e = e._init)
						try {
							return he(e(t))
						} catch {}
				}
			return null
		}
		function Se(e) {
			var t = e.type
			switch (e.tag) {
				case 24:
					return 'Cache'
				case 9:
					return (t.displayName || 'Context') + '.Consumer'
				case 10:
					return (t._context.displayName || 'Context') + '.Provider'
				case 18:
					return 'DehydratedFragment'
				case 11:
					return (
						(e = t.render),
						(e = e.displayName || e.name || ''),
						t.displayName || (e !== '' ? 'ForwardRef(' + e + ')' : 'ForwardRef')
					)
				case 7:
					return 'Fragment'
				case 5:
					return t
				case 4:
					return 'Portal'
				case 3:
					return 'Root'
				case 6:
					return 'Text'
				case 16:
					return he(t)
				case 8:
					return t === le ? 'StrictMode' : 'Mode'
				case 22:
					return 'Offscreen'
				case 12:
					return 'Profiler'
				case 21:
					return 'Scope'
				case 13:
					return 'Suspense'
				case 19:
					return 'SuspenseList'
				case 25:
					return 'TracingMarker'
				case 1:
				case 0:
				case 17:
				case 2:
				case 14:
				case 15:
					if (typeof t == 'function') return t.displayName || t.name || null
					if (typeof t == 'string') return t
			}
			return null
		}
		function we(e) {
			switch (typeof e) {
				case 'boolean':
				case 'number':
				case 'string':
				case 'undefined':
					return e
				case 'object':
					return e
				default:
					return ''
			}
		}
		function Ie(e) {
			var t = e.type
			return (e = e.nodeName) && e.toLowerCase() === 'input' && (t === 'checkbox' || t === 'radio')
		}
		function Be(e) {
			var t = Ie(e) ? 'checked' : 'value',
				s = Object.getOwnPropertyDescriptor(e.constructor.prototype, t),
				a = '' + e[t]
			if (
				!e.hasOwnProperty(t) &&
				typeof s < 'u' &&
				typeof s.get == 'function' &&
				typeof s.set == 'function'
			) {
				var c = s.get,
					f = s.set
				return (
					Object.defineProperty(e, t, {
						configurable: !0,
						get: function () {
							return c.call(this)
						},
						set: function (v) {
							;(a = '' + v), f.call(this, v)
						},
					}),
					Object.defineProperty(e, t, { enumerable: s.enumerable }),
					{
						getValue: function () {
							return a
						},
						setValue: function (v) {
							a = '' + v
						},
						stopTracking: function () {
							;(e._valueTracker = null), delete e[t]
						},
					}
				)
			}
		}
		function Vr(e) {
			e._valueTracker || (e._valueTracker = Be(e))
		}
		function zi(e) {
			if (!e) return !1
			var t = e._valueTracker
			if (!t) return !0
			var s = t.getValue(),
				a = ''
			return (
				e && (a = Ie(e) ? (e.checked ? 'true' : 'false') : e.value),
				(e = a),
				e !== s ? (t.setValue(e), !0) : !1
			)
		}
		function An(e) {
			if (((e = e || (typeof document < 'u' ? document : void 0)), typeof e > 'u')) return null
			try {
				return e.activeElement || e.body
			} catch {
				return e.body
			}
		}
		function qr(e, t) {
			var s = t.checked
			return W({}, t, {
				defaultChecked: void 0,
				defaultValue: void 0,
				value: void 0,
				checked: s ?? e._wrapperState.initialChecked,
			})
		}
		function ji(e, t) {
			var s = t.defaultValue == null ? '' : t.defaultValue,
				a = t.checked != null ? t.checked : t.defaultChecked
			;(s = we(t.value != null ? t.value : s)),
				(e._wrapperState = {
					initialChecked: a,
					initialValue: s,
					controlled:
						t.type === 'checkbox' || t.type === 'radio' ? t.checked != null : t.value != null,
				})
		}
		function Ui(e, t) {
			;(t = t.checked), t != null && G(e, 'checked', t, !1)
		}
		function pr(e, t) {
			Ui(e, t)
			var s = we(t.value),
				a = t.type
			if (s != null)
				a === 'number'
					? ((s === 0 && e.value === '') || e.value != s) && (e.value = '' + s)
					: e.value !== '' + s && (e.value = '' + s)
			else if (a === 'submit' || a === 'reset') {
				e.removeAttribute('value')
				return
			}
			t.hasOwnProperty('value')
				? pu(e, t.type, s)
				: t.hasOwnProperty('defaultValue') && pu(e, t.type, we(t.defaultValue)),
				t.checked == null && t.defaultChecked != null && (e.defaultChecked = !!t.defaultChecked)
		}
		function Lh(e, t, s) {
			if (t.hasOwnProperty('value') || t.hasOwnProperty('defaultValue')) {
				var a = t.type
				if (!((a !== 'submit' && a !== 'reset') || (t.value !== void 0 && t.value !== null))) return
				;(t = '' + e._wrapperState.initialValue),
					s || t === e.value || (e.value = t),
					(e.defaultValue = t)
			}
			;(s = e.name),
				s !== '' && (e.name = ''),
				(e.defaultChecked = !!e._wrapperState.initialChecked),
				s !== '' && (e.name = s)
		}
		function pu(e, t, s) {
			;(t !== 'number' || An(e.ownerDocument) !== e) &&
				(s == null
					? (e.defaultValue = '' + e._wrapperState.initialValue)
					: e.defaultValue !== '' + s && (e.defaultValue = '' + s))
		}
		var Bi = Array.isArray
		function Gr(e, t, s, a) {
			if (((e = e.options), t)) {
				t = {}
				for (var c = 0; c < s.length; c++) t['$' + s[c]] = !0
				for (s = 0; s < e.length; s++)
					(c = t.hasOwnProperty('$' + e[s].value)),
						e[s].selected !== c && (e[s].selected = c),
						c && a && (e[s].defaultSelected = !0)
			} else {
				for (s = '' + we(s), t = null, c = 0; c < e.length; c++) {
					if (e[c].value === s) {
						;(e[c].selected = !0), a && (e[c].defaultSelected = !0)
						return
					}
					t !== null || e[c].disabled || (t = e[c])
				}
				t !== null && (t.selected = !0)
			}
		}
		function hu(e, t) {
			if (t.dangerouslySetInnerHTML != null) throw Error(r(91))
			return W({}, t, {
				value: void 0,
				defaultValue: void 0,
				children: '' + e._wrapperState.initialValue,
			})
		}
		function Dh(e, t) {
			var s = t.value
			if (s == null) {
				if (((s = t.children), (t = t.defaultValue), s != null)) {
					if (t != null) throw Error(r(92))
					if (Bi(s)) {
						if (1 < s.length) throw Error(r(93))
						s = s[0]
					}
					t = s
				}
				t == null && (t = ''), (s = t)
			}
			e._wrapperState = { initialValue: we(s) }
		}
		function Ah(e, t) {
			var s = we(t.value),
				a = we(t.defaultValue)
			s != null &&
				((s = '' + s),
				s !== e.value && (e.value = s),
				t.defaultValue == null && e.defaultValue !== s && (e.defaultValue = s)),
				a != null && (e.defaultValue = '' + a)
		}
		function $h(e) {
			var t = e.textContent
			t === e._wrapperState.initialValue && t !== '' && t !== null && (e.value = t)
		}
		function zh(e) {
			switch (e) {
				case 'svg':
					return 'http://www.w3.org/2000/svg'
				case 'math':
					return 'http://www.w3.org/1998/Math/MathML'
				default:
					return 'http://www.w3.org/1999/xhtml'
			}
		}
		function vu(e, t) {
			return e == null || e === 'http://www.w3.org/1999/xhtml'
				? zh(t)
				: e === 'http://www.w3.org/2000/svg' && t === 'foreignObject'
					? 'http://www.w3.org/1999/xhtml'
					: e
		}
		var xo,
			jh = (function (e) {
				return typeof MSApp < 'u' && MSApp.execUnsafeLocalFunction
					? function (t, s, a, c) {
							MSApp.execUnsafeLocalFunction(function () {
								return e(t, s, a, c)
							})
						}
					: e
			})(function (e, t) {
				if (e.namespaceURI !== 'http://www.w3.org/2000/svg' || 'innerHTML' in e) e.innerHTML = t
				else {
					for (
						xo = xo || document.createElement('div'),
							xo.innerHTML = '<svg>' + t.valueOf().toString() + '</svg>',
							t = xo.firstChild;
						e.firstChild;

					)
						e.removeChild(e.firstChild)
					for (; t.firstChild; ) e.appendChild(t.firstChild)
				}
			})
		function Wi(e, t) {
			if (t) {
				var s = e.firstChild
				if (s && s === e.lastChild && s.nodeType === 3) {
					s.nodeValue = t
					return
				}
			}
			e.textContent = t
		}
		var Hi = {
				animationIterationCount: !0,
				aspectRatio: !0,
				borderImageOutset: !0,
				borderImageSlice: !0,
				borderImageWidth: !0,
				boxFlex: !0,
				boxFlexGroup: !0,
				boxOrdinalGroup: !0,
				columnCount: !0,
				columns: !0,
				flex: !0,
				flexGrow: !0,
				flexPositive: !0,
				flexShrink: !0,
				flexNegative: !0,
				flexOrder: !0,
				gridArea: !0,
				gridRow: !0,
				gridRowEnd: !0,
				gridRowSpan: !0,
				gridRowStart: !0,
				gridColumn: !0,
				gridColumnEnd: !0,
				gridColumnSpan: !0,
				gridColumnStart: !0,
				fontWeight: !0,
				lineClamp: !0,
				lineHeight: !0,
				opacity: !0,
				order: !0,
				orphans: !0,
				tabSize: !0,
				widows: !0,
				zIndex: !0,
				zoom: !0,
				fillOpacity: !0,
				floodOpacity: !0,
				stopOpacity: !0,
				strokeDasharray: !0,
				strokeDashoffset: !0,
				strokeMiterlimit: !0,
				strokeOpacity: !0,
				strokeWidth: !0,
			},
			Jw = ['Webkit', 'ms', 'Moz', 'O']
		Object.keys(Hi).forEach(function (e) {
			Jw.forEach(function (t) {
				;(t = t + e.charAt(0).toUpperCase() + e.substring(1)), (Hi[t] = Hi[e])
			})
		})
		function Uh(e, t, s) {
			return t == null || typeof t == 'boolean' || t === ''
				? ''
				: s || typeof t != 'number' || t === 0 || (Hi.hasOwnProperty(e) && Hi[e])
					? ('' + t).trim()
					: t + 'px'
		}
		function Bh(e, t) {
			e = e.style
			for (var s in t)
				if (t.hasOwnProperty(s)) {
					var a = s.indexOf('--') === 0,
						c = Uh(s, t[s], a)
					s === 'float' && (s = 'cssFloat'), a ? e.setProperty(s, c) : (e[s] = c)
				}
		}
		var e1 = W(
			{ menuitem: !0 },
			{
				area: !0,
				base: !0,
				br: !0,
				col: !0,
				embed: !0,
				hr: !0,
				img: !0,
				input: !0,
				keygen: !0,
				link: !0,
				meta: !0,
				param: !0,
				source: !0,
				track: !0,
				wbr: !0,
			}
		)
		function gu(e, t) {
			if (t) {
				if (e1[e] && (t.children != null || t.dangerouslySetInnerHTML != null))
					throw Error(r(137, e))
				if (t.dangerouslySetInnerHTML != null) {
					if (t.children != null) throw Error(r(60))
					if (
						typeof t.dangerouslySetInnerHTML != 'object' ||
						!('__html' in t.dangerouslySetInnerHTML)
					)
						throw Error(r(61))
				}
				if (t.style != null && typeof t.style != 'object') throw Error(r(62))
			}
		}
		function mu(e, t) {
			if (e.indexOf('-') === -1) return typeof t.is == 'string'
			switch (e) {
				case 'annotation-xml':
				case 'color-profile':
				case 'font-face':
				case 'font-face-src':
				case 'font-face-uri':
				case 'font-face-format':
				case 'font-face-name':
				case 'missing-glyph':
					return !1
				default:
					return !0
			}
		}
		var _u = null
		function yu(e) {
			return (
				(e = e.target || e.srcElement || window),
				e.correspondingUseElement && (e = e.correspondingUseElement),
				e.nodeType === 3 ? e.parentNode : e
			)
		}
		var wu = null,
			Qr = null,
			Kr = null
		function Wh(e) {
			if ((e = fs(e))) {
				if (typeof wu != 'function') throw Error(r(280))
				var t = e.stateNode
				t && ((t = Go(t)), wu(e.stateNode, e.type, t))
			}
		}
		function Hh(e) {
			Qr ? (Kr ? Kr.push(e) : (Kr = [e])) : (Qr = e)
		}
		function Vh() {
			if (Qr) {
				var e = Qr,
					t = Kr
				if (((Kr = Qr = null), Wh(e), t)) for (e = 0; e < t.length; e++) Wh(t[e])
			}
		}
		function qh(e, t) {
			return e(t)
		}
		function Gh() {}
		var Su = !1
		function Qh(e, t, s) {
			if (Su) return e(t, s)
			Su = !0
			try {
				return qh(e, t, s)
			} finally {
				;(Su = !1), (Qr !== null || Kr !== null) && (Gh(), Vh())
			}
		}
		function Vi(e, t) {
			var s = e.stateNode
			if (s === null) return null
			var a = Go(s)
			if (a === null) return null
			s = a[t]
			e: switch (t) {
				case 'onClick':
				case 'onClickCapture':
				case 'onDoubleClick':
				case 'onDoubleClickCapture':
				case 'onMouseDown':
				case 'onMouseDownCapture':
				case 'onMouseMove':
				case 'onMouseMoveCapture':
				case 'onMouseUp':
				case 'onMouseUpCapture':
				case 'onMouseEnter':
					;(a = !a.disabled) ||
						((e = e.type),
						(a = !(e === 'button' || e === 'input' || e === 'select' || e === 'textarea'))),
						(e = !a)
					break e
				default:
					e = !1
			}
			if (e) return null
			if (s && typeof s != 'function') throw Error(r(231, t, typeof s))
			return s
		}
		var Eu = !1
		if (p)
			try {
				var qi = {}
				Object.defineProperty(qi, 'passive', {
					get: function () {
						Eu = !0
					},
				}),
					window.addEventListener('test', qi, qi),
					window.removeEventListener('test', qi, qi)
			} catch {
				Eu = !1
			}
		function t1(e, t, s, a, c, f, v, y, E) {
			var O = Array.prototype.slice.call(arguments, 3)
			try {
				t.apply(s, O)
			} catch (B) {
				this.onError(B)
			}
		}
		var Gi = !1,
			Co = null,
			Po = !1,
			ku = null,
			n1 = {
				onError: function (e) {
					;(Gi = !0), (Co = e)
				},
			}
		function r1(e, t, s, a, c, f, v, y, E) {
			;(Gi = !1), (Co = null), t1.apply(n1, arguments)
		}
		function i1(e, t, s, a, c, f, v, y, E) {
			if ((r1.apply(this, arguments), Gi)) {
				if (Gi) {
					var O = Co
					;(Gi = !1), (Co = null)
				} else throw Error(r(198))
				Po || ((Po = !0), (ku = O))
			}
		}
		function hr(e) {
			var t = e,
				s = e
			if (e.alternate) for (; t.return; ) t = t.return
			else {
				e = t
				do (t = e), (t.flags & 4098) !== 0 && (s = t.return), (e = t.return)
				while (e)
			}
			return t.tag === 3 ? s : null
		}
		function Kh(e) {
			if (e.tag === 13) {
				var t = e.memoizedState
				if ((t === null && ((e = e.alternate), e !== null && (t = e.memoizedState)), t !== null))
					return t.dehydrated
			}
			return null
		}
		function Xh(e) {
			if (hr(e) !== e) throw Error(r(188))
		}
		function s1(e) {
			var t = e.alternate
			if (!t) {
				if (((t = hr(e)), t === null)) throw Error(r(188))
				return t !== e ? null : e
			}
			for (var s = e, a = t; ; ) {
				var c = s.return
				if (c === null) break
				var f = c.alternate
				if (f === null) {
					if (((a = c.return), a !== null)) {
						s = a
						continue
					}
					break
				}
				if (c.child === f.child) {
					for (f = c.child; f; ) {
						if (f === s) return Xh(c), e
						if (f === a) return Xh(c), t
						f = f.sibling
					}
					throw Error(r(188))
				}
				if (s.return !== a.return) (s = c), (a = f)
				else {
					for (var v = !1, y = c.child; y; ) {
						if (y === s) {
							;(v = !0), (s = c), (a = f)
							break
						}
						if (y === a) {
							;(v = !0), (a = c), (s = f)
							break
						}
						y = y.sibling
					}
					if (!v) {
						for (y = f.child; y; ) {
							if (y === s) {
								;(v = !0), (s = f), (a = c)
								break
							}
							if (y === a) {
								;(v = !0), (a = f), (s = c)
								break
							}
							y = y.sibling
						}
						if (!v) throw Error(r(189))
					}
				}
				if (s.alternate !== a) throw Error(r(190))
			}
			if (s.tag !== 3) throw Error(r(188))
			return s.stateNode.current === s ? e : t
		}
		function Yh(e) {
			return (e = s1(e)), e !== null ? Zh(e) : null
		}
		function Zh(e) {
			if (e.tag === 5 || e.tag === 6) return e
			for (e = e.child; e !== null; ) {
				var t = Zh(e)
				if (t !== null) return t
				e = e.sibling
			}
			return null
		}
		var Jh = n.unstable_scheduleCallback,
			ev = n.unstable_cancelCallback,
			o1 = n.unstable_shouldYield,
			a1 = n.unstable_requestPaint,
			Ve = n.unstable_now,
			l1 = n.unstable_getCurrentPriorityLevel,
			xu = n.unstable_ImmediatePriority,
			tv = n.unstable_UserBlockingPriority,
			bo = n.unstable_NormalPriority,
			u1 = n.unstable_LowPriority,
			nv = n.unstable_IdlePriority,
			Ro = null,
			an = null
		function c1(e) {
			if (an && typeof an.onCommitFiberRoot == 'function')
				try {
					an.onCommitFiberRoot(Ro, e, void 0, (e.current.flags & 128) === 128)
				} catch {}
		}
		var qt = Math.clz32 ? Math.clz32 : p1,
			d1 = Math.log,
			f1 = Math.LN2
		function p1(e) {
			return (e >>>= 0), e === 0 ? 32 : (31 - ((d1(e) / f1) | 0)) | 0
		}
		var Io = 64,
			To = 4194304
		function Qi(e) {
			switch (e & -e) {
				case 1:
					return 1
				case 2:
					return 2
				case 4:
					return 4
				case 8:
					return 8
				case 16:
					return 16
				case 32:
					return 32
				case 64:
				case 128:
				case 256:
				case 512:
				case 1024:
				case 2048:
				case 4096:
				case 8192:
				case 16384:
				case 32768:
				case 65536:
				case 131072:
				case 262144:
				case 524288:
				case 1048576:
				case 2097152:
					return e & 4194240
				case 4194304:
				case 8388608:
				case 16777216:
				case 33554432:
				case 67108864:
					return e & 130023424
				case 134217728:
					return 134217728
				case 268435456:
					return 268435456
				case 536870912:
					return 536870912
				case 1073741824:
					return 1073741824
				default:
					return e
			}
		}
		function Oo(e, t) {
			var s = e.pendingLanes
			if (s === 0) return 0
			var a = 0,
				c = e.suspendedLanes,
				f = e.pingedLanes,
				v = s & 268435455
			if (v !== 0) {
				var y = v & ~c
				y !== 0 ? (a = Qi(y)) : ((f &= v), f !== 0 && (a = Qi(f)))
			} else (v = s & ~c), v !== 0 ? (a = Qi(v)) : f !== 0 && (a = Qi(f))
			if (a === 0) return 0
			if (
				t !== 0 &&
				t !== a &&
				(t & c) === 0 &&
				((c = a & -a), (f = t & -t), c >= f || (c === 16 && (f & 4194240) !== 0))
			)
				return t
			if (((a & 4) !== 0 && (a |= s & 16), (t = e.entangledLanes), t !== 0))
				for (e = e.entanglements, t &= a; 0 < t; )
					(s = 31 - qt(t)), (c = 1 << s), (a |= e[s]), (t &= ~c)
			return a
		}
		function h1(e, t) {
			switch (e) {
				case 1:
				case 2:
				case 4:
					return t + 250
				case 8:
				case 16:
				case 32:
				case 64:
				case 128:
				case 256:
				case 512:
				case 1024:
				case 2048:
				case 4096:
				case 8192:
				case 16384:
				case 32768:
				case 65536:
				case 131072:
				case 262144:
				case 524288:
				case 1048576:
				case 2097152:
					return t + 5e3
				case 4194304:
				case 8388608:
				case 16777216:
				case 33554432:
				case 67108864:
					return -1
				case 134217728:
				case 268435456:
				case 536870912:
				case 1073741824:
					return -1
				default:
					return -1
			}
		}
		function v1(e, t) {
			for (
				var s = e.suspendedLanes, a = e.pingedLanes, c = e.expirationTimes, f = e.pendingLanes;
				0 < f;

			) {
				var v = 31 - qt(f),
					y = 1 << v,
					E = c[v]
				E === -1
					? ((y & s) === 0 || (y & a) !== 0) && (c[v] = h1(y, t))
					: E <= t && (e.expiredLanes |= y),
					(f &= ~y)
			}
		}
		function Cu(e) {
			return (e = e.pendingLanes & -1073741825), e !== 0 ? e : e & 1073741824 ? 1073741824 : 0
		}
		function rv() {
			var e = Io
			return (Io <<= 1), (Io & 4194240) === 0 && (Io = 64), e
		}
		function Pu(e) {
			for (var t = [], s = 0; 31 > s; s++) t.push(e)
			return t
		}
		function Ki(e, t, s) {
			;(e.pendingLanes |= t),
				t !== 536870912 && ((e.suspendedLanes = 0), (e.pingedLanes = 0)),
				(e = e.eventTimes),
				(t = 31 - qt(t)),
				(e[t] = s)
		}
		function g1(e, t) {
			var s = e.pendingLanes & ~t
			;(e.pendingLanes = t),
				(e.suspendedLanes = 0),
				(e.pingedLanes = 0),
				(e.expiredLanes &= t),
				(e.mutableReadLanes &= t),
				(e.entangledLanes &= t),
				(t = e.entanglements)
			var a = e.eventTimes
			for (e = e.expirationTimes; 0 < s; ) {
				var c = 31 - qt(s),
					f = 1 << c
				;(t[c] = 0), (a[c] = -1), (e[c] = -1), (s &= ~f)
			}
		}
		function bu(e, t) {
			var s = (e.entangledLanes |= t)
			for (e = e.entanglements; s; ) {
				var a = 31 - qt(s),
					c = 1 << a
				;(c & t) | (e[a] & t) && (e[a] |= t), (s &= ~c)
			}
		}
		var Pe = 0
		function iv(e) {
			return (e &= -e), 1 < e ? (4 < e ? ((e & 268435455) !== 0 ? 16 : 536870912) : 4) : 1
		}
		var sv,
			Ru,
			ov,
			av,
			lv,
			Iu = !1,
			No = [],
			$n = null,
			zn = null,
			jn = null,
			Xi = new Map(),
			Yi = new Map(),
			Un = [],
			m1 =
				'mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit'.split(
					' '
				)
		function uv(e, t) {
			switch (e) {
				case 'focusin':
				case 'focusout':
					$n = null
					break
				case 'dragenter':
				case 'dragleave':
					zn = null
					break
				case 'mouseover':
				case 'mouseout':
					jn = null
					break
				case 'pointerover':
				case 'pointerout':
					Xi.delete(t.pointerId)
					break
				case 'gotpointercapture':
				case 'lostpointercapture':
					Yi.delete(t.pointerId)
			}
		}
		function Zi(e, t, s, a, c, f) {
			return e === null || e.nativeEvent !== f
				? ((e = {
						blockedOn: t,
						domEventName: s,
						eventSystemFlags: a,
						nativeEvent: f,
						targetContainers: [c],
					}),
					t !== null && ((t = fs(t)), t !== null && Ru(t)),
					e)
				: ((e.eventSystemFlags |= a),
					(t = e.targetContainers),
					c !== null && t.indexOf(c) === -1 && t.push(c),
					e)
		}
		function _1(e, t, s, a, c) {
			switch (t) {
				case 'focusin':
					return ($n = Zi($n, e, t, s, a, c)), !0
				case 'dragenter':
					return (zn = Zi(zn, e, t, s, a, c)), !0
				case 'mouseover':
					return (jn = Zi(jn, e, t, s, a, c)), !0
				case 'pointerover':
					var f = c.pointerId
					return Xi.set(f, Zi(Xi.get(f) || null, e, t, s, a, c)), !0
				case 'gotpointercapture':
					return (f = c.pointerId), Yi.set(f, Zi(Yi.get(f) || null, e, t, s, a, c)), !0
			}
			return !1
		}
		function cv(e) {
			var t = vr(e.target)
			if (t !== null) {
				var s = hr(t)
				if (s !== null) {
					if (((t = s.tag), t === 13)) {
						if (((t = Kh(s)), t !== null)) {
							;(e.blockedOn = t),
								lv(e.priority, function () {
									ov(s)
								})
							return
						}
					} else if (t === 3 && s.stateNode.current.memoizedState.isDehydrated) {
						e.blockedOn = s.tag === 3 ? s.stateNode.containerInfo : null
						return
					}
				}
			}
			e.blockedOn = null
		}
		function Fo(e) {
			if (e.blockedOn !== null) return !1
			for (var t = e.targetContainers; 0 < t.length; ) {
				var s = Ou(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent)
				if (s === null) {
					s = e.nativeEvent
					var a = new s.constructor(s.type, s)
					;(_u = a), s.target.dispatchEvent(a), (_u = null)
				} else return (t = fs(s)), t !== null && Ru(t), (e.blockedOn = s), !1
				t.shift()
			}
			return !0
		}
		function dv(e, t, s) {
			Fo(e) && s.delete(t)
		}
		function y1() {
			;(Iu = !1),
				$n !== null && Fo($n) && ($n = null),
				zn !== null && Fo(zn) && (zn = null),
				jn !== null && Fo(jn) && (jn = null),
				Xi.forEach(dv),
				Yi.forEach(dv)
		}
		function Ji(e, t) {
			e.blockedOn === t &&
				((e.blockedOn = null),
				Iu || ((Iu = !0), n.unstable_scheduleCallback(n.unstable_NormalPriority, y1)))
		}
		function es(e) {
			function t(c) {
				return Ji(c, e)
			}
			if (0 < No.length) {
				Ji(No[0], e)
				for (var s = 1; s < No.length; s++) {
					var a = No[s]
					a.blockedOn === e && (a.blockedOn = null)
				}
			}
			for (
				$n !== null && Ji($n, e),
					zn !== null && Ji(zn, e),
					jn !== null && Ji(jn, e),
					Xi.forEach(t),
					Yi.forEach(t),
					s = 0;
				s < Un.length;
				s++
			)
				(a = Un[s]), a.blockedOn === e && (a.blockedOn = null)
			for (; 0 < Un.length && ((s = Un[0]), s.blockedOn === null); )
				cv(s), s.blockedOn === null && Un.shift()
		}
		var Xr = Q.ReactCurrentBatchConfig,
			Mo = !0
		function w1(e, t, s, a) {
			var c = Pe,
				f = Xr.transition
			Xr.transition = null
			try {
				;(Pe = 1), Tu(e, t, s, a)
			} finally {
				;(Pe = c), (Xr.transition = f)
			}
		}
		function S1(e, t, s, a) {
			var c = Pe,
				f = Xr.transition
			Xr.transition = null
			try {
				;(Pe = 4), Tu(e, t, s, a)
			} finally {
				;(Pe = c), (Xr.transition = f)
			}
		}
		function Tu(e, t, s, a) {
			if (Mo) {
				var c = Ou(e, t, s, a)
				if (c === null) Qu(e, t, a, Lo, s), uv(e, a)
				else if (_1(c, e, t, s, a)) a.stopPropagation()
				else if ((uv(e, a), t & 4 && -1 < m1.indexOf(e))) {
					for (; c !== null; ) {
						var f = fs(c)
						if (
							(f !== null && sv(f), (f = Ou(e, t, s, a)), f === null && Qu(e, t, a, Lo, s), f === c)
						)
							break
						c = f
					}
					c !== null && a.stopPropagation()
				} else Qu(e, t, a, null, s)
			}
		}
		var Lo = null
		function Ou(e, t, s, a) {
			if (((Lo = null), (e = yu(a)), (e = vr(e)), e !== null))
				if (((t = hr(e)), t === null)) e = null
				else if (((s = t.tag), s === 13)) {
					if (((e = Kh(t)), e !== null)) return e
					e = null
				} else if (s === 3) {
					if (t.stateNode.current.memoizedState.isDehydrated)
						return t.tag === 3 ? t.stateNode.containerInfo : null
					e = null
				} else t !== e && (e = null)
			return (Lo = e), null
		}
		function fv(e) {
			switch (e) {
				case 'cancel':
				case 'click':
				case 'close':
				case 'contextmenu':
				case 'copy':
				case 'cut':
				case 'auxclick':
				case 'dblclick':
				case 'dragend':
				case 'dragstart':
				case 'drop':
				case 'focusin':
				case 'focusout':
				case 'input':
				case 'invalid':
				case 'keydown':
				case 'keypress':
				case 'keyup':
				case 'mousedown':
				case 'mouseup':
				case 'paste':
				case 'pause':
				case 'play':
				case 'pointercancel':
				case 'pointerdown':
				case 'pointerup':
				case 'ratechange':
				case 'reset':
				case 'resize':
				case 'seeked':
				case 'submit':
				case 'touchcancel':
				case 'touchend':
				case 'touchstart':
				case 'volumechange':
				case 'change':
				case 'selectionchange':
				case 'textInput':
				case 'compositionstart':
				case 'compositionend':
				case 'compositionupdate':
				case 'beforeblur':
				case 'afterblur':
				case 'beforeinput':
				case 'blur':
				case 'fullscreenchange':
				case 'focus':
				case 'hashchange':
				case 'popstate':
				case 'select':
				case 'selectstart':
					return 1
				case 'drag':
				case 'dragenter':
				case 'dragexit':
				case 'dragleave':
				case 'dragover':
				case 'mousemove':
				case 'mouseout':
				case 'mouseover':
				case 'pointermove':
				case 'pointerout':
				case 'pointerover':
				case 'scroll':
				case 'toggle':
				case 'touchmove':
				case 'wheel':
				case 'mouseenter':
				case 'mouseleave':
				case 'pointerenter':
				case 'pointerleave':
					return 4
				case 'message':
					switch (l1()) {
						case xu:
							return 1
						case tv:
							return 4
						case bo:
						case u1:
							return 16
						case nv:
							return 536870912
						default:
							return 16
					}
				default:
					return 16
			}
		}
		var Bn = null,
			Nu = null,
			Do = null
		function pv() {
			if (Do) return Do
			var e,
				t = Nu,
				s = t.length,
				a,
				c = 'value' in Bn ? Bn.value : Bn.textContent,
				f = c.length
			for (e = 0; e < s && t[e] === c[e]; e++);
			var v = s - e
			for (a = 1; a <= v && t[s - a] === c[f - a]; a++);
			return (Do = c.slice(e, 1 < a ? 1 - a : void 0))
		}
		function Ao(e) {
			var t = e.keyCode
			return (
				'charCode' in e ? ((e = e.charCode), e === 0 && t === 13 && (e = 13)) : (e = t),
				e === 10 && (e = 13),
				32 <= e || e === 13 ? e : 0
			)
		}
		function $o() {
			return !0
		}
		function hv() {
			return !1
		}
		function It(e) {
			function t(s, a, c, f, v) {
				;(this._reactName = s),
					(this._targetInst = c),
					(this.type = a),
					(this.nativeEvent = f),
					(this.target = v),
					(this.currentTarget = null)
				for (var y in e) e.hasOwnProperty(y) && ((s = e[y]), (this[y] = s ? s(f) : f[y]))
				return (
					(this.isDefaultPrevented = (
						f.defaultPrevented != null ? f.defaultPrevented : f.returnValue === !1
					)
						? $o
						: hv),
					(this.isPropagationStopped = hv),
					this
				)
			}
			return (
				W(t.prototype, {
					preventDefault: function () {
						this.defaultPrevented = !0
						var s = this.nativeEvent
						s &&
							(s.preventDefault
								? s.preventDefault()
								: typeof s.returnValue != 'unknown' && (s.returnValue = !1),
							(this.isDefaultPrevented = $o))
					},
					stopPropagation: function () {
						var s = this.nativeEvent
						s &&
							(s.stopPropagation
								? s.stopPropagation()
								: typeof s.cancelBubble != 'unknown' && (s.cancelBubble = !0),
							(this.isPropagationStopped = $o))
					},
					persist: function () {},
					isPersistent: $o,
				}),
				t
			)
		}
		var Yr = {
				eventPhase: 0,
				bubbles: 0,
				cancelable: 0,
				timeStamp: function (e) {
					return e.timeStamp || Date.now()
				},
				defaultPrevented: 0,
				isTrusted: 0,
			},
			Fu = It(Yr),
			ts = W({}, Yr, { view: 0, detail: 0 }),
			E1 = It(ts),
			Mu,
			Lu,
			ns,
			zo = W({}, ts, {
				screenX: 0,
				screenY: 0,
				clientX: 0,
				clientY: 0,
				pageX: 0,
				pageY: 0,
				ctrlKey: 0,
				shiftKey: 0,
				altKey: 0,
				metaKey: 0,
				getModifierState: Au,
				button: 0,
				buttons: 0,
				relatedTarget: function (e) {
					return e.relatedTarget === void 0
						? e.fromElement === e.srcElement
							? e.toElement
							: e.fromElement
						: e.relatedTarget
				},
				movementX: function (e) {
					return 'movementX' in e
						? e.movementX
						: (e !== ns &&
								(ns && e.type === 'mousemove'
									? ((Mu = e.screenX - ns.screenX), (Lu = e.screenY - ns.screenY))
									: (Lu = Mu = 0),
								(ns = e)),
							Mu)
				},
				movementY: function (e) {
					return 'movementY' in e ? e.movementY : Lu
				},
			}),
			vv = It(zo),
			k1 = W({}, zo, { dataTransfer: 0 }),
			x1 = It(k1),
			C1 = W({}, ts, { relatedTarget: 0 }),
			Du = It(C1),
			P1 = W({}, Yr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
			b1 = It(P1),
			R1 = W({}, Yr, {
				clipboardData: function (e) {
					return 'clipboardData' in e ? e.clipboardData : window.clipboardData
				},
			}),
			I1 = It(R1),
			T1 = W({}, Yr, { data: 0 }),
			gv = It(T1),
			O1 = {
				Esc: 'Escape',
				Spacebar: ' ',
				Left: 'ArrowLeft',
				Up: 'ArrowUp',
				Right: 'ArrowRight',
				Down: 'ArrowDown',
				Del: 'Delete',
				Win: 'OS',
				Menu: 'ContextMenu',
				Apps: 'ContextMenu',
				Scroll: 'ScrollLock',
				MozPrintableKey: 'Unidentified',
			},
			N1 = {
				8: 'Backspace',
				9: 'Tab',
				12: 'Clear',
				13: 'Enter',
				16: 'Shift',
				17: 'Control',
				18: 'Alt',
				19: 'Pause',
				20: 'CapsLock',
				27: 'Escape',
				32: ' ',
				33: 'PageUp',
				34: 'PageDown',
				35: 'End',
				36: 'Home',
				37: 'ArrowLeft',
				38: 'ArrowUp',
				39: 'ArrowRight',
				40: 'ArrowDown',
				45: 'Insert',
				46: 'Delete',
				112: 'F1',
				113: 'F2',
				114: 'F3',
				115: 'F4',
				116: 'F5',
				117: 'F6',
				118: 'F7',
				119: 'F8',
				120: 'F9',
				121: 'F10',
				122: 'F11',
				123: 'F12',
				144: 'NumLock',
				145: 'ScrollLock',
				224: 'Meta',
			},
			F1 = { Alt: 'altKey', Control: 'ctrlKey', Meta: 'metaKey', Shift: 'shiftKey' }
		function M1(e) {
			var t = this.nativeEvent
			return t.getModifierState ? t.getModifierState(e) : (e = F1[e]) ? !!t[e] : !1
		}
		function Au() {
			return M1
		}
		var L1 = W({}, ts, {
				key: function (e) {
					if (e.key) {
						var t = O1[e.key] || e.key
						if (t !== 'Unidentified') return t
					}
					return e.type === 'keypress'
						? ((e = Ao(e)), e === 13 ? 'Enter' : String.fromCharCode(e))
						: e.type === 'keydown' || e.type === 'keyup'
							? N1[e.keyCode] || 'Unidentified'
							: ''
				},
				code: 0,
				location: 0,
				ctrlKey: 0,
				shiftKey: 0,
				altKey: 0,
				metaKey: 0,
				repeat: 0,
				locale: 0,
				getModifierState: Au,
				charCode: function (e) {
					return e.type === 'keypress' ? Ao(e) : 0
				},
				keyCode: function (e) {
					return e.type === 'keydown' || e.type === 'keyup' ? e.keyCode : 0
				},
				which: function (e) {
					return e.type === 'keypress'
						? Ao(e)
						: e.type === 'keydown' || e.type === 'keyup'
							? e.keyCode
							: 0
				},
			}),
			D1 = It(L1),
			A1 = W({}, zo, {
				pointerId: 0,
				width: 0,
				height: 0,
				pressure: 0,
				tangentialPressure: 0,
				tiltX: 0,
				tiltY: 0,
				twist: 0,
				pointerType: 0,
				isPrimary: 0,
			}),
			mv = It(A1),
			$1 = W({}, ts, {
				touches: 0,
				targetTouches: 0,
				changedTouches: 0,
				altKey: 0,
				metaKey: 0,
				ctrlKey: 0,
				shiftKey: 0,
				getModifierState: Au,
			}),
			z1 = It($1),
			j1 = W({}, Yr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
			U1 = It(j1),
			B1 = W({}, zo, {
				deltaX: function (e) {
					return 'deltaX' in e ? e.deltaX : 'wheelDeltaX' in e ? -e.wheelDeltaX : 0
				},
				deltaY: function (e) {
					return 'deltaY' in e
						? e.deltaY
						: 'wheelDeltaY' in e
							? -e.wheelDeltaY
							: 'wheelDelta' in e
								? -e.wheelDelta
								: 0
				},
				deltaZ: 0,
				deltaMode: 0,
			}),
			W1 = It(B1),
			H1 = [9, 13, 27, 32],
			$u = p && 'CompositionEvent' in window,
			rs = null
		p && 'documentMode' in document && (rs = document.documentMode)
		var V1 = p && 'TextEvent' in window && !rs,
			_v = p && (!$u || (rs && 8 < rs && 11 >= rs)),
			yv = ' ',
			wv = !1
		function Sv(e, t) {
			switch (e) {
				case 'keyup':
					return H1.indexOf(t.keyCode) !== -1
				case 'keydown':
					return t.keyCode !== 229
				case 'keypress':
				case 'mousedown':
				case 'focusout':
					return !0
				default:
					return !1
			}
		}
		function Ev(e) {
			return (e = e.detail), typeof e == 'object' && 'data' in e ? e.data : null
		}
		var Zr = !1
		function q1(e, t) {
			switch (e) {
				case 'compositionend':
					return Ev(t)
				case 'keypress':
					return t.which !== 32 ? null : ((wv = !0), yv)
				case 'textInput':
					return (e = t.data), e === yv && wv ? null : e
				default:
					return null
			}
		}
		function G1(e, t) {
			if (Zr)
				return e === 'compositionend' || (!$u && Sv(e, t))
					? ((e = pv()), (Do = Nu = Bn = null), (Zr = !1), e)
					: null
			switch (e) {
				case 'paste':
					return null
				case 'keypress':
					if (!(t.ctrlKey || t.altKey || t.metaKey) || (t.ctrlKey && t.altKey)) {
						if (t.char && 1 < t.char.length) return t.char
						if (t.which) return String.fromCharCode(t.which)
					}
					return null
				case 'compositionend':
					return _v && t.locale !== 'ko' ? null : t.data
				default:
					return null
			}
		}
		var Q1 = {
			color: !0,
			date: !0,
			datetime: !0,
			'datetime-local': !0,
			email: !0,
			month: !0,
			number: !0,
			password: !0,
			range: !0,
			search: !0,
			tel: !0,
			text: !0,
			time: !0,
			url: !0,
			week: !0,
		}
		function kv(e) {
			var t = e && e.nodeName && e.nodeName.toLowerCase()
			return t === 'input' ? !!Q1[e.type] : t === 'textarea'
		}
		function xv(e, t, s, a) {
			Hh(a),
				(t = Ho(t, 'onChange')),
				0 < t.length &&
					((s = new Fu('onChange', 'change', null, s, a)), e.push({ event: s, listeners: t }))
		}
		var is = null,
			ss = null
		function K1(e) {
			Bv(e, 0)
		}
		function jo(e) {
			var t = ri(e)
			if (zi(t)) return e
		}
		function X1(e, t) {
			if (e === 'change') return t
		}
		var Cv = !1
		if (p) {
			var zu
			if (p) {
				var ju = 'oninput' in document
				if (!ju) {
					var Pv = document.createElement('div')
					Pv.setAttribute('oninput', 'return;'), (ju = typeof Pv.oninput == 'function')
				}
				zu = ju
			} else zu = !1
			Cv = zu && (!document.documentMode || 9 < document.documentMode)
		}
		function bv() {
			is && (is.detachEvent('onpropertychange', Rv), (ss = is = null))
		}
		function Rv(e) {
			if (e.propertyName === 'value' && jo(ss)) {
				var t = []
				xv(t, ss, e, yu(e)), Qh(K1, t)
			}
		}
		function Y1(e, t, s) {
			e === 'focusin'
				? (bv(), (is = t), (ss = s), is.attachEvent('onpropertychange', Rv))
				: e === 'focusout' && bv()
		}
		function Z1(e) {
			if (e === 'selectionchange' || e === 'keyup' || e === 'keydown') return jo(ss)
		}
		function J1(e, t) {
			if (e === 'click') return jo(t)
		}
		function eS(e, t) {
			if (e === 'input' || e === 'change') return jo(t)
		}
		function tS(e, t) {
			return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t)
		}
		var Gt = typeof Object.is == 'function' ? Object.is : tS
		function os(e, t) {
			if (Gt(e, t)) return !0
			if (typeof e != 'object' || e === null || typeof t != 'object' || t === null) return !1
			var s = Object.keys(e),
				a = Object.keys(t)
			if (s.length !== a.length) return !1
			for (a = 0; a < s.length; a++) {
				var c = s[a]
				if (!h.call(t, c) || !Gt(e[c], t[c])) return !1
			}
			return !0
		}
		function Iv(e) {
			for (; e && e.firstChild; ) e = e.firstChild
			return e
		}
		function Tv(e, t) {
			var s = Iv(e)
			e = 0
			for (var a; s; ) {
				if (s.nodeType === 3) {
					if (((a = e + s.textContent.length), e <= t && a >= t)) return { node: s, offset: t - e }
					e = a
				}
				e: {
					for (; s; ) {
						if (s.nextSibling) {
							s = s.nextSibling
							break e
						}
						s = s.parentNode
					}
					s = void 0
				}
				s = Iv(s)
			}
		}
		function Ov(e, t) {
			return e && t
				? e === t
					? !0
					: e && e.nodeType === 3
						? !1
						: t && t.nodeType === 3
							? Ov(e, t.parentNode)
							: 'contains' in e
								? e.contains(t)
								: e.compareDocumentPosition
									? !!(e.compareDocumentPosition(t) & 16)
									: !1
				: !1
		}
		function Nv() {
			for (var e = window, t = An(); t instanceof e.HTMLIFrameElement; ) {
				try {
					var s = typeof t.contentWindow.location.href == 'string'
				} catch {
					s = !1
				}
				if (s) e = t.contentWindow
				else break
				t = An(e.document)
			}
			return t
		}
		function Uu(e) {
			var t = e && e.nodeName && e.nodeName.toLowerCase()
			return (
				t &&
				((t === 'input' &&
					(e.type === 'text' ||
						e.type === 'search' ||
						e.type === 'tel' ||
						e.type === 'url' ||
						e.type === 'password')) ||
					t === 'textarea' ||
					e.contentEditable === 'true')
			)
		}
		function nS(e) {
			var t = Nv(),
				s = e.focusedElem,
				a = e.selectionRange
			if (t !== s && s && s.ownerDocument && Ov(s.ownerDocument.documentElement, s)) {
				if (a !== null && Uu(s)) {
					if (((t = a.start), (e = a.end), e === void 0 && (e = t), 'selectionStart' in s))
						(s.selectionStart = t), (s.selectionEnd = Math.min(e, s.value.length))
					else if (
						((e = ((t = s.ownerDocument || document) && t.defaultView) || window), e.getSelection)
					) {
						e = e.getSelection()
						var c = s.textContent.length,
							f = Math.min(a.start, c)
						;(a = a.end === void 0 ? f : Math.min(a.end, c)),
							!e.extend && f > a && ((c = a), (a = f), (f = c)),
							(c = Tv(s, f))
						var v = Tv(s, a)
						c &&
							v &&
							(e.rangeCount !== 1 ||
								e.anchorNode !== c.node ||
								e.anchorOffset !== c.offset ||
								e.focusNode !== v.node ||
								e.focusOffset !== v.offset) &&
							((t = t.createRange()),
							t.setStart(c.node, c.offset),
							e.removeAllRanges(),
							f > a
								? (e.addRange(t), e.extend(v.node, v.offset))
								: (t.setEnd(v.node, v.offset), e.addRange(t)))
					}
				}
				for (t = [], e = s; (e = e.parentNode); )
					e.nodeType === 1 && t.push({ element: e, left: e.scrollLeft, top: e.scrollTop })
				for (typeof s.focus == 'function' && s.focus(), s = 0; s < t.length; s++)
					(e = t[s]), (e.element.scrollLeft = e.left), (e.element.scrollTop = e.top)
			}
		}
		var rS = p && 'documentMode' in document && 11 >= document.documentMode,
			Jr = null,
			Bu = null,
			as = null,
			Wu = !1
		function Fv(e, t, s) {
			var a = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument
			Wu ||
				Jr == null ||
				Jr !== An(a) ||
				((a = Jr),
				'selectionStart' in a && Uu(a)
					? (a = { start: a.selectionStart, end: a.selectionEnd })
					: ((a = ((a.ownerDocument && a.ownerDocument.defaultView) || window).getSelection()),
						(a = {
							anchorNode: a.anchorNode,
							anchorOffset: a.anchorOffset,
							focusNode: a.focusNode,
							focusOffset: a.focusOffset,
						})),
				(as && os(as, a)) ||
					((as = a),
					(a = Ho(Bu, 'onSelect')),
					0 < a.length &&
						((t = new Fu('onSelect', 'select', null, t, s)),
						e.push({ event: t, listeners: a }),
						(t.target = Jr))))
		}
		function Uo(e, t) {
			var s = {}
			return (
				(s[e.toLowerCase()] = t.toLowerCase()),
				(s['Webkit' + e] = 'webkit' + t),
				(s['Moz' + e] = 'moz' + t),
				s
			)
		}
		var ei = {
				animationend: Uo('Animation', 'AnimationEnd'),
				animationiteration: Uo('Animation', 'AnimationIteration'),
				animationstart: Uo('Animation', 'AnimationStart'),
				transitionend: Uo('Transition', 'TransitionEnd'),
			},
			Hu = {},
			Mv = {}
		p &&
			((Mv = document.createElement('div').style),
			'AnimationEvent' in window ||
				(delete ei.animationend.animation,
				delete ei.animationiteration.animation,
				delete ei.animationstart.animation),
			'TransitionEvent' in window || delete ei.transitionend.transition)
		function Bo(e) {
			if (Hu[e]) return Hu[e]
			if (!ei[e]) return e
			var t = ei[e],
				s
			for (s in t) if (t.hasOwnProperty(s) && s in Mv) return (Hu[e] = t[s])
			return e
		}
		var Lv = Bo('animationend'),
			Dv = Bo('animationiteration'),
			Av = Bo('animationstart'),
			$v = Bo('transitionend'),
			zv = new Map(),
			jv =
				'abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel'.split(
					' '
				)
		function Wn(e, t) {
			zv.set(e, t), u(t, [e])
		}
		for (var Vu = 0; Vu < jv.length; Vu++) {
			var qu = jv[Vu],
				iS = qu.toLowerCase(),
				sS = qu[0].toUpperCase() + qu.slice(1)
			Wn(iS, 'on' + sS)
		}
		Wn(Lv, 'onAnimationEnd'),
			Wn(Dv, 'onAnimationIteration'),
			Wn(Av, 'onAnimationStart'),
			Wn('dblclick', 'onDoubleClick'),
			Wn('focusin', 'onFocus'),
			Wn('focusout', 'onBlur'),
			Wn($v, 'onTransitionEnd'),
			d('onMouseEnter', ['mouseout', 'mouseover']),
			d('onMouseLeave', ['mouseout', 'mouseover']),
			d('onPointerEnter', ['pointerout', 'pointerover']),
			d('onPointerLeave', ['pointerout', 'pointerover']),
			u('onChange', 'change click focusin focusout input keydown keyup selectionchange'.split(' ')),
			u(
				'onSelect',
				'focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange'.split(
					' '
				)
			),
			u('onBeforeInput', ['compositionend', 'keypress', 'textInput', 'paste']),
			u('onCompositionEnd', 'compositionend focusout keydown keypress keyup mousedown'.split(' ')),
			u(
				'onCompositionStart',
				'compositionstart focusout keydown keypress keyup mousedown'.split(' ')
			),
			u(
				'onCompositionUpdate',
				'compositionupdate focusout keydown keypress keyup mousedown'.split(' ')
			)
		var ls =
				'abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting'.split(
					' '
				),
			oS = new Set('cancel close invalid load scroll toggle'.split(' ').concat(ls))
		function Uv(e, t, s) {
			var a = e.type || 'unknown-event'
			;(e.currentTarget = s), i1(a, t, void 0, e), (e.currentTarget = null)
		}
		function Bv(e, t) {
			t = (t & 4) !== 0
			for (var s = 0; s < e.length; s++) {
				var a = e[s],
					c = a.event
				a = a.listeners
				e: {
					var f = void 0
					if (t)
						for (var v = a.length - 1; 0 <= v; v--) {
							var y = a[v],
								E = y.instance,
								O = y.currentTarget
							if (((y = y.listener), E !== f && c.isPropagationStopped())) break e
							Uv(c, y, O), (f = E)
						}
					else
						for (v = 0; v < a.length; v++) {
							if (
								((y = a[v]),
								(E = y.instance),
								(O = y.currentTarget),
								(y = y.listener),
								E !== f && c.isPropagationStopped())
							)
								break e
							Uv(c, y, O), (f = E)
						}
				}
			}
			if (Po) throw ((e = ku), (Po = !1), (ku = null), e)
		}
		function Fe(e, t) {
			var s = t[ec]
			s === void 0 && (s = t[ec] = new Set())
			var a = e + '__bubble'
			s.has(a) || (Wv(t, e, 2, !1), s.add(a))
		}
		function Gu(e, t, s) {
			var a = 0
			t && (a |= 4), Wv(s, e, a, t)
		}
		var Wo = '_reactListening' + Math.random().toString(36).slice(2)
		function us(e) {
			if (!e[Wo]) {
				;(e[Wo] = !0),
					o.forEach(function (s) {
						s !== 'selectionchange' && (oS.has(s) || Gu(s, !1, e), Gu(s, !0, e))
					})
				var t = e.nodeType === 9 ? e : e.ownerDocument
				t === null || t[Wo] || ((t[Wo] = !0), Gu('selectionchange', !1, t))
			}
		}
		function Wv(e, t, s, a) {
			switch (fv(t)) {
				case 1:
					var c = w1
					break
				case 4:
					c = S1
					break
				default:
					c = Tu
			}
			;(s = c.bind(null, t, s, e)),
				(c = void 0),
				!Eu || (t !== 'touchstart' && t !== 'touchmove' && t !== 'wheel') || (c = !0),
				a
					? c !== void 0
						? e.addEventListener(t, s, { capture: !0, passive: c })
						: e.addEventListener(t, s, !0)
					: c !== void 0
						? e.addEventListener(t, s, { passive: c })
						: e.addEventListener(t, s, !1)
		}
		function Qu(e, t, s, a, c) {
			var f = a
			if ((t & 1) === 0 && (t & 2) === 0 && a !== null)
				e: for (;;) {
					if (a === null) return
					var v = a.tag
					if (v === 3 || v === 4) {
						var y = a.stateNode.containerInfo
						if (y === c || (y.nodeType === 8 && y.parentNode === c)) break
						if (v === 4)
							for (v = a.return; v !== null; ) {
								var E = v.tag
								if (
									(E === 3 || E === 4) &&
									((E = v.stateNode.containerInfo),
									E === c || (E.nodeType === 8 && E.parentNode === c))
								)
									return
								v = v.return
							}
						for (; y !== null; ) {
							if (((v = vr(y)), v === null)) return
							if (((E = v.tag), E === 5 || E === 6)) {
								a = f = v
								continue e
							}
							y = y.parentNode
						}
					}
					a = a.return
				}
			Qh(function () {
				var O = f,
					B = yu(s),
					H = []
				e: {
					var U = zv.get(e)
					if (U !== void 0) {
						var Y = Fu,
							re = e
						switch (e) {
							case 'keypress':
								if (Ao(s) === 0) break e
							case 'keydown':
							case 'keyup':
								Y = D1
								break
							case 'focusin':
								;(re = 'focus'), (Y = Du)
								break
							case 'focusout':
								;(re = 'blur'), (Y = Du)
								break
							case 'beforeblur':
							case 'afterblur':
								Y = Du
								break
							case 'click':
								if (s.button === 2) break e
							case 'auxclick':
							case 'dblclick':
							case 'mousedown':
							case 'mousemove':
							case 'mouseup':
							case 'mouseout':
							case 'mouseover':
							case 'contextmenu':
								Y = vv
								break
							case 'drag':
							case 'dragend':
							case 'dragenter':
							case 'dragexit':
							case 'dragleave':
							case 'dragover':
							case 'dragstart':
							case 'drop':
								Y = x1
								break
							case 'touchcancel':
							case 'touchend':
							case 'touchmove':
							case 'touchstart':
								Y = z1
								break
							case Lv:
							case Dv:
							case Av:
								Y = b1
								break
							case $v:
								Y = U1
								break
							case 'scroll':
								Y = E1
								break
							case 'wheel':
								Y = W1
								break
							case 'copy':
							case 'cut':
							case 'paste':
								Y = I1
								break
							case 'gotpointercapture':
							case 'lostpointercapture':
							case 'pointercancel':
							case 'pointerdown':
							case 'pointermove':
							case 'pointerout':
							case 'pointerover':
							case 'pointerup':
								Y = mv
						}
						var se = (t & 4) !== 0,
							qe = !se && e === 'scroll',
							P = se ? (U !== null ? U + 'Capture' : null) : U
						se = []
						for (var C = O, b; C !== null; ) {
							b = C
							var V = b.stateNode
							if (
								(b.tag === 5 &&
									V !== null &&
									((b = V), P !== null && ((V = Vi(C, P)), V != null && se.push(cs(C, V, b)))),
								qe)
							)
								break
							C = C.return
						}
						0 < se.length && ((U = new Y(U, re, null, s, B)), H.push({ event: U, listeners: se }))
					}
				}
				if ((t & 7) === 0) {
					e: {
						if (
							((U = e === 'mouseover' || e === 'pointerover'),
							(Y = e === 'mouseout' || e === 'pointerout'),
							U && s !== _u && (re = s.relatedTarget || s.fromElement) && (vr(re) || re[wn]))
						)
							break e
						if (
							(Y || U) &&
							((U =
								B.window === B
									? B
									: (U = B.ownerDocument)
										? U.defaultView || U.parentWindow
										: window),
							Y
								? ((re = s.relatedTarget || s.toElement),
									(Y = O),
									(re = re ? vr(re) : null),
									re !== null &&
										((qe = hr(re)), re !== qe || (re.tag !== 5 && re.tag !== 6)) &&
										(re = null))
								: ((Y = null), (re = O)),
							Y !== re)
						) {
							if (
								((se = vv),
								(V = 'onMouseLeave'),
								(P = 'onMouseEnter'),
								(C = 'mouse'),
								(e === 'pointerout' || e === 'pointerover') &&
									((se = mv), (V = 'onPointerLeave'), (P = 'onPointerEnter'), (C = 'pointer')),
								(qe = Y == null ? U : ri(Y)),
								(b = re == null ? U : ri(re)),
								(U = new se(V, C + 'leave', Y, s, B)),
								(U.target = qe),
								(U.relatedTarget = b),
								(V = null),
								vr(B) === O &&
									((se = new se(P, C + 'enter', re, s, B)),
									(se.target = b),
									(se.relatedTarget = qe),
									(V = se)),
								(qe = V),
								Y && re)
							)
								t: {
									for (se = Y, P = re, C = 0, b = se; b; b = ti(b)) C++
									for (b = 0, V = P; V; V = ti(V)) b++
									for (; 0 < C - b; ) (se = ti(se)), C--
									for (; 0 < b - C; ) (P = ti(P)), b--
									for (; C--; ) {
										if (se === P || (P !== null && se === P.alternate)) break t
										;(se = ti(se)), (P = ti(P))
									}
									se = null
								}
							else se = null
							Y !== null && Hv(H, U, Y, se, !1), re !== null && qe !== null && Hv(H, qe, re, se, !0)
						}
					}
					e: {
						if (
							((U = O ? ri(O) : window),
							(Y = U.nodeName && U.nodeName.toLowerCase()),
							Y === 'select' || (Y === 'input' && U.type === 'file'))
						)
							var oe = X1
						else if (kv(U))
							if (Cv) oe = eS
							else {
								oe = Z1
								var ce = Y1
							}
						else
							(Y = U.nodeName) &&
								Y.toLowerCase() === 'input' &&
								(U.type === 'checkbox' || U.type === 'radio') &&
								(oe = J1)
						if (oe && (oe = oe(e, O))) {
							xv(H, oe, s, B)
							break e
						}
						ce && ce(e, U, O),
							e === 'focusout' &&
								(ce = U._wrapperState) &&
								ce.controlled &&
								U.type === 'number' &&
								pu(U, 'number', U.value)
					}
					switch (((ce = O ? ri(O) : window), e)) {
						case 'focusin':
							;(kv(ce) || ce.contentEditable === 'true') && ((Jr = ce), (Bu = O), (as = null))
							break
						case 'focusout':
							as = Bu = Jr = null
							break
						case 'mousedown':
							Wu = !0
							break
						case 'contextmenu':
						case 'mouseup':
						case 'dragend':
							;(Wu = !1), Fv(H, s, B)
							break
						case 'selectionchange':
							if (rS) break
						case 'keydown':
						case 'keyup':
							Fv(H, s, B)
					}
					var de
					if ($u)
						e: {
							switch (e) {
								case 'compositionstart':
									var fe = 'onCompositionStart'
									break e
								case 'compositionend':
									fe = 'onCompositionEnd'
									break e
								case 'compositionupdate':
									fe = 'onCompositionUpdate'
									break e
							}
							fe = void 0
						}
					else
						Zr
							? Sv(e, s) && (fe = 'onCompositionEnd')
							: e === 'keydown' && s.keyCode === 229 && (fe = 'onCompositionStart')
					fe &&
						(_v &&
							s.locale !== 'ko' &&
							(Zr || fe !== 'onCompositionStart'
								? fe === 'onCompositionEnd' && Zr && (de = pv())
								: ((Bn = B), (Nu = 'value' in Bn ? Bn.value : Bn.textContent), (Zr = !0))),
						(ce = Ho(O, fe)),
						0 < ce.length &&
							((fe = new gv(fe, e, null, s, B)),
							H.push({ event: fe, listeners: ce }),
							de ? (fe.data = de) : ((de = Ev(s)), de !== null && (fe.data = de)))),
						(de = V1 ? q1(e, s) : G1(e, s)) &&
							((O = Ho(O, 'onBeforeInput')),
							0 < O.length &&
								((B = new gv('onBeforeInput', 'beforeinput', null, s, B)),
								H.push({ event: B, listeners: O }),
								(B.data = de)))
				}
				Bv(H, t)
			})
		}
		function cs(e, t, s) {
			return { instance: e, listener: t, currentTarget: s }
		}
		function Ho(e, t) {
			for (var s = t + 'Capture', a = []; e !== null; ) {
				var c = e,
					f = c.stateNode
				c.tag === 5 &&
					f !== null &&
					((c = f),
					(f = Vi(e, s)),
					f != null && a.unshift(cs(e, f, c)),
					(f = Vi(e, t)),
					f != null && a.push(cs(e, f, c))),
					(e = e.return)
			}
			return a
		}
		function ti(e) {
			if (e === null) return null
			do e = e.return
			while (e && e.tag !== 5)
			return e || null
		}
		function Hv(e, t, s, a, c) {
			for (var f = t._reactName, v = []; s !== null && s !== a; ) {
				var y = s,
					E = y.alternate,
					O = y.stateNode
				if (E !== null && E === a) break
				y.tag === 5 &&
					O !== null &&
					((y = O),
					c
						? ((E = Vi(s, f)), E != null && v.unshift(cs(s, E, y)))
						: c || ((E = Vi(s, f)), E != null && v.push(cs(s, E, y)))),
					(s = s.return)
			}
			v.length !== 0 && e.push({ event: t, listeners: v })
		}
		var aS = /\r\n?/g,
			lS = /\u0000|\uFFFD/g
		function Vv(e) {
			return (typeof e == 'string' ? e : '' + e)
				.replace(
					aS,
					`
`
				)
				.replace(lS, '')
		}
		function Vo(e, t, s) {
			if (((t = Vv(t)), Vv(e) !== t && s)) throw Error(r(425))
		}
		function qo() {}
		var Ku = null,
			Xu = null
		function Yu(e, t) {
			return (
				e === 'textarea' ||
				e === 'noscript' ||
				typeof t.children == 'string' ||
				typeof t.children == 'number' ||
				(typeof t.dangerouslySetInnerHTML == 'object' &&
					t.dangerouslySetInnerHTML !== null &&
					t.dangerouslySetInnerHTML.__html != null)
			)
		}
		var Zu = typeof setTimeout == 'function' ? setTimeout : void 0,
			uS = typeof clearTimeout == 'function' ? clearTimeout : void 0,
			qv = typeof Promise == 'function' ? Promise : void 0,
			cS =
				typeof queueMicrotask == 'function'
					? queueMicrotask
					: typeof qv < 'u'
						? function (e) {
								return qv.resolve(null).then(e).catch(dS)
							}
						: Zu
		function dS(e) {
			setTimeout(function () {
				throw e
			})
		}
		function Ju(e, t) {
			var s = t,
				a = 0
			do {
				var c = s.nextSibling
				if ((e.removeChild(s), c && c.nodeType === 8))
					if (((s = c.data), s === '/$')) {
						if (a === 0) {
							e.removeChild(c), es(t)
							return
						}
						a--
					} else (s !== '$' && s !== '$?' && s !== '$!') || a++
				s = c
			} while (s)
			es(t)
		}
		function Hn(e) {
			for (; e != null; e = e.nextSibling) {
				var t = e.nodeType
				if (t === 1 || t === 3) break
				if (t === 8) {
					if (((t = e.data), t === '$' || t === '$!' || t === '$?')) break
					if (t === '/$') return null
				}
			}
			return e
		}
		function Gv(e) {
			e = e.previousSibling
			for (var t = 0; e; ) {
				if (e.nodeType === 8) {
					var s = e.data
					if (s === '$' || s === '$!' || s === '$?') {
						if (t === 0) return e
						t--
					} else s === '/$' && t++
				}
				e = e.previousSibling
			}
			return null
		}
		var ni = Math.random().toString(36).slice(2),
			ln = '__reactFiber$' + ni,
			ds = '__reactProps$' + ni,
			wn = '__reactContainer$' + ni,
			ec = '__reactEvents$' + ni,
			fS = '__reactListeners$' + ni,
			pS = '__reactHandles$' + ni
		function vr(e) {
			var t = e[ln]
			if (t) return t
			for (var s = e.parentNode; s; ) {
				if ((t = s[wn] || s[ln])) {
					if (((s = t.alternate), t.child !== null || (s !== null && s.child !== null)))
						for (e = Gv(e); e !== null; ) {
							if ((s = e[ln])) return s
							e = Gv(e)
						}
					return t
				}
				;(e = s), (s = e.parentNode)
			}
			return null
		}
		function fs(e) {
			return (
				(e = e[ln] || e[wn]),
				!e || (e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3) ? null : e
			)
		}
		function ri(e) {
			if (e.tag === 5 || e.tag === 6) return e.stateNode
			throw Error(r(33))
		}
		function Go(e) {
			return e[ds] || null
		}
		var tc = [],
			ii = -1
		function Vn(e) {
			return { current: e }
		}
		function Me(e) {
			0 > ii || ((e.current = tc[ii]), (tc[ii] = null), ii--)
		}
		function Te(e, t) {
			ii++, (tc[ii] = e.current), (e.current = t)
		}
		var qn = {},
			ct = Vn(qn),
			kt = Vn(!1),
			gr = qn
		function si(e, t) {
			var s = e.type.contextTypes
			if (!s) return qn
			var a = e.stateNode
			if (a && a.__reactInternalMemoizedUnmaskedChildContext === t)
				return a.__reactInternalMemoizedMaskedChildContext
			var c = {},
				f
			for (f in s) c[f] = t[f]
			return (
				a &&
					((e = e.stateNode),
					(e.__reactInternalMemoizedUnmaskedChildContext = t),
					(e.__reactInternalMemoizedMaskedChildContext = c)),
				c
			)
		}
		function xt(e) {
			return (e = e.childContextTypes), e != null
		}
		function Qo() {
			Me(kt), Me(ct)
		}
		function Qv(e, t, s) {
			if (ct.current !== qn) throw Error(r(168))
			Te(ct, t), Te(kt, s)
		}
		function Kv(e, t, s) {
			var a = e.stateNode
			if (((t = t.childContextTypes), typeof a.getChildContext != 'function')) return s
			a = a.getChildContext()
			for (var c in a) if (!(c in t)) throw Error(r(108, Se(e) || 'Unknown', c))
			return W({}, s, a)
		}
		function Ko(e) {
			return (
				(e = ((e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext) || qn),
				(gr = ct.current),
				Te(ct, e),
				Te(kt, kt.current),
				!0
			)
		}
		function Xv(e, t, s) {
			var a = e.stateNode
			if (!a) throw Error(r(169))
			s
				? ((e = Kv(e, t, gr)),
					(a.__reactInternalMemoizedMergedChildContext = e),
					Me(kt),
					Me(ct),
					Te(ct, e))
				: Me(kt),
				Te(kt, s)
		}
		var Sn = null,
			Xo = !1,
			nc = !1
		function Yv(e) {
			Sn === null ? (Sn = [e]) : Sn.push(e)
		}
		function hS(e) {
			;(Xo = !0), Yv(e)
		}
		function Gn() {
			if (!nc && Sn !== null) {
				nc = !0
				var e = 0,
					t = Pe
				try {
					var s = Sn
					for (Pe = 1; e < s.length; e++) {
						var a = s[e]
						do a = a(!0)
						while (a !== null)
					}
					;(Sn = null), (Xo = !1)
				} catch (c) {
					throw (Sn !== null && (Sn = Sn.slice(e + 1)), Jh(xu, Gn), c)
				} finally {
					;(Pe = t), (nc = !1)
				}
			}
			return null
		}
		var oi = [],
			ai = 0,
			Yo = null,
			Zo = 0,
			At = [],
			$t = 0,
			mr = null,
			En = 1,
			kn = ''
		function _r(e, t) {
			;(oi[ai++] = Zo), (oi[ai++] = Yo), (Yo = e), (Zo = t)
		}
		function Zv(e, t, s) {
			;(At[$t++] = En), (At[$t++] = kn), (At[$t++] = mr), (mr = e)
			var a = En
			e = kn
			var c = 32 - qt(a) - 1
			;(a &= ~(1 << c)), (s += 1)
			var f = 32 - qt(t) + c
			if (30 < f) {
				var v = c - (c % 5)
				;(f = (a & ((1 << v) - 1)).toString(32)),
					(a >>= v),
					(c -= v),
					(En = (1 << (32 - qt(t) + c)) | (s << c) | a),
					(kn = f + e)
			} else (En = (1 << f) | (s << c) | a), (kn = e)
		}
		function rc(e) {
			e.return !== null && (_r(e, 1), Zv(e, 1, 0))
		}
		function ic(e) {
			for (; e === Yo; ) (Yo = oi[--ai]), (oi[ai] = null), (Zo = oi[--ai]), (oi[ai] = null)
			for (; e === mr; )
				(mr = At[--$t]),
					(At[$t] = null),
					(kn = At[--$t]),
					(At[$t] = null),
					(En = At[--$t]),
					(At[$t] = null)
		}
		var Tt = null,
			Ot = null,
			De = !1,
			Qt = null
		function Jv(e, t) {
			var s = Bt(5, null, null, 0)
			;(s.elementType = 'DELETED'),
				(s.stateNode = t),
				(s.return = e),
				(t = e.deletions),
				t === null ? ((e.deletions = [s]), (e.flags |= 16)) : t.push(s)
		}
		function eg(e, t) {
			switch (e.tag) {
				case 5:
					var s = e.type
					return (
						(t = t.nodeType !== 1 || s.toLowerCase() !== t.nodeName.toLowerCase() ? null : t),
						t !== null ? ((e.stateNode = t), (Tt = e), (Ot = Hn(t.firstChild)), !0) : !1
					)
				case 6:
					return (
						(t = e.pendingProps === '' || t.nodeType !== 3 ? null : t),
						t !== null ? ((e.stateNode = t), (Tt = e), (Ot = null), !0) : !1
					)
				case 13:
					return (
						(t = t.nodeType !== 8 ? null : t),
						t !== null
							? ((s = mr !== null ? { id: En, overflow: kn } : null),
								(e.memoizedState = { dehydrated: t, treeContext: s, retryLane: 1073741824 }),
								(s = Bt(18, null, null, 0)),
								(s.stateNode = t),
								(s.return = e),
								(e.child = s),
								(Tt = e),
								(Ot = null),
								!0)
							: !1
					)
				default:
					return !1
			}
		}
		function sc(e) {
			return (e.mode & 1) !== 0 && (e.flags & 128) === 0
		}
		function oc(e) {
			if (De) {
				var t = Ot
				if (t) {
					var s = t
					if (!eg(e, t)) {
						if (sc(e)) throw Error(r(418))
						t = Hn(s.nextSibling)
						var a = Tt
						t && eg(e, t) ? Jv(a, s) : ((e.flags = (e.flags & -4097) | 2), (De = !1), (Tt = e))
					}
				} else {
					if (sc(e)) throw Error(r(418))
					;(e.flags = (e.flags & -4097) | 2), (De = !1), (Tt = e)
				}
			}
		}
		function tg(e) {
			for (e = e.return; e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13; ) e = e.return
			Tt = e
		}
		function Jo(e) {
			if (e !== Tt) return !1
			if (!De) return tg(e), (De = !0), !1
			var t
			if (
				((t = e.tag !== 3) &&
					!(t = e.tag !== 5) &&
					((t = e.type), (t = t !== 'head' && t !== 'body' && !Yu(e.type, e.memoizedProps))),
				t && (t = Ot))
			) {
				if (sc(e)) throw (ng(), Error(r(418)))
				for (; t; ) Jv(e, t), (t = Hn(t.nextSibling))
			}
			if ((tg(e), e.tag === 13)) {
				if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e)) throw Error(r(317))
				e: {
					for (e = e.nextSibling, t = 0; e; ) {
						if (e.nodeType === 8) {
							var s = e.data
							if (s === '/$') {
								if (t === 0) {
									Ot = Hn(e.nextSibling)
									break e
								}
								t--
							} else (s !== '$' && s !== '$!' && s !== '$?') || t++
						}
						e = e.nextSibling
					}
					Ot = null
				}
			} else Ot = Tt ? Hn(e.stateNode.nextSibling) : null
			return !0
		}
		function ng() {
			for (var e = Ot; e; ) e = Hn(e.nextSibling)
		}
		function li() {
			;(Ot = Tt = null), (De = !1)
		}
		function ac(e) {
			Qt === null ? (Qt = [e]) : Qt.push(e)
		}
		var vS = Q.ReactCurrentBatchConfig
		function ps(e, t, s) {
			if (((e = s.ref), e !== null && typeof e != 'function' && typeof e != 'object')) {
				if (s._owner) {
					if (((s = s._owner), s)) {
						if (s.tag !== 1) throw Error(r(309))
						var a = s.stateNode
					}
					if (!a) throw Error(r(147, e))
					var c = a,
						f = '' + e
					return t !== null &&
						t.ref !== null &&
						typeof t.ref == 'function' &&
						t.ref._stringRef === f
						? t.ref
						: ((t = function (v) {
								var y = c.refs
								v === null ? delete y[f] : (y[f] = v)
							}),
							(t._stringRef = f),
							t)
				}
				if (typeof e != 'string') throw Error(r(284))
				if (!s._owner) throw Error(r(290, e))
			}
			return e
		}
		function ea(e, t) {
			throw (
				((e = Object.prototype.toString.call(t)),
				Error(
					r(
						31,
						e === '[object Object]' ? 'object with keys {' + Object.keys(t).join(', ') + '}' : e
					)
				))
			)
		}
		function rg(e) {
			var t = e._init
			return t(e._payload)
		}
		function ig(e) {
			function t(P, C) {
				if (e) {
					var b = P.deletions
					b === null ? ((P.deletions = [C]), (P.flags |= 16)) : b.push(C)
				}
			}
			function s(P, C) {
				if (!e) return null
				for (; C !== null; ) t(P, C), (C = C.sibling)
				return null
			}
			function a(P, C) {
				for (P = new Map(); C !== null; )
					C.key !== null ? P.set(C.key, C) : P.set(C.index, C), (C = C.sibling)
				return P
			}
			function c(P, C) {
				return (P = tr(P, C)), (P.index = 0), (P.sibling = null), P
			}
			function f(P, C, b) {
				return (
					(P.index = b),
					e
						? ((b = P.alternate),
							b !== null ? ((b = b.index), b < C ? ((P.flags |= 2), C) : b) : ((P.flags |= 2), C))
						: ((P.flags |= 1048576), C)
				)
			}
			function v(P) {
				return e && P.alternate === null && (P.flags |= 2), P
			}
			function y(P, C, b, V) {
				return C === null || C.tag !== 6
					? ((C = Zc(b, P.mode, V)), (C.return = P), C)
					: ((C = c(C, b)), (C.return = P), C)
			}
			function E(P, C, b, V) {
				var oe = b.type
				return oe === ae
					? B(P, C, b.props.children, V, b.key)
					: C !== null &&
						  (C.elementType === oe ||
								(typeof oe == 'object' && oe !== null && oe.$$typeof === A && rg(oe) === C.type))
						? ((V = c(C, b.props)), (V.ref = ps(P, C, b)), (V.return = P), V)
						: ((V = xa(b.type, b.key, b.props, null, P.mode, V)),
							(V.ref = ps(P, C, b)),
							(V.return = P),
							V)
			}
			function O(P, C, b, V) {
				return C === null ||
					C.tag !== 4 ||
					C.stateNode.containerInfo !== b.containerInfo ||
					C.stateNode.implementation !== b.implementation
					? ((C = Jc(b, P.mode, V)), (C.return = P), C)
					: ((C = c(C, b.children || [])), (C.return = P), C)
			}
			function B(P, C, b, V, oe) {
				return C === null || C.tag !== 7
					? ((C = Pr(b, P.mode, V, oe)), (C.return = P), C)
					: ((C = c(C, b)), (C.return = P), C)
			}
			function H(P, C, b) {
				if ((typeof C == 'string' && C !== '') || typeof C == 'number')
					return (C = Zc('' + C, P.mode, b)), (C.return = P), C
				if (typeof C == 'object' && C !== null) {
					switch (C.$$typeof) {
						case ue:
							return (
								(b = xa(C.type, C.key, C.props, null, P.mode, b)),
								(b.ref = ps(P, null, C)),
								(b.return = P),
								b
							)
						case ve:
							return (C = Jc(C, P.mode, b)), (C.return = P), C
						case A:
							var V = C._init
							return H(P, V(C._payload), b)
					}
					if (Bi(C) || $(C)) return (C = Pr(C, P.mode, b, null)), (C.return = P), C
					ea(P, C)
				}
				return null
			}
			function U(P, C, b, V) {
				var oe = C !== null ? C.key : null
				if ((typeof b == 'string' && b !== '') || typeof b == 'number')
					return oe !== null ? null : y(P, C, '' + b, V)
				if (typeof b == 'object' && b !== null) {
					switch (b.$$typeof) {
						case ue:
							return b.key === oe ? E(P, C, b, V) : null
						case ve:
							return b.key === oe ? O(P, C, b, V) : null
						case A:
							return (oe = b._init), U(P, C, oe(b._payload), V)
					}
					if (Bi(b) || $(b)) return oe !== null ? null : B(P, C, b, V, null)
					ea(P, b)
				}
				return null
			}
			function Y(P, C, b, V, oe) {
				if ((typeof V == 'string' && V !== '') || typeof V == 'number')
					return (P = P.get(b) || null), y(C, P, '' + V, oe)
				if (typeof V == 'object' && V !== null) {
					switch (V.$$typeof) {
						case ue:
							return (P = P.get(V.key === null ? b : V.key) || null), E(C, P, V, oe)
						case ve:
							return (P = P.get(V.key === null ? b : V.key) || null), O(C, P, V, oe)
						case A:
							var ce = V._init
							return Y(P, C, b, ce(V._payload), oe)
					}
					if (Bi(V) || $(V)) return (P = P.get(b) || null), B(C, P, V, oe, null)
					ea(C, V)
				}
				return null
			}
			function re(P, C, b, V) {
				for (
					var oe = null, ce = null, de = C, fe = (C = 0), tt = null;
					de !== null && fe < b.length;
					fe++
				) {
					de.index > fe ? ((tt = de), (de = null)) : (tt = de.sibling)
					var ke = U(P, de, b[fe], V)
					if (ke === null) {
						de === null && (de = tt)
						break
					}
					e && de && ke.alternate === null && t(P, de),
						(C = f(ke, C, fe)),
						ce === null ? (oe = ke) : (ce.sibling = ke),
						(ce = ke),
						(de = tt)
				}
				if (fe === b.length) return s(P, de), De && _r(P, fe), oe
				if (de === null) {
					for (; fe < b.length; fe++)
						(de = H(P, b[fe], V)),
							de !== null &&
								((C = f(de, C, fe)), ce === null ? (oe = de) : (ce.sibling = de), (ce = de))
					return De && _r(P, fe), oe
				}
				for (de = a(P, de); fe < b.length; fe++)
					(tt = Y(de, P, fe, b[fe], V)),
						tt !== null &&
							(e && tt.alternate !== null && de.delete(tt.key === null ? fe : tt.key),
							(C = f(tt, C, fe)),
							ce === null ? (oe = tt) : (ce.sibling = tt),
							(ce = tt))
				return (
					e &&
						de.forEach(function (nr) {
							return t(P, nr)
						}),
					De && _r(P, fe),
					oe
				)
			}
			function se(P, C, b, V) {
				var oe = $(b)
				if (typeof oe != 'function') throw Error(r(150))
				if (((b = oe.call(b)), b == null)) throw Error(r(151))
				for (
					var ce = (oe = null), de = C, fe = (C = 0), tt = null, ke = b.next();
					de !== null && !ke.done;
					fe++, ke = b.next()
				) {
					de.index > fe ? ((tt = de), (de = null)) : (tt = de.sibling)
					var nr = U(P, de, ke.value, V)
					if (nr === null) {
						de === null && (de = tt)
						break
					}
					e && de && nr.alternate === null && t(P, de),
						(C = f(nr, C, fe)),
						ce === null ? (oe = nr) : (ce.sibling = nr),
						(ce = nr),
						(de = tt)
				}
				if (ke.done) return s(P, de), De && _r(P, fe), oe
				if (de === null) {
					for (; !ke.done; fe++, ke = b.next())
						(ke = H(P, ke.value, V)),
							ke !== null &&
								((C = f(ke, C, fe)), ce === null ? (oe = ke) : (ce.sibling = ke), (ce = ke))
					return De && _r(P, fe), oe
				}
				for (de = a(P, de); !ke.done; fe++, ke = b.next())
					(ke = Y(de, P, fe, ke.value, V)),
						ke !== null &&
							(e && ke.alternate !== null && de.delete(ke.key === null ? fe : ke.key),
							(C = f(ke, C, fe)),
							ce === null ? (oe = ke) : (ce.sibling = ke),
							(ce = ke))
				return (
					e &&
						de.forEach(function (QS) {
							return t(P, QS)
						}),
					De && _r(P, fe),
					oe
				)
			}
			function qe(P, C, b, V) {
				if (
					(typeof b == 'object' &&
						b !== null &&
						b.type === ae &&
						b.key === null &&
						(b = b.props.children),
					typeof b == 'object' && b !== null)
				) {
					switch (b.$$typeof) {
						case ue:
							e: {
								for (var oe = b.key, ce = C; ce !== null; ) {
									if (ce.key === oe) {
										if (((oe = b.type), oe === ae)) {
											if (ce.tag === 7) {
												s(P, ce.sibling), (C = c(ce, b.props.children)), (C.return = P), (P = C)
												break e
											}
										} else if (
											ce.elementType === oe ||
											(typeof oe == 'object' &&
												oe !== null &&
												oe.$$typeof === A &&
												rg(oe) === ce.type)
										) {
											s(P, ce.sibling),
												(C = c(ce, b.props)),
												(C.ref = ps(P, ce, b)),
												(C.return = P),
												(P = C)
											break e
										}
										s(P, ce)
										break
									} else t(P, ce)
									ce = ce.sibling
								}
								b.type === ae
									? ((C = Pr(b.props.children, P.mode, V, b.key)), (C.return = P), (P = C))
									: ((V = xa(b.type, b.key, b.props, null, P.mode, V)),
										(V.ref = ps(P, C, b)),
										(V.return = P),
										(P = V))
							}
							return v(P)
						case ve:
							e: {
								for (ce = b.key; C !== null; ) {
									if (C.key === ce)
										if (
											C.tag === 4 &&
											C.stateNode.containerInfo === b.containerInfo &&
											C.stateNode.implementation === b.implementation
										) {
											s(P, C.sibling), (C = c(C, b.children || [])), (C.return = P), (P = C)
											break e
										} else {
											s(P, C)
											break
										}
									else t(P, C)
									C = C.sibling
								}
								;(C = Jc(b, P.mode, V)), (C.return = P), (P = C)
							}
							return v(P)
						case A:
							return (ce = b._init), qe(P, C, ce(b._payload), V)
					}
					if (Bi(b)) return re(P, C, b, V)
					if ($(b)) return se(P, C, b, V)
					ea(P, b)
				}
				return (typeof b == 'string' && b !== '') || typeof b == 'number'
					? ((b = '' + b),
						C !== null && C.tag === 6
							? (s(P, C.sibling), (C = c(C, b)), (C.return = P), (P = C))
							: (s(P, C), (C = Zc(b, P.mode, V)), (C.return = P), (P = C)),
						v(P))
					: s(P, C)
			}
			return qe
		}
		var ui = ig(!0),
			sg = ig(!1),
			ta = Vn(null),
			na = null,
			ci = null,
			lc = null
		function uc() {
			lc = ci = na = null
		}
		function cc(e) {
			var t = ta.current
			Me(ta), (e._currentValue = t)
		}
		function dc(e, t, s) {
			for (; e !== null; ) {
				var a = e.alternate
				if (
					((e.childLanes & t) !== t
						? ((e.childLanes |= t), a !== null && (a.childLanes |= t))
						: a !== null && (a.childLanes & t) !== t && (a.childLanes |= t),
					e === s)
				)
					break
				e = e.return
			}
		}
		function di(e, t) {
			;(na = e),
				(lc = ci = null),
				(e = e.dependencies),
				e !== null &&
					e.firstContext !== null &&
					((e.lanes & t) !== 0 && (Ct = !0), (e.firstContext = null))
		}
		function zt(e) {
			var t = e._currentValue
			if (lc !== e)
				if (((e = { context: e, memoizedValue: t, next: null }), ci === null)) {
					if (na === null) throw Error(r(308))
					;(ci = e), (na.dependencies = { lanes: 0, firstContext: e })
				} else ci = ci.next = e
			return t
		}
		var yr = null
		function fc(e) {
			yr === null ? (yr = [e]) : yr.push(e)
		}
		function og(e, t, s, a) {
			var c = t.interleaved
			return (
				c === null ? ((s.next = s), fc(t)) : ((s.next = c.next), (c.next = s)),
				(t.interleaved = s),
				xn(e, a)
			)
		}
		function xn(e, t) {
			e.lanes |= t
			var s = e.alternate
			for (s !== null && (s.lanes |= t), s = e, e = e.return; e !== null; )
				(e.childLanes |= t),
					(s = e.alternate),
					s !== null && (s.childLanes |= t),
					(s = e),
					(e = e.return)
			return s.tag === 3 ? s.stateNode : null
		}
		var Qn = !1
		function pc(e) {
			e.updateQueue = {
				baseState: e.memoizedState,
				firstBaseUpdate: null,
				lastBaseUpdate: null,
				shared: { pending: null, interleaved: null, lanes: 0 },
				effects: null,
			}
		}
		function ag(e, t) {
			;(e = e.updateQueue),
				t.updateQueue === e &&
					(t.updateQueue = {
						baseState: e.baseState,
						firstBaseUpdate: e.firstBaseUpdate,
						lastBaseUpdate: e.lastBaseUpdate,
						shared: e.shared,
						effects: e.effects,
					})
		}
		function Cn(e, t) {
			return { eventTime: e, lane: t, tag: 0, payload: null, callback: null, next: null }
		}
		function Kn(e, t, s) {
			var a = e.updateQueue
			if (a === null) return null
			if (((a = a.shared), (Ee & 2) !== 0)) {
				var c = a.pending
				return (
					c === null ? (t.next = t) : ((t.next = c.next), (c.next = t)), (a.pending = t), xn(e, s)
				)
			}
			return (
				(c = a.interleaved),
				c === null ? ((t.next = t), fc(a)) : ((t.next = c.next), (c.next = t)),
				(a.interleaved = t),
				xn(e, s)
			)
		}
		function ra(e, t, s) {
			if (((t = t.updateQueue), t !== null && ((t = t.shared), (s & 4194240) !== 0))) {
				var a = t.lanes
				;(a &= e.pendingLanes), (s |= a), (t.lanes = s), bu(e, s)
			}
		}
		function lg(e, t) {
			var s = e.updateQueue,
				a = e.alternate
			if (a !== null && ((a = a.updateQueue), s === a)) {
				var c = null,
					f = null
				if (((s = s.firstBaseUpdate), s !== null)) {
					do {
						var v = {
							eventTime: s.eventTime,
							lane: s.lane,
							tag: s.tag,
							payload: s.payload,
							callback: s.callback,
							next: null,
						}
						f === null ? (c = f = v) : (f = f.next = v), (s = s.next)
					} while (s !== null)
					f === null ? (c = f = t) : (f = f.next = t)
				} else c = f = t
				;(s = {
					baseState: a.baseState,
					firstBaseUpdate: c,
					lastBaseUpdate: f,
					shared: a.shared,
					effects: a.effects,
				}),
					(e.updateQueue = s)
				return
			}
			;(e = s.lastBaseUpdate),
				e === null ? (s.firstBaseUpdate = t) : (e.next = t),
				(s.lastBaseUpdate = t)
		}
		function ia(e, t, s, a) {
			var c = e.updateQueue
			Qn = !1
			var f = c.firstBaseUpdate,
				v = c.lastBaseUpdate,
				y = c.shared.pending
			if (y !== null) {
				c.shared.pending = null
				var E = y,
					O = E.next
				;(E.next = null), v === null ? (f = O) : (v.next = O), (v = E)
				var B = e.alternate
				B !== null &&
					((B = B.updateQueue),
					(y = B.lastBaseUpdate),
					y !== v && (y === null ? (B.firstBaseUpdate = O) : (y.next = O), (B.lastBaseUpdate = E)))
			}
			if (f !== null) {
				var H = c.baseState
				;(v = 0), (B = O = E = null), (y = f)
				do {
					var U = y.lane,
						Y = y.eventTime
					if ((a & U) === U) {
						B !== null &&
							(B = B.next =
								{
									eventTime: Y,
									lane: 0,
									tag: y.tag,
									payload: y.payload,
									callback: y.callback,
									next: null,
								})
						e: {
							var re = e,
								se = y
							switch (((U = t), (Y = s), se.tag)) {
								case 1:
									if (((re = se.payload), typeof re == 'function')) {
										H = re.call(Y, H, U)
										break e
									}
									H = re
									break e
								case 3:
									re.flags = (re.flags & -65537) | 128
								case 0:
									if (
										((re = se.payload),
										(U = typeof re == 'function' ? re.call(Y, H, U) : re),
										U == null)
									)
										break e
									H = W({}, H, U)
									break e
								case 2:
									Qn = !0
							}
						}
						y.callback !== null &&
							y.lane !== 0 &&
							((e.flags |= 64), (U = c.effects), U === null ? (c.effects = [y]) : U.push(y))
					} else
						(Y = {
							eventTime: Y,
							lane: U,
							tag: y.tag,
							payload: y.payload,
							callback: y.callback,
							next: null,
						}),
							B === null ? ((O = B = Y), (E = H)) : (B = B.next = Y),
							(v |= U)
					if (((y = y.next), y === null)) {
						if (((y = c.shared.pending), y === null)) break
						;(U = y),
							(y = U.next),
							(U.next = null),
							(c.lastBaseUpdate = U),
							(c.shared.pending = null)
					}
				} while (!0)
				if (
					(B === null && (E = H),
					(c.baseState = E),
					(c.firstBaseUpdate = O),
					(c.lastBaseUpdate = B),
					(t = c.shared.interleaved),
					t !== null)
				) {
					c = t
					do (v |= c.lane), (c = c.next)
					while (c !== t)
				} else f === null && (c.shared.lanes = 0)
				;(Er |= v), (e.lanes = v), (e.memoizedState = H)
			}
		}
		function ug(e, t, s) {
			if (((e = t.effects), (t.effects = null), e !== null))
				for (t = 0; t < e.length; t++) {
					var a = e[t],
						c = a.callback
					if (c !== null) {
						if (((a.callback = null), (a = s), typeof c != 'function')) throw Error(r(191, c))
						c.call(a)
					}
				}
		}
		var hs = {},
			un = Vn(hs),
			vs = Vn(hs),
			gs = Vn(hs)
		function wr(e) {
			if (e === hs) throw Error(r(174))
			return e
		}
		function hc(e, t) {
			switch ((Te(gs, t), Te(vs, e), Te(un, hs), (e = t.nodeType), e)) {
				case 9:
				case 11:
					t = (t = t.documentElement) ? t.namespaceURI : vu(null, '')
					break
				default:
					;(e = e === 8 ? t.parentNode : t),
						(t = e.namespaceURI || null),
						(e = e.tagName),
						(t = vu(t, e))
			}
			Me(un), Te(un, t)
		}
		function fi() {
			Me(un), Me(vs), Me(gs)
		}
		function cg(e) {
			wr(gs.current)
			var t = wr(un.current),
				s = vu(t, e.type)
			t !== s && (Te(vs, e), Te(un, s))
		}
		function vc(e) {
			vs.current === e && (Me(un), Me(vs))
		}
		var $e = Vn(0)
		function sa(e) {
			for (var t = e; t !== null; ) {
				if (t.tag === 13) {
					var s = t.memoizedState
					if (s !== null && ((s = s.dehydrated), s === null || s.data === '$?' || s.data === '$!'))
						return t
				} else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
					if ((t.flags & 128) !== 0) return t
				} else if (t.child !== null) {
					;(t.child.return = t), (t = t.child)
					continue
				}
				if (t === e) break
				for (; t.sibling === null; ) {
					if (t.return === null || t.return === e) return null
					t = t.return
				}
				;(t.sibling.return = t.return), (t = t.sibling)
			}
			return null
		}
		var gc = []
		function mc() {
			for (var e = 0; e < gc.length; e++) gc[e]._workInProgressVersionPrimary = null
			gc.length = 0
		}
		var oa = Q.ReactCurrentDispatcher,
			_c = Q.ReactCurrentBatchConfig,
			Sr = 0,
			ze = null,
			Ye = null,
			Je = null,
			aa = !1,
			ms = !1,
			_s = 0,
			gS = 0
		function dt() {
			throw Error(r(321))
		}
		function yc(e, t) {
			if (t === null) return !1
			for (var s = 0; s < t.length && s < e.length; s++) if (!Gt(e[s], t[s])) return !1
			return !0
		}
		function wc(e, t, s, a, c, f) {
			if (
				((Sr = f),
				(ze = t),
				(t.memoizedState = null),
				(t.updateQueue = null),
				(t.lanes = 0),
				(oa.current = e === null || e.memoizedState === null ? wS : SS),
				(e = s(a, c)),
				ms)
			) {
				f = 0
				do {
					if (((ms = !1), (_s = 0), 25 <= f)) throw Error(r(301))
					;(f += 1), (Je = Ye = null), (t.updateQueue = null), (oa.current = ES), (e = s(a, c))
				} while (ms)
			}
			if (
				((oa.current = ca),
				(t = Ye !== null && Ye.next !== null),
				(Sr = 0),
				(Je = Ye = ze = null),
				(aa = !1),
				t)
			)
				throw Error(r(300))
			return e
		}
		function Sc() {
			var e = _s !== 0
			return (_s = 0), e
		}
		function cn() {
			var e = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null }
			return Je === null ? (ze.memoizedState = Je = e) : (Je = Je.next = e), Je
		}
		function jt() {
			if (Ye === null) {
				var e = ze.alternate
				e = e !== null ? e.memoizedState : null
			} else e = Ye.next
			var t = Je === null ? ze.memoizedState : Je.next
			if (t !== null) (Je = t), (Ye = e)
			else {
				if (e === null) throw Error(r(310))
				;(Ye = e),
					(e = {
						memoizedState: Ye.memoizedState,
						baseState: Ye.baseState,
						baseQueue: Ye.baseQueue,
						queue: Ye.queue,
						next: null,
					}),
					Je === null ? (ze.memoizedState = Je = e) : (Je = Je.next = e)
			}
			return Je
		}
		function ys(e, t) {
			return typeof t == 'function' ? t(e) : t
		}
		function Ec(e) {
			var t = jt(),
				s = t.queue
			if (s === null) throw Error(r(311))
			s.lastRenderedReducer = e
			var a = Ye,
				c = a.baseQueue,
				f = s.pending
			if (f !== null) {
				if (c !== null) {
					var v = c.next
					;(c.next = f.next), (f.next = v)
				}
				;(a.baseQueue = c = f), (s.pending = null)
			}
			if (c !== null) {
				;(f = c.next), (a = a.baseState)
				var y = (v = null),
					E = null,
					O = f
				do {
					var B = O.lane
					if ((Sr & B) === B)
						E !== null &&
							(E = E.next =
								{
									lane: 0,
									action: O.action,
									hasEagerState: O.hasEagerState,
									eagerState: O.eagerState,
									next: null,
								}),
							(a = O.hasEagerState ? O.eagerState : e(a, O.action))
					else {
						var H = {
							lane: B,
							action: O.action,
							hasEagerState: O.hasEagerState,
							eagerState: O.eagerState,
							next: null,
						}
						E === null ? ((y = E = H), (v = a)) : (E = E.next = H), (ze.lanes |= B), (Er |= B)
					}
					O = O.next
				} while (O !== null && O !== f)
				E === null ? (v = a) : (E.next = y),
					Gt(a, t.memoizedState) || (Ct = !0),
					(t.memoizedState = a),
					(t.baseState = v),
					(t.baseQueue = E),
					(s.lastRenderedState = a)
			}
			if (((e = s.interleaved), e !== null)) {
				c = e
				do (f = c.lane), (ze.lanes |= f), (Er |= f), (c = c.next)
				while (c !== e)
			} else c === null && (s.lanes = 0)
			return [t.memoizedState, s.dispatch]
		}
		function kc(e) {
			var t = jt(),
				s = t.queue
			if (s === null) throw Error(r(311))
			s.lastRenderedReducer = e
			var a = s.dispatch,
				c = s.pending,
				f = t.memoizedState
			if (c !== null) {
				s.pending = null
				var v = (c = c.next)
				do (f = e(f, v.action)), (v = v.next)
				while (v !== c)
				Gt(f, t.memoizedState) || (Ct = !0),
					(t.memoizedState = f),
					t.baseQueue === null && (t.baseState = f),
					(s.lastRenderedState = f)
			}
			return [f, a]
		}
		function dg() {}
		function fg(e, t) {
			var s = ze,
				a = jt(),
				c = t(),
				f = !Gt(a.memoizedState, c)
			if (
				(f && ((a.memoizedState = c), (Ct = !0)),
				(a = a.queue),
				xc(vg.bind(null, s, a, e), [e]),
				a.getSnapshot !== t || f || (Je !== null && Je.memoizedState.tag & 1))
			) {
				if (((s.flags |= 2048), ws(9, hg.bind(null, s, a, c, t), void 0, null), et === null))
					throw Error(r(349))
				;(Sr & 30) !== 0 || pg(s, t, c)
			}
			return c
		}
		function pg(e, t, s) {
			;(e.flags |= 16384),
				(e = { getSnapshot: t, value: s }),
				(t = ze.updateQueue),
				t === null
					? ((t = { lastEffect: null, stores: null }), (ze.updateQueue = t), (t.stores = [e]))
					: ((s = t.stores), s === null ? (t.stores = [e]) : s.push(e))
		}
		function hg(e, t, s, a) {
			;(t.value = s), (t.getSnapshot = a), gg(t) && mg(e)
		}
		function vg(e, t, s) {
			return s(function () {
				gg(t) && mg(e)
			})
		}
		function gg(e) {
			var t = e.getSnapshot
			e = e.value
			try {
				var s = t()
				return !Gt(e, s)
			} catch {
				return !0
			}
		}
		function mg(e) {
			var t = xn(e, 1)
			t !== null && Zt(t, e, 1, -1)
		}
		function _g(e) {
			var t = cn()
			return (
				typeof e == 'function' && (e = e()),
				(t.memoizedState = t.baseState = e),
				(e = {
					pending: null,
					interleaved: null,
					lanes: 0,
					dispatch: null,
					lastRenderedReducer: ys,
					lastRenderedState: e,
				}),
				(t.queue = e),
				(e = e.dispatch = yS.bind(null, ze, e)),
				[t.memoizedState, e]
			)
		}
		function ws(e, t, s, a) {
			return (
				(e = { tag: e, create: t, destroy: s, deps: a, next: null }),
				(t = ze.updateQueue),
				t === null
					? ((t = { lastEffect: null, stores: null }),
						(ze.updateQueue = t),
						(t.lastEffect = e.next = e))
					: ((s = t.lastEffect),
						s === null
							? (t.lastEffect = e.next = e)
							: ((a = s.next), (s.next = e), (e.next = a), (t.lastEffect = e))),
				e
			)
		}
		function yg() {
			return jt().memoizedState
		}
		function la(e, t, s, a) {
			var c = cn()
			;(ze.flags |= e), (c.memoizedState = ws(1 | t, s, void 0, a === void 0 ? null : a))
		}
		function ua(e, t, s, a) {
			var c = jt()
			a = a === void 0 ? null : a
			var f = void 0
			if (Ye !== null) {
				var v = Ye.memoizedState
				if (((f = v.destroy), a !== null && yc(a, v.deps))) {
					c.memoizedState = ws(t, s, f, a)
					return
				}
			}
			;(ze.flags |= e), (c.memoizedState = ws(1 | t, s, f, a))
		}
		function wg(e, t) {
			return la(8390656, 8, e, t)
		}
		function xc(e, t) {
			return ua(2048, 8, e, t)
		}
		function Sg(e, t) {
			return ua(4, 2, e, t)
		}
		function Eg(e, t) {
			return ua(4, 4, e, t)
		}
		function kg(e, t) {
			if (typeof t == 'function')
				return (
					(e = e()),
					t(e),
					function () {
						t(null)
					}
				)
			if (t != null)
				return (
					(e = e()),
					(t.current = e),
					function () {
						t.current = null
					}
				)
		}
		function xg(e, t, s) {
			return (s = s != null ? s.concat([e]) : null), ua(4, 4, kg.bind(null, t, e), s)
		}
		function Cc() {}
		function Cg(e, t) {
			var s = jt()
			t = t === void 0 ? null : t
			var a = s.memoizedState
			return a !== null && t !== null && yc(t, a[1]) ? a[0] : ((s.memoizedState = [e, t]), e)
		}
		function Pg(e, t) {
			var s = jt()
			t = t === void 0 ? null : t
			var a = s.memoizedState
			return a !== null && t !== null && yc(t, a[1])
				? a[0]
				: ((e = e()), (s.memoizedState = [e, t]), e)
		}
		function bg(e, t, s) {
			return (Sr & 21) === 0
				? (e.baseState && ((e.baseState = !1), (Ct = !0)), (e.memoizedState = s))
				: (Gt(s, t) || ((s = rv()), (ze.lanes |= s), (Er |= s), (e.baseState = !0)), t)
		}
		function mS(e, t) {
			var s = Pe
			;(Pe = s !== 0 && 4 > s ? s : 4), e(!0)
			var a = _c.transition
			_c.transition = {}
			try {
				e(!1), t()
			} finally {
				;(Pe = s), (_c.transition = a)
			}
		}
		function Rg() {
			return jt().memoizedState
		}
		function _S(e, t, s) {
			var a = Jn(e)
			if (((s = { lane: a, action: s, hasEagerState: !1, eagerState: null, next: null }), Ig(e)))
				Tg(t, s)
			else if (((s = og(e, t, s, a)), s !== null)) {
				var c = gt()
				Zt(s, e, a, c), Og(s, t, a)
			}
		}
		function yS(e, t, s) {
			var a = Jn(e),
				c = { lane: a, action: s, hasEagerState: !1, eagerState: null, next: null }
			if (Ig(e)) Tg(t, c)
			else {
				var f = e.alternate
				if (
					e.lanes === 0 &&
					(f === null || f.lanes === 0) &&
					((f = t.lastRenderedReducer), f !== null)
				)
					try {
						var v = t.lastRenderedState,
							y = f(v, s)
						if (((c.hasEagerState = !0), (c.eagerState = y), Gt(y, v))) {
							var E = t.interleaved
							E === null ? ((c.next = c), fc(t)) : ((c.next = E.next), (E.next = c)),
								(t.interleaved = c)
							return
						}
					} catch {
					} finally {
					}
				;(s = og(e, t, c, a)), s !== null && ((c = gt()), Zt(s, e, a, c), Og(s, t, a))
			}
		}
		function Ig(e) {
			var t = e.alternate
			return e === ze || (t !== null && t === ze)
		}
		function Tg(e, t) {
			ms = aa = !0
			var s = e.pending
			s === null ? (t.next = t) : ((t.next = s.next), (s.next = t)), (e.pending = t)
		}
		function Og(e, t, s) {
			if ((s & 4194240) !== 0) {
				var a = t.lanes
				;(a &= e.pendingLanes), (s |= a), (t.lanes = s), bu(e, s)
			}
		}
		var ca = {
				readContext: zt,
				useCallback: dt,
				useContext: dt,
				useEffect: dt,
				useImperativeHandle: dt,
				useInsertionEffect: dt,
				useLayoutEffect: dt,
				useMemo: dt,
				useReducer: dt,
				useRef: dt,
				useState: dt,
				useDebugValue: dt,
				useDeferredValue: dt,
				useTransition: dt,
				useMutableSource: dt,
				useSyncExternalStore: dt,
				useId: dt,
				unstable_isNewReconciler: !1,
			},
			wS = {
				readContext: zt,
				useCallback: function (e, t) {
					return (cn().memoizedState = [e, t === void 0 ? null : t]), e
				},
				useContext: zt,
				useEffect: wg,
				useImperativeHandle: function (e, t, s) {
					return (s = s != null ? s.concat([e]) : null), la(4194308, 4, kg.bind(null, t, e), s)
				},
				useLayoutEffect: function (e, t) {
					return la(4194308, 4, e, t)
				},
				useInsertionEffect: function (e, t) {
					return la(4, 2, e, t)
				},
				useMemo: function (e, t) {
					var s = cn()
					return (t = t === void 0 ? null : t), (e = e()), (s.memoizedState = [e, t]), e
				},
				useReducer: function (e, t, s) {
					var a = cn()
					return (
						(t = s !== void 0 ? s(t) : t),
						(a.memoizedState = a.baseState = t),
						(e = {
							pending: null,
							interleaved: null,
							lanes: 0,
							dispatch: null,
							lastRenderedReducer: e,
							lastRenderedState: t,
						}),
						(a.queue = e),
						(e = e.dispatch = _S.bind(null, ze, e)),
						[a.memoizedState, e]
					)
				},
				useRef: function (e) {
					var t = cn()
					return (e = { current: e }), (t.memoizedState = e)
				},
				useState: _g,
				useDebugValue: Cc,
				useDeferredValue: function (e) {
					return (cn().memoizedState = e)
				},
				useTransition: function () {
					var e = _g(!1),
						t = e[0]
					return (e = mS.bind(null, e[1])), (cn().memoizedState = e), [t, e]
				},
				useMutableSource: function () {},
				useSyncExternalStore: function (e, t, s) {
					var a = ze,
						c = cn()
					if (De) {
						if (s === void 0) throw Error(r(407))
						s = s()
					} else {
						if (((s = t()), et === null)) throw Error(r(349))
						;(Sr & 30) !== 0 || pg(a, t, s)
					}
					c.memoizedState = s
					var f = { value: s, getSnapshot: t }
					return (
						(c.queue = f),
						wg(vg.bind(null, a, f, e), [e]),
						(a.flags |= 2048),
						ws(9, hg.bind(null, a, f, s, t), void 0, null),
						s
					)
				},
				useId: function () {
					var e = cn(),
						t = et.identifierPrefix
					if (De) {
						var s = kn,
							a = En
						;(s = (a & ~(1 << (32 - qt(a) - 1))).toString(32) + s),
							(t = ':' + t + 'R' + s),
							(s = _s++),
							0 < s && (t += 'H' + s.toString(32)),
							(t += ':')
					} else (s = gS++), (t = ':' + t + 'r' + s.toString(32) + ':')
					return (e.memoizedState = t)
				},
				unstable_isNewReconciler: !1,
			},
			SS = {
				readContext: zt,
				useCallback: Cg,
				useContext: zt,
				useEffect: xc,
				useImperativeHandle: xg,
				useInsertionEffect: Sg,
				useLayoutEffect: Eg,
				useMemo: Pg,
				useReducer: Ec,
				useRef: yg,
				useState: function () {
					return Ec(ys)
				},
				useDebugValue: Cc,
				useDeferredValue: function (e) {
					var t = jt()
					return bg(t, Ye.memoizedState, e)
				},
				useTransition: function () {
					var e = Ec(ys)[0],
						t = jt().memoizedState
					return [e, t]
				},
				useMutableSource: dg,
				useSyncExternalStore: fg,
				useId: Rg,
				unstable_isNewReconciler: !1,
			},
			ES = {
				readContext: zt,
				useCallback: Cg,
				useContext: zt,
				useEffect: xc,
				useImperativeHandle: xg,
				useInsertionEffect: Sg,
				useLayoutEffect: Eg,
				useMemo: Pg,
				useReducer: kc,
				useRef: yg,
				useState: function () {
					return kc(ys)
				},
				useDebugValue: Cc,
				useDeferredValue: function (e) {
					var t = jt()
					return Ye === null ? (t.memoizedState = e) : bg(t, Ye.memoizedState, e)
				},
				useTransition: function () {
					var e = kc(ys)[0],
						t = jt().memoizedState
					return [e, t]
				},
				useMutableSource: dg,
				useSyncExternalStore: fg,
				useId: Rg,
				unstable_isNewReconciler: !1,
			}
		function Kt(e, t) {
			if (e && e.defaultProps) {
				;(t = W({}, t)), (e = e.defaultProps)
				for (var s in e) t[s] === void 0 && (t[s] = e[s])
				return t
			}
			return t
		}
		function Pc(e, t, s, a) {
			;(t = e.memoizedState),
				(s = s(a, t)),
				(s = s == null ? t : W({}, t, s)),
				(e.memoizedState = s),
				e.lanes === 0 && (e.updateQueue.baseState = s)
		}
		var da = {
			isMounted: function (e) {
				return (e = e._reactInternals) ? hr(e) === e : !1
			},
			enqueueSetState: function (e, t, s) {
				e = e._reactInternals
				var a = gt(),
					c = Jn(e),
					f = Cn(a, c)
				;(f.payload = t),
					s != null && (f.callback = s),
					(t = Kn(e, f, c)),
					t !== null && (Zt(t, e, c, a), ra(t, e, c))
			},
			enqueueReplaceState: function (e, t, s) {
				e = e._reactInternals
				var a = gt(),
					c = Jn(e),
					f = Cn(a, c)
				;(f.tag = 1),
					(f.payload = t),
					s != null && (f.callback = s),
					(t = Kn(e, f, c)),
					t !== null && (Zt(t, e, c, a), ra(t, e, c))
			},
			enqueueForceUpdate: function (e, t) {
				e = e._reactInternals
				var s = gt(),
					a = Jn(e),
					c = Cn(s, a)
				;(c.tag = 2),
					t != null && (c.callback = t),
					(t = Kn(e, c, a)),
					t !== null && (Zt(t, e, a, s), ra(t, e, a))
			},
		}
		function Ng(e, t, s, a, c, f, v) {
			return (
				(e = e.stateNode),
				typeof e.shouldComponentUpdate == 'function'
					? e.shouldComponentUpdate(a, f, v)
					: t.prototype && t.prototype.isPureReactComponent
						? !os(s, a) || !os(c, f)
						: !0
			)
		}
		function Fg(e, t, s) {
			var a = !1,
				c = qn,
				f = t.contextType
			return (
				typeof f == 'object' && f !== null
					? (f = zt(f))
					: ((c = xt(t) ? gr : ct.current),
						(a = t.contextTypes),
						(f = (a = a != null) ? si(e, c) : qn)),
				(t = new t(s, f)),
				(e.memoizedState = t.state !== null && t.state !== void 0 ? t.state : null),
				(t.updater = da),
				(e.stateNode = t),
				(t._reactInternals = e),
				a &&
					((e = e.stateNode),
					(e.__reactInternalMemoizedUnmaskedChildContext = c),
					(e.__reactInternalMemoizedMaskedChildContext = f)),
				t
			)
		}
		function Mg(e, t, s, a) {
			;(e = t.state),
				typeof t.componentWillReceiveProps == 'function' && t.componentWillReceiveProps(s, a),
				typeof t.UNSAFE_componentWillReceiveProps == 'function' &&
					t.UNSAFE_componentWillReceiveProps(s, a),
				t.state !== e && da.enqueueReplaceState(t, t.state, null)
		}
		function bc(e, t, s, a) {
			var c = e.stateNode
			;(c.props = s), (c.state = e.memoizedState), (c.refs = {}), pc(e)
			var f = t.contextType
			typeof f == 'object' && f !== null
				? (c.context = zt(f))
				: ((f = xt(t) ? gr : ct.current), (c.context = si(e, f))),
				(c.state = e.memoizedState),
				(f = t.getDerivedStateFromProps),
				typeof f == 'function' && (Pc(e, t, f, s), (c.state = e.memoizedState)),
				typeof t.getDerivedStateFromProps == 'function' ||
					typeof c.getSnapshotBeforeUpdate == 'function' ||
					(typeof c.UNSAFE_componentWillMount != 'function' &&
						typeof c.componentWillMount != 'function') ||
					((t = c.state),
					typeof c.componentWillMount == 'function' && c.componentWillMount(),
					typeof c.UNSAFE_componentWillMount == 'function' && c.UNSAFE_componentWillMount(),
					t !== c.state && da.enqueueReplaceState(c, c.state, null),
					ia(e, s, c, a),
					(c.state = e.memoizedState)),
				typeof c.componentDidMount == 'function' && (e.flags |= 4194308)
		}
		function pi(e, t) {
			try {
				var s = '',
					a = t
				do (s += ge(a)), (a = a.return)
				while (a)
				var c = s
			} catch (f) {
				c =
					`
Error generating stack: ` +
					f.message +
					`
` +
					f.stack
			}
			return { value: e, source: t, stack: c, digest: null }
		}
		function Rc(e, t, s) {
			return { value: e, source: null, stack: s ?? null, digest: t ?? null }
		}
		function Ic(e, t) {
			try {
				console.error(t.value)
			} catch (s) {
				setTimeout(function () {
					throw s
				})
			}
		}
		var kS = typeof WeakMap == 'function' ? WeakMap : Map
		function Lg(e, t, s) {
			;(s = Cn(-1, s)), (s.tag = 3), (s.payload = { element: null })
			var a = t.value
			return (
				(s.callback = function () {
					_a || ((_a = !0), (Hc = a)), Ic(e, t)
				}),
				s
			)
		}
		function Dg(e, t, s) {
			;(s = Cn(-1, s)), (s.tag = 3)
			var a = e.type.getDerivedStateFromError
			if (typeof a == 'function') {
				var c = t.value
				;(s.payload = function () {
					return a(c)
				}),
					(s.callback = function () {
						Ic(e, t)
					})
			}
			var f = e.stateNode
			return (
				f !== null &&
					typeof f.componentDidCatch == 'function' &&
					(s.callback = function () {
						Ic(e, t),
							typeof a != 'function' && (Yn === null ? (Yn = new Set([this])) : Yn.add(this))
						var v = t.stack
						this.componentDidCatch(t.value, { componentStack: v !== null ? v : '' })
					}),
				s
			)
		}
		function Ag(e, t, s) {
			var a = e.pingCache
			if (a === null) {
				a = e.pingCache = new kS()
				var c = new Set()
				a.set(t, c)
			} else (c = a.get(t)), c === void 0 && ((c = new Set()), a.set(t, c))
			c.has(s) || (c.add(s), (e = AS.bind(null, e, t, s)), t.then(e, e))
		}
		function $g(e) {
			do {
				var t
				if (
					((t = e.tag === 13) &&
						((t = e.memoizedState), (t = t !== null ? t.dehydrated !== null : !0)),
					t)
				)
					return e
				e = e.return
			} while (e !== null)
			return null
		}
		function zg(e, t, s, a, c) {
			return (e.mode & 1) === 0
				? (e === t
						? (e.flags |= 65536)
						: ((e.flags |= 128),
							(s.flags |= 131072),
							(s.flags &= -52805),
							s.tag === 1 &&
								(s.alternate === null ? (s.tag = 17) : ((t = Cn(-1, 1)), (t.tag = 2), Kn(s, t, 1))),
							(s.lanes |= 1)),
					e)
				: ((e.flags |= 65536), (e.lanes = c), e)
		}
		var xS = Q.ReactCurrentOwner,
			Ct = !1
		function vt(e, t, s, a) {
			t.child = e === null ? sg(t, null, s, a) : ui(t, e.child, s, a)
		}
		function jg(e, t, s, a, c) {
			s = s.render
			var f = t.ref
			return (
				di(t, c),
				(a = wc(e, t, s, a, f, c)),
				(s = Sc()),
				e !== null && !Ct
					? ((t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~c), Pn(e, t, c))
					: (De && s && rc(t), (t.flags |= 1), vt(e, t, a, c), t.child)
			)
		}
		function Ug(e, t, s, a, c) {
			if (e === null) {
				var f = s.type
				return typeof f == 'function' &&
					!Yc(f) &&
					f.defaultProps === void 0 &&
					s.compare === null &&
					s.defaultProps === void 0
					? ((t.tag = 15), (t.type = f), Bg(e, t, f, a, c))
					: ((e = xa(s.type, null, a, t, t.mode, c)),
						(e.ref = t.ref),
						(e.return = t),
						(t.child = e))
			}
			if (((f = e.child), (e.lanes & c) === 0)) {
				var v = f.memoizedProps
				if (((s = s.compare), (s = s !== null ? s : os), s(v, a) && e.ref === t.ref))
					return Pn(e, t, c)
			}
			return (t.flags |= 1), (e = tr(f, a)), (e.ref = t.ref), (e.return = t), (t.child = e)
		}
		function Bg(e, t, s, a, c) {
			if (e !== null) {
				var f = e.memoizedProps
				if (os(f, a) && e.ref === t.ref)
					if (((Ct = !1), (t.pendingProps = a = f), (e.lanes & c) !== 0))
						(e.flags & 131072) !== 0 && (Ct = !0)
					else return (t.lanes = e.lanes), Pn(e, t, c)
			}
			return Tc(e, t, s, a, c)
		}
		function Wg(e, t, s) {
			var a = t.pendingProps,
				c = a.children,
				f = e !== null ? e.memoizedState : null
			if (a.mode === 'hidden')
				if ((t.mode & 1) === 0)
					(t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
						Te(vi, Nt),
						(Nt |= s)
				else {
					if ((s & 1073741824) === 0)
						return (
							(e = f !== null ? f.baseLanes | s : s),
							(t.lanes = t.childLanes = 1073741824),
							(t.memoizedState = { baseLanes: e, cachePool: null, transitions: null }),
							(t.updateQueue = null),
							Te(vi, Nt),
							(Nt |= e),
							null
						)
					;(t.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }),
						(a = f !== null ? f.baseLanes : s),
						Te(vi, Nt),
						(Nt |= a)
				}
			else
				f !== null ? ((a = f.baseLanes | s), (t.memoizedState = null)) : (a = s),
					Te(vi, Nt),
					(Nt |= a)
			return vt(e, t, c, s), t.child
		}
		function Hg(e, t) {
			var s = t.ref
			;((e === null && s !== null) || (e !== null && e.ref !== s)) &&
				((t.flags |= 512), (t.flags |= 2097152))
		}
		function Tc(e, t, s, a, c) {
			var f = xt(s) ? gr : ct.current
			return (
				(f = si(t, f)),
				di(t, c),
				(s = wc(e, t, s, a, f, c)),
				(a = Sc()),
				e !== null && !Ct
					? ((t.updateQueue = e.updateQueue), (t.flags &= -2053), (e.lanes &= ~c), Pn(e, t, c))
					: (De && a && rc(t), (t.flags |= 1), vt(e, t, s, c), t.child)
			)
		}
		function Vg(e, t, s, a, c) {
			if (xt(s)) {
				var f = !0
				Ko(t)
			} else f = !1
			if ((di(t, c), t.stateNode === null)) pa(e, t), Fg(t, s, a), bc(t, s, a, c), (a = !0)
			else if (e === null) {
				var v = t.stateNode,
					y = t.memoizedProps
				v.props = y
				var E = v.context,
					O = s.contextType
				typeof O == 'object' && O !== null
					? (O = zt(O))
					: ((O = xt(s) ? gr : ct.current), (O = si(t, O)))
				var B = s.getDerivedStateFromProps,
					H = typeof B == 'function' || typeof v.getSnapshotBeforeUpdate == 'function'
				H ||
					(typeof v.UNSAFE_componentWillReceiveProps != 'function' &&
						typeof v.componentWillReceiveProps != 'function') ||
					((y !== a || E !== O) && Mg(t, v, a, O)),
					(Qn = !1)
				var U = t.memoizedState
				;(v.state = U),
					ia(t, a, v, c),
					(E = t.memoizedState),
					y !== a || U !== E || kt.current || Qn
						? (typeof B == 'function' && (Pc(t, s, B, a), (E = t.memoizedState)),
							(y = Qn || Ng(t, s, y, a, U, E, O))
								? (H ||
										(typeof v.UNSAFE_componentWillMount != 'function' &&
											typeof v.componentWillMount != 'function') ||
										(typeof v.componentWillMount == 'function' && v.componentWillMount(),
										typeof v.UNSAFE_componentWillMount == 'function' &&
											v.UNSAFE_componentWillMount()),
									typeof v.componentDidMount == 'function' && (t.flags |= 4194308))
								: (typeof v.componentDidMount == 'function' && (t.flags |= 4194308),
									(t.memoizedProps = a),
									(t.memoizedState = E)),
							(v.props = a),
							(v.state = E),
							(v.context = O),
							(a = y))
						: (typeof v.componentDidMount == 'function' && (t.flags |= 4194308), (a = !1))
			} else {
				;(v = t.stateNode),
					ag(e, t),
					(y = t.memoizedProps),
					(O = t.type === t.elementType ? y : Kt(t.type, y)),
					(v.props = O),
					(H = t.pendingProps),
					(U = v.context),
					(E = s.contextType),
					typeof E == 'object' && E !== null
						? (E = zt(E))
						: ((E = xt(s) ? gr : ct.current), (E = si(t, E)))
				var Y = s.getDerivedStateFromProps
				;(B = typeof Y == 'function' || typeof v.getSnapshotBeforeUpdate == 'function') ||
					(typeof v.UNSAFE_componentWillReceiveProps != 'function' &&
						typeof v.componentWillReceiveProps != 'function') ||
					((y !== H || U !== E) && Mg(t, v, a, E)),
					(Qn = !1),
					(U = t.memoizedState),
					(v.state = U),
					ia(t, a, v, c)
				var re = t.memoizedState
				y !== H || U !== re || kt.current || Qn
					? (typeof Y == 'function' && (Pc(t, s, Y, a), (re = t.memoizedState)),
						(O = Qn || Ng(t, s, O, a, U, re, E) || !1)
							? (B ||
									(typeof v.UNSAFE_componentWillUpdate != 'function' &&
										typeof v.componentWillUpdate != 'function') ||
									(typeof v.componentWillUpdate == 'function' && v.componentWillUpdate(a, re, E),
									typeof v.UNSAFE_componentWillUpdate == 'function' &&
										v.UNSAFE_componentWillUpdate(a, re, E)),
								typeof v.componentDidUpdate == 'function' && (t.flags |= 4),
								typeof v.getSnapshotBeforeUpdate == 'function' && (t.flags |= 1024))
							: (typeof v.componentDidUpdate != 'function' ||
									(y === e.memoizedProps && U === e.memoizedState) ||
									(t.flags |= 4),
								typeof v.getSnapshotBeforeUpdate != 'function' ||
									(y === e.memoizedProps && U === e.memoizedState) ||
									(t.flags |= 1024),
								(t.memoizedProps = a),
								(t.memoizedState = re)),
						(v.props = a),
						(v.state = re),
						(v.context = E),
						(a = O))
					: (typeof v.componentDidUpdate != 'function' ||
							(y === e.memoizedProps && U === e.memoizedState) ||
							(t.flags |= 4),
						typeof v.getSnapshotBeforeUpdate != 'function' ||
							(y === e.memoizedProps && U === e.memoizedState) ||
							(t.flags |= 1024),
						(a = !1))
			}
			return Oc(e, t, s, a, f, c)
		}
		function Oc(e, t, s, a, c, f) {
			Hg(e, t)
			var v = (t.flags & 128) !== 0
			if (!a && !v) return c && Xv(t, s, !1), Pn(e, t, f)
			;(a = t.stateNode), (xS.current = t)
			var y = v && typeof s.getDerivedStateFromError != 'function' ? null : a.render()
			return (
				(t.flags |= 1),
				e !== null && v
					? ((t.child = ui(t, e.child, null, f)), (t.child = ui(t, null, y, f)))
					: vt(e, t, y, f),
				(t.memoizedState = a.state),
				c && Xv(t, s, !0),
				t.child
			)
		}
		function qg(e) {
			var t = e.stateNode
			t.pendingContext
				? Qv(e, t.pendingContext, t.pendingContext !== t.context)
				: t.context && Qv(e, t.context, !1),
				hc(e, t.containerInfo)
		}
		function Gg(e, t, s, a, c) {
			return li(), ac(c), (t.flags |= 256), vt(e, t, s, a), t.child
		}
		var Nc = { dehydrated: null, treeContext: null, retryLane: 0 }
		function Fc(e) {
			return { baseLanes: e, cachePool: null, transitions: null }
		}
		function Qg(e, t, s) {
			var a = t.pendingProps,
				c = $e.current,
				f = !1,
				v = (t.flags & 128) !== 0,
				y
			if (
				((y = v) || (y = e !== null && e.memoizedState === null ? !1 : (c & 2) !== 0),
				y ? ((f = !0), (t.flags &= -129)) : (e === null || e.memoizedState !== null) && (c |= 1),
				Te($e, c & 1),
				e === null)
			)
				return (
					oc(t),
					(e = t.memoizedState),
					e !== null && ((e = e.dehydrated), e !== null)
						? ((t.mode & 1) === 0
								? (t.lanes = 1)
								: e.data === '$!'
									? (t.lanes = 8)
									: (t.lanes = 1073741824),
							null)
						: ((v = a.children),
							(e = a.fallback),
							f
								? ((a = t.mode),
									(f = t.child),
									(v = { mode: 'hidden', children: v }),
									(a & 1) === 0 && f !== null
										? ((f.childLanes = 0), (f.pendingProps = v))
										: (f = Ca(v, a, 0, null)),
									(e = Pr(e, a, s, null)),
									(f.return = t),
									(e.return = t),
									(f.sibling = e),
									(t.child = f),
									(t.child.memoizedState = Fc(s)),
									(t.memoizedState = Nc),
									e)
								: Mc(t, v))
				)
			if (((c = e.memoizedState), c !== null && ((y = c.dehydrated), y !== null)))
				return CS(e, t, v, a, y, c, s)
			if (f) {
				;(f = a.fallback), (v = t.mode), (c = e.child), (y = c.sibling)
				var E = { mode: 'hidden', children: a.children }
				return (
					(v & 1) === 0 && t.child !== c
						? ((a = t.child), (a.childLanes = 0), (a.pendingProps = E), (t.deletions = null))
						: ((a = tr(c, E)), (a.subtreeFlags = c.subtreeFlags & 14680064)),
					y !== null ? (f = tr(y, f)) : ((f = Pr(f, v, s, null)), (f.flags |= 2)),
					(f.return = t),
					(a.return = t),
					(a.sibling = f),
					(t.child = a),
					(a = f),
					(f = t.child),
					(v = e.child.memoizedState),
					(v =
						v === null
							? Fc(s)
							: { baseLanes: v.baseLanes | s, cachePool: null, transitions: v.transitions }),
					(f.memoizedState = v),
					(f.childLanes = e.childLanes & ~s),
					(t.memoizedState = Nc),
					a
				)
			}
			return (
				(f = e.child),
				(e = f.sibling),
				(a = tr(f, { mode: 'visible', children: a.children })),
				(t.mode & 1) === 0 && (a.lanes = s),
				(a.return = t),
				(a.sibling = null),
				e !== null &&
					((s = t.deletions), s === null ? ((t.deletions = [e]), (t.flags |= 16)) : s.push(e)),
				(t.child = a),
				(t.memoizedState = null),
				a
			)
		}
		function Mc(e, t) {
			return (
				(t = Ca({ mode: 'visible', children: t }, e.mode, 0, null)), (t.return = e), (e.child = t)
			)
		}
		function fa(e, t, s, a) {
			return (
				a !== null && ac(a),
				ui(t, e.child, null, s),
				(e = Mc(t, t.pendingProps.children)),
				(e.flags |= 2),
				(t.memoizedState = null),
				e
			)
		}
		function CS(e, t, s, a, c, f, v) {
			if (s)
				return t.flags & 256
					? ((t.flags &= -257), (a = Rc(Error(r(422)))), fa(e, t, v, a))
					: t.memoizedState !== null
						? ((t.child = e.child), (t.flags |= 128), null)
						: ((f = a.fallback),
							(c = t.mode),
							(a = Ca({ mode: 'visible', children: a.children }, c, 0, null)),
							(f = Pr(f, c, v, null)),
							(f.flags |= 2),
							(a.return = t),
							(f.return = t),
							(a.sibling = f),
							(t.child = a),
							(t.mode & 1) !== 0 && ui(t, e.child, null, v),
							(t.child.memoizedState = Fc(v)),
							(t.memoizedState = Nc),
							f)
			if ((t.mode & 1) === 0) return fa(e, t, v, null)
			if (c.data === '$!') {
				if (((a = c.nextSibling && c.nextSibling.dataset), a)) var y = a.dgst
				return (a = y), (f = Error(r(419))), (a = Rc(f, a, void 0)), fa(e, t, v, a)
			}
			if (((y = (v & e.childLanes) !== 0), Ct || y)) {
				if (((a = et), a !== null)) {
					switch (v & -v) {
						case 4:
							c = 2
							break
						case 16:
							c = 8
							break
						case 64:
						case 128:
						case 256:
						case 512:
						case 1024:
						case 2048:
						case 4096:
						case 8192:
						case 16384:
						case 32768:
						case 65536:
						case 131072:
						case 262144:
						case 524288:
						case 1048576:
						case 2097152:
						case 4194304:
						case 8388608:
						case 16777216:
						case 33554432:
						case 67108864:
							c = 32
							break
						case 536870912:
							c = 268435456
							break
						default:
							c = 0
					}
					;(c = (c & (a.suspendedLanes | v)) !== 0 ? 0 : c),
						c !== 0 && c !== f.retryLane && ((f.retryLane = c), xn(e, c), Zt(a, e, c, -1))
				}
				return Xc(), (a = Rc(Error(r(421)))), fa(e, t, v, a)
			}
			return c.data === '$?'
				? ((t.flags |= 128), (t.child = e.child), (t = $S.bind(null, e)), (c._reactRetry = t), null)
				: ((e = f.treeContext),
					(Ot = Hn(c.nextSibling)),
					(Tt = t),
					(De = !0),
					(Qt = null),
					e !== null &&
						((At[$t++] = En),
						(At[$t++] = kn),
						(At[$t++] = mr),
						(En = e.id),
						(kn = e.overflow),
						(mr = t)),
					(t = Mc(t, a.children)),
					(t.flags |= 4096),
					t)
		}
		function Kg(e, t, s) {
			e.lanes |= t
			var a = e.alternate
			a !== null && (a.lanes |= t), dc(e.return, t, s)
		}
		function Lc(e, t, s, a, c) {
			var f = e.memoizedState
			f === null
				? (e.memoizedState = {
						isBackwards: t,
						rendering: null,
						renderingStartTime: 0,
						last: a,
						tail: s,
						tailMode: c,
					})
				: ((f.isBackwards = t),
					(f.rendering = null),
					(f.renderingStartTime = 0),
					(f.last = a),
					(f.tail = s),
					(f.tailMode = c))
		}
		function Xg(e, t, s) {
			var a = t.pendingProps,
				c = a.revealOrder,
				f = a.tail
			if ((vt(e, t, a.children, s), (a = $e.current), (a & 2) !== 0))
				(a = (a & 1) | 2), (t.flags |= 128)
			else {
				if (e !== null && (e.flags & 128) !== 0)
					e: for (e = t.child; e !== null; ) {
						if (e.tag === 13) e.memoizedState !== null && Kg(e, s, t)
						else if (e.tag === 19) Kg(e, s, t)
						else if (e.child !== null) {
							;(e.child.return = e), (e = e.child)
							continue
						}
						if (e === t) break e
						for (; e.sibling === null; ) {
							if (e.return === null || e.return === t) break e
							e = e.return
						}
						;(e.sibling.return = e.return), (e = e.sibling)
					}
				a &= 1
			}
			if ((Te($e, a), (t.mode & 1) === 0)) t.memoizedState = null
			else
				switch (c) {
					case 'forwards':
						for (s = t.child, c = null; s !== null; )
							(e = s.alternate), e !== null && sa(e) === null && (c = s), (s = s.sibling)
						;(s = c),
							s === null
								? ((c = t.child), (t.child = null))
								: ((c = s.sibling), (s.sibling = null)),
							Lc(t, !1, c, s, f)
						break
					case 'backwards':
						for (s = null, c = t.child, t.child = null; c !== null; ) {
							if (((e = c.alternate), e !== null && sa(e) === null)) {
								t.child = c
								break
							}
							;(e = c.sibling), (c.sibling = s), (s = c), (c = e)
						}
						Lc(t, !0, s, null, f)
						break
					case 'together':
						Lc(t, !1, null, null, void 0)
						break
					default:
						t.memoizedState = null
				}
			return t.child
		}
		function pa(e, t) {
			;(t.mode & 1) === 0 &&
				e !== null &&
				((e.alternate = null), (t.alternate = null), (t.flags |= 2))
		}
		function Pn(e, t, s) {
			if (
				(e !== null && (t.dependencies = e.dependencies), (Er |= t.lanes), (s & t.childLanes) === 0)
			)
				return null
			if (e !== null && t.child !== e.child) throw Error(r(153))
			if (t.child !== null) {
				for (
					e = t.child, s = tr(e, e.pendingProps), t.child = s, s.return = t;
					e.sibling !== null;

				)
					(e = e.sibling), (s = s.sibling = tr(e, e.pendingProps)), (s.return = t)
				s.sibling = null
			}
			return t.child
		}
		function PS(e, t, s) {
			switch (t.tag) {
				case 3:
					qg(t), li()
					break
				case 5:
					cg(t)
					break
				case 1:
					xt(t.type) && Ko(t)
					break
				case 4:
					hc(t, t.stateNode.containerInfo)
					break
				case 10:
					var a = t.type._context,
						c = t.memoizedProps.value
					Te(ta, a._currentValue), (a._currentValue = c)
					break
				case 13:
					if (((a = t.memoizedState), a !== null))
						return a.dehydrated !== null
							? (Te($e, $e.current & 1), (t.flags |= 128), null)
							: (s & t.child.childLanes) !== 0
								? Qg(e, t, s)
								: (Te($e, $e.current & 1), (e = Pn(e, t, s)), e !== null ? e.sibling : null)
					Te($e, $e.current & 1)
					break
				case 19:
					if (((a = (s & t.childLanes) !== 0), (e.flags & 128) !== 0)) {
						if (a) return Xg(e, t, s)
						t.flags |= 128
					}
					if (
						((c = t.memoizedState),
						c !== null && ((c.rendering = null), (c.tail = null), (c.lastEffect = null)),
						Te($e, $e.current),
						a)
					)
						break
					return null
				case 22:
				case 23:
					return (t.lanes = 0), Wg(e, t, s)
			}
			return Pn(e, t, s)
		}
		var Yg, Dc, Zg, Jg
		;(Yg = function (e, t) {
			for (var s = t.child; s !== null; ) {
				if (s.tag === 5 || s.tag === 6) e.appendChild(s.stateNode)
				else if (s.tag !== 4 && s.child !== null) {
					;(s.child.return = s), (s = s.child)
					continue
				}
				if (s === t) break
				for (; s.sibling === null; ) {
					if (s.return === null || s.return === t) return
					s = s.return
				}
				;(s.sibling.return = s.return), (s = s.sibling)
			}
		}),
			(Dc = function () {}),
			(Zg = function (e, t, s, a) {
				var c = e.memoizedProps
				if (c !== a) {
					;(e = t.stateNode), wr(un.current)
					var f = null
					switch (s) {
						case 'input':
							;(c = qr(e, c)), (a = qr(e, a)), (f = [])
							break
						case 'select':
							;(c = W({}, c, { value: void 0 })), (a = W({}, a, { value: void 0 })), (f = [])
							break
						case 'textarea':
							;(c = hu(e, c)), (a = hu(e, a)), (f = [])
							break
						default:
							typeof c.onClick != 'function' && typeof a.onClick == 'function' && (e.onclick = qo)
					}
					gu(s, a)
					var v
					s = null
					for (O in c)
						if (!a.hasOwnProperty(O) && c.hasOwnProperty(O) && c[O] != null)
							if (O === 'style') {
								var y = c[O]
								for (v in y) y.hasOwnProperty(v) && (s || (s = {}), (s[v] = ''))
							} else
								O !== 'dangerouslySetInnerHTML' &&
									O !== 'children' &&
									O !== 'suppressContentEditableWarning' &&
									O !== 'suppressHydrationWarning' &&
									O !== 'autoFocus' &&
									(l.hasOwnProperty(O) ? f || (f = []) : (f = f || []).push(O, null))
					for (O in a) {
						var E = a[O]
						if (((y = c?.[O]), a.hasOwnProperty(O) && E !== y && (E != null || y != null)))
							if (O === 'style')
								if (y) {
									for (v in y)
										!y.hasOwnProperty(v) ||
											(E && E.hasOwnProperty(v)) ||
											(s || (s = {}), (s[v] = ''))
									for (v in E)
										E.hasOwnProperty(v) && y[v] !== E[v] && (s || (s = {}), (s[v] = E[v]))
								} else s || (f || (f = []), f.push(O, s)), (s = E)
							else
								O === 'dangerouslySetInnerHTML'
									? ((E = E ? E.__html : void 0),
										(y = y ? y.__html : void 0),
										E != null && y !== E && (f = f || []).push(O, E))
									: O === 'children'
										? (typeof E != 'string' && typeof E != 'number') ||
											(f = f || []).push(O, '' + E)
										: O !== 'suppressContentEditableWarning' &&
											O !== 'suppressHydrationWarning' &&
											(l.hasOwnProperty(O)
												? (E != null && O === 'onScroll' && Fe('scroll', e),
													f || y === E || (f = []))
												: (f = f || []).push(O, E))
					}
					s && (f = f || []).push('style', s)
					var O = f
					;(t.updateQueue = O) && (t.flags |= 4)
				}
			}),
			(Jg = function (e, t, s, a) {
				s !== a && (t.flags |= 4)
			})
		function Ss(e, t) {
			if (!De)
				switch (e.tailMode) {
					case 'hidden':
						t = e.tail
						for (var s = null; t !== null; ) t.alternate !== null && (s = t), (t = t.sibling)
						s === null ? (e.tail = null) : (s.sibling = null)
						break
					case 'collapsed':
						s = e.tail
						for (var a = null; s !== null; ) s.alternate !== null && (a = s), (s = s.sibling)
						a === null
							? t || e.tail === null
								? (e.tail = null)
								: (e.tail.sibling = null)
							: (a.sibling = null)
				}
		}
		function ft(e) {
			var t = e.alternate !== null && e.alternate.child === e.child,
				s = 0,
				a = 0
			if (t)
				for (var c = e.child; c !== null; )
					(s |= c.lanes | c.childLanes),
						(a |= c.subtreeFlags & 14680064),
						(a |= c.flags & 14680064),
						(c.return = e),
						(c = c.sibling)
			else
				for (c = e.child; c !== null; )
					(s |= c.lanes | c.childLanes),
						(a |= c.subtreeFlags),
						(a |= c.flags),
						(c.return = e),
						(c = c.sibling)
			return (e.subtreeFlags |= a), (e.childLanes = s), t
		}
		function bS(e, t, s) {
			var a = t.pendingProps
			switch ((ic(t), t.tag)) {
				case 2:
				case 16:
				case 15:
				case 0:
				case 11:
				case 7:
				case 8:
				case 12:
				case 9:
				case 14:
					return ft(t), null
				case 1:
					return xt(t.type) && Qo(), ft(t), null
				case 3:
					return (
						(a = t.stateNode),
						fi(),
						Me(kt),
						Me(ct),
						mc(),
						a.pendingContext && ((a.context = a.pendingContext), (a.pendingContext = null)),
						(e === null || e.child === null) &&
							(Jo(t)
								? (t.flags |= 4)
								: e === null ||
									(e.memoizedState.isDehydrated && (t.flags & 256) === 0) ||
									((t.flags |= 1024), Qt !== null && (Gc(Qt), (Qt = null)))),
						Dc(e, t),
						ft(t),
						null
					)
				case 5:
					vc(t)
					var c = wr(gs.current)
					if (((s = t.type), e !== null && t.stateNode != null))
						Zg(e, t, s, a, c), e.ref !== t.ref && ((t.flags |= 512), (t.flags |= 2097152))
					else {
						if (!a) {
							if (t.stateNode === null) throw Error(r(166))
							return ft(t), null
						}
						if (((e = wr(un.current)), Jo(t))) {
							;(a = t.stateNode), (s = t.type)
							var f = t.memoizedProps
							switch (((a[ln] = t), (a[ds] = f), (e = (t.mode & 1) !== 0), s)) {
								case 'dialog':
									Fe('cancel', a), Fe('close', a)
									break
								case 'iframe':
								case 'object':
								case 'embed':
									Fe('load', a)
									break
								case 'video':
								case 'audio':
									for (c = 0; c < ls.length; c++) Fe(ls[c], a)
									break
								case 'source':
									Fe('error', a)
									break
								case 'img':
								case 'image':
								case 'link':
									Fe('error', a), Fe('load', a)
									break
								case 'details':
									Fe('toggle', a)
									break
								case 'input':
									ji(a, f), Fe('invalid', a)
									break
								case 'select':
									;(a._wrapperState = { wasMultiple: !!f.multiple }), Fe('invalid', a)
									break
								case 'textarea':
									Dh(a, f), Fe('invalid', a)
							}
							gu(s, f), (c = null)
							for (var v in f)
								if (f.hasOwnProperty(v)) {
									var y = f[v]
									v === 'children'
										? typeof y == 'string'
											? a.textContent !== y &&
												(f.suppressHydrationWarning !== !0 && Vo(a.textContent, y, e),
												(c = ['children', y]))
											: typeof y == 'number' &&
												a.textContent !== '' + y &&
												(f.suppressHydrationWarning !== !0 && Vo(a.textContent, y, e),
												(c = ['children', '' + y]))
										: l.hasOwnProperty(v) && y != null && v === 'onScroll' && Fe('scroll', a)
								}
							switch (s) {
								case 'input':
									Vr(a), Lh(a, f, !0)
									break
								case 'textarea':
									Vr(a), $h(a)
									break
								case 'select':
								case 'option':
									break
								default:
									typeof f.onClick == 'function' && (a.onclick = qo)
							}
							;(a = c), (t.updateQueue = a), a !== null && (t.flags |= 4)
						} else {
							;(v = c.nodeType === 9 ? c : c.ownerDocument),
								e === 'http://www.w3.org/1999/xhtml' && (e = zh(s)),
								e === 'http://www.w3.org/1999/xhtml'
									? s === 'script'
										? ((e = v.createElement('div')),
											(e.innerHTML = '<script></script>'),
											(e = e.removeChild(e.firstChild)))
										: typeof a.is == 'string'
											? (e = v.createElement(s, { is: a.is }))
											: ((e = v.createElement(s)),
												s === 'select' &&
													((v = e), a.multiple ? (v.multiple = !0) : a.size && (v.size = a.size)))
									: (e = v.createElementNS(e, s)),
								(e[ln] = t),
								(e[ds] = a),
								Yg(e, t, !1, !1),
								(t.stateNode = e)
							e: {
								switch (((v = mu(s, a)), s)) {
									case 'dialog':
										Fe('cancel', e), Fe('close', e), (c = a)
										break
									case 'iframe':
									case 'object':
									case 'embed':
										Fe('load', e), (c = a)
										break
									case 'video':
									case 'audio':
										for (c = 0; c < ls.length; c++) Fe(ls[c], e)
										c = a
										break
									case 'source':
										Fe('error', e), (c = a)
										break
									case 'img':
									case 'image':
									case 'link':
										Fe('error', e), Fe('load', e), (c = a)
										break
									case 'details':
										Fe('toggle', e), (c = a)
										break
									case 'input':
										ji(e, a), (c = qr(e, a)), Fe('invalid', e)
										break
									case 'option':
										c = a
										break
									case 'select':
										;(e._wrapperState = { wasMultiple: !!a.multiple }),
											(c = W({}, a, { value: void 0 })),
											Fe('invalid', e)
										break
									case 'textarea':
										Dh(e, a), (c = hu(e, a)), Fe('invalid', e)
										break
									default:
										c = a
								}
								gu(s, c), (y = c)
								for (f in y)
									if (y.hasOwnProperty(f)) {
										var E = y[f]
										f === 'style'
											? Bh(e, E)
											: f === 'dangerouslySetInnerHTML'
												? ((E = E ? E.__html : void 0), E != null && jh(e, E))
												: f === 'children'
													? typeof E == 'string'
														? (s !== 'textarea' || E !== '') && Wi(e, E)
														: typeof E == 'number' && Wi(e, '' + E)
													: f !== 'suppressContentEditableWarning' &&
														f !== 'suppressHydrationWarning' &&
														f !== 'autoFocus' &&
														(l.hasOwnProperty(f)
															? E != null && f === 'onScroll' && Fe('scroll', e)
															: E != null && G(e, f, E, v))
									}
								switch (s) {
									case 'input':
										Vr(e), Lh(e, a, !1)
										break
									case 'textarea':
										Vr(e), $h(e)
										break
									case 'option':
										a.value != null && e.setAttribute('value', '' + we(a.value))
										break
									case 'select':
										;(e.multiple = !!a.multiple),
											(f = a.value),
											f != null
												? Gr(e, !!a.multiple, f, !1)
												: a.defaultValue != null && Gr(e, !!a.multiple, a.defaultValue, !0)
										break
									default:
										typeof c.onClick == 'function' && (e.onclick = qo)
								}
								switch (s) {
									case 'button':
									case 'input':
									case 'select':
									case 'textarea':
										a = !!a.autoFocus
										break e
									case 'img':
										a = !0
										break e
									default:
										a = !1
								}
							}
							a && (t.flags |= 4)
						}
						t.ref !== null && ((t.flags |= 512), (t.flags |= 2097152))
					}
					return ft(t), null
				case 6:
					if (e && t.stateNode != null) Jg(e, t, e.memoizedProps, a)
					else {
						if (typeof a != 'string' && t.stateNode === null) throw Error(r(166))
						if (((s = wr(gs.current)), wr(un.current), Jo(t))) {
							if (
								((a = t.stateNode),
								(s = t.memoizedProps),
								(a[ln] = t),
								(f = a.nodeValue !== s) && ((e = Tt), e !== null))
							)
								switch (e.tag) {
									case 3:
										Vo(a.nodeValue, s, (e.mode & 1) !== 0)
										break
									case 5:
										e.memoizedProps.suppressHydrationWarning !== !0 &&
											Vo(a.nodeValue, s, (e.mode & 1) !== 0)
								}
							f && (t.flags |= 4)
						} else
							(a = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(a)),
								(a[ln] = t),
								(t.stateNode = a)
					}
					return ft(t), null
				case 13:
					if (
						(Me($e),
						(a = t.memoizedState),
						e === null || (e.memoizedState !== null && e.memoizedState.dehydrated !== null))
					) {
						if (De && Ot !== null && (t.mode & 1) !== 0 && (t.flags & 128) === 0)
							ng(), li(), (t.flags |= 98560), (f = !1)
						else if (((f = Jo(t)), a !== null && a.dehydrated !== null)) {
							if (e === null) {
								if (!f) throw Error(r(318))
								if (((f = t.memoizedState), (f = f !== null ? f.dehydrated : null), !f))
									throw Error(r(317))
								f[ln] = t
							} else li(), (t.flags & 128) === 0 && (t.memoizedState = null), (t.flags |= 4)
							ft(t), (f = !1)
						} else Qt !== null && (Gc(Qt), (Qt = null)), (f = !0)
						if (!f) return t.flags & 65536 ? t : null
					}
					return (t.flags & 128) !== 0
						? ((t.lanes = s), t)
						: ((a = a !== null),
							a !== (e !== null && e.memoizedState !== null) &&
								a &&
								((t.child.flags |= 8192),
								(t.mode & 1) !== 0 &&
									(e === null || ($e.current & 1) !== 0 ? Ze === 0 && (Ze = 3) : Xc())),
							t.updateQueue !== null && (t.flags |= 4),
							ft(t),
							null)
				case 4:
					return fi(), Dc(e, t), e === null && us(t.stateNode.containerInfo), ft(t), null
				case 10:
					return cc(t.type._context), ft(t), null
				case 17:
					return xt(t.type) && Qo(), ft(t), null
				case 19:
					if ((Me($e), (f = t.memoizedState), f === null)) return ft(t), null
					if (((a = (t.flags & 128) !== 0), (v = f.rendering), v === null))
						if (a) Ss(f, !1)
						else {
							if (Ze !== 0 || (e !== null && (e.flags & 128) !== 0))
								for (e = t.child; e !== null; ) {
									if (((v = sa(e)), v !== null)) {
										for (
											t.flags |= 128,
												Ss(f, !1),
												a = v.updateQueue,
												a !== null && ((t.updateQueue = a), (t.flags |= 4)),
												t.subtreeFlags = 0,
												a = s,
												s = t.child;
											s !== null;

										)
											(f = s),
												(e = a),
												(f.flags &= 14680066),
												(v = f.alternate),
												v === null
													? ((f.childLanes = 0),
														(f.lanes = e),
														(f.child = null),
														(f.subtreeFlags = 0),
														(f.memoizedProps = null),
														(f.memoizedState = null),
														(f.updateQueue = null),
														(f.dependencies = null),
														(f.stateNode = null))
													: ((f.childLanes = v.childLanes),
														(f.lanes = v.lanes),
														(f.child = v.child),
														(f.subtreeFlags = 0),
														(f.deletions = null),
														(f.memoizedProps = v.memoizedProps),
														(f.memoizedState = v.memoizedState),
														(f.updateQueue = v.updateQueue),
														(f.type = v.type),
														(e = v.dependencies),
														(f.dependencies =
															e === null
																? null
																: { lanes: e.lanes, firstContext: e.firstContext })),
												(s = s.sibling)
										return Te($e, ($e.current & 1) | 2), t.child
									}
									e = e.sibling
								}
							f.tail !== null &&
								Ve() > gi &&
								((t.flags |= 128), (a = !0), Ss(f, !1), (t.lanes = 4194304))
						}
					else {
						if (!a)
							if (((e = sa(v)), e !== null)) {
								if (
									((t.flags |= 128),
									(a = !0),
									(s = e.updateQueue),
									s !== null && ((t.updateQueue = s), (t.flags |= 4)),
									Ss(f, !0),
									f.tail === null && f.tailMode === 'hidden' && !v.alternate && !De)
								)
									return ft(t), null
							} else
								2 * Ve() - f.renderingStartTime > gi &&
									s !== 1073741824 &&
									((t.flags |= 128), (a = !0), Ss(f, !1), (t.lanes = 4194304))
						f.isBackwards
							? ((v.sibling = t.child), (t.child = v))
							: ((s = f.last), s !== null ? (s.sibling = v) : (t.child = v), (f.last = v))
					}
					return f.tail !== null
						? ((t = f.tail),
							(f.rendering = t),
							(f.tail = t.sibling),
							(f.renderingStartTime = Ve()),
							(t.sibling = null),
							(s = $e.current),
							Te($e, a ? (s & 1) | 2 : s & 1),
							t)
						: (ft(t), null)
				case 22:
				case 23:
					return (
						Kc(),
						(a = t.memoizedState !== null),
						e !== null && (e.memoizedState !== null) !== a && (t.flags |= 8192),
						a && (t.mode & 1) !== 0
							? (Nt & 1073741824) !== 0 && (ft(t), t.subtreeFlags & 6 && (t.flags |= 8192))
							: ft(t),
						null
					)
				case 24:
					return null
				case 25:
					return null
			}
			throw Error(r(156, t.tag))
		}
		function RS(e, t) {
			switch ((ic(t), t.tag)) {
				case 1:
					return (
						xt(t.type) && Qo(),
						(e = t.flags),
						e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
					)
				case 3:
					return (
						fi(),
						Me(kt),
						Me(ct),
						mc(),
						(e = t.flags),
						(e & 65536) !== 0 && (e & 128) === 0 ? ((t.flags = (e & -65537) | 128), t) : null
					)
				case 5:
					return vc(t), null
				case 13:
					if ((Me($e), (e = t.memoizedState), e !== null && e.dehydrated !== null)) {
						if (t.alternate === null) throw Error(r(340))
						li()
					}
					return (e = t.flags), e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
				case 19:
					return Me($e), null
				case 4:
					return fi(), null
				case 10:
					return cc(t.type._context), null
				case 22:
				case 23:
					return Kc(), null
				case 24:
					return null
				default:
					return null
			}
		}
		var ha = !1,
			pt = !1,
			IS = typeof WeakSet == 'function' ? WeakSet : Set,
			te = null
		function hi(e, t) {
			var s = e.ref
			if (s !== null)
				if (typeof s == 'function')
					try {
						s(null)
					} catch (a) {
						We(e, t, a)
					}
				else s.current = null
		}
		function Ac(e, t, s) {
			try {
				s()
			} catch (a) {
				We(e, t, a)
			}
		}
		var em = !1
		function TS(e, t) {
			if (((Ku = Mo), (e = Nv()), Uu(e))) {
				if ('selectionStart' in e) var s = { start: e.selectionStart, end: e.selectionEnd }
				else
					e: {
						s = ((s = e.ownerDocument) && s.defaultView) || window
						var a = s.getSelection && s.getSelection()
						if (a && a.rangeCount !== 0) {
							s = a.anchorNode
							var c = a.anchorOffset,
								f = a.focusNode
							a = a.focusOffset
							try {
								s.nodeType, f.nodeType
							} catch {
								s = null
								break e
							}
							var v = 0,
								y = -1,
								E = -1,
								O = 0,
								B = 0,
								H = e,
								U = null
							t: for (;;) {
								for (
									var Y;
									H !== s || (c !== 0 && H.nodeType !== 3) || (y = v + c),
										H !== f || (a !== 0 && H.nodeType !== 3) || (E = v + a),
										H.nodeType === 3 && (v += H.nodeValue.length),
										(Y = H.firstChild) !== null;

								)
									(U = H), (H = Y)
								for (;;) {
									if (H === e) break t
									if (
										(U === s && ++O === c && (y = v),
										U === f && ++B === a && (E = v),
										(Y = H.nextSibling) !== null)
									)
										break
									;(H = U), (U = H.parentNode)
								}
								H = Y
							}
							s = y === -1 || E === -1 ? null : { start: y, end: E }
						} else s = null
					}
				s = s || { start: 0, end: 0 }
			} else s = null
			for (Xu = { focusedElem: e, selectionRange: s }, Mo = !1, te = t; te !== null; )
				if (((t = te), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null))
					(e.return = t), (te = e)
				else
					for (; te !== null; ) {
						t = te
						try {
							var re = t.alternate
							if ((t.flags & 1024) !== 0)
								switch (t.tag) {
									case 0:
									case 11:
									case 15:
										break
									case 1:
										if (re !== null) {
											var se = re.memoizedProps,
												qe = re.memoizedState,
												P = t.stateNode,
												C = P.getSnapshotBeforeUpdate(
													t.elementType === t.type ? se : Kt(t.type, se),
													qe
												)
											P.__reactInternalSnapshotBeforeUpdate = C
										}
										break
									case 3:
										var b = t.stateNode.containerInfo
										b.nodeType === 1
											? (b.textContent = '')
											: b.nodeType === 9 && b.documentElement && b.removeChild(b.documentElement)
										break
									case 5:
									case 6:
									case 4:
									case 17:
										break
									default:
										throw Error(r(163))
								}
						} catch (V) {
							We(t, t.return, V)
						}
						if (((e = t.sibling), e !== null)) {
							;(e.return = t.return), (te = e)
							break
						}
						te = t.return
					}
			return (re = em), (em = !1), re
		}
		function Es(e, t, s) {
			var a = t.updateQueue
			if (((a = a !== null ? a.lastEffect : null), a !== null)) {
				var c = (a = a.next)
				do {
					if ((c.tag & e) === e) {
						var f = c.destroy
						;(c.destroy = void 0), f !== void 0 && Ac(t, s, f)
					}
					c = c.next
				} while (c !== a)
			}
		}
		function va(e, t) {
			if (((t = t.updateQueue), (t = t !== null ? t.lastEffect : null), t !== null)) {
				var s = (t = t.next)
				do {
					if ((s.tag & e) === e) {
						var a = s.create
						s.destroy = a()
					}
					s = s.next
				} while (s !== t)
			}
		}
		function $c(e) {
			var t = e.ref
			if (t !== null) {
				var s = e.stateNode
				switch (e.tag) {
					case 5:
						e = s
						break
					default:
						e = s
				}
				typeof t == 'function' ? t(e) : (t.current = e)
			}
		}
		function tm(e) {
			var t = e.alternate
			t !== null && ((e.alternate = null), tm(t)),
				(e.child = null),
				(e.deletions = null),
				(e.sibling = null),
				e.tag === 5 &&
					((t = e.stateNode),
					t !== null && (delete t[ln], delete t[ds], delete t[ec], delete t[fS], delete t[pS])),
				(e.stateNode = null),
				(e.return = null),
				(e.dependencies = null),
				(e.memoizedProps = null),
				(e.memoizedState = null),
				(e.pendingProps = null),
				(e.stateNode = null),
				(e.updateQueue = null)
		}
		function nm(e) {
			return e.tag === 5 || e.tag === 3 || e.tag === 4
		}
		function rm(e) {
			e: for (;;) {
				for (; e.sibling === null; ) {
					if (e.return === null || nm(e.return)) return null
					e = e.return
				}
				for (
					e.sibling.return = e.return, e = e.sibling;
					e.tag !== 5 && e.tag !== 6 && e.tag !== 18;

				) {
					if (e.flags & 2 || e.child === null || e.tag === 4) continue e
					;(e.child.return = e), (e = e.child)
				}
				if (!(e.flags & 2)) return e.stateNode
			}
		}
		function zc(e, t, s) {
			var a = e.tag
			if (a === 5 || a === 6)
				(e = e.stateNode),
					t
						? s.nodeType === 8
							? s.parentNode.insertBefore(e, t)
							: s.insertBefore(e, t)
						: (s.nodeType === 8
								? ((t = s.parentNode), t.insertBefore(e, s))
								: ((t = s), t.appendChild(e)),
							(s = s._reactRootContainer),
							s != null || t.onclick !== null || (t.onclick = qo))
			else if (a !== 4 && ((e = e.child), e !== null))
				for (zc(e, t, s), e = e.sibling; e !== null; ) zc(e, t, s), (e = e.sibling)
		}
		function jc(e, t, s) {
			var a = e.tag
			if (a === 5 || a === 6) (e = e.stateNode), t ? s.insertBefore(e, t) : s.appendChild(e)
			else if (a !== 4 && ((e = e.child), e !== null))
				for (jc(e, t, s), e = e.sibling; e !== null; ) jc(e, t, s), (e = e.sibling)
		}
		var it = null,
			Xt = !1
		function Xn(e, t, s) {
			for (s = s.child; s !== null; ) im(e, t, s), (s = s.sibling)
		}
		function im(e, t, s) {
			if (an && typeof an.onCommitFiberUnmount == 'function')
				try {
					an.onCommitFiberUnmount(Ro, s)
				} catch {}
			switch (s.tag) {
				case 5:
					pt || hi(s, t)
				case 6:
					var a = it,
						c = Xt
					;(it = null),
						Xn(e, t, s),
						(it = a),
						(Xt = c),
						it !== null &&
							(Xt
								? ((e = it),
									(s = s.stateNode),
									e.nodeType === 8 ? e.parentNode.removeChild(s) : e.removeChild(s))
								: it.removeChild(s.stateNode))
					break
				case 18:
					it !== null &&
						(Xt
							? ((e = it),
								(s = s.stateNode),
								e.nodeType === 8 ? Ju(e.parentNode, s) : e.nodeType === 1 && Ju(e, s),
								es(e))
							: Ju(it, s.stateNode))
					break
				case 4:
					;(a = it),
						(c = Xt),
						(it = s.stateNode.containerInfo),
						(Xt = !0),
						Xn(e, t, s),
						(it = a),
						(Xt = c)
					break
				case 0:
				case 11:
				case 14:
				case 15:
					if (!pt && ((a = s.updateQueue), a !== null && ((a = a.lastEffect), a !== null))) {
						c = a = a.next
						do {
							var f = c,
								v = f.destroy
							;(f = f.tag),
								v !== void 0 && ((f & 2) !== 0 || (f & 4) !== 0) && Ac(s, t, v),
								(c = c.next)
						} while (c !== a)
					}
					Xn(e, t, s)
					break
				case 1:
					if (!pt && (hi(s, t), (a = s.stateNode), typeof a.componentWillUnmount == 'function'))
						try {
							;(a.props = s.memoizedProps), (a.state = s.memoizedState), a.componentWillUnmount()
						} catch (y) {
							We(s, t, y)
						}
					Xn(e, t, s)
					break
				case 21:
					Xn(e, t, s)
					break
				case 22:
					s.mode & 1
						? ((pt = (a = pt) || s.memoizedState !== null), Xn(e, t, s), (pt = a))
						: Xn(e, t, s)
					break
				default:
					Xn(e, t, s)
			}
		}
		function sm(e) {
			var t = e.updateQueue
			if (t !== null) {
				e.updateQueue = null
				var s = e.stateNode
				s === null && (s = e.stateNode = new IS()),
					t.forEach(function (a) {
						var c = zS.bind(null, e, a)
						s.has(a) || (s.add(a), a.then(c, c))
					})
			}
		}
		function Yt(e, t) {
			var s = t.deletions
			if (s !== null)
				for (var a = 0; a < s.length; a++) {
					var c = s[a]
					try {
						var f = e,
							v = t,
							y = v
						e: for (; y !== null; ) {
							switch (y.tag) {
								case 5:
									;(it = y.stateNode), (Xt = !1)
									break e
								case 3:
									;(it = y.stateNode.containerInfo), (Xt = !0)
									break e
								case 4:
									;(it = y.stateNode.containerInfo), (Xt = !0)
									break e
							}
							y = y.return
						}
						if (it === null) throw Error(r(160))
						im(f, v, c), (it = null), (Xt = !1)
						var E = c.alternate
						E !== null && (E.return = null), (c.return = null)
					} catch (O) {
						We(c, t, O)
					}
				}
			if (t.subtreeFlags & 12854) for (t = t.child; t !== null; ) om(t, e), (t = t.sibling)
		}
		function om(e, t) {
			var s = e.alternate,
				a = e.flags
			switch (e.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					if ((Yt(t, e), dn(e), a & 4)) {
						try {
							Es(3, e, e.return), va(3, e)
						} catch (se) {
							We(e, e.return, se)
						}
						try {
							Es(5, e, e.return)
						} catch (se) {
							We(e, e.return, se)
						}
					}
					break
				case 1:
					Yt(t, e), dn(e), a & 512 && s !== null && hi(s, s.return)
					break
				case 5:
					if ((Yt(t, e), dn(e), a & 512 && s !== null && hi(s, s.return), e.flags & 32)) {
						var c = e.stateNode
						try {
							Wi(c, '')
						} catch (se) {
							We(e, e.return, se)
						}
					}
					if (a & 4 && ((c = e.stateNode), c != null)) {
						var f = e.memoizedProps,
							v = s !== null ? s.memoizedProps : f,
							y = e.type,
							E = e.updateQueue
						if (((e.updateQueue = null), E !== null))
							try {
								y === 'input' && f.type === 'radio' && f.name != null && Ui(c, f), mu(y, v)
								var O = mu(y, f)
								for (v = 0; v < E.length; v += 2) {
									var B = E[v],
										H = E[v + 1]
									B === 'style'
										? Bh(c, H)
										: B === 'dangerouslySetInnerHTML'
											? jh(c, H)
											: B === 'children'
												? Wi(c, H)
												: G(c, B, H, O)
								}
								switch (y) {
									case 'input':
										pr(c, f)
										break
									case 'textarea':
										Ah(c, f)
										break
									case 'select':
										var U = c._wrapperState.wasMultiple
										c._wrapperState.wasMultiple = !!f.multiple
										var Y = f.value
										Y != null
											? Gr(c, !!f.multiple, Y, !1)
											: U !== !!f.multiple &&
												(f.defaultValue != null
													? Gr(c, !!f.multiple, f.defaultValue, !0)
													: Gr(c, !!f.multiple, f.multiple ? [] : '', !1))
								}
								c[ds] = f
							} catch (se) {
								We(e, e.return, se)
							}
					}
					break
				case 6:
					if ((Yt(t, e), dn(e), a & 4)) {
						if (e.stateNode === null) throw Error(r(162))
						;(c = e.stateNode), (f = e.memoizedProps)
						try {
							c.nodeValue = f
						} catch (se) {
							We(e, e.return, se)
						}
					}
					break
				case 3:
					if ((Yt(t, e), dn(e), a & 4 && s !== null && s.memoizedState.isDehydrated))
						try {
							es(t.containerInfo)
						} catch (se) {
							We(e, e.return, se)
						}
					break
				case 4:
					Yt(t, e), dn(e)
					break
				case 13:
					Yt(t, e),
						dn(e),
						(c = e.child),
						c.flags & 8192 &&
							((f = c.memoizedState !== null),
							(c.stateNode.isHidden = f),
							!f || (c.alternate !== null && c.alternate.memoizedState !== null) || (Wc = Ve())),
						a & 4 && sm(e)
					break
				case 22:
					if (
						((B = s !== null && s.memoizedState !== null),
						e.mode & 1 ? ((pt = (O = pt) || B), Yt(t, e), (pt = O)) : Yt(t, e),
						dn(e),
						a & 8192)
					) {
						if (
							((O = e.memoizedState !== null),
							(e.stateNode.isHidden = O) && !B && (e.mode & 1) !== 0)
						)
							for (te = e, B = e.child; B !== null; ) {
								for (H = te = B; te !== null; ) {
									switch (((U = te), (Y = U.child), U.tag)) {
										case 0:
										case 11:
										case 14:
										case 15:
											Es(4, U, U.return)
											break
										case 1:
											hi(U, U.return)
											var re = U.stateNode
											if (typeof re.componentWillUnmount == 'function') {
												;(a = U), (s = U.return)
												try {
													;(t = a),
														(re.props = t.memoizedProps),
														(re.state = t.memoizedState),
														re.componentWillUnmount()
												} catch (se) {
													We(a, s, se)
												}
											}
											break
										case 5:
											hi(U, U.return)
											break
										case 22:
											if (U.memoizedState !== null) {
												um(H)
												continue
											}
									}
									Y !== null ? ((Y.return = U), (te = Y)) : um(H)
								}
								B = B.sibling
							}
						e: for (B = null, H = e; ; ) {
							if (H.tag === 5) {
								if (B === null) {
									B = H
									try {
										;(c = H.stateNode),
											O
												? ((f = c.style),
													typeof f.setProperty == 'function'
														? f.setProperty('display', 'none', 'important')
														: (f.display = 'none'))
												: ((y = H.stateNode),
													(E = H.memoizedProps.style),
													(v = E != null && E.hasOwnProperty('display') ? E.display : null),
													(y.style.display = Uh('display', v)))
									} catch (se) {
										We(e, e.return, se)
									}
								}
							} else if (H.tag === 6) {
								if (B === null)
									try {
										H.stateNode.nodeValue = O ? '' : H.memoizedProps
									} catch (se) {
										We(e, e.return, se)
									}
							} else if (
								((H.tag !== 22 && H.tag !== 23) || H.memoizedState === null || H === e) &&
								H.child !== null
							) {
								;(H.child.return = H), (H = H.child)
								continue
							}
							if (H === e) break e
							for (; H.sibling === null; ) {
								if (H.return === null || H.return === e) break e
								B === H && (B = null), (H = H.return)
							}
							B === H && (B = null), (H.sibling.return = H.return), (H = H.sibling)
						}
					}
					break
				case 19:
					Yt(t, e), dn(e), a & 4 && sm(e)
					break
				case 21:
					break
				default:
					Yt(t, e), dn(e)
			}
		}
		function dn(e) {
			var t = e.flags
			if (t & 2) {
				try {
					e: {
						for (var s = e.return; s !== null; ) {
							if (nm(s)) {
								var a = s
								break e
							}
							s = s.return
						}
						throw Error(r(160))
					}
					switch (a.tag) {
						case 5:
							var c = a.stateNode
							a.flags & 32 && (Wi(c, ''), (a.flags &= -33))
							var f = rm(e)
							jc(e, f, c)
							break
						case 3:
						case 4:
							var v = a.stateNode.containerInfo,
								y = rm(e)
							zc(e, y, v)
							break
						default:
							throw Error(r(161))
					}
				} catch (E) {
					We(e, e.return, E)
				}
				e.flags &= -3
			}
			t & 4096 && (e.flags &= -4097)
		}
		function OS(e, t, s) {
			;(te = e), am(e)
		}
		function am(e, t, s) {
			for (var a = (e.mode & 1) !== 0; te !== null; ) {
				var c = te,
					f = c.child
				if (c.tag === 22 && a) {
					var v = c.memoizedState !== null || ha
					if (!v) {
						var y = c.alternate,
							E = (y !== null && y.memoizedState !== null) || pt
						y = ha
						var O = pt
						if (((ha = v), (pt = E) && !O))
							for (te = c; te !== null; )
								(v = te),
									(E = v.child),
									v.tag === 22 && v.memoizedState !== null
										? cm(c)
										: E !== null
											? ((E.return = v), (te = E))
											: cm(c)
						for (; f !== null; ) (te = f), am(f), (f = f.sibling)
						;(te = c), (ha = y), (pt = O)
					}
					lm(e)
				} else (c.subtreeFlags & 8772) !== 0 && f !== null ? ((f.return = c), (te = f)) : lm(e)
			}
		}
		function lm(e) {
			for (; te !== null; ) {
				var t = te
				if ((t.flags & 8772) !== 0) {
					var s = t.alternate
					try {
						if ((t.flags & 8772) !== 0)
							switch (t.tag) {
								case 0:
								case 11:
								case 15:
									pt || va(5, t)
									break
								case 1:
									var a = t.stateNode
									if (t.flags & 4 && !pt)
										if (s === null) a.componentDidMount()
										else {
											var c =
												t.elementType === t.type ? s.memoizedProps : Kt(t.type, s.memoizedProps)
											a.componentDidUpdate(
												c,
												s.memoizedState,
												a.__reactInternalSnapshotBeforeUpdate
											)
										}
									var f = t.updateQueue
									f !== null && ug(t, f, a)
									break
								case 3:
									var v = t.updateQueue
									if (v !== null) {
										if (((s = null), t.child !== null))
											switch (t.child.tag) {
												case 5:
													s = t.child.stateNode
													break
												case 1:
													s = t.child.stateNode
											}
										ug(t, v, s)
									}
									break
								case 5:
									var y = t.stateNode
									if (s === null && t.flags & 4) {
										s = y
										var E = t.memoizedProps
										switch (t.type) {
											case 'button':
											case 'input':
											case 'select':
											case 'textarea':
												E.autoFocus && s.focus()
												break
											case 'img':
												E.src && (s.src = E.src)
										}
									}
									break
								case 6:
									break
								case 4:
									break
								case 12:
									break
								case 13:
									if (t.memoizedState === null) {
										var O = t.alternate
										if (O !== null) {
											var B = O.memoizedState
											if (B !== null) {
												var H = B.dehydrated
												H !== null && es(H)
											}
										}
									}
									break
								case 19:
								case 17:
								case 21:
								case 22:
								case 23:
								case 25:
									break
								default:
									throw Error(r(163))
							}
						pt || (t.flags & 512 && $c(t))
					} catch (U) {
						We(t, t.return, U)
					}
				}
				if (t === e) {
					te = null
					break
				}
				if (((s = t.sibling), s !== null)) {
					;(s.return = t.return), (te = s)
					break
				}
				te = t.return
			}
		}
		function um(e) {
			for (; te !== null; ) {
				var t = te
				if (t === e) {
					te = null
					break
				}
				var s = t.sibling
				if (s !== null) {
					;(s.return = t.return), (te = s)
					break
				}
				te = t.return
			}
		}
		function cm(e) {
			for (; te !== null; ) {
				var t = te
				try {
					switch (t.tag) {
						case 0:
						case 11:
						case 15:
							var s = t.return
							try {
								va(4, t)
							} catch (E) {
								We(t, s, E)
							}
							break
						case 1:
							var a = t.stateNode
							if (typeof a.componentDidMount == 'function') {
								var c = t.return
								try {
									a.componentDidMount()
								} catch (E) {
									We(t, c, E)
								}
							}
							var f = t.return
							try {
								$c(t)
							} catch (E) {
								We(t, f, E)
							}
							break
						case 5:
							var v = t.return
							try {
								$c(t)
							} catch (E) {
								We(t, v, E)
							}
					}
				} catch (E) {
					We(t, t.return, E)
				}
				if (t === e) {
					te = null
					break
				}
				var y = t.sibling
				if (y !== null) {
					;(y.return = t.return), (te = y)
					break
				}
				te = t.return
			}
		}
		var NS = Math.ceil,
			ga = Q.ReactCurrentDispatcher,
			Uc = Q.ReactCurrentOwner,
			Ut = Q.ReactCurrentBatchConfig,
			Ee = 0,
			et = null,
			Qe = null,
			st = 0,
			Nt = 0,
			vi = Vn(0),
			Ze = 0,
			ks = null,
			Er = 0,
			ma = 0,
			Bc = 0,
			xs = null,
			Pt = null,
			Wc = 0,
			gi = 1 / 0,
			bn = null,
			_a = !1,
			Hc = null,
			Yn = null,
			ya = !1,
			Zn = null,
			wa = 0,
			Cs = 0,
			Vc = null,
			Sa = -1,
			Ea = 0
		function gt() {
			return (Ee & 6) !== 0 ? Ve() : Sa !== -1 ? Sa : (Sa = Ve())
		}
		function Jn(e) {
			return (e.mode & 1) === 0
				? 1
				: (Ee & 2) !== 0 && st !== 0
					? st & -st
					: vS.transition !== null
						? (Ea === 0 && (Ea = rv()), Ea)
						: ((e = Pe), e !== 0 || ((e = window.event), (e = e === void 0 ? 16 : fv(e.type))), e)
		}
		function Zt(e, t, s, a) {
			if (50 < Cs) throw ((Cs = 0), (Vc = null), Error(r(185)))
			Ki(e, s, a),
				((Ee & 2) === 0 || e !== et) &&
					(e === et && ((Ee & 2) === 0 && (ma |= s), Ze === 4 && er(e, st)),
					bt(e, a),
					s === 1 && Ee === 0 && (t.mode & 1) === 0 && ((gi = Ve() + 500), Xo && Gn()))
		}
		function bt(e, t) {
			var s = e.callbackNode
			v1(e, t)
			var a = Oo(e, e === et ? st : 0)
			if (a === 0) s !== null && ev(s), (e.callbackNode = null), (e.callbackPriority = 0)
			else if (((t = a & -a), e.callbackPriority !== t)) {
				if ((s != null && ev(s), t === 1))
					e.tag === 0 ? hS(fm.bind(null, e)) : Yv(fm.bind(null, e)),
						cS(function () {
							;(Ee & 6) === 0 && Gn()
						}),
						(s = null)
				else {
					switch (iv(a)) {
						case 1:
							s = xu
							break
						case 4:
							s = tv
							break
						case 16:
							s = bo
							break
						case 536870912:
							s = nv
							break
						default:
							s = bo
					}
					s = wm(s, dm.bind(null, e))
				}
				;(e.callbackPriority = t), (e.callbackNode = s)
			}
		}
		function dm(e, t) {
			if (((Sa = -1), (Ea = 0), (Ee & 6) !== 0)) throw Error(r(327))
			var s = e.callbackNode
			if (mi() && e.callbackNode !== s) return null
			var a = Oo(e, e === et ? st : 0)
			if (a === 0) return null
			if ((a & 30) !== 0 || (a & e.expiredLanes) !== 0 || t) t = ka(e, a)
			else {
				t = a
				var c = Ee
				Ee |= 2
				var f = hm()
				;(et !== e || st !== t) && ((bn = null), (gi = Ve() + 500), xr(e, t))
				do
					try {
						LS()
						break
					} catch (y) {
						pm(e, y)
					}
				while (!0)
				uc(), (ga.current = f), (Ee = c), Qe !== null ? (t = 0) : ((et = null), (st = 0), (t = Ze))
			}
			if (t !== 0) {
				if ((t === 2 && ((c = Cu(e)), c !== 0 && ((a = c), (t = qc(e, c)))), t === 1))
					throw ((s = ks), xr(e, 0), er(e, a), bt(e, Ve()), s)
				if (t === 6) er(e, a)
				else {
					if (
						((c = e.current.alternate),
						(a & 30) === 0 &&
							!FS(c) &&
							((t = ka(e, a)),
							t === 2 && ((f = Cu(e)), f !== 0 && ((a = f), (t = qc(e, f)))),
							t === 1))
					)
						throw ((s = ks), xr(e, 0), er(e, a), bt(e, Ve()), s)
					switch (((e.finishedWork = c), (e.finishedLanes = a), t)) {
						case 0:
						case 1:
							throw Error(r(345))
						case 2:
							Cr(e, Pt, bn)
							break
						case 3:
							if ((er(e, a), (a & 130023424) === a && ((t = Wc + 500 - Ve()), 10 < t))) {
								if (Oo(e, 0) !== 0) break
								if (((c = e.suspendedLanes), (c & a) !== a)) {
									gt(), (e.pingedLanes |= e.suspendedLanes & c)
									break
								}
								e.timeoutHandle = Zu(Cr.bind(null, e, Pt, bn), t)
								break
							}
							Cr(e, Pt, bn)
							break
						case 4:
							if ((er(e, a), (a & 4194240) === a)) break
							for (t = e.eventTimes, c = -1; 0 < a; ) {
								var v = 31 - qt(a)
								;(f = 1 << v), (v = t[v]), v > c && (c = v), (a &= ~f)
							}
							if (
								((a = c),
								(a = Ve() - a),
								(a =
									(120 > a
										? 120
										: 480 > a
											? 480
											: 1080 > a
												? 1080
												: 1920 > a
													? 1920
													: 3e3 > a
														? 3e3
														: 4320 > a
															? 4320
															: 1960 * NS(a / 1960)) - a),
								10 < a)
							) {
								e.timeoutHandle = Zu(Cr.bind(null, e, Pt, bn), a)
								break
							}
							Cr(e, Pt, bn)
							break
						case 5:
							Cr(e, Pt, bn)
							break
						default:
							throw Error(r(329))
					}
				}
			}
			return bt(e, Ve()), e.callbackNode === s ? dm.bind(null, e) : null
		}
		function qc(e, t) {
			var s = xs
			return (
				e.current.memoizedState.isDehydrated && (xr(e, t).flags |= 256),
				(e = ka(e, t)),
				e !== 2 && ((t = Pt), (Pt = s), t !== null && Gc(t)),
				e
			)
		}
		function Gc(e) {
			Pt === null ? (Pt = e) : Pt.push.apply(Pt, e)
		}
		function FS(e) {
			for (var t = e; ; ) {
				if (t.flags & 16384) {
					var s = t.updateQueue
					if (s !== null && ((s = s.stores), s !== null))
						for (var a = 0; a < s.length; a++) {
							var c = s[a],
								f = c.getSnapshot
							c = c.value
							try {
								if (!Gt(f(), c)) return !1
							} catch {
								return !1
							}
						}
				}
				if (((s = t.child), t.subtreeFlags & 16384 && s !== null)) (s.return = t), (t = s)
				else {
					if (t === e) break
					for (; t.sibling === null; ) {
						if (t.return === null || t.return === e) return !0
						t = t.return
					}
					;(t.sibling.return = t.return), (t = t.sibling)
				}
			}
			return !0
		}
		function er(e, t) {
			for (
				t &= ~Bc, t &= ~ma, e.suspendedLanes |= t, e.pingedLanes &= ~t, e = e.expirationTimes;
				0 < t;

			) {
				var s = 31 - qt(t),
					a = 1 << s
				;(e[s] = -1), (t &= ~a)
			}
		}
		function fm(e) {
			if ((Ee & 6) !== 0) throw Error(r(327))
			mi()
			var t = Oo(e, 0)
			if ((t & 1) === 0) return bt(e, Ve()), null
			var s = ka(e, t)
			if (e.tag !== 0 && s === 2) {
				var a = Cu(e)
				a !== 0 && ((t = a), (s = qc(e, a)))
			}
			if (s === 1) throw ((s = ks), xr(e, 0), er(e, t), bt(e, Ve()), s)
			if (s === 6) throw Error(r(345))
			return (
				(e.finishedWork = e.current.alternate),
				(e.finishedLanes = t),
				Cr(e, Pt, bn),
				bt(e, Ve()),
				null
			)
		}
		function Qc(e, t) {
			var s = Ee
			Ee |= 1
			try {
				return e(t)
			} finally {
				;(Ee = s), Ee === 0 && ((gi = Ve() + 500), Xo && Gn())
			}
		}
		function kr(e) {
			Zn !== null && Zn.tag === 0 && (Ee & 6) === 0 && mi()
			var t = Ee
			Ee |= 1
			var s = Ut.transition,
				a = Pe
			try {
				if (((Ut.transition = null), (Pe = 1), e)) return e()
			} finally {
				;(Pe = a), (Ut.transition = s), (Ee = t), (Ee & 6) === 0 && Gn()
			}
		}
		function Kc() {
			;(Nt = vi.current), Me(vi)
		}
		function xr(e, t) {
			;(e.finishedWork = null), (e.finishedLanes = 0)
			var s = e.timeoutHandle
			if ((s !== -1 && ((e.timeoutHandle = -1), uS(s)), Qe !== null))
				for (s = Qe.return; s !== null; ) {
					var a = s
					switch ((ic(a), a.tag)) {
						case 1:
							;(a = a.type.childContextTypes), a != null && Qo()
							break
						case 3:
							fi(), Me(kt), Me(ct), mc()
							break
						case 5:
							vc(a)
							break
						case 4:
							fi()
							break
						case 13:
							Me($e)
							break
						case 19:
							Me($e)
							break
						case 10:
							cc(a.type._context)
							break
						case 22:
						case 23:
							Kc()
					}
					s = s.return
				}
			if (
				((et = e),
				(Qe = e = tr(e.current, null)),
				(st = Nt = t),
				(Ze = 0),
				(ks = null),
				(Bc = ma = Er = 0),
				(Pt = xs = null),
				yr !== null)
			) {
				for (t = 0; t < yr.length; t++)
					if (((s = yr[t]), (a = s.interleaved), a !== null)) {
						s.interleaved = null
						var c = a.next,
							f = s.pending
						if (f !== null) {
							var v = f.next
							;(f.next = c), (a.next = v)
						}
						s.pending = a
					}
				yr = null
			}
			return e
		}
		function pm(e, t) {
			do {
				var s = Qe
				try {
					if ((uc(), (oa.current = ca), aa)) {
						for (var a = ze.memoizedState; a !== null; ) {
							var c = a.queue
							c !== null && (c.pending = null), (a = a.next)
						}
						aa = !1
					}
					if (
						((Sr = 0),
						(Je = Ye = ze = null),
						(ms = !1),
						(_s = 0),
						(Uc.current = null),
						s === null || s.return === null)
					) {
						;(Ze = 1), (ks = t), (Qe = null)
						break
					}
					e: {
						var f = e,
							v = s.return,
							y = s,
							E = t
						if (
							((t = st),
							(y.flags |= 32768),
							E !== null && typeof E == 'object' && typeof E.then == 'function')
						) {
							var O = E,
								B = y,
								H = B.tag
							if ((B.mode & 1) === 0 && (H === 0 || H === 11 || H === 15)) {
								var U = B.alternate
								U
									? ((B.updateQueue = U.updateQueue),
										(B.memoizedState = U.memoizedState),
										(B.lanes = U.lanes))
									: ((B.updateQueue = null), (B.memoizedState = null))
							}
							var Y = $g(v)
							if (Y !== null) {
								;(Y.flags &= -257), zg(Y, v, y, f, t), Y.mode & 1 && Ag(f, O, t), (t = Y), (E = O)
								var re = t.updateQueue
								if (re === null) {
									var se = new Set()
									se.add(E), (t.updateQueue = se)
								} else re.add(E)
								break e
							} else {
								if ((t & 1) === 0) {
									Ag(f, O, t), Xc()
									break e
								}
								E = Error(r(426))
							}
						} else if (De && y.mode & 1) {
							var qe = $g(v)
							if (qe !== null) {
								;(qe.flags & 65536) === 0 && (qe.flags |= 256), zg(qe, v, y, f, t), ac(pi(E, y))
								break e
							}
						}
						;(f = E = pi(E, y)),
							Ze !== 4 && (Ze = 2),
							xs === null ? (xs = [f]) : xs.push(f),
							(f = v)
						do {
							switch (f.tag) {
								case 3:
									;(f.flags |= 65536), (t &= -t), (f.lanes |= t)
									var P = Lg(f, E, t)
									lg(f, P)
									break e
								case 1:
									y = E
									var C = f.type,
										b = f.stateNode
									if (
										(f.flags & 128) === 0 &&
										(typeof C.getDerivedStateFromError == 'function' ||
											(b !== null &&
												typeof b.componentDidCatch == 'function' &&
												(Yn === null || !Yn.has(b))))
									) {
										;(f.flags |= 65536), (t &= -t), (f.lanes |= t)
										var V = Dg(f, y, t)
										lg(f, V)
										break e
									}
							}
							f = f.return
						} while (f !== null)
					}
					gm(s)
				} catch (oe) {
					;(t = oe), Qe === s && s !== null && (Qe = s = s.return)
					continue
				}
				break
			} while (!0)
		}
		function hm() {
			var e = ga.current
			return (ga.current = ca), e === null ? ca : e
		}
		function Xc() {
			;(Ze === 0 || Ze === 3 || Ze === 2) && (Ze = 4),
				et === null || ((Er & 268435455) === 0 && (ma & 268435455) === 0) || er(et, st)
		}
		function ka(e, t) {
			var s = Ee
			Ee |= 2
			var a = hm()
			;(et !== e || st !== t) && ((bn = null), xr(e, t))
			do
				try {
					MS()
					break
				} catch (c) {
					pm(e, c)
				}
			while (!0)
			if ((uc(), (Ee = s), (ga.current = a), Qe !== null)) throw Error(r(261))
			return (et = null), (st = 0), Ze
		}
		function MS() {
			for (; Qe !== null; ) vm(Qe)
		}
		function LS() {
			for (; Qe !== null && !o1(); ) vm(Qe)
		}
		function vm(e) {
			var t = ym(e.alternate, e, Nt)
			;(e.memoizedProps = e.pendingProps), t === null ? gm(e) : (Qe = t), (Uc.current = null)
		}
		function gm(e) {
			var t = e
			do {
				var s = t.alternate
				if (((e = t.return), (t.flags & 32768) === 0)) {
					if (((s = bS(s, t, Nt)), s !== null)) {
						Qe = s
						return
					}
				} else {
					if (((s = RS(s, t)), s !== null)) {
						;(s.flags &= 32767), (Qe = s)
						return
					}
					if (e !== null) (e.flags |= 32768), (e.subtreeFlags = 0), (e.deletions = null)
					else {
						;(Ze = 6), (Qe = null)
						return
					}
				}
				if (((t = t.sibling), t !== null)) {
					Qe = t
					return
				}
				Qe = t = e
			} while (t !== null)
			Ze === 0 && (Ze = 5)
		}
		function Cr(e, t, s) {
			var a = Pe,
				c = Ut.transition
			try {
				;(Ut.transition = null), (Pe = 1), DS(e, t, s, a)
			} finally {
				;(Ut.transition = c), (Pe = a)
			}
			return null
		}
		function DS(e, t, s, a) {
			do mi()
			while (Zn !== null)
			if ((Ee & 6) !== 0) throw Error(r(327))
			s = e.finishedWork
			var c = e.finishedLanes
			if (s === null) return null
			if (((e.finishedWork = null), (e.finishedLanes = 0), s === e.current)) throw Error(r(177))
			;(e.callbackNode = null), (e.callbackPriority = 0)
			var f = s.lanes | s.childLanes
			if (
				(g1(e, f),
				e === et && ((Qe = et = null), (st = 0)),
				((s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0) ||
					ya ||
					((ya = !0),
					wm(bo, function () {
						return mi(), null
					})),
				(f = (s.flags & 15990) !== 0),
				(s.subtreeFlags & 15990) !== 0 || f)
			) {
				;(f = Ut.transition), (Ut.transition = null)
				var v = Pe
				Pe = 1
				var y = Ee
				;(Ee |= 4),
					(Uc.current = null),
					TS(e, s),
					om(s, e),
					nS(Xu),
					(Mo = !!Ku),
					(Xu = Ku = null),
					(e.current = s),
					OS(s),
					a1(),
					(Ee = y),
					(Pe = v),
					(Ut.transition = f)
			} else e.current = s
			if (
				(ya && ((ya = !1), (Zn = e), (wa = c)),
				(f = e.pendingLanes),
				f === 0 && (Yn = null),
				c1(s.stateNode),
				bt(e, Ve()),
				t !== null)
			)
				for (a = e.onRecoverableError, s = 0; s < t.length; s++)
					(c = t[s]), a(c.value, { componentStack: c.stack, digest: c.digest })
			if (_a) throw ((_a = !1), (e = Hc), (Hc = null), e)
			return (
				(wa & 1) !== 0 && e.tag !== 0 && mi(),
				(f = e.pendingLanes),
				(f & 1) !== 0 ? (e === Vc ? Cs++ : ((Cs = 0), (Vc = e))) : (Cs = 0),
				Gn(),
				null
			)
		}
		function mi() {
			if (Zn !== null) {
				var e = iv(wa),
					t = Ut.transition,
					s = Pe
				try {
					if (((Ut.transition = null), (Pe = 16 > e ? 16 : e), Zn === null)) var a = !1
					else {
						if (((e = Zn), (Zn = null), (wa = 0), (Ee & 6) !== 0)) throw Error(r(331))
						var c = Ee
						for (Ee |= 4, te = e.current; te !== null; ) {
							var f = te,
								v = f.child
							if ((te.flags & 16) !== 0) {
								var y = f.deletions
								if (y !== null) {
									for (var E = 0; E < y.length; E++) {
										var O = y[E]
										for (te = O; te !== null; ) {
											var B = te
											switch (B.tag) {
												case 0:
												case 11:
												case 15:
													Es(8, B, f)
											}
											var H = B.child
											if (H !== null) (H.return = B), (te = H)
											else
												for (; te !== null; ) {
													B = te
													var U = B.sibling,
														Y = B.return
													if ((tm(B), B === O)) {
														te = null
														break
													}
													if (U !== null) {
														;(U.return = Y), (te = U)
														break
													}
													te = Y
												}
										}
									}
									var re = f.alternate
									if (re !== null) {
										var se = re.child
										if (se !== null) {
											re.child = null
											do {
												var qe = se.sibling
												;(se.sibling = null), (se = qe)
											} while (se !== null)
										}
									}
									te = f
								}
							}
							if ((f.subtreeFlags & 2064) !== 0 && v !== null) (v.return = f), (te = v)
							else
								e: for (; te !== null; ) {
									if (((f = te), (f.flags & 2048) !== 0))
										switch (f.tag) {
											case 0:
											case 11:
											case 15:
												Es(9, f, f.return)
										}
									var P = f.sibling
									if (P !== null) {
										;(P.return = f.return), (te = P)
										break e
									}
									te = f.return
								}
						}
						var C = e.current
						for (te = C; te !== null; ) {
							v = te
							var b = v.child
							if ((v.subtreeFlags & 2064) !== 0 && b !== null) (b.return = v), (te = b)
							else
								e: for (v = C; te !== null; ) {
									if (((y = te), (y.flags & 2048) !== 0))
										try {
											switch (y.tag) {
												case 0:
												case 11:
												case 15:
													va(9, y)
											}
										} catch (oe) {
											We(y, y.return, oe)
										}
									if (y === v) {
										te = null
										break e
									}
									var V = y.sibling
									if (V !== null) {
										;(V.return = y.return), (te = V)
										break e
									}
									te = y.return
								}
						}
						if (((Ee = c), Gn(), an && typeof an.onPostCommitFiberRoot == 'function'))
							try {
								an.onPostCommitFiberRoot(Ro, e)
							} catch {}
						a = !0
					}
					return a
				} finally {
					;(Pe = s), (Ut.transition = t)
				}
			}
			return !1
		}
		function mm(e, t, s) {
			;(t = pi(s, t)),
				(t = Lg(e, t, 1)),
				(e = Kn(e, t, 1)),
				(t = gt()),
				e !== null && (Ki(e, 1, t), bt(e, t))
		}
		function We(e, t, s) {
			if (e.tag === 3) mm(e, e, s)
			else
				for (; t !== null; ) {
					if (t.tag === 3) {
						mm(t, e, s)
						break
					} else if (t.tag === 1) {
						var a = t.stateNode
						if (
							typeof t.type.getDerivedStateFromError == 'function' ||
							(typeof a.componentDidCatch == 'function' && (Yn === null || !Yn.has(a)))
						) {
							;(e = pi(s, e)),
								(e = Dg(t, e, 1)),
								(t = Kn(t, e, 1)),
								(e = gt()),
								t !== null && (Ki(t, 1, e), bt(t, e))
							break
						}
					}
					t = t.return
				}
		}
		function AS(e, t, s) {
			var a = e.pingCache
			a !== null && a.delete(t),
				(t = gt()),
				(e.pingedLanes |= e.suspendedLanes & s),
				et === e &&
					(st & s) === s &&
					(Ze === 4 || (Ze === 3 && (st & 130023424) === st && 500 > Ve() - Wc)
						? xr(e, 0)
						: (Bc |= s)),
				bt(e, t)
		}
		function _m(e, t) {
			t === 0 &&
				((e.mode & 1) === 0
					? (t = 1)
					: ((t = To), (To <<= 1), (To & 130023424) === 0 && (To = 4194304)))
			var s = gt()
			;(e = xn(e, t)), e !== null && (Ki(e, t, s), bt(e, s))
		}
		function $S(e) {
			var t = e.memoizedState,
				s = 0
			t !== null && (s = t.retryLane), _m(e, s)
		}
		function zS(e, t) {
			var s = 0
			switch (e.tag) {
				case 13:
					var a = e.stateNode,
						c = e.memoizedState
					c !== null && (s = c.retryLane)
					break
				case 19:
					a = e.stateNode
					break
				default:
					throw Error(r(314))
			}
			a !== null && a.delete(t), _m(e, s)
		}
		var ym
		ym = function (e, t, s) {
			if (e !== null)
				if (e.memoizedProps !== t.pendingProps || kt.current) Ct = !0
				else {
					if ((e.lanes & s) === 0 && (t.flags & 128) === 0) return (Ct = !1), PS(e, t, s)
					Ct = (e.flags & 131072) !== 0
				}
			else (Ct = !1), De && (t.flags & 1048576) !== 0 && Zv(t, Zo, t.index)
			switch (((t.lanes = 0), t.tag)) {
				case 2:
					var a = t.type
					pa(e, t), (e = t.pendingProps)
					var c = si(t, ct.current)
					di(t, s), (c = wc(null, t, a, e, c, s))
					var f = Sc()
					return (
						(t.flags |= 1),
						typeof c == 'object' &&
						c !== null &&
						typeof c.render == 'function' &&
						c.$$typeof === void 0
							? ((t.tag = 1),
								(t.memoizedState = null),
								(t.updateQueue = null),
								xt(a) ? ((f = !0), Ko(t)) : (f = !1),
								(t.memoizedState = c.state !== null && c.state !== void 0 ? c.state : null),
								pc(t),
								(c.updater = da),
								(t.stateNode = c),
								(c._reactInternals = t),
								bc(t, a, e, s),
								(t = Oc(null, t, a, !0, f, s)))
							: ((t.tag = 0), De && f && rc(t), vt(null, t, c, s), (t = t.child)),
						t
					)
				case 16:
					a = t.elementType
					e: {
						switch (
							(pa(e, t),
							(e = t.pendingProps),
							(c = a._init),
							(a = c(a._payload)),
							(t.type = a),
							(c = t.tag = US(a)),
							(e = Kt(a, e)),
							c)
						) {
							case 0:
								t = Tc(null, t, a, e, s)
								break e
							case 1:
								t = Vg(null, t, a, e, s)
								break e
							case 11:
								t = jg(null, t, a, e, s)
								break e
							case 14:
								t = Ug(null, t, a, Kt(a.type, e), s)
								break e
						}
						throw Error(r(306, a, ''))
					}
					return t
				case 0:
					return (
						(a = t.type),
						(c = t.pendingProps),
						(c = t.elementType === a ? c : Kt(a, c)),
						Tc(e, t, a, c, s)
					)
				case 1:
					return (
						(a = t.type),
						(c = t.pendingProps),
						(c = t.elementType === a ? c : Kt(a, c)),
						Vg(e, t, a, c, s)
					)
				case 3:
					e: {
						if ((qg(t), e === null)) throw Error(r(387))
						;(a = t.pendingProps),
							(f = t.memoizedState),
							(c = f.element),
							ag(e, t),
							ia(t, a, null, s)
						var v = t.memoizedState
						if (((a = v.element), f.isDehydrated))
							if (
								((f = {
									element: a,
									isDehydrated: !1,
									cache: v.cache,
									pendingSuspenseBoundaries: v.pendingSuspenseBoundaries,
									transitions: v.transitions,
								}),
								(t.updateQueue.baseState = f),
								(t.memoizedState = f),
								t.flags & 256)
							) {
								;(c = pi(Error(r(423)), t)), (t = Gg(e, t, a, s, c))
								break e
							} else if (a !== c) {
								;(c = pi(Error(r(424)), t)), (t = Gg(e, t, a, s, c))
								break e
							} else
								for (
									Ot = Hn(t.stateNode.containerInfo.firstChild),
										Tt = t,
										De = !0,
										Qt = null,
										s = sg(t, null, a, s),
										t.child = s;
									s;

								)
									(s.flags = (s.flags & -3) | 4096), (s = s.sibling)
						else {
							if ((li(), a === c)) {
								t = Pn(e, t, s)
								break e
							}
							vt(e, t, a, s)
						}
						t = t.child
					}
					return t
				case 5:
					return (
						cg(t),
						e === null && oc(t),
						(a = t.type),
						(c = t.pendingProps),
						(f = e !== null ? e.memoizedProps : null),
						(v = c.children),
						Yu(a, c) ? (v = null) : f !== null && Yu(a, f) && (t.flags |= 32),
						Hg(e, t),
						vt(e, t, v, s),
						t.child
					)
				case 6:
					return e === null && oc(t), null
				case 13:
					return Qg(e, t, s)
				case 4:
					return (
						hc(t, t.stateNode.containerInfo),
						(a = t.pendingProps),
						e === null ? (t.child = ui(t, null, a, s)) : vt(e, t, a, s),
						t.child
					)
				case 11:
					return (
						(a = t.type),
						(c = t.pendingProps),
						(c = t.elementType === a ? c : Kt(a, c)),
						jg(e, t, a, c, s)
					)
				case 7:
					return vt(e, t, t.pendingProps, s), t.child
				case 8:
					return vt(e, t, t.pendingProps.children, s), t.child
				case 12:
					return vt(e, t, t.pendingProps.children, s), t.child
				case 10:
					e: {
						if (
							((a = t.type._context),
							(c = t.pendingProps),
							(f = t.memoizedProps),
							(v = c.value),
							Te(ta, a._currentValue),
							(a._currentValue = v),
							f !== null)
						)
							if (Gt(f.value, v)) {
								if (f.children === c.children && !kt.current) {
									t = Pn(e, t, s)
									break e
								}
							} else
								for (f = t.child, f !== null && (f.return = t); f !== null; ) {
									var y = f.dependencies
									if (y !== null) {
										v = f.child
										for (var E = y.firstContext; E !== null; ) {
											if (E.context === a) {
												if (f.tag === 1) {
													;(E = Cn(-1, s & -s)), (E.tag = 2)
													var O = f.updateQueue
													if (O !== null) {
														O = O.shared
														var B = O.pending
														B === null ? (E.next = E) : ((E.next = B.next), (B.next = E)),
															(O.pending = E)
													}
												}
												;(f.lanes |= s),
													(E = f.alternate),
													E !== null && (E.lanes |= s),
													dc(f.return, s, t),
													(y.lanes |= s)
												break
											}
											E = E.next
										}
									} else if (f.tag === 10) v = f.type === t.type ? null : f.child
									else if (f.tag === 18) {
										if (((v = f.return), v === null)) throw Error(r(341))
										;(v.lanes |= s),
											(y = v.alternate),
											y !== null && (y.lanes |= s),
											dc(v, s, t),
											(v = f.sibling)
									} else v = f.child
									if (v !== null) v.return = f
									else
										for (v = f; v !== null; ) {
											if (v === t) {
												v = null
												break
											}
											if (((f = v.sibling), f !== null)) {
												;(f.return = v.return), (v = f)
												break
											}
											v = v.return
										}
									f = v
								}
						vt(e, t, c.children, s), (t = t.child)
					}
					return t
				case 9:
					return (
						(c = t.type),
						(a = t.pendingProps.children),
						di(t, s),
						(c = zt(c)),
						(a = a(c)),
						(t.flags |= 1),
						vt(e, t, a, s),
						t.child
					)
				case 14:
					return (a = t.type), (c = Kt(a, t.pendingProps)), (c = Kt(a.type, c)), Ug(e, t, a, c, s)
				case 15:
					return Bg(e, t, t.type, t.pendingProps, s)
				case 17:
					return (
						(a = t.type),
						(c = t.pendingProps),
						(c = t.elementType === a ? c : Kt(a, c)),
						pa(e, t),
						(t.tag = 1),
						xt(a) ? ((e = !0), Ko(t)) : (e = !1),
						di(t, s),
						Fg(t, a, c),
						bc(t, a, c, s),
						Oc(null, t, a, !0, e, s)
					)
				case 19:
					return Xg(e, t, s)
				case 22:
					return Wg(e, t, s)
			}
			throw Error(r(156, t.tag))
		}
		function wm(e, t) {
			return Jh(e, t)
		}
		function jS(e, t, s, a) {
			;(this.tag = e),
				(this.key = s),
				(this.sibling =
					this.child =
					this.return =
					this.stateNode =
					this.type =
					this.elementType =
						null),
				(this.index = 0),
				(this.ref = null),
				(this.pendingProps = t),
				(this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null),
				(this.mode = a),
				(this.subtreeFlags = this.flags = 0),
				(this.deletions = null),
				(this.childLanes = this.lanes = 0),
				(this.alternate = null)
		}
		function Bt(e, t, s, a) {
			return new jS(e, t, s, a)
		}
		function Yc(e) {
			return (e = e.prototype), !(!e || !e.isReactComponent)
		}
		function US(e) {
			if (typeof e == 'function') return Yc(e) ? 1 : 0
			if (e != null) {
				if (((e = e.$$typeof), e === Re)) return 11
				if (e === I) return 14
			}
			return 2
		}
		function tr(e, t) {
			var s = e.alternate
			return (
				s === null
					? ((s = Bt(e.tag, t, e.key, e.mode)),
						(s.elementType = e.elementType),
						(s.type = e.type),
						(s.stateNode = e.stateNode),
						(s.alternate = e),
						(e.alternate = s))
					: ((s.pendingProps = t),
						(s.type = e.type),
						(s.flags = 0),
						(s.subtreeFlags = 0),
						(s.deletions = null)),
				(s.flags = e.flags & 14680064),
				(s.childLanes = e.childLanes),
				(s.lanes = e.lanes),
				(s.child = e.child),
				(s.memoizedProps = e.memoizedProps),
				(s.memoizedState = e.memoizedState),
				(s.updateQueue = e.updateQueue),
				(t = e.dependencies),
				(s.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
				(s.sibling = e.sibling),
				(s.index = e.index),
				(s.ref = e.ref),
				s
			)
		}
		function xa(e, t, s, a, c, f) {
			var v = 2
			if (((a = e), typeof e == 'function')) Yc(e) && (v = 1)
			else if (typeof e == 'string') v = 5
			else
				e: switch (e) {
					case ae:
						return Pr(s.children, c, f, t)
					case le:
						;(v = 8), (c |= 8)
						break
					case pe:
						return (e = Bt(12, s, t, c | 2)), (e.elementType = pe), (e.lanes = f), e
					case Ne:
						return (e = Bt(13, s, t, c)), (e.elementType = Ne), (e.lanes = f), e
					case z:
						return (e = Bt(19, s, t, c)), (e.elementType = z), (e.lanes = f), e
					case D:
						return Ca(s, c, f, t)
					default:
						if (typeof e == 'object' && e !== null)
							switch (e.$$typeof) {
								case Ce:
									v = 10
									break e
								case He:
									v = 9
									break e
								case Re:
									v = 11
									break e
								case I:
									v = 14
									break e
								case A:
									;(v = 16), (a = null)
									break e
							}
						throw Error(r(130, e == null ? e : typeof e, ''))
				}
			return (t = Bt(v, s, t, c)), (t.elementType = e), (t.type = a), (t.lanes = f), t
		}
		function Pr(e, t, s, a) {
			return (e = Bt(7, e, a, t)), (e.lanes = s), e
		}
		function Ca(e, t, s, a) {
			return (
				(e = Bt(22, e, a, t)),
				(e.elementType = D),
				(e.lanes = s),
				(e.stateNode = { isHidden: !1 }),
				e
			)
		}
		function Zc(e, t, s) {
			return (e = Bt(6, e, null, t)), (e.lanes = s), e
		}
		function Jc(e, t, s) {
			return (
				(t = Bt(4, e.children !== null ? e.children : [], e.key, t)),
				(t.lanes = s),
				(t.stateNode = {
					containerInfo: e.containerInfo,
					pendingChildren: null,
					implementation: e.implementation,
				}),
				t
			)
		}
		function BS(e, t, s, a, c) {
			;(this.tag = t),
				(this.containerInfo = e),
				(this.finishedWork = this.pingCache = this.current = this.pendingChildren = null),
				(this.timeoutHandle = -1),
				(this.callbackNode = this.pendingContext = this.context = null),
				(this.callbackPriority = 0),
				(this.eventTimes = Pu(0)),
				(this.expirationTimes = Pu(-1)),
				(this.entangledLanes =
					this.finishedLanes =
					this.mutableReadLanes =
					this.expiredLanes =
					this.pingedLanes =
					this.suspendedLanes =
					this.pendingLanes =
						0),
				(this.entanglements = Pu(0)),
				(this.identifierPrefix = a),
				(this.onRecoverableError = c),
				(this.mutableSourceEagerHydrationData = null)
		}
		function ed(e, t, s, a, c, f, v, y, E) {
			return (
				(e = new BS(e, t, s, y, E)),
				t === 1 ? ((t = 1), f === !0 && (t |= 8)) : (t = 0),
				(f = Bt(3, null, null, t)),
				(e.current = f),
				(f.stateNode = e),
				(f.memoizedState = {
					element: a,
					isDehydrated: s,
					cache: null,
					transitions: null,
					pendingSuspenseBoundaries: null,
				}),
				pc(f),
				e
			)
		}
		function WS(e, t, s) {
			var a = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null
			return {
				$$typeof: ve,
				key: a == null ? null : '' + a,
				children: e,
				containerInfo: t,
				implementation: s,
			}
		}
		function Sm(e) {
			if (!e) return qn
			e = e._reactInternals
			e: {
				if (hr(e) !== e || e.tag !== 1) throw Error(r(170))
				var t = e
				do {
					switch (t.tag) {
						case 3:
							t = t.stateNode.context
							break e
						case 1:
							if (xt(t.type)) {
								t = t.stateNode.__reactInternalMemoizedMergedChildContext
								break e
							}
					}
					t = t.return
				} while (t !== null)
				throw Error(r(171))
			}
			if (e.tag === 1) {
				var s = e.type
				if (xt(s)) return Kv(e, s, t)
			}
			return t
		}
		function Em(e, t, s, a, c, f, v, y, E) {
			return (
				(e = ed(s, a, !0, e, c, f, v, y, E)),
				(e.context = Sm(null)),
				(s = e.current),
				(a = gt()),
				(c = Jn(s)),
				(f = Cn(a, c)),
				(f.callback = t ?? null),
				Kn(s, f, c),
				(e.current.lanes = c),
				Ki(e, c, a),
				bt(e, a),
				e
			)
		}
		function Pa(e, t, s, a) {
			var c = t.current,
				f = gt(),
				v = Jn(c)
			return (
				(s = Sm(s)),
				t.context === null ? (t.context = s) : (t.pendingContext = s),
				(t = Cn(f, v)),
				(t.payload = { element: e }),
				(a = a === void 0 ? null : a),
				a !== null && (t.callback = a),
				(e = Kn(c, t, v)),
				e !== null && (Zt(e, c, v, f), ra(e, c, v)),
				v
			)
		}
		function ba(e) {
			if (((e = e.current), !e.child)) return null
			switch (e.child.tag) {
				case 5:
					return e.child.stateNode
				default:
					return e.child.stateNode
			}
		}
		function km(e, t) {
			if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
				var s = e.retryLane
				e.retryLane = s !== 0 && s < t ? s : t
			}
		}
		function td(e, t) {
			km(e, t), (e = e.alternate) && km(e, t)
		}
		function HS() {
			return null
		}
		var xm =
			typeof reportError == 'function'
				? reportError
				: function (e) {
						console.error(e)
					}
		function nd(e) {
			this._internalRoot = e
		}
		;(Ra.prototype.render = nd.prototype.render =
			function (e) {
				var t = this._internalRoot
				if (t === null) throw Error(r(409))
				Pa(e, t, null, null)
			}),
			(Ra.prototype.unmount = nd.prototype.unmount =
				function () {
					var e = this._internalRoot
					if (e !== null) {
						this._internalRoot = null
						var t = e.containerInfo
						kr(function () {
							Pa(null, e, null, null)
						}),
							(t[wn] = null)
					}
				})
		function Ra(e) {
			this._internalRoot = e
		}
		Ra.prototype.unstable_scheduleHydration = function (e) {
			if (e) {
				var t = av()
				e = { blockedOn: null, target: e, priority: t }
				for (var s = 0; s < Un.length && t !== 0 && t < Un[s].priority; s++);
				Un.splice(s, 0, e), s === 0 && cv(e)
			}
		}
		function rd(e) {
			return !(!e || (e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11))
		}
		function Ia(e) {
			return !(
				!e ||
				(e.nodeType !== 1 &&
					e.nodeType !== 9 &&
					e.nodeType !== 11 &&
					(e.nodeType !== 8 || e.nodeValue !== ' react-mount-point-unstable '))
			)
		}
		function Cm() {}
		function VS(e, t, s, a, c) {
			if (c) {
				if (typeof a == 'function') {
					var f = a
					a = function () {
						var O = ba(v)
						f.call(O)
					}
				}
				var v = Em(t, a, e, 0, null, !1, !1, '', Cm)
				return (
					(e._reactRootContainer = v),
					(e[wn] = v.current),
					us(e.nodeType === 8 ? e.parentNode : e),
					kr(),
					v
				)
			}
			for (; (c = e.lastChild); ) e.removeChild(c)
			if (typeof a == 'function') {
				var y = a
				a = function () {
					var O = ba(E)
					y.call(O)
				}
			}
			var E = ed(e, 0, !1, null, null, !1, !1, '', Cm)
			return (
				(e._reactRootContainer = E),
				(e[wn] = E.current),
				us(e.nodeType === 8 ? e.parentNode : e),
				kr(function () {
					Pa(t, E, s, a)
				}),
				E
			)
		}
		function Ta(e, t, s, a, c) {
			var f = s._reactRootContainer
			if (f) {
				var v = f
				if (typeof c == 'function') {
					var y = c
					c = function () {
						var E = ba(v)
						y.call(E)
					}
				}
				Pa(t, v, e, c)
			} else v = VS(s, t, e, c, a)
			return ba(v)
		}
		;(sv = function (e) {
			switch (e.tag) {
				case 3:
					var t = e.stateNode
					if (t.current.memoizedState.isDehydrated) {
						var s = Qi(t.pendingLanes)
						s !== 0 && (bu(t, s | 1), bt(t, Ve()), (Ee & 6) === 0 && ((gi = Ve() + 500), Gn()))
					}
					break
				case 13:
					kr(function () {
						var a = xn(e, 1)
						if (a !== null) {
							var c = gt()
							Zt(a, e, 1, c)
						}
					}),
						td(e, 1)
			}
		}),
			(Ru = function (e) {
				if (e.tag === 13) {
					var t = xn(e, 134217728)
					if (t !== null) {
						var s = gt()
						Zt(t, e, 134217728, s)
					}
					td(e, 134217728)
				}
			}),
			(ov = function (e) {
				if (e.tag === 13) {
					var t = Jn(e),
						s = xn(e, t)
					if (s !== null) {
						var a = gt()
						Zt(s, e, t, a)
					}
					td(e, t)
				}
			}),
			(av = function () {
				return Pe
			}),
			(lv = function (e, t) {
				var s = Pe
				try {
					return (Pe = e), t()
				} finally {
					Pe = s
				}
			}),
			(wu = function (e, t, s) {
				switch (t) {
					case 'input':
						if ((pr(e, s), (t = s.name), s.type === 'radio' && t != null)) {
							for (s = e; s.parentNode; ) s = s.parentNode
							for (
								s = s.querySelectorAll('input[name=' + JSON.stringify('' + t) + '][type="radio"]'),
									t = 0;
								t < s.length;
								t++
							) {
								var a = s[t]
								if (a !== e && a.form === e.form) {
									var c = Go(a)
									if (!c) throw Error(r(90))
									zi(a), pr(a, c)
								}
							}
						}
						break
					case 'textarea':
						Ah(e, s)
						break
					case 'select':
						;(t = s.value), t != null && Gr(e, !!s.multiple, t, !1)
				}
			}),
			(qh = Qc),
			(Gh = kr)
		var qS = { usingClientEntryPoint: !1, Events: [fs, ri, Go, Hh, Vh, Qc] },
			Ps = {
				findFiberByHostInstance: vr,
				bundleType: 0,
				version: '18.3.1',
				rendererPackageName: 'react-dom',
			},
			GS = {
				bundleType: Ps.bundleType,
				version: Ps.version,
				rendererPackageName: Ps.rendererPackageName,
				rendererConfig: Ps.rendererConfig,
				overrideHookState: null,
				overrideHookStateDeletePath: null,
				overrideHookStateRenamePath: null,
				overrideProps: null,
				overridePropsDeletePath: null,
				overridePropsRenamePath: null,
				setErrorHandler: null,
				setSuspenseHandler: null,
				scheduleUpdate: null,
				currentDispatcherRef: Q.ReactCurrentDispatcher,
				findHostInstanceByFiber: function (e) {
					return (e = Yh(e)), e === null ? null : e.stateNode
				},
				findFiberByHostInstance: Ps.findFiberByHostInstance || HS,
				findHostInstancesForRefresh: null,
				scheduleRefresh: null,
				scheduleRoot: null,
				setRefreshHandler: null,
				getCurrentFiber: null,
				reconcilerVersion: '18.3.1-next-f1338f8080-20240426',
			}
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < 'u') {
			var Oa = __REACT_DEVTOOLS_GLOBAL_HOOK__
			if (!Oa.isDisabled && Oa.supportsFiber)
				try {
					;(Ro = Oa.inject(GS)), (an = Oa)
				} catch {}
		}
		return (
			(mt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = qS),
			(mt.createPortal = function (e, t) {
				var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null
				if (!rd(t)) throw Error(r(200))
				return WS(e, t, null, s)
			}),
			(mt.createRoot = function (e, t) {
				if (!rd(e)) throw Error(r(299))
				var s = !1,
					a = '',
					c = xm
				return (
					t != null &&
						(t.unstable_strictMode === !0 && (s = !0),
						t.identifierPrefix !== void 0 && (a = t.identifierPrefix),
						t.onRecoverableError !== void 0 && (c = t.onRecoverableError)),
					(t = ed(e, 1, !1, null, null, s, !1, a, c)),
					(e[wn] = t.current),
					us(e.nodeType === 8 ? e.parentNode : e),
					new nd(t)
				)
			}),
			(mt.findDOMNode = function (e) {
				if (e == null) return null
				if (e.nodeType === 1) return e
				var t = e._reactInternals
				if (t === void 0)
					throw typeof e.render == 'function'
						? Error(r(188))
						: ((e = Object.keys(e).join(',')), Error(r(268, e)))
				return (e = Yh(t)), (e = e === null ? null : e.stateNode), e
			}),
			(mt.flushSync = function (e) {
				return kr(e)
			}),
			(mt.hydrate = function (e, t, s) {
				if (!Ia(t)) throw Error(r(200))
				return Ta(null, e, t, !0, s)
			}),
			(mt.hydrateRoot = function (e, t, s) {
				if (!rd(e)) throw Error(r(405))
				var a = (s != null && s.hydratedSources) || null,
					c = !1,
					f = '',
					v = xm
				if (
					(s != null &&
						(s.unstable_strictMode === !0 && (c = !0),
						s.identifierPrefix !== void 0 && (f = s.identifierPrefix),
						s.onRecoverableError !== void 0 && (v = s.onRecoverableError)),
					(t = Em(t, null, e, 1, s ?? null, c, !1, f, v)),
					(e[wn] = t.current),
					us(e),
					a)
				)
					for (e = 0; e < a.length; e++)
						(s = a[e]),
							(c = s._getVersion),
							(c = c(s._source)),
							t.mutableSourceEagerHydrationData == null
								? (t.mutableSourceEagerHydrationData = [s, c])
								: t.mutableSourceEagerHydrationData.push(s, c)
				return new Ra(t)
			}),
			(mt.render = function (e, t, s) {
				if (!Ia(t)) throw Error(r(200))
				return Ta(null, e, t, !1, s)
			}),
			(mt.unmountComponentAtNode = function (e) {
				if (!Ia(e)) throw Error(r(40))
				return e._reactRootContainer
					? (kr(function () {
							Ta(null, null, e, !1, function () {
								;(e._reactRootContainer = null), (e[wn] = null)
							})
						}),
						!0)
					: !1
			}),
			(mt.unstable_batchedUpdates = Qc),
			(mt.unstable_renderSubtreeIntoContainer = function (e, t, s, a) {
				if (!Ia(s)) throw Error(r(200))
				if (e == null || e._reactInternals === void 0) throw Error(r(38))
				return Ta(e, t, s, !1, a)
			}),
			(mt.version = '18.3.1-next-f1338f8080-20240426'),
			mt
		)
	}
	var cd
	function dd() {
		if (cd) return Da.exports
		cd = 1
		function i() {
			if (
				!(
					typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > 'u' ||
					typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != 'function'
				)
			)
				try {
					__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)
				} catch (n) {
					console.error(n)
				}
		}
		return i(), (Da.exports = Im()), Da.exports
	}
	var fd
	function Tm() {
		if (fd) return Rs
		fd = 1
		var i = dd()
		return (Rs.createRoot = i.createRoot), (Rs.hydrateRoot = i.hydrateRoot), Rs
	}
	var pd = Tm(),
		za = { exports: {} },
		_i = {}
	/**
	 * @license React
	 * react-jsx-runtime.production.min.js
	 *
	 * Copyright (c) Facebook, Inc. and its affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */ var hd
	function Om() {
		if (hd) return _i
		hd = 1
		var i = Ma(),
			n = Symbol.for('react.element'),
			r = Symbol.for('react.fragment'),
			o = Object.prototype.hasOwnProperty,
			l = i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
			u = { key: !0, ref: !0, __self: !0, __source: !0 }
		function d(p, h, g) {
			var m,
				w = {},
				_ = null,
				S = null
			g !== void 0 && (_ = '' + g),
				h.key !== void 0 && (_ = '' + h.key),
				h.ref !== void 0 && (S = h.ref)
			for (m in h) o.call(h, m) && !u.hasOwnProperty(m) && (w[m] = h[m])
			if (p && p.defaultProps) for (m in ((h = p.defaultProps), h)) w[m] === void 0 && (w[m] = h[m])
			return { $$typeof: n, type: p, key: _, ref: S, props: w, _owner: l.current }
		}
		return (_i.Fragment = r), (_i.jsx = d), (_i.jsxs = d), _i
	}
	var vd
	function Nm() {
		return vd || ((vd = 1), (za.exports = Om())), za.exports
	}
	var ne = Nm()
	/*! js-cookie v3.0.5 | MIT */ function Is(i) {
		for (var n = 1; n < arguments.length; n++) {
			var r = arguments[n]
			for (var o in r) i[o] = r[o]
		}
		return i
	}
	var Fm = {
		read: function (i) {
			return i[0] === '"' && (i = i.slice(1, -1)), i.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
		},
		write: function (i) {
			return encodeURIComponent(i).replace(
				/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
				decodeURIComponent
			)
		},
	}
	function ja(i, n) {
		function r(l, u, d) {
			if (!(typeof document > 'u')) {
				;(d = Is({}, n, d)),
					typeof d.expires == 'number' && (d.expires = new Date(Date.now() + d.expires * 864e5)),
					d.expires && (d.expires = d.expires.toUTCString()),
					(l = encodeURIComponent(l)
						.replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
						.replace(/[()]/g, escape))
				var p = ''
				for (var h in d) d[h] && ((p += '; ' + h), d[h] !== !0 && (p += '=' + d[h].split(';')[0]))
				return (document.cookie = l + '=' + i.write(u, l) + p)
			}
		}
		function o(l) {
			if (!(typeof document > 'u' || (arguments.length && !l))) {
				for (
					var u = document.cookie ? document.cookie.split('; ') : [], d = {}, p = 0;
					p < u.length;
					p++
				) {
					var h = u[p].split('='),
						g = h.slice(1).join('=')
					try {
						var m = decodeURIComponent(h[0])
						if (((d[m] = i.read(g, m)), l === m)) break
					} catch {}
				}
				return l ? d[l] : d
			}
		}
		return Object.create(
			{
				set: r,
				get: o,
				remove: function (l, u) {
					r(l, '', Is({}, u, { expires: -1 }))
				},
				withAttributes: function (l) {
					return ja(this.converter, Is({}, this.attributes, l))
				},
				withConverter: function (l) {
					return ja(Is({}, this.converter, l), this.attributes)
				},
			},
			{ attributes: { value: Object.freeze(n) }, converter: { value: Object.freeze(i) } }
		)
	}
	var Ts = ja(Fm, { path: '/' }),
		N = typeof window < 'u' ? window : void 0,
		_t = typeof globalThis < 'u' ? globalThis : N,
		gd = Array.prototype,
		md = gd.forEach,
		_d = gd.indexOf,
		Rt = _t?.navigator,
		J = _t?.document,
		yt = _t?.location,
		Ua = _t?.fetch,
		Ba =
			_t != null && _t.XMLHttpRequest && 'withCredentials' in new _t.XMLHttpRequest()
				? _t.XMLHttpRequest
				: void 0,
		yd = _t?.AbortController,
		wt = Rt?.userAgent,
		me = N ?? {},
		fn = { DEBUG: !1, LIB_VERSION: '1.248.1' },
		Wa = '$copy_autocapture',
		Mm = [
			'$snapshot',
			'$pageview',
			'$pageleave',
			'$set',
			'survey dismissed',
			'survey sent',
			'survey shown',
			'$identify',
			'$groupidentify',
			'$create_alias',
			'$$client_ingestion_warning',
			'$web_experiment_applied',
			'$feature_enrollment_update',
			'$feature_flag_called',
		],
		pn = (function (i) {
			return (i.GZipJS = 'gzip-js'), (i.Base64 = 'base64'), i
		})({}),
		Lm = ['fatal', 'error', 'warning', 'log', 'info', 'debug']
	function ye(i, n) {
		return i.indexOf(n) !== -1
	}
	var Os = function (i) {
			return i.trim()
		},
		Ha = function (i) {
			return i.replace(/^\$/, '')
		},
		Dm = Array.isArray,
		wd = Object.prototype,
		Sd = wd.hasOwnProperty,
		Ns = wd.toString,
		Le =
			Dm ||
			function (i) {
				return Ns.call(i) === '[object Array]'
			},
		Ft = (i) => typeof i == 'function',
		je = (i) => i === Object(i) && !Le(i),
		br = (i) => {
			if (je(i)) {
				for (var n in i) if (Sd.call(i, n)) return !1
				return !0
			}
			return !1
		},
		K = (i) => i === void 0,
		Ue = (i) => Ns.call(i) == '[object String]',
		Va = (i) => Ue(i) && i.trim().length === 0,
		Rn = (i) => i === null,
		xe = (i) => K(i) || Rn(i),
		ot = (i) => Ns.call(i) == '[object Number]',
		Jt = (i) => Ns.call(i) === '[object Boolean]',
		Am = (i) => i instanceof FormData,
		$m = (i) => ye(Mm, i),
		Ed = (i) => {
			var n = {
				t: function (r) {
					if (N && (fn.DEBUG || me.POSTHOG_DEBUG) && !K(N.console) && N.console) {
						for (
							var o =
									('__rrweb_original__' in N.console[r])
										? N.console[r].__rrweb_original__
										: N.console[r],
								l = arguments.length,
								u = new Array(l > 1 ? l - 1 : 0),
								d = 1;
							d < l;
							d++
						)
							u[d - 1] = arguments[d]
						o(i, ...u)
					}
				},
				info: function () {
					for (var r = arguments.length, o = new Array(r), l = 0; l < r; l++) o[l] = arguments[l]
					n.t('log', ...o)
				},
				warn: function () {
					for (var r = arguments.length, o = new Array(r), l = 0; l < r; l++) o[l] = arguments[l]
					n.t('warn', ...o)
				},
				error: function () {
					for (var r = arguments.length, o = new Array(r), l = 0; l < r; l++) o[l] = arguments[l]
					n.t('error', ...o)
				},
				critical: function () {
					for (var r = arguments.length, o = new Array(r), l = 0; l < r; l++) o[l] = arguments[l]
					console.error(i, ...o)
				},
				uninitializedWarning: (r) => {
					n.error('You must initialize PostHog before calling ' + r)
				},
				createLogger: (r) => Ed(i + ' ' + r),
			}
			return n
		},
		ie = Ed('[PostHog.js]'),
		nt = ie.createLogger,
		zm = nt('[ExternalScriptsLoader]'),
		kd = (i, n, r) => {
			if (i.config.disable_external_dependency_loading)
				return (
					zm.warn(n + ' was requested but loading of external scripts is disabled.'),
					r('Loading of external scripts is disabled')
				)
			var o = J?.querySelectorAll('script')
			if (o) {
				for (var l = 0; l < o.length; l++) if (o[l].src === n) return r()
			}
			var u = () => {
				if (!J) return r('document not found')
				var d = J.createElement('script')
				if (
					((d.type = 'text/javascript'),
					(d.crossOrigin = 'anonymous'),
					(d.src = n),
					(d.onload = (g) => r(void 0, g)),
					(d.onerror = (g) => r(g)),
					i.config.prepare_external_dependency_script &&
						(d = i.config.prepare_external_dependency_script(d)),
					!d)
				)
					return r('prepare_external_dependency_script returned null')
				var p,
					h = J.querySelectorAll('body > script')
				h.length > 0
					? (p = h[0].parentNode) == null || p.insertBefore(d, h[0])
					: J.body.appendChild(d)
			}
			J != null && J.body ? u() : J?.addEventListener('DOMContentLoaded', u)
		}
	function Z() {
		return (
			(Z = Object.assign
				? Object.assign.bind()
				: function (i) {
						for (var n = 1; n < arguments.length; n++) {
							var r = arguments[n]
							for (var o in r) ({}).hasOwnProperty.call(r, o) && (i[o] = r[o])
						}
						return i
					}),
			Z.apply(null, arguments)
		)
	}
	function xd(i, n) {
		if (i == null) return {}
		var r = {}
		for (var o in i)
			if ({}.hasOwnProperty.call(i, o)) {
				if (n.indexOf(o) !== -1) continue
				r[o] = i[o]
			}
		return r
	}
	;(me.__PosthogExtensions__ = me.__PosthogExtensions__ || {}),
		(me.__PosthogExtensions__.loadExternalDependency = (i, n, r) => {
			var o = '/static/' + n + '.js?v=' + i.version
			if (
				(n === 'remote-config' && (o = '/array/' + i.config.token + '/config.js'), n === 'toolbar')
			) {
				var l = 3e5
				o = o + '&t=' + Math.floor(Date.now() / l) * l
			}
			var u = i.requestRouter.endpointFor('assets', o)
			kd(i, u, r)
		}),
		(me.__PosthogExtensions__.loadSiteApp = (i, n, r) => {
			var o = i.requestRouter.endpointFor('api', n)
			kd(i, o, r)
		})
	var Fs = {}
	function In(i, n, r) {
		if (Le(i)) {
			if (md && i.forEach === md) i.forEach(n, r)
			else if ('length' in i && i.length === +i.length) {
				for (var o = 0, l = i.length; o < l; o++) if (o in i && n.call(r, i[o], o) === Fs) return
			}
		}
	}
	function be(i, n, r) {
		if (!xe(i)) {
			if (Le(i)) return In(i, n, r)
			if (Am(i)) {
				for (var o of i.entries()) if (n.call(r, o[1], o[0]) === Fs) return
			} else for (var l in i) if (Sd.call(i, l) && n.call(r, i[l], l) === Fs) return
		}
	}
	var Ge = function (i) {
			for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++)
				r[o - 1] = arguments[o]
			return (
				In(r, function (l) {
					for (var u in l) l[u] !== void 0 && (i[u] = l[u])
				}),
				i
			)
		},
		Ms = function (i) {
			for (var n = arguments.length, r = new Array(n > 1 ? n - 1 : 0), o = 1; o < n; o++)
				r[o - 1] = arguments[o]
			return (
				In(r, function (l) {
					In(l, function (u) {
						i.push(u)
					})
				}),
				i
			)
		}
	function Ls(i) {
		for (var n = Object.keys(i), r = n.length, o = new Array(r); r--; ) o[r] = [n[r], i[n[r]]]
		return o
	}
	var Cd = function (i) {
			try {
				return i()
			} catch {
				return
			}
		},
		jm = function (i) {
			return function () {
				try {
					for (var n = arguments.length, r = new Array(n), o = 0; o < n; o++) r[o] = arguments[o]
					return i.apply(this, r)
				} catch (l) {
					ie.critical(
						'Implementation error. Please turn on debug mode and open a ticket on https://app.posthog.com/home#panel=support%3Asupport%3A.'
					),
						ie.critical(l)
				}
			}
		},
		qa = function (i) {
			var n = {}
			return (
				be(i, function (r, o) {
					;((Ue(r) && r.length > 0) || ot(r)) && (n[o] = r)
				}),
				n
			)
		}
	function Um(i, n) {
		return (
			(r = i),
			(o = (u) => (Ue(u) && !Rn(n) ? u.slice(0, n) : u)),
			(l = new Set()),
			(function u(d, p) {
				return d !== Object(d)
					? o
						? o(d, p)
						: d
					: l.has(d)
						? void 0
						: (l.add(d),
							Le(d)
								? ((h = []),
									In(d, (g) => {
										h.push(u(g))
									}))
								: ((h = {}),
									be(d, (g, m) => {
										l.has(g) || (h[m] = u(g, m))
									})),
							h)
				var h
			})(r)
		)
		var r, o, l
	}
	var Bm = ['herokuapp.com', 'vercel.app', 'netlify.app']
	function Wm(i) {
		var n = i?.hostname
		if (!Ue(n)) return !1
		var r = n.split('.').slice(-2).join('.')
		for (var o of Bm) if (r === o) return !1
		return !0
	}
	function Pd(i, n) {
		for (var r = 0; r < i.length; r++) if (n(i[r])) return i[r]
	}
	function Ae(i, n, r, o) {
		var { capture: l = !1, passive: u = !0 } = o ?? {}
		i?.addEventListener(n, r, { capture: l, passive: u })
	}
	var bd = '$people_distinct_id',
		yi = '__alias',
		wi = '__timers',
		Rd = '$autocapture_disabled_server_side',
		Ga = '$heatmaps_enabled_server_side',
		Id = '$exception_capture_enabled_server_side',
		Qa = '$error_tracking_suppression_rules',
		Td = '$web_vitals_enabled_server_side',
		Od = '$dead_clicks_enabled_server_side',
		Nd = '$web_vitals_allowed_metrics',
		Ka = '$session_recording_enabled_server_side',
		Fd = '$console_log_recording_enabled_server_side',
		Md = '$session_recording_network_payload_capture',
		Ld = '$session_recording_masking',
		Dd = '$session_recording_canvas_recording',
		Ad = '$replay_sample_rate',
		$d = '$replay_minimum_duration',
		zd = '$replay_script_config',
		Ds = '$sesid',
		Si = '$session_is_sampled',
		Xa = '$session_recording_url_trigger_activated_session',
		Ya = '$session_recording_event_trigger_activated_session',
		Rr = '$enabled_feature_flags',
		As = '$early_access_features',
		Za = '$feature_flag_details',
		Ei = '$stored_person_properties',
		rr = '$stored_group_properties',
		Ja = '$surveys',
		$s = '$surveys_activated',
		zs = '$flag_call_reported',
		hn = '$user_state',
		el = '$client_session_props',
		tl = '$capture_rate_limit',
		nl = '$initial_campaign_params',
		rl = '$initial_referrer_info',
		js = '$initial_person_info',
		Us = '$epp',
		jd = '__POSTHOG_TOOLBAR__',
		Ud = '$posthog_cookieless',
		Hm = [
			bd,
			yi,
			'__cmpns',
			wi,
			Ka,
			Ga,
			Ds,
			Rr,
			Qa,
			hn,
			As,
			Za,
			rr,
			Ei,
			Ja,
			zs,
			el,
			tl,
			nl,
			rl,
			Us,
			js,
		]
	function Bd(i) {
		return (
			i instanceof Element &&
			(i.id === jd || !(i.closest == null || !i.closest('.toolbar-global-fade-container')))
		)
	}
	function Bs(i) {
		return !!i && i.nodeType === 1
	}
	function Tn(i, n) {
		return !!i && !!i.tagName && i.tagName.toLowerCase() === n.toLowerCase()
	}
	function Wd(i) {
		return !!i && i.nodeType === 3
	}
	function Hd(i) {
		return !!i && i.nodeType === 11
	}
	function il(i) {
		return i ? Os(i).split(/\s+/) : []
	}
	function Vd(i) {
		var n = N?.location.href
		return !!(n && i && i.some((r) => n.match(r)))
	}
	function Ws(i) {
		var n = ''
		switch (typeof i.className) {
			case 'string':
				n = i.className
				break
			case 'object':
				n =
					(i.className && 'baseVal' in i.className ? i.className.baseVal : null) ||
					i.getAttribute('class') ||
					''
				break
			default:
				n = ''
		}
		return il(n)
	}
	function qd(i) {
		return xe(i)
			? null
			: Os(i)
					.split(/(\s+)/)
					.filter((n) => Ir(n))
					.join('')
					.replace(/[\r\n]/g, ' ')
					.replace(/[ ]+/g, ' ')
					.substring(0, 255)
	}
	function Hs(i) {
		var n = ''
		return (
			ol(i) &&
				!Kd(i) &&
				i.childNodes &&
				i.childNodes.length &&
				be(i.childNodes, function (r) {
					var o
					Wd(r) && r.textContent && (n += (o = qd(r.textContent)) !== null && o !== void 0 ? o : '')
				}),
			Os(n)
		)
	}
	function Gd(i) {
		return K(i.target)
			? i.srcElement || null
			: (n = i.target) != null && n.shadowRoot
				? i.composedPath()[0] || null
				: i.target || null
		var n
	}
	var sl = ['a', 'button', 'form', 'input', 'select', 'textarea', 'label']
	function Qd(i) {
		var n = i.parentNode
		return !(!n || !Bs(n)) && n
	}
	function Vm(i, n, r, o, l) {
		var u, d, p
		if (
			(r === void 0 && (r = void 0),
			!N ||
				!i ||
				Tn(i, 'html') ||
				!Bs(i) ||
				((u = r) != null && u.url_allowlist && !Vd(r.url_allowlist)) ||
				((d = r) != null && d.url_ignorelist && Vd(r.url_ignorelist)))
		)
			return !1
		if ((p = r) != null && p.dom_event_allowlist) {
			var h = r.dom_event_allowlist
			if (h && !h.some((F) => n.type === F)) return !1
		}
		for (var g = !1, m = [i], w = !0, _ = i; _.parentNode && !Tn(_, 'body'); )
			if (Hd(_.parentNode)) m.push(_.parentNode.host), (_ = _.parentNode.host)
			else {
				if (!(w = Qd(_))) break
				if (o || sl.indexOf(w.tagName.toLowerCase()) > -1) g = !0
				else {
					var S = N.getComputedStyle(w)
					S && S.getPropertyValue('cursor') === 'pointer' && (g = !0)
				}
				m.push(w), (_ = w)
			}
		if (
			!(function (F, j) {
				var q = j?.element_allowlist
				if (K(q)) return !0
				var G,
					Q = function (ve) {
						if (q.some((ae) => ve.tagName.toLowerCase() === ae)) return { v: !0 }
					}
				for (var ue of F) if ((G = Q(ue))) return G.v
				return !1
			})(m, r) ||
			!(function (F, j) {
				var q = j?.css_selector_allowlist
				if (K(q)) return !0
				var G,
					Q = function (ve) {
						if (q.some((ae) => ve.matches(ae))) return { v: !0 }
					}
				for (var ue of F) if ((G = Q(ue))) return G.v
				return !1
			})(m, r)
		)
			return !1
		var M = N.getComputedStyle(i)
		if (M && M.getPropertyValue('cursor') === 'pointer' && n.type === 'click') return !0
		var k = i.tagName.toLowerCase()
		switch (k) {
			case 'html':
				return !1
			case 'form':
				return (l || ['submit']).indexOf(n.type) >= 0
			case 'input':
			case 'select':
			case 'textarea':
				return (l || ['change', 'click']).indexOf(n.type) >= 0
			default:
				return g
					? (l || ['click']).indexOf(n.type) >= 0
					: (l || ['click']).indexOf(n.type) >= 0 &&
							(sl.indexOf(k) > -1 || i.getAttribute('contenteditable') === 'true')
		}
	}
	function ol(i) {
		for (var n = i; n.parentNode && !Tn(n, 'body'); n = n.parentNode) {
			var r = Ws(n)
			if (ye(r, 'ph-sensitive') || ye(r, 'ph-no-capture')) return !1
		}
		if (ye(Ws(i), 'ph-include')) return !0
		var o = i.type || ''
		if (Ue(o))
			switch (o.toLowerCase()) {
				case 'hidden':
				case 'password':
					return !1
			}
		var l = i.name || i.id || ''
		return !(
			Ue(l) &&
			/^cc|cardnum|ccnum|creditcard|csc|cvc|cvv|exp|pass|pwd|routing|seccode|securitycode|securitynum|socialsec|socsec|ssn/i.test(
				l.replace(/[^a-zA-Z0-9]/g, '')
			)
		)
	}
	function Kd(i) {
		return !!(
			(Tn(i, 'input') && !['button', 'checkbox', 'submit', 'reset'].includes(i.type)) ||
			Tn(i, 'select') ||
			Tn(i, 'textarea') ||
			i.getAttribute('contenteditable') === 'true'
		)
	}
	var Xd =
			'(4[0-9]{12}(?:[0-9]{3})?)|(5[1-5][0-9]{14})|(6(?:011|5[0-9]{2})[0-9]{12})|(3[47][0-9]{13})|(3(?:0[0-5]|[68][0-9])[0-9]{11})|((?:2131|1800|35[0-9]{3})[0-9]{11})',
		qm = new RegExp('^(?:' + Xd + ')$'),
		Gm = new RegExp(Xd),
		Yd = '\\d{3}-?\\d{2}-?\\d{4}',
		Qm = new RegExp('^(' + Yd + ')$'),
		Km = new RegExp('(' + Yd + ')')
	function Ir(i, n) {
		return (
			n === void 0 && (n = !0),
			!(
				xe(i) ||
				(Ue(i) &&
					((i = Os(i)),
					(n ? qm : Gm).test((i || '').replace(/[- ]/g, '')) || (n ? Qm : Km).test(i)))
			)
		)
	}
	function Zd(i) {
		var n = Hs(i)
		return Ir((n = (n + ' ' + Jd(i)).trim())) ? n : ''
	}
	function Jd(i) {
		var n = ''
		return (
			i &&
				i.childNodes &&
				i.childNodes.length &&
				be(i.childNodes, function (r) {
					var o
					if (r && ((o = r.tagName) == null ? void 0 : o.toLowerCase()) === 'span')
						try {
							var l = Hs(r)
							;(n = (n + ' ' + l).trim()),
								r.childNodes && r.childNodes.length && (n = (n + ' ' + Jd(r)).trim())
						} catch (u) {
							ie.error('[AutoCapture]', u)
						}
				}),
			n
		)
	}
	function Xm(i) {
		return (function (n) {
			var r = n.map((o) => {
				var l,
					u,
					d = ''
				if ((o.tag_name && (d += o.tag_name), o.attr_class))
					for (var p of (o.attr_class.sort(), o.attr_class)) d += '.' + p.replace(/"/g, '')
				var h = Z(
						{},
						o.text ? { text: o.text } : {},
						{
							'nth-child': (l = o.nth_child) !== null && l !== void 0 ? l : 0,
							'nth-of-type': (u = o.nth_of_type) !== null && u !== void 0 ? u : 0,
						},
						o.href ? { href: o.href } : {},
						o.attr_id ? { attr_id: o.attr_id } : {},
						o.attributes
					),
					g = {}
				return (
					Ls(h)
						.sort((m, w) => {
							var [_] = m,
								[S] = w
							return _.localeCompare(S)
						})
						.forEach((m) => {
							var [w, _] = m
							return (g[ef(w.toString())] = ef(_.toString()))
						}),
					(d += ':'),
					(d += Ls(g)
						.map((m) => {
							var [w, _] = m
							return w + '="' + _ + '"'
						})
						.join(''))
				)
			})
			return r.join(';')
		})(
			(function (n) {
				return n.map((r) => {
					var o,
						l,
						u = {
							text: (o = r.$el_text) == null ? void 0 : o.slice(0, 400),
							tag_name: r.tag_name,
							href: (l = r.attr__href) == null ? void 0 : l.slice(0, 2048),
							attr_class: Ym(r),
							attr_id: r.attr__id,
							nth_child: r.nth_child,
							nth_of_type: r.nth_of_type,
							attributes: {},
						}
					return (
						Ls(r)
							.filter((d) => {
								var [p] = d
								return p.indexOf('attr__') === 0
							})
							.forEach((d) => {
								var [p, h] = d
								return (u.attributes[p] = h)
							}),
						u
					)
				})
			})(i)
		)
	}
	function ef(i) {
		return i.replace(/"|\\"/g, '\\"')
	}
	function Ym(i) {
		var n = i.attr__class
		return n ? (Le(n) ? n : il(n)) : void 0
	}
	class tf {
		constructor() {
			this.clicks = []
		}
		isRageClick(n, r, o) {
			var l = this.clicks[this.clicks.length - 1]
			if (l && Math.abs(n - l.x) + Math.abs(r - l.y) < 30 && o - l.timestamp < 1e3) {
				if ((this.clicks.push({ x: n, y: r, timestamp: o }), this.clicks.length === 3)) return !0
			} else this.clicks = [{ x: n, y: r, timestamp: o }]
			return !1
		}
	}
	var Zm = ['localhost', '127.0.0.1'],
		Tr = (i) => {
			var n = J?.createElement('a')
			return K(n) ? null : ((n.href = i), n)
		},
		Jm = function (i, n) {
			var r, o
			n === void 0 && (n = '&')
			var l = []
			return (
				be(i, function (u, d) {
					K(u) ||
						K(d) ||
						d === 'undefined' ||
						((r = encodeURIComponent(((p) => p instanceof File)(u) ? u.name : u.toString())),
						(o = encodeURIComponent(d)),
						(l[l.length] = o + '=' + r))
				}),
				l.join(n)
			)
		},
		Vs = function (i, n) {
			for (
				var r,
					o = ((i.split('#')[0] || '').split(/\?(.*)/)[1] || '').replace(/^\?+/g, '').split('&'),
					l = 0;
				l < o.length;
				l++
			) {
				var u = o[l].split('=')
				if (u[0] === n) {
					r = u
					break
				}
			}
			if (!Le(r) || r.length < 2) return ''
			var d = r[1]
			try {
				d = decodeURIComponent(d)
			} catch {
				ie.error('Skipping decoding for malformed query param: ' + d)
			}
			return d.replace(/\+/g, ' ')
		},
		al = function (i, n, r) {
			if (!i || !n || !n.length) return i
			for (
				var o = i.split('#'),
					l = o[0] || '',
					u = o[1],
					d = l.split('?'),
					p = d[1],
					h = d[0],
					g = (p || '').split('&'),
					m = [],
					w = 0;
				w < g.length;
				w++
			) {
				var _ = g[w].split('=')
				Le(_) && (n.includes(_[0]) ? m.push(_[0] + '=' + r) : m.push(g[w]))
			}
			var S = h
			return p != null && (S += '?' + m.join('&')), u != null && (S += '#' + u), S
		},
		qs = function (i, n) {
			var r = i.match(new RegExp(n + '=([^&]*)'))
			return r ? r[1] : null
		},
		nf = nt('[AutoCapture]')
	function ll(i, n) {
		return n.length > i ? n.slice(0, i) + '...' : n
	}
	function e_(i) {
		if (i.previousElementSibling) return i.previousElementSibling
		var n = i
		do n = n.previousSibling
		while (n && !Bs(n))
		return n
	}
	function t_(i, n, r, o) {
		var l = i.tagName.toLowerCase(),
			u = { tag_name: l }
		sl.indexOf(l) > -1 &&
			!r &&
			(l.toLowerCase() === 'a' || l.toLowerCase() === 'button'
				? (u.$el_text = ll(1024, Zd(i)))
				: (u.$el_text = ll(1024, Hs(i))))
		var d = Ws(i)
		d.length > 0 &&
			(u.classes = d.filter(function (m) {
				return m !== ''
			})),
			be(i.attributes, function (m) {
				var w
				if (
					(!Kd(i) || ['name', 'id', 'class', 'aria-label'].indexOf(m.name) !== -1) &&
					(o == null || !o.includes(m.name)) &&
					!n &&
					Ir(m.value) &&
					((w = m.name),
					!Ue(w) || (w.substring(0, 10) !== '_ngcontent' && w.substring(0, 7) !== '_nghost'))
				) {
					var _ = m.value
					m.name === 'class' && (_ = il(_).join(' ')), (u['attr__' + m.name] = ll(1024, _))
				}
			})
		for (var p = 1, h = 1, g = i; (g = e_(g)); ) p++, g.tagName === i.tagName && h++
		return (u.nth_child = p), (u.nth_of_type = h), u
	}
	function n_(i, n) {
		for (
			var r,
				o,
				{
					e: l,
					maskAllElementAttributes: u,
					maskAllText: d,
					elementAttributeIgnoreList: p,
					elementsChainAsString: h,
				} = n,
				g = [i],
				m = i;
			m.parentNode && !Tn(m, 'body');

		)
			Hd(m.parentNode)
				? (g.push(m.parentNode.host), (m = m.parentNode.host))
				: (g.push(m.parentNode), (m = m.parentNode))
		var w,
			_ = [],
			S = {},
			M = !1,
			k = !1
		if (
			(be(g, (Q) => {
				var ue = ol(Q)
				Q.tagName.toLowerCase() === 'a' &&
					((M = Q.getAttribute('href')), (M = ue && M && Ir(M) && M)),
					ye(Ws(Q), 'ph-no-capture') && (k = !0),
					_.push(t_(Q, u, d, p))
				var ve = (function (ae) {
					if (!ol(ae)) return {}
					var le = {}
					return (
						be(ae.attributes, function (pe) {
							if (pe.name && pe.name.indexOf('data-ph-capture-attribute') === 0) {
								var Ce = pe.name.replace('data-ph-capture-attribute-', ''),
									He = pe.value
								Ce && He && Ir(He) && (le[Ce] = He)
							}
						}),
						le
					)
				})(Q)
				Ge(S, ve)
			}),
			k)
		)
			return { props: {}, explicitNoCapture: k }
		if (
			(d ||
				(i.tagName.toLowerCase() === 'a' || i.tagName.toLowerCase() === 'button'
					? (_[0].$el_text = Zd(i))
					: (_[0].$el_text = Hs(i))),
			M)
		) {
			var F, j
			_[0].attr__href = M
			var q = (F = Tr(M)) == null ? void 0 : F.host,
				G = N == null || (j = N.location) == null ? void 0 : j.host
			q && G && q !== G && (w = M)
		}
		return {
			props: Ge(
				{ $event_type: l.type, $ce_version: 1 },
				h ? {} : { $elements: _ },
				{ $elements_chain: Xm(_) },
				(r = _[0]) != null && r.$el_text
					? { $el_text: (o = _[0]) == null ? void 0 : o.$el_text }
					: {},
				w && l.type === 'click' ? { $external_click_url: w } : {},
				S
			),
		}
	}
	class r_ {
		constructor(n) {
			;(this.i = !1),
				(this.o = null),
				(this.rageclicks = new tf()),
				(this.h = !1),
				(this.instance = n),
				(this.m = null)
		}
		get S() {
			var n,
				r,
				o = je(this.instance.config.autocapture) ? this.instance.config.autocapture : {}
			return (
				(o.url_allowlist = (n = o.url_allowlist) == null ? void 0 : n.map((l) => new RegExp(l))),
				(o.url_ignorelist = (r = o.url_ignorelist) == null ? void 0 : r.map((l) => new RegExp(l))),
				o
			)
		}
		$() {
			if (this.isBrowserSupported()) {
				if (N && J) {
					var n = (o) => {
						o = o || N?.event
						try {
							this.k(o)
						} catch (l) {
							nf.error('Failed to capture event', l)
						}
					}
					if (
						(Ae(J, 'submit', n, { capture: !0 }),
						Ae(J, 'change', n, { capture: !0 }),
						Ae(J, 'click', n, { capture: !0 }),
						this.S.capture_copied_text)
					) {
						var r = (o) => {
							;(o = o || N?.event), this.k(o, Wa)
						}
						Ae(J, 'copy', r, { capture: !0 }), Ae(J, 'cut', r, { capture: !0 })
					}
				}
			} else nf.info('Disabling Automatic Event Collection because this browser is not supported')
		}
		startIfEnabled() {
			this.isEnabled && !this.i && (this.$(), (this.i = !0))
		}
		onRemoteConfig(n) {
			n.elementsChainAsString && (this.h = n.elementsChainAsString),
				this.instance.persistence &&
					this.instance.persistence.register({ [Rd]: !!n.autocapture_opt_out }),
				(this.o = !!n.autocapture_opt_out),
				this.startIfEnabled()
		}
		setElementSelectors(n) {
			this.m = n
		}
		getElementSelectors(n) {
			var r,
				o = []
			return (
				(r = this.m) == null ||
					r.forEach((l) => {
						var u = J?.querySelectorAll(l)
						u?.forEach((d) => {
							n === d && o.push(l)
						})
					}),
				o
			)
		}
		get isEnabled() {
			var n,
				r,
				o = (n = this.instance.persistence) == null ? void 0 : n.props[Rd],
				l = this.o
			if (Rn(l) && !Jt(o) && !this.instance.config.advanced_disable_decide) return !1
			var u = (r = this.o) !== null && r !== void 0 ? r : !!o
			return !!this.instance.config.autocapture && !u
		}
		k(n, r) {
			if ((r === void 0 && (r = '$autocapture'), this.isEnabled)) {
				var o,
					l = Gd(n)
				Wd(l) && (l = l.parentNode || null),
					r === '$autocapture' &&
						n.type === 'click' &&
						n instanceof MouseEvent &&
						this.instance.config.rageclick &&
						(o = this.rageclicks) != null &&
						o.isRageClick(n.clientX, n.clientY, new Date().getTime()) &&
						this.k(n, '$rageclick')
				var u = r === Wa
				if (l && Vm(l, n, this.S, u, u ? ['copy', 'cut'] : void 0)) {
					var { props: d, explicitNoCapture: p } = n_(l, {
						e: n,
						maskAllElementAttributes: this.instance.config.mask_all_element_attributes,
						maskAllText: this.instance.config.mask_all_text,
						elementAttributeIgnoreList: this.S.element_attribute_ignorelist,
						elementsChainAsString: this.h,
					})
					if (p) return !1
					var h = this.getElementSelectors(l)
					if ((h && h.length > 0 && (d.$element_selectors = h), r === Wa)) {
						var g,
							m = qd(N == null || (g = N.getSelection()) == null ? void 0 : g.toString()),
							w = n.type || 'clipboard'
						if (!m) return !1
						;(d.$selected_content = m), (d.$copy_type = w)
					}
					return this.instance.capture(r, d), !0
				}
			}
		}
		isBrowserSupported() {
			return Ft(J?.querySelectorAll)
		}
	}
	Math.trunc ||
		(Math.trunc = function (i) {
			return i < 0 ? Math.ceil(i) : Math.floor(i)
		}),
		Number.isInteger ||
			(Number.isInteger = function (i) {
				return ot(i) && isFinite(i) && Math.floor(i) === i
			})
	var rf = '0123456789abcdef'
	class Gs {
		constructor(n) {
			if (((this.bytes = n), n.length !== 16)) throw new TypeError('not 128-bit length')
		}
		static fromFieldsV7(n, r, o, l) {
			if (
				!Number.isInteger(n) ||
				!Number.isInteger(r) ||
				!Number.isInteger(o) ||
				!Number.isInteger(l) ||
				n < 0 ||
				r < 0 ||
				o < 0 ||
				l < 0 ||
				n > 0xffffffffffff ||
				r > 4095 ||
				o > 1073741823 ||
				l > 4294967295
			)
				throw new RangeError('invalid field value')
			var u = new Uint8Array(16)
			return (
				(u[0] = n / Math.pow(2, 40)),
				(u[1] = n / Math.pow(2, 32)),
				(u[2] = n / Math.pow(2, 24)),
				(u[3] = n / Math.pow(2, 16)),
				(u[4] = n / Math.pow(2, 8)),
				(u[5] = n),
				(u[6] = 112 | (r >>> 8)),
				(u[7] = r),
				(u[8] = 128 | (o >>> 24)),
				(u[9] = o >>> 16),
				(u[10] = o >>> 8),
				(u[11] = o),
				(u[12] = l >>> 24),
				(u[13] = l >>> 16),
				(u[14] = l >>> 8),
				(u[15] = l),
				new Gs(u)
			)
		}
		toString() {
			for (var n = '', r = 0; r < this.bytes.length; r++)
				(n = n + rf.charAt(this.bytes[r] >>> 4) + rf.charAt(15 & this.bytes[r])),
					(r !== 3 && r !== 5 && r !== 7 && r !== 9) || (n += '-')
			if (n.length !== 36) throw new Error('Invalid UUIDv7 was generated')
			return n
		}
		clone() {
			return new Gs(this.bytes.slice(0))
		}
		equals(n) {
			return this.compareTo(n) === 0
		}
		compareTo(n) {
			for (var r = 0; r < 16; r++) {
				var o = this.bytes[r] - n.bytes[r]
				if (o !== 0) return Math.sign(o)
			}
			return 0
		}
	}
	class i_ {
		constructor() {
			;(this.I = 0), (this.P = 0), (this.R = new s_())
		}
		generate() {
			var n = this.generateOrAbort()
			if (K(n)) {
				this.I = 0
				var r = this.generateOrAbort()
				if (K(r)) throw new Error('Could not generate UUID after timestamp reset')
				return r
			}
			return n
		}
		generateOrAbort() {
			var n = Date.now()
			if (n > this.I) (this.I = n), this.T()
			else {
				if (!(n + 1e4 > this.I)) return
				this.P++, this.P > 4398046511103 && (this.I++, this.T())
			}
			return Gs.fromFieldsV7(
				this.I,
				Math.trunc(this.P / Math.pow(2, 30)),
				this.P & (Math.pow(2, 30) - 1),
				this.R.nextUint32()
			)
		}
		T() {
			this.P = 1024 * this.R.nextUint32() + (1023 & this.R.nextUint32())
		}
	}
	var sf,
		of = (i) => {
			if (typeof UUIDV7_DENY_WEAK_RNG < 'u' && UUIDV7_DENY_WEAK_RNG)
				throw new Error('no cryptographically strong RNG available')
			for (var n = 0; n < i.length; n++)
				i[n] = 65536 * Math.trunc(65536 * Math.random()) + Math.trunc(65536 * Math.random())
			return i
		}
	N && !K(N.crypto) && crypto.getRandomValues && (of = (i) => crypto.getRandomValues(i))
	class s_ {
		constructor() {
			;(this.M = new Uint32Array(8)), (this.C = 1 / 0)
		}
		nextUint32() {
			return this.C >= this.M.length && (of(this.M), (this.C = 0)), this.M[this.C++]
		}
	}
	var On = () => o_().toString(),
		o_ = () => (sf || (sf = new i_())).generate(),
		ki = '',
		a_ = /[a-z0-9][a-z0-9-]+\.[a-z]{2,}$/i
	function l_(i, n) {
		if (n) {
			var r = (function (l, u) {
				if ((u === void 0 && (u = J), ki)) return ki
				if (!u || ['localhost', '127.0.0.1'].includes(l)) return ''
				for (var d = l.split('.'), p = Math.min(d.length, 8), h = 'dmn_chk_' + On(); !ki && p--; ) {
					var g = d.slice(p).join('.'),
						m = h + '=1;domain=.' + g + ';path=/'
					;(u.cookie = m + ';max-age=3'),
						u.cookie.includes(h) && ((u.cookie = m + ';max-age=0'), (ki = g))
				}
				return ki
			})(i)
			if (!r) {
				var o = ((l) => {
					var u = l.match(a_)
					return u ? u[0] : ''
				})(i)
				o !== r && ie.info('Warning: cookie subdomain discovery mismatch', o, r), (r = o)
			}
			return r ? '; domain=.' + r : ''
		}
		return ''
	}
	var vn = {
			O: () => !!J,
			F: function (i) {
				ie.error('cookieStore error: ' + i)
			},
			A: function (i) {
				if (J) {
					try {
						for (
							var n = i + '=', r = J.cookie.split(';').filter((u) => u.length), o = 0;
							o < r.length;
							o++
						) {
							for (var l = r[o]; l.charAt(0) == ' '; ) l = l.substring(1, l.length)
							if (l.indexOf(n) === 0) return decodeURIComponent(l.substring(n.length, l.length))
						}
					} catch {}
					return null
				}
			},
			D: function (i) {
				var n
				try {
					n = JSON.parse(vn.A(i)) || {}
				} catch {}
				return n
			},
			L: function (i, n, r, o, l) {
				if (J)
					try {
						var u = '',
							d = '',
							p = l_(J.location.hostname, o)
						if (r) {
							var h = new Date()
							h.setTime(h.getTime() + 24 * r * 60 * 60 * 1e3), (u = '; expires=' + h.toUTCString())
						}
						l && (d = '; secure')
						var g =
							i + '=' + encodeURIComponent(JSON.stringify(n)) + u + '; SameSite=Lax; path=/' + p + d
						return (
							g.length > 3686.4 && ie.warn('cookieStore warning: large cookie, len=' + g.length),
							(J.cookie = g),
							g
						)
					} catch {
						return
					}
			},
			N: function (i, n) {
				try {
					vn.L(i, '', -1, n)
				} catch {
					return
				}
			},
		},
		ul = null,
		Ke = {
			O: function () {
				if (!Rn(ul)) return ul
				var i = !0
				if (K(N)) i = !1
				else
					try {
						var n = '__mplssupport__'
						Ke.L(n, 'xyz'), Ke.A(n) !== '"xyz"' && (i = !1), Ke.N(n)
					} catch {
						i = !1
					}
				return i || ie.error('localStorage unsupported; falling back to cookie store'), (ul = i), i
			},
			F: function (i) {
				ie.error('localStorage error: ' + i)
			},
			A: function (i) {
				try {
					return N?.localStorage.getItem(i)
				} catch (n) {
					Ke.F(n)
				}
				return null
			},
			D: function (i) {
				try {
					return JSON.parse(Ke.A(i)) || {}
				} catch {}
				return null
			},
			L: function (i, n) {
				try {
					N?.localStorage.setItem(i, JSON.stringify(n))
				} catch (r) {
					Ke.F(r)
				}
			},
			N: function (i) {
				try {
					N?.localStorage.removeItem(i)
				} catch (n) {
					Ke.F(n)
				}
			},
		},
		u_ = ['distinct_id', Ds, Si, Us, js],
		Qs = Z({}, Ke, {
			D: function (i) {
				try {
					var n = {}
					try {
						n = vn.D(i) || {}
					} catch {}
					var r = Ge(n, JSON.parse(Ke.A(i) || '{}'))
					return Ke.L(i, r), r
				} catch {}
				return null
			},
			L: function (i, n, r, o, l, u) {
				try {
					Ke.L(i, n, void 0, void 0, u)
					var d = {}
					u_.forEach((p) => {
						n[p] && (d[p] = n[p])
					}),
						Object.keys(d).length && vn.L(i, d, r, o, l, u)
				} catch (p) {
					Ke.F(p)
				}
			},
			N: function (i, n) {
				try {
					N?.localStorage.removeItem(i), vn.N(i, n)
				} catch (r) {
					Ke.F(r)
				}
			},
		}),
		Ks = {},
		c_ = {
			O: function () {
				return !0
			},
			F: function (i) {
				ie.error('memoryStorage error: ' + i)
			},
			A: function (i) {
				return Ks[i] || null
			},
			D: function (i) {
				return Ks[i] || null
			},
			L: function (i, n) {
				Ks[i] = n
			},
			N: function (i) {
				delete Ks[i]
			},
		},
		ir = null,
		rt = {
			O: function () {
				if (!Rn(ir)) return ir
				if (((ir = !0), K(N))) ir = !1
				else
					try {
						var i = '__support__'
						rt.L(i, 'xyz'), rt.A(i) !== '"xyz"' && (ir = !1), rt.N(i)
					} catch {
						ir = !1
					}
				return ir
			},
			F: function (i) {
				ie.error('sessionStorage error: ', i)
			},
			A: function (i) {
				try {
					return N?.sessionStorage.getItem(i)
				} catch (n) {
					rt.F(n)
				}
				return null
			},
			D: function (i) {
				try {
					return JSON.parse(rt.A(i)) || null
				} catch {}
				return null
			},
			L: function (i, n) {
				try {
					N?.sessionStorage.setItem(i, JSON.stringify(n))
				} catch (r) {
					rt.F(r)
				}
			},
			N: function (i) {
				try {
					N?.sessionStorage.removeItem(i)
				} catch (n) {
					rt.F(n)
				}
			},
		},
		Or = (function (i) {
			return (
				(i[(i.PENDING = -1)] = 'PENDING'),
				(i[(i.DENIED = 0)] = 'DENIED'),
				(i[(i.GRANTED = 1)] = 'GRANTED'),
				i
			)
		})({})
	class d_ {
		constructor(n) {
			this._instance = n
		}
		get S() {
			return this._instance.config
		}
		get consent() {
			return this.j() ? Or.DENIED : this.U
		}
		isOptedOut() {
			return (
				this.consent === Or.DENIED ||
				(this.consent === Or.PENDING && this.S.opt_out_capturing_by_default)
			)
		}
		isOptedIn() {
			return !this.isOptedOut()
		}
		optInOut(n) {
			this.q.L(
				this.B,
				n ? 1 : 0,
				this.S.cookie_expiration,
				this.S.cross_subdomain_cookie,
				this.S.secure_cookie
			)
		}
		reset() {
			this.q.N(this.B, this.S.cross_subdomain_cookie)
		}
		get B() {
			var { token: n, opt_out_capturing_cookie_prefix: r } = this._instance.config
			return (r || '__ph_opt_in_out_') + n
		}
		get U() {
			var n = this.q.A(this.B)
			return n === '1' ? Or.GRANTED : n === '0' ? Or.DENIED : Or.PENDING
		}
		get q() {
			if (!this.H) {
				var n = this.S.opt_out_capturing_persistence_type
				this.H = n === 'localStorage' ? Ke : vn
				var r = n === 'localStorage' ? vn : Ke
				r.A(this.B) &&
					(this.H.A(this.B) || this.optInOut(r.A(this.B) === '1'),
					r.N(this.B, this.S.cross_subdomain_cookie))
			}
			return this.H
		}
		j() {
			return (
				!!this.S.respect_dnt &&
				!!Pd([Rt?.doNotTrack, Rt?.msDoNotTrack, me.doNotTrack], (n) => ye([!0, 1, '1', 'yes'], n))
			)
		}
	}
	var Xs = nt('[Dead Clicks]'),
		f_ = () => !0,
		p_ = (i) => {
			var n,
				r = !((n = i.instance.persistence) == null || !n.get_property(Od)),
				o = i.instance.config.capture_dead_clicks
			return Jt(o) ? o : r
		}
	class af {
		get lazyLoadedDeadClicksAutocapture() {
			return this.W
		}
		constructor(n, r, o) {
			;(this.instance = n), (this.isEnabled = r), (this.onCapture = o), this.startIfEnabled()
		}
		onRemoteConfig(n) {
			this.instance.persistence &&
				this.instance.persistence.register({ [Od]: n?.captureDeadClicks }),
				this.startIfEnabled()
		}
		startIfEnabled() {
			this.isEnabled(this) &&
				this.G(() => {
					this.J()
				})
		}
		G(n) {
			var r, o
			;(r = me.__PosthogExtensions__) != null && r.initDeadClicksAutocapture && n(),
				(o = me.__PosthogExtensions__) == null ||
					o.loadExternalDependency == null ||
					o.loadExternalDependency(this.instance, 'dead-clicks-autocapture', (l) => {
						l ? Xs.error('failed to load script', l) : n()
					})
		}
		J() {
			var n
			if (J) {
				if (!this.W && (n = me.__PosthogExtensions__) != null && n.initDeadClicksAutocapture) {
					var r = je(this.instance.config.capture_dead_clicks)
						? this.instance.config.capture_dead_clicks
						: {}
					;(r.__onCapture = this.onCapture),
						(this.W = me.__PosthogExtensions__.initDeadClicksAutocapture(this.instance, r)),
						this.W.start(J),
						Xs.info('starting...')
				}
			} else Xs.error('`document` not found. Cannot start.')
		}
		stop() {
			this.W && (this.W.stop(), (this.W = void 0), Xs.info('stopping...'))
		}
	}
	var cl = nt('[ExceptionAutocapture]')
	class h_ {
		constructor(n) {
			var r
			;(this.V = () => {
				var o
				if (
					N &&
					this.isEnabled &&
					(o = me.__PosthogExtensions__) != null &&
					o.errorWrappingFunctions
				) {
					var l = me.__PosthogExtensions__.errorWrappingFunctions.wrapOnError,
						u = me.__PosthogExtensions__.errorWrappingFunctions.wrapUnhandledRejection,
						d = me.__PosthogExtensions__.errorWrappingFunctions.wrapConsoleError
					try {
						!this.K &&
							this.S.capture_unhandled_errors &&
							(this.K = l(this.captureException.bind(this))),
							!this.Y &&
								this.S.capture_unhandled_rejections &&
								(this.Y = u(this.captureException.bind(this))),
							!this.X &&
								this.S.capture_console_errors &&
								(this.X = d(this.captureException.bind(this)))
					} catch (p) {
						cl.error('failed to start', p), this.Z()
					}
				}
			}),
				(this._instance = n),
				(this.tt = !((r = this._instance.persistence) == null || !r.props[Id])),
				(this.S = this.it()),
				this.startIfEnabled()
		}
		it() {
			var n = this._instance.config.capture_exceptions,
				r = {
					capture_unhandled_errors: !1,
					capture_unhandled_rejections: !1,
					capture_console_errors: !1,
				}
			return (
				je(n)
					? (r = Z({}, r, n))
					: (K(n) ? this.tt : n) &&
						(r = Z({}, r, { capture_unhandled_errors: !0, capture_unhandled_rejections: !0 })),
				r
			)
		}
		get isEnabled() {
			return (
				this.S.capture_console_errors ||
				this.S.capture_unhandled_errors ||
				this.S.capture_unhandled_rejections
			)
		}
		startIfEnabled() {
			this.isEnabled && (cl.info('enabled'), this.G(this.V))
		}
		G(n) {
			var r, o
			;(r = me.__PosthogExtensions__) != null && r.errorWrappingFunctions && n(),
				(o = me.__PosthogExtensions__) == null ||
					o.loadExternalDependency == null ||
					o.loadExternalDependency(this._instance, 'exception-autocapture', (l) => {
						if (l) return cl.error('failed to load script', l)
						n()
					})
		}
		Z() {
			var n, r, o
			;(n = this.K) == null || n.call(this),
				(this.K = void 0),
				(r = this.Y) == null || r.call(this),
				(this.Y = void 0),
				(o = this.X) == null || o.call(this),
				(this.X = void 0)
		}
		onRemoteConfig(n) {
			var r = n.autocaptureExceptions
			;(this.tt = !!r || !1),
				(this.S = this.it()),
				this._instance.persistence && this._instance.persistence.register({ [Id]: this.tt }),
				this.startIfEnabled()
		}
		captureException(n) {
			var r = this._instance.requestRouter.endpointFor('ui')
			;(n.$exception_personURL =
				r +
				'/project/' +
				this._instance.config.token +
				'/person/' +
				this._instance.get_distinct_id()),
				this._instance.exceptions.sendExceptionEvent(n)
		}
	}
	function lf(i) {
		return !K(Event) && uf(i, Event)
	}
	function uf(i, n) {
		try {
			return i instanceof n
		} catch {
			return !1
		}
	}
	function cf(i) {
		switch (Object.prototype.toString.call(i)) {
			case '[object Error]':
			case '[object Exception]':
			case '[object DOMException]':
			case '[object DOMError]':
				return !0
			default:
				return uf(i, Error)
		}
	}
	function Ys(i, n) {
		return Object.prototype.toString.call(i) === '[object ' + n + ']'
	}
	function dl(i) {
		return Ys(i, 'DOMError')
	}
	var df = /\(error: (.*)\)/,
		ff = 50,
		Nr = '?'
	function fl(i, n, r, o) {
		var l = {
			platform: 'web:javascript',
			filename: i,
			function: n === '<anonymous>' ? Nr : n,
			in_app: !0,
		}
		return K(r) || (l.lineno = r), K(o) || (l.colno = o), l
	}
	var v_ = /^\s*at (\S+?)(?::(\d+))(?::(\d+))\s*$/i,
		g_ =
			/^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?:address at )?)?(?:async )?((?:<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i,
		m_ = /\((\S*)(?::(\d+))(?::(\d+))\)/,
		__ =
			/^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:[-a-z]+)?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i,
		y_ = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i,
		w_ = (function () {
			for (var i = arguments.length, n = new Array(i), r = 0; r < i; r++) n[r] = arguments[r]
			var o = n.sort((l, u) => l[0] - u[0]).map((l) => l[1])
			return function (l, u) {
				u === void 0 && (u = 0)
				for (
					var d = [],
						p = l.split(`
`),
						h = u;
					h < p.length;
					h++
				) {
					var g = p[h]
					if (!(g.length > 1024)) {
						var m = df.test(g) ? g.replace(df, '$1') : g
						if (!m.match(/\S*Error: /)) {
							for (var w of o) {
								var _ = w(m)
								if (_) {
									d.push(_)
									break
								}
							}
							if (d.length >= ff) break
						}
					}
				}
				return (function (S) {
					if (!S.length) return []
					var M = Array.from(S)
					return (
						M.reverse(),
						M.slice(0, ff).map((k) =>
							Z({}, k, { filename: k.filename || S_(M).filename, function: k.function || Nr })
						)
					)
				})(d)
			}
		})(
			[
				30,
				(i) => {
					var n = v_.exec(i)
					if (n) {
						var [, r, o, l] = n
						return fl(r, Nr, +o, +l)
					}
					var u = g_.exec(i)
					if (u) {
						if (u[2] && u[2].indexOf('eval') === 0) {
							var d = m_.exec(u[2])
							d && ((u[2] = d[1]), (u[3] = d[2]), (u[4] = d[3]))
						}
						var [p, h] = hf(u[1] || Nr, u[2])
						return fl(h, p, u[3] ? +u[3] : void 0, u[4] ? +u[4] : void 0)
					}
				},
			],
			[
				50,
				(i) => {
					var n = __.exec(i)
					if (n) {
						if (n[3] && n[3].indexOf(' > eval') > -1) {
							var r = y_.exec(n[3])
							r && ((n[1] = n[1] || 'eval'), (n[3] = r[1]), (n[4] = r[2]), (n[5] = ''))
						}
						var o = n[3],
							l = n[1] || Nr
						return ([l, o] = hf(l, o)), fl(o, l, n[4] ? +n[4] : void 0, n[5] ? +n[5] : void 0)
					}
				},
			]
		)
	function S_(i) {
		return i[i.length - 1] || {}
	}
	var Zs,
		pf,
		pl,
		hf = (i, n) => {
			var r = i.indexOf('safari-extension') !== -1,
				o = i.indexOf('safari-web-extension') !== -1
			return r || o
				? [
						i.indexOf('@') !== -1 ? i.split('@')[0] : Nr,
						r ? 'safari-extension:' + n : 'safari-web-extension:' + n,
					]
				: [i, n]
		},
		E_ =
			/^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?(.*)$/i
	function hl(i, n) {
		n === void 0 && (n = 0)
		var r = i.stacktrace || i.stack || '',
			o = (function (d) {
				return d && k_.test(d.message) ? 1 : 0
			})(i)
		try {
			var l = w_,
				u = (function (d, p) {
					var h = (function (g) {
						var m = globalThis._posthogChunkIds
						if (!m) return {}
						var w = Object.keys(m)
						return (
							(pl && w.length === pf) ||
								((pf = w.length),
								(pl = w.reduce((_, S) => {
									Zs || (Zs = {})
									var M = Zs[S]
									if (M) _[M[0]] = M[1]
									else
										for (var k = g(S), F = k.length - 1; F >= 0; F--) {
											var j = k[F],
												q = j?.filename,
												G = m[S]
											if (q && G) {
												;(_[q] = G), (Zs[S] = [q, G])
												break
											}
										}
									return _
								}, {}))),
							pl
						)
					})(p)
					return (
						d.forEach((g) => {
							g.filename && (g.chunk_id = h[g.filename])
						}),
						d
					)
				})(l(r, o), l)
			return u.slice(0, u.length - n)
		} catch {}
		return []
	}
	var k_ = /Minified React error #\d+;/i
	function x_(i, n) {
		var r,
			o,
			l = hl(i),
			u = (r = n?.handled) === null || r === void 0 || r,
			d = (o = n?.synthetic) !== null && o !== void 0 && o
		return {
			type: n != null && n.overrideExceptionType ? n.overrideExceptionType : i.name,
			value: (function (p) {
				var h = p.message
				return h.error && typeof h.error.message == 'string' ? String(h.error.message) : String(h)
			})(i),
			stacktrace: { frames: l, type: 'raw' },
			mechanism: { handled: u, synthetic: d },
		}
	}
	function vf(i, n) {
		var r = x_(i, n)
		return i.cause && cf(i.cause) && i.cause !== i
			? [r, ...vf(i.cause, { handled: n?.handled, synthetic: n?.synthetic })]
			: [r]
	}
	function vl(i, n) {
		return { $exception_list: vf(i, n), $exception_level: 'error' }
	}
	function gl(i, n) {
		var r,
			o,
			l,
			u = (r = n?.handled) === null || r === void 0 || r,
			d = (o = n?.synthetic) === null || o === void 0 || o,
			p = {
				type:
					n != null && n.overrideExceptionType
						? n.overrideExceptionType
						: (l = n?.defaultExceptionType) !== null && l !== void 0
							? l
							: 'Error',
				value: i || n?.defaultExceptionMessage,
				mechanism: { handled: u, synthetic: d },
			}
		if (n != null && n.syntheticException) {
			var h = hl(n.syntheticException, 1)
			h.length && (p.stacktrace = { frames: h, type: 'raw' })
		}
		return { $exception_list: [p], $exception_level: 'error' }
	}
	function C_(i) {
		return Ue(i) && !Va(i) && Lm.indexOf(i) >= 0
	}
	function P_(i, n) {
		var r,
			o,
			l = (r = n?.handled) === null || r === void 0 || r,
			u = (o = n?.synthetic) === null || o === void 0 || o,
			d =
				n != null && n.overrideExceptionType
					? n.overrideExceptionType
					: lf(i)
						? i.constructor.name
						: 'Error',
			p =
				"Non-Error 'exception' captured with keys: " +
				(function (m, w) {
					w === void 0 && (w = 40)
					var _ = Object.keys(m)
					if ((_.sort(), !_.length)) return '[object has no keys]'
					for (var S = _.length; S > 0; S--) {
						var M = _.slice(0, S).join(', ')
						if (!(M.length > w)) return S === _.length || M.length <= w ? M : M.slice(0, w) + '...'
					}
					return ''
				})(i),
			h = { type: d, value: p, mechanism: { handled: l, synthetic: u } }
		if (n != null && n.syntheticException) {
			var g = hl(n?.syntheticException, 1)
			g.length && (h.stacktrace = { frames: g, type: 'raw' })
		}
		return { $exception_list: [h], $exception_level: C_(i.level) ? i.level : 'error' }
	}
	function b_(i, n) {
		var { error: r, event: o } = i,
			l = { $exception_list: [] },
			u = r || o
		if (
			dl(u) ||
			(function (_) {
				return Ys(_, 'DOMException')
			})(u)
		) {
			var d = u
			if (
				(function (_) {
					return 'stack' in _
				})(u)
			)
				l = vl(u, n)
			else {
				var p = d.name || (dl(d) ? 'DOMError' : 'DOMException'),
					h = d.message ? p + ': ' + d.message : p
				l = gl(
					h,
					Z({}, n, {
						overrideExceptionType: dl(d) ? 'DOMError' : 'DOMException',
						defaultExceptionMessage: h,
					})
				)
			}
			return 'code' in d && (l.$exception_DOMException_code = '' + d.code), l
		}
		if (
			(function (_) {
				return Ys(_, 'ErrorEvent')
			})(u) &&
			u.error
		)
			return vl(u.error, n)
		if (cf(u)) return vl(u, n)
		if (
			(function (_) {
				return Ys(_, 'Object')
			})(u) ||
			lf(u)
		)
			return P_(u, n)
		if (K(r) && Ue(o)) {
			var g = 'Error',
				m = o,
				w = o.match(E_)
			return (
				w && ((g = w[1]), (m = w[2])),
				gl(m, Z({}, n, { overrideExceptionType: g, defaultExceptionMessage: m }))
			)
		}
		return gl(u, n)
	}
	function gf(i, n, r) {
		try {
			if (!(n in i)) return () => {}
			var o = i[n],
				l = r(o)
			return (
				Ft(l) &&
					((l.prototype = l.prototype || {}),
					Object.defineProperties(l, { __posthog_wrapped__: { enumerable: !1, value: !0 } })),
				(i[n] = l),
				() => {
					i[n] = o
				}
			)
		} catch {
			return () => {}
		}
	}
	class R_ {
		constructor(n) {
			var r
			;(this._instance = n),
				(this.et = (N == null || (r = N.location) == null ? void 0 : r.pathname) || '')
		}
		get isEnabled() {
			return this._instance.config.capture_pageview === 'history_change'
		}
		startIfEnabled() {
			this.isEnabled &&
				(ie.info('History API monitoring enabled, starting...'), this.monitorHistoryChanges())
		}
		stop() {
			this.rt && this.rt(), (this.rt = void 0), ie.info('History API monitoring stopped')
		}
		monitorHistoryChanges() {
			var n, r
			if (N && N.history) {
				var o = this
				;((n = N.history.pushState) != null && n.__posthog_wrapped__) ||
					gf(
						N.history,
						'pushState',
						(l) =>
							function (u, d, p) {
								l.call(this, u, d, p), o.st('pushState')
							}
					),
					((r = N.history.replaceState) != null && r.__posthog_wrapped__) ||
						gf(
							N.history,
							'replaceState',
							(l) =>
								function (u, d, p) {
									l.call(this, u, d, p), o.st('replaceState')
								}
						),
					this.nt()
			}
		}
		st(n) {
			try {
				var r,
					o = N == null || (r = N.location) == null ? void 0 : r.pathname
				if (!o) return
				o !== this.et &&
					this.isEnabled &&
					this._instance.capture('$pageview', { navigation_type: n }),
					(this.et = o)
			} catch (l) {
				ie.error('Error capturing ' + n + ' pageview', l)
			}
		}
		nt() {
			if (!this.rt) {
				var n = () => {
					this.st('popstate')
				}
				Ae(N, 'popstate', n),
					(this.rt = () => {
						N && N.removeEventListener('popstate', n)
					})
			}
		}
	}
	function Js(i) {
		var n, r
		return (
			((n = JSON.stringify(
				i,
				((r = []),
				function (o, l) {
					if (je(l)) {
						for (; r.length > 0 && r[r.length - 1] !== this; ) r.pop()
						return r.includes(l) ? '[Circular]' : (r.push(l), l)
					}
					return l
				})
			)) == null
				? void 0
				: n.length) || 0
		)
	}
	function ml(i, n) {
		if ((n === void 0 && (n = 66060288e-1), i.size >= n && i.data.length > 1)) {
			var r = Math.floor(i.data.length / 2),
				o = i.data.slice(0, r),
				l = i.data.slice(r)
			return [
				ml({ size: Js(o), data: o, sessionId: i.sessionId, windowId: i.windowId }),
				ml({ size: Js(l), data: l, sessionId: i.sessionId, windowId: i.windowId }),
			].flatMap((u) => u)
		}
		return [i]
	}
	var gn = ((i) => (
			(i[(i.DomContentLoaded = 0)] = 'DomContentLoaded'),
			(i[(i.Load = 1)] = 'Load'),
			(i[(i.FullSnapshot = 2)] = 'FullSnapshot'),
			(i[(i.IncrementalSnapshot = 3)] = 'IncrementalSnapshot'),
			(i[(i.Meta = 4)] = 'Meta'),
			(i[(i.Custom = 5)] = 'Custom'),
			(i[(i.Plugin = 6)] = 'Plugin'),
			i
		))(gn || {}),
		Wt = ((i) => (
			(i[(i.Mutation = 0)] = 'Mutation'),
			(i[(i.MouseMove = 1)] = 'MouseMove'),
			(i[(i.MouseInteraction = 2)] = 'MouseInteraction'),
			(i[(i.Scroll = 3)] = 'Scroll'),
			(i[(i.ViewportResize = 4)] = 'ViewportResize'),
			(i[(i.Input = 5)] = 'Input'),
			(i[(i.TouchMove = 6)] = 'TouchMove'),
			(i[(i.MediaInteraction = 7)] = 'MediaInteraction'),
			(i[(i.StyleSheetRule = 8)] = 'StyleSheetRule'),
			(i[(i.CanvasMutation = 9)] = 'CanvasMutation'),
			(i[(i.Font = 10)] = 'Font'),
			(i[(i.Log = 11)] = 'Log'),
			(i[(i.Drag = 12)] = 'Drag'),
			(i[(i.StyleDeclaration = 13)] = 'StyleDeclaration'),
			(i[(i.Selection = 14)] = 'Selection'),
			(i[(i.AdoptedStyleSheet = 15)] = 'AdoptedStyleSheet'),
			(i[(i.CustomElement = 16)] = 'CustomElement'),
			i
		))(Wt || {}),
		_l = '[SessionRecording]',
		yl = 'redacted',
		eo = {
			initiatorTypes: [
				'audio',
				'beacon',
				'body',
				'css',
				'early-hint',
				'embed',
				'fetch',
				'frame',
				'iframe',
				'icon',
				'image',
				'img',
				'input',
				'link',
				'navigation',
				'object',
				'ping',
				'script',
				'track',
				'video',
				'xmlhttprequest',
			],
			maskRequestFn: (i) => i,
			recordHeaders: !1,
			recordBody: !1,
			recordInitialRequests: !1,
			recordPerformance: !1,
			performanceEntryTypeToObserve: ['first-input', 'navigation', 'paint', 'resource'],
			payloadSizeLimitBytes: 1e6,
			payloadHostDenyList: [
				'.lr-ingest.io',
				'.ingest.sentry.io',
				'.clarity.ms',
				'analytics.google.com',
				'bam.nr-data.net',
			],
		},
		I_ = [
			'authorization',
			'x-forwarded-for',
			'authorization',
			'cookie',
			'set-cookie',
			'x-api-key',
			'x-real-ip',
			'remote-addr',
			'forwarded',
			'proxy-authorization',
			'x-csrf-token',
			'x-csrftoken',
			'x-xsrf-token',
		],
		T_ = [
			'password',
			'secret',
			'passwd',
			'api_key',
			'apikey',
			'auth',
			'credentials',
			'mysql_pwd',
			'privatekey',
			'private_key',
			'token',
		],
		O_ = ['/s/', '/e/', '/i/']
	function mf(i, n, r, o) {
		if (xe(i)) return i
		var l =
			n?.['content-length'] ||
			(function (u) {
				return new Blob([u]).size
			})(i)
		return (
			Ue(l) && (l = parseInt(l)),
			l > r ? _l + ' ' + o + ' body too large to record (' + l + ' bytes)' : i
		)
	}
	function _f(i, n) {
		if (xe(i)) return i
		var r = i
		return (
			Ir(r, !1) || (r = _l + ' ' + n + ' body ' + yl),
			be(T_, (o) => {
				var l, u
				;(l = r) != null &&
					l.length &&
					((u = r) == null ? void 0 : u.indexOf(o)) !== -1 &&
					(r = _l + ' ' + n + ' body ' + yl + ' as might contain: ' + o)
			}),
			r
		)
	}
	var N_ = (i, n) => {
		var r,
			o,
			l,
			u = {
				payloadSizeLimitBytes: eo.payloadSizeLimitBytes,
				performanceEntryTypeToObserve: [...eo.performanceEntryTypeToObserve],
				payloadHostDenyList: [...(n.payloadHostDenyList || []), ...eo.payloadHostDenyList],
			},
			d = i.session_recording.recordHeaders !== !1 && n.recordHeaders,
			p = i.session_recording.recordBody !== !1 && n.recordBody,
			h = i.capture_performance !== !1 && n.recordPerformance,
			g =
				((r = u),
				(l = Math.min(1e6, (o = r.payloadSizeLimitBytes) !== null && o !== void 0 ? o : 1e6)),
				(_) => (
					_ != null &&
						_.requestBody &&
						(_.requestBody = mf(_.requestBody, _.requestHeaders, l, 'Request')),
					_ != null &&
						_.responseBody &&
						(_.responseBody = mf(_.responseBody, _.responseHeaders, l, 'Response')),
					_
				)),
			m = (_) => {
				return g(
					((k, F) => {
						var j,
							q = Tr(k.name),
							G = F.indexOf('http') === 0 ? ((j = Tr(F)) == null ? void 0 : j.pathname) : F
						G === '/' && (G = '')
						var Q = q?.pathname.replace(G || '', '')
						if (!(q && Q && O_.some((ue) => Q.indexOf(ue) === 0))) return k
					})(
						((M = (S = _).requestHeaders),
						xe(M) ||
							be(Object.keys(M ?? {}), (k) => {
								I_.includes(k.toLowerCase()) && (M[k] = yl)
							}),
						S),
						i.api_host
					)
				)
				var S, M
			},
			w = Ft(i.session_recording.maskNetworkRequestFn)
		return (
			w &&
				Ft(i.session_recording.maskCapturedNetworkRequestFn) &&
				ie.warn(
					'Both `maskNetworkRequestFn` and `maskCapturedNetworkRequestFn` are defined. `maskNetworkRequestFn` will be ignored.'
				),
			w &&
				(i.session_recording.maskCapturedNetworkRequestFn = (_) => {
					var S = i.session_recording.maskNetworkRequestFn({ url: _.name })
					return Z({}, _, { name: S?.url })
				}),
			(u.maskRequestFn = Ft(i.session_recording.maskCapturedNetworkRequestFn)
				? (_) => {
						var S,
							M = m(_)
						return M &&
							(S =
								i.session_recording.maskCapturedNetworkRequestFn == null
									? void 0
									: i.session_recording.maskCapturedNetworkRequestFn(M)) !== null &&
							S !== void 0
							? S
							: void 0
					}
				: (_) =>
						(function (S) {
							if (!K(S))
								return (
									(S.requestBody = _f(S.requestBody, 'Request')),
									(S.responseBody = _f(S.responseBody, 'Response')),
									S
								)
						})(m(_))),
			Z({}, eo, u, {
				recordHeaders: d,
				recordBody: p,
				recordPerformance: h,
				recordInitialRequests: h,
			})
		)
	}
	function Mt(i, n, r, o, l) {
		return (
			n > r && (ie.warn('min cannot be greater than max.'), (n = r)),
			ot(i)
				? i > r
					? (o && ie.warn(o + ' cannot be  greater than max: ' + r + '. Using max value instead.'),
						r)
					: i < n
						? (o && ie.warn(o + ' cannot be less than min: ' + n + '. Using min value instead.'), n)
						: i
				: (o &&
						ie.warn(o + ' must be a number. using max or fallback. max: ' + r + ', fallback: ' + l),
					Mt(l || r, n, r, o))
		)
	}
	class F_ {
		constructor(n, r) {
			var o, l
			r === void 0 && (r = {}),
				(this.ot = 100),
				(this.lt = 10),
				(this.ut = {}),
				(this.ht = {}),
				(this.dt = () => {
					Object.keys(this.ut).forEach((u) => {
						;(this.ut[u] = this.ut[u] + this.lt), this.ut[u] >= this.ot && delete this.ut[u]
					})
				}),
				(this.vt = (u) => {
					var d = this._rrweb.mirror.getNode(u)
					if (d?.nodeName !== 'svg' && d instanceof Element) {
						var p = d.closest('svg')
						if (p) return [this._rrweb.mirror.getId(p), p]
					}
					return [u, d]
				}),
				(this.ct = (u) => {
					var d, p, h, g, m, w, _, S
					return (
						((d = (p = u.removes) == null ? void 0 : p.length) !== null && d !== void 0 ? d : 0) +
						((h = (g = u.attributes) == null ? void 0 : g.length) !== null && h !== void 0
							? h
							: 0) +
						((m = (w = u.texts) == null ? void 0 : w.length) !== null && m !== void 0 ? m : 0) +
						((_ = (S = u.adds) == null ? void 0 : S.length) !== null && _ !== void 0 ? _ : 0)
					)
				}),
				(this.throttleMutations = (u) => {
					if (u.type !== 3 || u.data.source !== 0) return u
					var d = u.data,
						p = this.ct(d)
					d.attributes &&
						(d.attributes = d.attributes.filter((g) => {
							var m,
								w,
								_,
								[S, M] = this.vt(g.id)
							return this.ut[S] === 0
								? !1
								: ((this.ut[S] = (m = this.ut[S]) !== null && m !== void 0 ? m : this.ot),
									(this.ut[S] = Math.max(this.ut[S] - 1, 0)),
									this.ut[S] === 0 &&
										(this.ht[S] ||
											((this.ht[S] = !0),
											(w = (_ = this.ft).onBlockedNode) == null || w.call(_, S, M))),
									g)
						}))
					var h = this.ct(d)
					return h !== 0 || p === h ? u : void 0
				}),
				(this._rrweb = n),
				(this.ft = r),
				(this.lt = Mt(
					(o = this.ft.refillRate) !== null && o !== void 0 ? o : this.lt,
					0,
					100,
					'mutation throttling refill rate'
				)),
				(this.ot = Mt(
					(l = this.ft.bucketSize) !== null && l !== void 0 ? l : this.ot,
					0,
					100,
					'mutation throttling bucket size'
				)),
				setInterval(() => {
					this.dt()
				}, 1e3)
		}
	}
	var Lt = Uint8Array,
		St = Uint16Array,
		Fr = Uint32Array,
		wl = new Lt([
			0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0,
			0,
		]),
		Sl = new Lt([
			0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13,
			13, 0, 0,
		]),
		yf = new Lt([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]),
		wf = function (i, n) {
			for (var r = new St(31), o = 0; o < 31; ++o) r[o] = n += 1 << i[o - 1]
			var l = new Fr(r[30])
			for (o = 1; o < 30; ++o) for (var u = r[o]; u < r[o + 1]; ++u) l[u] = ((u - r[o]) << 5) | o
			return [r, l]
		},
		Sf = wf(wl, 2),
		M_ = Sf[0],
		El = Sf[1]
	;(M_[28] = 258), (El[258] = 28)
	for (var Ef = wf(Sl, 0)[1], kf = new St(32768), Oe = 0; Oe < 32768; ++Oe) {
		var sr = ((43690 & Oe) >>> 1) | ((21845 & Oe) << 1)
		;(sr =
			((61680 & (sr = ((52428 & sr) >>> 2) | ((13107 & sr) << 2))) >>> 4) | ((3855 & sr) << 4)),
			(kf[Oe] = (((65280 & sr) >>> 8) | ((255 & sr) << 8)) >>> 1)
	}
	var xi = function (i, n, r) {
			for (var o = i.length, l = 0, u = new St(n); l < o; ++l) ++u[i[l] - 1]
			var d,
				p = new St(n)
			for (l = 0; l < n; ++l) p[l] = (p[l - 1] + u[l - 1]) << 1
			for (d = new St(o), l = 0; l < o; ++l) d[l] = kf[p[i[l] - 1]++] >>> (15 - i[l])
			return d
		},
		or = new Lt(288)
	for (Oe = 0; Oe < 144; ++Oe) or[Oe] = 8
	for (Oe = 144; Oe < 256; ++Oe) or[Oe] = 9
	for (Oe = 256; Oe < 280; ++Oe) or[Oe] = 7
	for (Oe = 280; Oe < 288; ++Oe) or[Oe] = 8
	var to = new Lt(32)
	for (Oe = 0; Oe < 32; ++Oe) to[Oe] = 5
	var L_ = xi(or, 9),
		D_ = xi(to, 5),
		xf = function (i) {
			return ((i / 8) >> 0) + (7 & i && 1)
		},
		Cf = function (i, n, r) {
			;(r == null || r > i.length) && (r = i.length)
			var o = new (i instanceof St ? St : i instanceof Fr ? Fr : Lt)(r - n)
			return o.set(i.subarray(n, r)), o
		},
		mn = function (i, n, r) {
			r <<= 7 & n
			var o = (n / 8) >> 0
			;(i[o] |= r), (i[o + 1] |= r >>> 8)
		},
		Ci = function (i, n, r) {
			r <<= 7 & n
			var o = (n / 8) >> 0
			;(i[o] |= r), (i[o + 1] |= r >>> 8), (i[o + 2] |= r >>> 16)
		},
		kl = function (i, n) {
			for (var r = [], o = 0; o < i.length; ++o) i[o] && r.push({ s: o, f: i[o] })
			var l = r.length,
				u = r.slice()
			if (!l) return [new Lt(0), 0]
			if (l == 1) {
				var d = new Lt(r[0].s + 1)
				return (d[r[0].s] = 1), [d, 1]
			}
			r.sort(function (ue, ve) {
				return ue.f - ve.f
			}),
				r.push({ s: -1, f: 25001 })
			var p = r[0],
				h = r[1],
				g = 0,
				m = 1,
				w = 2
			for (r[0] = { s: -1, f: p.f + h.f, l: p, r: h }; m != l - 1; )
				(p = r[r[g].f < r[w].f ? g++ : w++]),
					(h = r[g != m && r[g].f < r[w].f ? g++ : w++]),
					(r[m++] = { s: -1, f: p.f + h.f, l: p, r: h })
			var _ = u[0].s
			for (o = 1; o < l; ++o) u[o].s > _ && (_ = u[o].s)
			var S = new St(_ + 1),
				M = xl(r[m - 1], S, 0)
			if (M > n) {
				o = 0
				var k = 0,
					F = M - n,
					j = 1 << F
				for (
					u.sort(function (ue, ve) {
						return S[ve.s] - S[ue.s] || ue.f - ve.f
					});
					o < l;
					++o
				) {
					var q = u[o].s
					if (!(S[q] > n)) break
					;(k += j - (1 << (M - S[q]))), (S[q] = n)
				}
				for (k >>>= F; k > 0; ) {
					var G = u[o].s
					S[G] < n ? (k -= 1 << (n - S[G]++ - 1)) : ++o
				}
				for (; o >= 0 && k; --o) {
					var Q = u[o].s
					S[Q] == n && (--S[Q], ++k)
				}
				M = n
			}
			return [new Lt(S), M]
		},
		xl = function (i, n, r) {
			return i.s == -1 ? Math.max(xl(i.l, n, r + 1), xl(i.r, n, r + 1)) : (n[i.s] = r)
		},
		Pf = function (i) {
			for (var n = i.length; n && !i[--n]; );
			for (
				var r = new St(++n),
					o = 0,
					l = i[0],
					u = 1,
					d = function (h) {
						r[o++] = h
					},
					p = 1;
				p <= n;
				++p
			)
				if (i[p] == l && p != n) ++u
				else {
					if (!l && u > 2) {
						for (; u > 138; u -= 138) d(32754)
						u > 2 && (d(u > 10 ? ((u - 11) << 5) | 28690 : ((u - 3) << 5) | 12305), (u = 0))
					} else if (u > 3) {
						for (d(l), --u; u > 6; u -= 6) d(8304)
						u > 2 && (d(((u - 3) << 5) | 8208), (u = 0))
					}
					for (; u--; ) d(l)
					;(u = 1), (l = i[p])
				}
			return [r.subarray(0, o), n]
		},
		Pi = function (i, n) {
			for (var r = 0, o = 0; o < n.length; ++o) r += i[o] * n[o]
			return r
		},
		Cl = function (i, n, r) {
			var o = r.length,
				l = xf(n + 2)
			;(i[l] = 255 & o), (i[l + 1] = o >>> 8), (i[l + 2] = 255 ^ i[l]), (i[l + 3] = 255 ^ i[l + 1])
			for (var u = 0; u < o; ++u) i[l + u + 4] = r[u]
			return 8 * (l + 4 + o)
		},
		bf = function (i, n, r, o, l, u, d, p, h, g, m) {
			mn(n, m++, r), ++l[256]
			for (
				var w = kl(l, 15),
					_ = w[0],
					S = w[1],
					M = kl(u, 15),
					k = M[0],
					F = M[1],
					j = Pf(_),
					q = j[0],
					G = j[1],
					Q = Pf(k),
					ue = Q[0],
					ve = Q[1],
					ae = new St(19),
					le = 0;
				le < q.length;
				++le
			)
				ae[31 & q[le]]++
			for (le = 0; le < ue.length; ++le) ae[31 & ue[le]]++
			for (var pe = kl(ae, 7), Ce = pe[0], He = pe[1], Re = 19; Re > 4 && !Ce[yf[Re - 1]]; --Re);
			var Ne,
				z,
				I,
				A,
				D = (g + 5) << 3,
				T = Pi(l, or) + Pi(u, to) + d,
				$ =
					Pi(l, _) +
					Pi(u, k) +
					d +
					14 +
					3 * Re +
					Pi(ae, Ce) +
					(2 * ae[16] + 3 * ae[17] + 7 * ae[18])
			if (D <= T && D <= $) return Cl(n, m, i.subarray(h, h + g))
			if ((mn(n, m, 1 + ($ < T)), (m += 2), $ < T)) {
				;(Ne = xi(_, S)), (z = _), (I = xi(k, F)), (A = k)
				var W = xi(Ce, He)
				for (
					mn(n, m, G - 257), mn(n, m + 5, ve - 1), mn(n, m + 10, Re - 4), m += 14, le = 0;
					le < Re;
					++le
				)
					mn(n, m + 3 * le, Ce[yf[le]])
				m += 3 * Re
				for (var x = [q, ue], L = 0; L < 2; ++L) {
					var X = x[L]
					for (le = 0; le < X.length; ++le) {
						var ee = 31 & X[le]
						mn(n, m, W[ee]),
							(m += Ce[ee]),
							ee > 15 && (mn(n, m, (X[le] >>> 5) & 127), (m += X[le] >>> 12))
					}
				}
			} else (Ne = L_), (z = or), (I = D_), (A = to)
			for (le = 0; le < p; ++le)
				if (o[le] > 255) {
					;(ee = (o[le] >>> 18) & 31),
						Ci(n, m, Ne[ee + 257]),
						(m += z[ee + 257]),
						ee > 7 && (mn(n, m, (o[le] >>> 23) & 31), (m += wl[ee]))
					var ge = 31 & o[le]
					Ci(n, m, I[ge]), (m += A[ge]), ge > 3 && (Ci(n, m, (o[le] >>> 5) & 8191), (m += Sl[ge]))
				} else Ci(n, m, Ne[o[le]]), (m += z[o[le]])
			return Ci(n, m, Ne[256]), m + z[256]
		},
		A_ = new Fr([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]),
		$_ = (function () {
			for (var i = new Fr(256), n = 0; n < 256; ++n) {
				for (var r = n, o = 9; --o; ) r = (1 & r && 3988292384) ^ (r >>> 1)
				i[n] = r
			}
			return i
		})(),
		z_ = function () {
			var i = 4294967295
			return {
				p: function (n) {
					for (var r = i, o = 0; o < n.length; ++o) r = $_[(255 & r) ^ n[o]] ^ (r >>> 8)
					i = r
				},
				d: function () {
					return 4294967295 ^ i
				},
			}
		},
		j_ = function (i, n, r, o, l) {
			return (function (u, d, p, h, g, m) {
				var w = u.length,
					_ = new Lt(h + w + 5 * (1 + Math.floor(w / 7e3)) + g),
					S = _.subarray(h, _.length - g),
					M = 0
				if (!d || w < 8)
					for (var k = 0; k <= w; k += 65535) {
						var F = k + 65535
						F < w
							? (M = Cl(S, M, u.subarray(k, F)))
							: ((S[k] = m), (M = Cl(S, M, u.subarray(k, w))))
					}
				else {
					for (
						var j = A_[d - 1],
							q = j >>> 13,
							G = 8191 & j,
							Q = (1 << p) - 1,
							ue = new St(32768),
							ve = new St(Q + 1),
							ae = Math.ceil(p / 3),
							le = 2 * ae,
							pe = function (pr) {
								return (u[pr] ^ (u[pr + 1] << ae) ^ (u[pr + 2] << le)) & Q
							},
							Ce = new Fr(25e3),
							He = new St(288),
							Re = new St(32),
							Ne = 0,
							z = 0,
							I = ((k = 0), 0),
							A = 0,
							D = 0;
						k < w;
						++k
					) {
						var T = pe(k),
							$ = 32767 & k,
							W = ve[T]
						if (((ue[$] = W), (ve[T] = $), A <= k)) {
							var x = w - k
							if ((Ne > 7e3 || I > 24576) && x > 423) {
								;(M = bf(u, S, 0, Ce, He, Re, z, I, D, k - D, M)), (I = Ne = z = 0), (D = k)
								for (var L = 0; L < 286; ++L) He[L] = 0
								for (L = 0; L < 30; ++L) Re[L] = 0
							}
							var X = 2,
								ee = 0,
								ge = G,
								he = ($ - W) & 32767
							if (x > 2 && T == pe(k - he))
								for (
									var Se = Math.min(q, x) - 1, we = Math.min(32767, k), Ie = Math.min(258, x);
									he <= we && --ge && $ != W;

								) {
									if (u[k + X] == u[k + X - he]) {
										for (var Be = 0; Be < Ie && u[k + Be] == u[k + Be - he]; ++Be);
										if (Be > X) {
											if (((X = Be), (ee = he), Be > Se)) break
											var Vr = Math.min(he, Be - 2),
												zi = 0
											for (L = 0; L < Vr; ++L) {
												var An = (k - he + L + 32768) & 32767,
													qr = (An - ue[An] + 32768) & 32767
												qr > zi && ((zi = qr), (W = An))
											}
										}
									}
									he += (($ = W) - (W = ue[$]) + 32768) & 32767
								}
							if (ee) {
								Ce[I++] = 268435456 | (El[X] << 18) | Ef[ee]
								var ji = 31 & El[X],
									Ui = 31 & Ef[ee]
								;(z += wl[ji] + Sl[Ui]), ++He[257 + ji], ++Re[Ui], (A = k + X), ++Ne
							} else (Ce[I++] = u[k]), ++He[u[k]]
						}
					}
					M = bf(u, S, m, Ce, He, Re, z, I, D, k - D, M)
				}
				return Cf(_, 0, h + xf(M) + g)
			})(
				i,
				n.level == null ? 6 : n.level,
				n.mem == null ? Math.ceil(1.5 * Math.max(8, Math.min(13, Math.log(i.length)))) : 12 + n.mem,
				r,
				o,
				!0
			)
		},
		Pl = function (i, n, r) {
			for (; r; ++n) (i[n] = r), (r >>>= 8)
		},
		U_ = function (i, n) {
			var r = n.filename
			if (
				((i[0] = 31),
				(i[1] = 139),
				(i[2] = 8),
				(i[8] = n.level < 2 ? 4 : n.level == 9 ? 2 : 0),
				(i[9] = 3),
				n.mtime != 0 && Pl(i, 4, Math.floor(new Date(n.mtime || Date.now()) / 1e3)),
				r)
			) {
				i[3] = 8
				for (var o = 0; o <= r.length; ++o) i[o + 10] = r.charCodeAt(o)
			}
		},
		B_ = function (i) {
			return 10 + ((i.filename && i.filename.length + 1) || 0)
		}
	function Rf(i, n) {
		n === void 0 && (n = {})
		var r = z_(),
			o = i.length
		r.p(i)
		var l = j_(i, n, B_(n), 8),
			u = l.length
		return U_(l, n), Pl(l, u - 8, r.d()), Pl(l, u - 4, o), l
	}
	function If(i, n) {
		var r = i.length
		if (typeof TextEncoder < 'u') return new TextEncoder().encode(i)
		for (
			var o = new Lt(i.length + (i.length >>> 1)),
				l = 0,
				u = function (g) {
					o[l++] = g
				},
				d = 0;
			d < r;
			++d
		) {
			if (l + 5 > o.length) {
				var p = new Lt(l + 8 + ((r - d) << 1))
				p.set(o), (o = p)
			}
			var h = i.charCodeAt(d)
			h < 128 || n
				? u(h)
				: h < 2048
					? (u(192 | (h >>> 6)), u(128 | (63 & h)))
					: h > 55295 && h < 57344
						? (u(240 | ((h = (65536 + (1047552 & h)) | (1023 & i.charCodeAt(++d))) >>> 18)),
							u(128 | ((h >>> 12) & 63)),
							u(128 | ((h >>> 6) & 63)),
							u(128 | (63 & h)))
						: (u(224 | (h >>> 12)), u(128 | ((h >>> 6) & 63)), u(128 | (63 & h)))
		}
		return Cf(o, 0, l)
	}
	function W_(i, n) {
		return (
			(function (r) {
				for (var o = 0, l = 0; l < r.length; l++) (o = (o << 5) - o + r.charCodeAt(l)), (o |= 0)
				return Math.abs(o)
			})(i) %
				100 <
			Mt(100 * n, 0, 100)
		)
	}
	var Nn = 'disabled',
		bl = 'sampled',
		no = 'active',
		ar = 'buffering',
		Rl = 'paused',
		Il = 'trigger',
		en = Il + '_activated',
		at = Il + '_pending',
		tn = Il + '_' + Nn
	function Tf(i, n) {
		return n.some((r) => r.matching === 'regex' && new RegExp(r.url).test(i))
	}
	class Of {
		constructor(n) {
			this.gt = n
		}
		triggerStatus(n) {
			var r = this.gt.map((o) => o.triggerStatus(n))
			return r.includes(en) ? en : r.includes(at) ? at : tn
		}
		stop() {
			this.gt.forEach((n) => n.stop())
		}
	}
	class Nf {
		constructor(n) {
			this.gt = n
		}
		triggerStatus(n) {
			var r = new Set()
			for (var o of this.gt) r.add(o.triggerStatus(n))
			switch ((r.delete(tn), r.size)) {
				case 0:
					return tn
				case 1:
					return Array.from(r)[0]
				default:
					return at
			}
		}
		stop() {
			this.gt.forEach((n) => n.stop())
		}
	}
	class H_ {
		triggerStatus() {
			return at
		}
		stop() {}
	}
	class V_ {
		constructor(n) {
			;(this._t = []), (this.bt = []), (this.urlBlocked = !1), (this._instance = n)
		}
		onRemoteConfig(n) {
			var r, o
			;(this._t = ((r = n.sessionRecording) == null ? void 0 : r.urlTriggers) || []),
				(this.bt = ((o = n.sessionRecording) == null ? void 0 : o.urlBlocklist) || [])
		}
		wt(n) {
			var r
			return this._t.length === 0
				? tn
				: ((r = this._instance) == null ? void 0 : r.get_property(Xa)) === n
					? en
					: at
		}
		triggerStatus(n) {
			var r = this.wt(n),
				o = r === en ? en : r === at ? at : tn
			return this._instance.register_for_session({ $sdk_debug_replay_url_trigger_status: o }), o
		}
		checkUrlTriggerConditions(n, r, o) {
			if (N !== void 0 && N.location.href) {
				var l = N.location.href,
					u = this.urlBlocked,
					d = Tf(l, this.bt)
				;(u && d) || (d && !u ? n() : !d && u && r(), Tf(l, this._t) && o('url'))
			}
		}
		stop() {}
	}
	class q_ {
		constructor(n) {
			;(this.linkedFlag = null),
				(this.linkedFlagSeen = !1),
				(this.yt = () => {}),
				(this._instance = n)
		}
		triggerStatus() {
			var n = at
			return (
				xe(this.linkedFlag) && (n = tn),
				this.linkedFlagSeen && (n = en),
				this._instance.register_for_session({ $sdk_debug_replay_linked_flag_trigger_status: n }),
				n
			)
		}
		onRemoteConfig(n, r) {
			var o
			if (
				((this.linkedFlag = ((o = n.sessionRecording) == null ? void 0 : o.linkedFlag) || null),
				!xe(this.linkedFlag) && !this.linkedFlagSeen)
			) {
				var l = Ue(this.linkedFlag) ? this.linkedFlag : this.linkedFlag.flag,
					u = Ue(this.linkedFlag) ? null : this.linkedFlag.variant
				this.yt = this._instance.onFeatureFlags((d, p) => {
					var h = !1
					if (je(p) && l in p) {
						var g = p[l]
						h = Jt(g) ? g === !0 : u ? g === u : !!g
					}
					;(this.linkedFlagSeen = h), h && r(l, u)
				})
			}
		}
		stop() {
			this.yt()
		}
	}
	class G_ {
		constructor(n) {
			;(this.St = []), (this._instance = n)
		}
		onRemoteConfig(n) {
			var r
			this.St = ((r = n.sessionRecording) == null ? void 0 : r.eventTriggers) || []
		}
		$t(n) {
			var r
			return this.St.length === 0
				? tn
				: ((r = this._instance) == null ? void 0 : r.get_property(Ya)) === n
					? en
					: at
		}
		triggerStatus(n) {
			var r = this.$t(n),
				o = r === en ? en : r === at ? at : tn
			return this._instance.register_for_session({ $sdk_debug_replay_event_trigger_status: o }), o
		}
		stop() {}
	}
	function Q_(i) {
		return i.isRecordingEnabled ? ar : Nn
	}
	function K_(i) {
		if (!i.receivedDecide) return ar
		if (!i.isRecordingEnabled) return Nn
		if (i.urlTriggerMatching.urlBlocked) return Rl
		var n = i.isSampled === !0,
			r = new Of([
				i.eventTriggerMatching,
				i.urlTriggerMatching,
				i.linkedFlagMatching,
			]).triggerStatus(i.sessionId)
		return n ? bl : r === en ? no : r === at ? ar : i.isSampled === !1 ? Nn : no
	}
	function X_(i) {
		if (!i.receivedDecide) return ar
		if (!i.isRecordingEnabled) return Nn
		if (i.urlTriggerMatching.urlBlocked) return Rl
		var n = new Nf([
				i.eventTriggerMatching,
				i.urlTriggerMatching,
				i.linkedFlagMatching,
			]).triggerStatus(i.sessionId),
			r = n !== tn,
			o = Jt(i.isSampled)
		return r && n === at
			? ar
			: (r && n === tn) || (o && !i.isSampled)
				? Nn
				: i.isSampled === !0
					? bl
					: no
	}
	var bi = '[SessionRecording]',
		lt = nt(bi)
	function ro() {
		var i
		return me == null || (i = me.__PosthogExtensions__) == null || (i = i.rrweb) == null
			? void 0
			: i.record
	}
	var Y_ = 3e5,
		Z_ = [
			Wt.MouseMove,
			Wt.MouseInteraction,
			Wt.Scroll,
			Wt.ViewportResize,
			Wt.Input,
			Wt.TouchMove,
			Wt.MediaInteraction,
			Wt.Drag,
		],
		Ff = (i) => ({ rrwebMethod: i, enqueuedAt: Date.now(), attempt: 1 })
	function lr(i) {
		return (function (n, r) {
			for (var o = '', l = 0; l < n.length; ) {
				var u = n[l++]
				o += String.fromCharCode(u)
			}
			return o
		})(Rf(If(JSON.stringify(i))))
	}
	function Mf(i) {
		return i.type === gn.Custom && i.data.tag === 'sessionIdle'
	}
	class J_ {
		get sessionId() {
			return this.kt
		}
		get xt() {
			return this._instance.config.session_recording.session_idle_threshold_ms || 3e5
		}
		get started() {
			return this.Et
		}
		get It() {
			if (!this._instance.sessionManager)
				throw new Error(bi + ' must be started with a valid sessionManager.')
			return this._instance.sessionManager
		}
		get Pt() {
			var n, r
			return this.Rt.triggerStatus(this.sessionId) === at
				? 6e4
				: (n =
							(r = this._instance.config.session_recording) == null
								? void 0
								: r.full_snapshot_interval_millis) !== null && n !== void 0
					? n
					: Y_
		}
		get Tt() {
			var n = this._instance.get_property(Si)
			return Jt(n) ? n : null
		}
		get Mt() {
			var n,
				r,
				o =
					(n = this.M) == null
						? void 0
						: n.data[((r = this.M) == null ? void 0 : r.data.length) - 1],
				{ sessionStartTimestamp: l } = this.It.checkAndGetSessionAndWindowId(!0)
			return o ? o.timestamp - l : null
		}
		get Ct() {
			var n = !!this._instance.get_property(Ka),
				r = !this._instance.config.disable_session_recording
			return N && n && r
		}
		get Ot() {
			var n = !!this._instance.get_property(Fd),
				r = this._instance.config.enable_recording_console_log
			return r ?? n
		}
		get Ft() {
			var n,
				r,
				o,
				l,
				u,
				d,
				p = this._instance.config.session_recording.captureCanvas,
				h = this._instance.get_property(Dd),
				g =
					(n = (r = p?.recordCanvas) !== null && r !== void 0 ? r : h?.enabled) !== null &&
					n !== void 0 &&
					n,
				m =
					(o = (l = p?.canvasFps) !== null && l !== void 0 ? l : h?.fps) !== null && o !== void 0
						? o
						: 4,
				w =
					(u = (d = p?.canvasQuality) !== null && d !== void 0 ? d : h?.quality) !== null &&
					u !== void 0
						? u
						: 0.4
			if (typeof w == 'string') {
				var _ = parseFloat(w)
				w = isNaN(_) ? 0.4 : _
			}
			return {
				enabled: g,
				fps: Mt(m, 0, 12, 'canvas recording fps', 4),
				quality: Mt(w, 0, 1, 'canvas recording quality', 0.4),
			}
		}
		get At() {
			var n,
				r,
				o = this._instance.get_property(Md),
				l = {
					recordHeaders:
						(n = this._instance.config.session_recording) == null ? void 0 : n.recordHeaders,
					recordBody: (r = this._instance.config.session_recording) == null ? void 0 : r.recordBody,
				},
				u = l?.recordHeaders || o?.recordHeaders,
				d = l?.recordBody || o?.recordBody,
				p = je(this._instance.config.capture_performance)
					? this._instance.config.capture_performance.network_timing
					: this._instance.config.capture_performance,
				h = !!(Jt(p) ? p : o?.capturePerformance)
			return u || d || h ? { recordHeaders: u, recordBody: d, recordPerformance: h } : void 0
		}
		get Dt() {
			var n,
				r,
				o,
				l,
				u,
				d,
				p = this._instance.get_property(Ld),
				h = {
					maskAllInputs:
						(n = this._instance.config.session_recording) == null ? void 0 : n.maskAllInputs,
					maskTextSelector:
						(r = this._instance.config.session_recording) == null ? void 0 : r.maskTextSelector,
					blockSelector:
						(o = this._instance.config.session_recording) == null ? void 0 : o.blockSelector,
				},
				g = (l = h?.maskAllInputs) !== null && l !== void 0 ? l : p?.maskAllInputs,
				m = (u = h?.maskTextSelector) !== null && u !== void 0 ? u : p?.maskTextSelector,
				w = (d = h?.blockSelector) !== null && d !== void 0 ? d : p?.blockSelector
			return K(g) && K(m) && K(w)
				? void 0
				: { maskAllInputs: g == null || g, maskTextSelector: m, blockSelector: w }
		}
		get Lt() {
			var n = this._instance.get_property(Ad)
			return ot(n) ? n : null
		}
		get Nt() {
			var n = this._instance.get_property($d)
			return ot(n) ? n : null
		}
		get status() {
			return this.jt
				? this.zt({
						receivedDecide: this.jt,
						isRecordingEnabled: this.Ct,
						isSampled: this.Tt,
						urlTriggerMatching: this.Ut,
						eventTriggerMatching: this.qt,
						linkedFlagMatching: this.Bt,
						sessionId: this.sessionId,
					})
				: ar
		}
		constructor(n) {
			if (
				((this.zt = Q_),
				(this.jt = !1),
				(this.Ht = []),
				(this.Wt = 'unknown'),
				(this.Gt = Date.now()),
				(this.Rt = new H_()),
				(this.Jt = void 0),
				(this.Vt = void 0),
				(this.Kt = void 0),
				(this.Yt = void 0),
				(this.Xt = void 0),
				(this._forceAllowLocalhostNetworkCapture = !1),
				(this.Qt = () => {
					this.Zt()
				}),
				(this.ti = () => {
					this.ii('browser offline', {})
				}),
				(this.ei = () => {
					this.ii('browser online', {})
				}),
				(this.ri = () => {
					if (J != null && J.visibilityState) {
						var l = 'window ' + J.visibilityState
						this.ii(l, {})
					}
				}),
				(this._instance = n),
				(this.Et = !1),
				(this.si = '/s/'),
				(this.ni = void 0),
				(this.jt = !1),
				!this._instance.sessionManager)
			)
				throw (
					(lt.error('started without valid sessionManager'),
					new Error(bi + ' started without valid sessionManager. This is a bug.'))
				)
			if (this._instance.config.__preview_experimental_cookieless_mode)
				throw new Error(bi + ' cannot be used with __preview_experimental_cookieless_mode.')
			;(this.Bt = new q_(this._instance)),
				(this.Ut = new V_(this._instance)),
				(this.qt = new G_(this._instance))
			var { sessionId: r, windowId: o } = this.It.checkAndGetSessionAndWindowId()
			;(this.kt = r),
				(this.oi = o),
				(this.M = this.ai()),
				this.xt >= this.It.sessionTimeoutMs &&
					lt.warn(
						'session_idle_threshold_ms (' +
							this.xt +
							') is greater than the session timeout (' +
							this.It.sessionTimeoutMs +
							'). Session will never be detected as idle'
					)
		}
		startIfEnabledOrStop(n) {
			this.Ct
				? (this.li(n),
					Ae(N, 'beforeunload', this.Qt),
					Ae(N, 'offline', this.ti),
					Ae(N, 'online', this.ei),
					Ae(N, 'visibilitychange', this.ri),
					this.ui(),
					this.hi(),
					xe(this.Jt) &&
						(this.Jt = this._instance.on('eventCaptured', (r) => {
							try {
								if (r.event === '$pageview') {
									var o =
										r != null && r.properties.$current_url
											? this.di(r?.properties.$current_url)
											: ''
									if (!o) return
									this.ii('$pageview', { href: o })
								}
							} catch (l) {
								lt.error('Could not add $pageview to rrweb session', l)
							}
						})),
					this.Vt ||
						(this.Vt = this.It.onSessionId((r, o, l) => {
							var u, d
							l &&
								(this.ii('$session_id_change', { sessionId: r, windowId: o, changeReason: l }),
								(u = this._instance) == null || (u = u.persistence) == null || u.unregister(Ya),
								(d = this._instance) == null || (d = d.persistence) == null || d.unregister(Xa))
						})))
				: this.stopRecording()
		}
		stopRecording() {
			var n, r, o, l
			this.Et &&
				this.ni &&
				(this.ni(),
				(this.ni = void 0),
				(this.Et = !1),
				N?.removeEventListener('beforeunload', this.Qt),
				N?.removeEventListener('offline', this.ti),
				N?.removeEventListener('online', this.ei),
				N?.removeEventListener('visibilitychange', this.ri),
				this.ai(),
				clearInterval(this.vi),
				(n = this.Jt) == null || n.call(this),
				(this.Jt = void 0),
				(r = this.Xt) == null || r.call(this),
				(this.Xt = void 0),
				(o = this.Vt) == null || o.call(this),
				(this.Vt = void 0),
				(l = this.Yt) == null || l.call(this),
				(this.Yt = void 0),
				this.qt.stop(),
				this.Ut.stop(),
				this.Bt.stop(),
				lt.info('stopped'))
		}
		ci() {
			var n
			;(n = this._instance.persistence) == null || n.unregister(Si)
		}
		fi(n) {
			var r,
				o = this.kt !== n,
				l = this.Lt
			if (ot(l)) {
				var u = this.Tt,
					d = o || !Jt(u),
					p = d ? W_(n, l) : u
				d &&
					(p
						? this.pi(bl)
						: lt.warn(
								'Sample rate (' +
									l +
									') has determined that this sessionId (' +
									n +
									') will not be sent to the server.'
							),
					this.ii('samplingDecisionMade', { sampleRate: l, isSampled: p })),
					(r = this._instance.persistence) == null || r.register({ [Si]: p })
			} else this.ci()
		}
		onRemoteConfig(n) {
			var r, o, l, u
			this.ii('$remote_config_received', n),
				this.gi(n),
				(r = n.sessionRecording) != null &&
					r.endpoint &&
					(this.si = (u = n.sessionRecording) == null ? void 0 : u.endpoint),
				this.ui(),
				((o = n.sessionRecording) == null ? void 0 : o.triggerMatchType) === 'any'
					? ((this.zt = K_), (this.Rt = new Of([this.qt, this.Ut])))
					: ((this.zt = X_), (this.Rt = new Nf([this.qt, this.Ut]))),
				this._instance.register_for_session({
					$sdk_debug_replay_remote_trigger_matching_config:
						(l = n.sessionRecording) == null ? void 0 : l.triggerMatchType,
				}),
				this.Ut.onRemoteConfig(n),
				this.qt.onRemoteConfig(n),
				this.Bt.onRemoteConfig(n, (d, p) => {
					this.pi('linked_flag_matched', { flag: d, variant: p })
				}),
				(this.jt = !0),
				this.startIfEnabledOrStop()
		}
		ui() {
			ot(this.Lt) &&
				xe(this.Yt) &&
				(this.Yt = this.It.onSessionId((n) => {
					this.fi(n)
				}))
		}
		gi(n) {
			if (this._instance.persistence) {
				var r,
					o = this._instance.persistence,
					l = () => {
						var u,
							d,
							p,
							h,
							g,
							m,
							w,
							_,
							S,
							M = (u = n.sessionRecording) == null ? void 0 : u.sampleRate,
							k = xe(M) ? null : parseFloat(M)
						xe(k) && this.ci()
						var F = (d = n.sessionRecording) == null ? void 0 : d.minimumDurationMilliseconds
						o.register({
							[Ka]: !!n.sessionRecording,
							[Fd]: (p = n.sessionRecording) == null ? void 0 : p.consoleLogRecordingEnabled,
							[Md]: Z(
								{ capturePerformance: n.capturePerformance },
								(h = n.sessionRecording) == null ? void 0 : h.networkPayloadCapture
							),
							[Ld]: (g = n.sessionRecording) == null ? void 0 : g.masking,
							[Dd]: {
								enabled: (m = n.sessionRecording) == null ? void 0 : m.recordCanvas,
								fps: (w = n.sessionRecording) == null ? void 0 : w.canvasFps,
								quality: (_ = n.sessionRecording) == null ? void 0 : _.canvasQuality,
							},
							[Ad]: k,
							[$d]: K(F) ? null : F,
							[zd]: (S = n.sessionRecording) == null ? void 0 : S.scriptConfig,
						})
					}
				l(), (r = this.Kt) == null || r.call(this), (this.Kt = this.It.onSessionId(l))
			}
		}
		log(n, r) {
			var o
			r === void 0 && (r = 'log'),
				(o = this._instance.sessionRecording) == null ||
					o.onRRwebEmit({
						type: 6,
						data: {
							plugin: 'rrweb/console@1',
							payload: { level: r, trace: [], payload: [JSON.stringify(n)] },
						},
						timestamp: Date.now(),
					})
		}
		li(n) {
			if (
				!K(Object.assign) &&
				!K(Array.from) &&
				!(
					this.Et ||
					this._instance.config.disable_session_recording ||
					this._instance.consent.isOptedOut()
				)
			) {
				var r
				;(this.Et = !0),
					this.It.checkAndGetSessionAndWindowId(),
					ro()
						? this.mi()
						: (r = me.__PosthogExtensions__) == null ||
							r.loadExternalDependency == null ||
							r.loadExternalDependency(this._instance, this.bi, (o) => {
								if (o) return lt.error('could not load recorder', o)
								this.mi()
							}),
					lt.info('starting'),
					this.status === no && this.pi(n || 'recording_initialized')
			}
		}
		get bi() {
			var n
			return (
				((n = this._instance) == null ||
				(n = n.persistence) == null ||
				(n = n.get_property(zd)) == null
					? void 0
					: n.script) || 'recorder'
			)
		}
		wi(n) {
			var r
			return n.type === 3 && Z_.indexOf((r = n.data) == null ? void 0 : r.source) !== -1
		}
		yi(n) {
			var r = this.wi(n)
			r ||
				this.Wt ||
				(n.timestamp - this.Gt > this.xt &&
					((this.Wt = !0),
					clearInterval(this.vi),
					this.ii('sessionIdle', {
						eventTimestamp: n.timestamp,
						lastActivityTimestamp: this.Gt,
						threshold: this.xt,
						bufferLength: this.M.data.length,
						bufferSize: this.M.size,
					}),
					this.Zt()))
			var o = !1
			if (r && ((this.Gt = n.timestamp), this.Wt)) {
				var l = this.Wt === 'unknown'
				;(this.Wt = !1),
					l || (this.ii('sessionNoLongerIdle', { reason: 'user activity', type: n.type }), (o = !0))
			}
			if (!this.Wt) {
				var { windowId: u, sessionId: d } = this.It.checkAndGetSessionAndWindowId(!r, n.timestamp),
					p = this.kt !== d,
					h = this.oi !== u
				;(this.oi = u),
					(this.kt = d),
					p || h
						? (this.stopRecording(), this.startIfEnabledOrStop('session_id_changed'))
						: o && this.Si()
			}
		}
		$i(n) {
			try {
				return n.rrwebMethod(), !0
			} catch (r) {
				return (
					this.Ht.length < 10
						? this.Ht.push({
								enqueuedAt: n.enqueuedAt || Date.now(),
								attempt: n.attempt++,
								rrwebMethod: n.rrwebMethod,
							})
						: lt.warn('could not emit queued rrweb event.', r, n),
					!1
				)
			}
		}
		ii(n, r) {
			return this.$i(Ff(() => ro().addCustomEvent(n, r)))
		}
		ki() {
			return this.$i(Ff(() => ro().takeFullSnapshot()))
		}
		mi() {
			var n,
				r,
				o,
				l,
				u = {
					blockClass: 'ph-no-capture',
					blockSelector: void 0,
					ignoreClass: 'ph-ignore-input',
					maskTextClass: 'ph-mask',
					maskTextSelector: void 0,
					maskTextFn: void 0,
					maskAllInputs: !0,
					maskInputOptions: { password: !0 },
					maskInputFn: void 0,
					slimDOMOptions: {},
					collectFonts: !1,
					inlineStylesheet: !0,
					recordCrossOriginIframes: !1,
				},
				d = this._instance.config.session_recording
			for (var [p, h] of Object.entries(d || {}))
				p in u &&
					(p === 'maskInputOptions' ? (u.maskInputOptions = Z({ password: !0 }, h)) : (u[p] = h))
			this.Ft &&
				this.Ft.enabled &&
				((u.recordCanvas = !0),
				(u.sampling = { canvas: this.Ft.fps }),
				(u.dataURLOptions = { type: 'image/webp', quality: this.Ft.quality })),
				this.Dt &&
					((u.maskAllInputs = (r = this.Dt.maskAllInputs) === null || r === void 0 || r),
					(u.maskTextSelector =
						(o = this.Dt.maskTextSelector) !== null && o !== void 0 ? o : void 0),
					(u.blockSelector = (l = this.Dt.blockSelector) !== null && l !== void 0 ? l : void 0))
			var g = ro()
			if (g) {
				this.xi =
					(n = this.xi) !== null && n !== void 0
						? n
						: new F_(g, {
								refillRate: this._instance.config.session_recording.__mutationRateLimiterRefillRate,
								bucketSize: this._instance.config.session_recording.__mutationRateLimiterBucketSize,
								onBlockedNode: (w, _) => {
									var S =
										"Too many mutations on node '" +
										w +
										"'. Rate limiting. This could be due to SVG animations or something similar"
									lt.info(S, { node: _ }), this.log(bi + ' ' + S, 'warn')
								},
							})
				var m = this.Ei()
				;(this.ni = g(
					Z(
						{
							emit: (w) => {
								this.onRRwebEmit(w)
							},
							plugins: m,
						},
						u
					)
				)),
					(this.Gt = Date.now()),
					(this.Wt = Jt(this.Wt) ? this.Wt : 'unknown'),
					this.ii('$session_options', {
						sessionRecordingOptions: u,
						activePlugins: m.map((w) => w?.name),
					}),
					this.ii('$posthog_config', { config: this._instance.config })
			} else
				lt.error(
					'onScriptLoaded was called but rrwebRecord is not available. This indicates something has gone wrong.'
				)
		}
		Si() {
			if ((this.vi && clearInterval(this.vi), this.Wt !== !0)) {
				var n = this.Pt
				n &&
					(this.vi = setInterval(() => {
						this.ki()
					}, n))
			}
		}
		Ei() {
			var n,
				r,
				o = [],
				l =
					(n = me.__PosthogExtensions__) == null || (n = n.rrwebPlugins) == null
						? void 0
						: n.getRecordConsolePlugin
			l && this.Ot && o.push(l())
			var u =
				(r = me.__PosthogExtensions__) == null || (r = r.rrwebPlugins) == null
					? void 0
					: r.getRecordNetworkPlugin
			return (
				this.At &&
					Ft(u) &&
					(!Zm.includes(location.hostname) || this._forceAllowLocalhostNetworkCapture
						? o.push(u(N_(this._instance.config, this.At)))
						: lt.info('NetworkCapture not started because we are on localhost.')),
				o
			)
		}
		onRRwebEmit(n) {
			var r
			if ((this.Ii(), n && je(n))) {
				if (n.type === gn.Meta) {
					var o = this.di(n.data.href)
					if (((this.Pi = o), !o)) return
					n.data.href = o
				} else this.Ri()
				if (
					(this.Ut.checkUrlTriggerConditions(
						() => this.Ti(),
						() => this.Mi(),
						(_) => this.Ci(_)
					),
					!this.Ut.urlBlocked || ((l = n).type === gn.Custom && l.data.tag === 'recording paused'))
				) {
					var l
					n.type === gn.FullSnapshot && this.Si(),
						n.type === gn.FullSnapshot &&
							this.jt &&
							this.Rt.triggerStatus(this.sessionId) === at &&
							this.ai()
					var u = this.xi ? this.xi.throttleMutations(n) : n
					if (u) {
						var d = (function (_) {
							var S = _
							if (S && je(S) && S.type === 6 && je(S.data) && S.data.plugin === 'rrweb/console@1') {
								S.data.payload.payload.length > 10 &&
									((S.data.payload.payload = S.data.payload.payload.slice(0, 10)),
									S.data.payload.payload.push('...[truncated]'))
								for (var M = [], k = 0; k < S.data.payload.payload.length; k++)
									S.data.payload.payload[k] && S.data.payload.payload[k].length > 2e3
										? M.push(S.data.payload.payload[k].slice(0, 2e3) + '...[truncated]')
										: M.push(S.data.payload.payload[k])
								return (S.data.payload.payload = M), _
							}
							return _
						})(u)
						if ((this.yi(d), this.Wt !== !0 || Mf(d))) {
							if (Mf(d)) {
								var p = d.data.payload
								if (p) {
									var h = p.lastActivityTimestamp,
										g = p.threshold
									d.timestamp = h + g
								}
							}
							var m =
									(r = this._instance.config.session_recording.compress_events) === null ||
									r === void 0 ||
									r
										? (function (_) {
												if (Js(_) < 1024) return _
												try {
													if (_.type === gn.FullSnapshot)
														return Z({}, _, { data: lr(_.data), cv: '2024-10' })
													if (_.type === gn.IncrementalSnapshot && _.data.source === Wt.Mutation)
														return Z({}, _, {
															cv: '2024-10',
															data: Z({}, _.data, {
																texts: lr(_.data.texts),
																attributes: lr(_.data.attributes),
																removes: lr(_.data.removes),
																adds: lr(_.data.adds),
															}),
														})
													if (
														_.type === gn.IncrementalSnapshot &&
														_.data.source === Wt.StyleSheetRule
													)
														return Z({}, _, {
															cv: '2024-10',
															data: Z({}, _.data, {
																adds: _.data.adds ? lr(_.data.adds) : void 0,
																removes: _.data.removes ? lr(_.data.removes) : void 0,
															}),
														})
												} catch (S) {
													lt.error('could not compress event - will use uncompressed event', S)
												}
												return _
											})(d)
										: d,
								w = {
									$snapshot_bytes: Js(m),
									$snapshot_data: m,
									$session_id: this.kt,
									$window_id: this.oi,
								}
							this.status !== Nn ? this.Oi(w) : this.ai()
						}
					}
				}
			}
		}
		Ri() {
			if (!this._instance.config.capture_pageview && N) {
				var n = this.di(N.location.href)
				this.Pi !== n && (this.ii('$url_changed', { href: n }), (this.Pi = n))
			}
		}
		Ii() {
			if (this.Ht.length) {
				var n = [...this.Ht]
				;(this.Ht = []),
					n.forEach((r) => {
						Date.now() - r.enqueuedAt <= 2e3 && this.$i(r)
					})
			}
		}
		di(n) {
			var r = this._instance.config.session_recording
			if (r.maskNetworkRequestFn) {
				var o,
					l = { url: n }
				return (o = l = r.maskNetworkRequestFn(l)) == null ? void 0 : o.url
			}
			return n
		}
		ai() {
			return (this.M = { size: 0, data: [], sessionId: this.kt, windowId: this.oi }), this.M
		}
		Zt() {
			this.Fi && (clearTimeout(this.Fi), (this.Fi = void 0))
			var n = this.Nt,
				r = this.Mt,
				o = ot(r) && r >= 0,
				l = ot(n) && o && r < n
			return this.status === ar || this.status === Rl || this.status === Nn || l
				? ((this.Fi = setTimeout(() => {
						this.Zt()
					}, 2e3)),
					this.M)
				: (this.M.data.length > 0 &&
						ml(this.M).forEach((u) => {
							this.Ai({
								$snapshot_bytes: u.size,
								$snapshot_data: u.data,
								$session_id: u.sessionId,
								$window_id: u.windowId,
								$lib: 'web',
								$lib_version: fn.LIB_VERSION,
							})
						}),
					this.ai())
		}
		Oi(n) {
			var r,
				o = 2 + (((r = this.M) == null ? void 0 : r.data.length) || 0)
			!this.Wt &&
				(this.M.size + n.$snapshot_bytes + o > 943718.4 || this.M.sessionId !== this.kt) &&
				(this.M = this.Zt()),
				(this.M.size += n.$snapshot_bytes),
				this.M.data.push(n.$snapshot_data),
				this.Fi ||
					this.Wt ||
					(this.Fi = setTimeout(() => {
						this.Zt()
					}, 2e3))
		}
		Ai(n) {
			this._instance.capture('$snapshot', n, {
				_url: this._instance.requestRouter.endpointFor('api', this.si),
				_noTruncate: !0,
				_batchKey: 'recordings',
				skip_client_rate_limiting: !0,
			})
		}
		Ci(n) {
			var r
			this.Rt.triggerStatus(this.sessionId) === at &&
				((r = this._instance) == null ||
					(r = r.persistence) == null ||
					r.register({ [n === 'url' ? Xa : Ya]: this.kt }),
				this.Zt(),
				this.pi(n + '_trigger_matched'))
		}
		Ti() {
			this.Ut.urlBlocked ||
				((this.Ut.urlBlocked = !0),
				clearInterval(this.vi),
				lt.info('recording paused due to URL blocker'),
				this.ii('recording paused', { reason: 'url blocker' }))
		}
		Mi() {
			this.Ut.urlBlocked &&
				((this.Ut.urlBlocked = !1),
				this.ki(),
				this.Si(),
				this.ii('recording resumed', { reason: 'left blocked url' }),
				lt.info('recording resumed'))
		}
		hi() {
			this.qt.St.length !== 0 &&
				xe(this.Xt) &&
				(this.Xt = this._instance.on('eventCaptured', (n) => {
					try {
						this.qt.St.includes(n.event) && this.Ci('event')
					} catch (r) {
						lt.error('Could not activate event trigger', r)
					}
				}))
		}
		overrideLinkedFlag() {
			;(this.Bt.linkedFlagSeen = !0), this.ki(), this.pi('linked_flag_overridden')
		}
		overrideSampling() {
			var n
			;(n = this._instance.persistence) == null || n.register({ [Si]: !0 }),
				this.ki(),
				this.pi('sampling_overridden')
		}
		overrideTrigger(n) {
			this.Ci(n)
		}
		pi(n, r) {
			this._instance.register_for_session({ $session_recording_start_reason: n }),
				lt.info(n.replace('_', ' '), r),
				ye(['recording_initialized', 'session_id_changed'], n) || this.ii(n, r)
		}
		get sdkDebugProperties() {
			var { sessionStartTimestamp: n } = this.It.checkAndGetSessionAndWindowId(!0)
			return {
				$recording_status: this.status,
				$sdk_debug_replay_internal_buffer_length: this.M.data.length,
				$sdk_debug_replay_internal_buffer_size: this.M.size,
				$sdk_debug_current_session_duration: this.Mt,
				$sdk_debug_session_start: n,
			}
		}
	}
	var Tl = nt('[SegmentIntegration]')
	function ey(i, n) {
		var r = i.config.segment
		if (!r) return n()
		;(function (o, l) {
			var u = o.config.segment
			if (!u) return l()
			var d = (h) => {
					var g = () => h.anonymousId() || On()
					;(o.config.get_device_id = g),
						h.id() &&
							(o.register({ distinct_id: h.id(), $device_id: g() }),
							o.persistence.set_property(hn, 'identified')),
						l()
				},
				p = u.user()
			'then' in p && Ft(p.then) ? p.then((h) => d(h)) : d(p)
		})(i, () => {
			r.register(
				((o) => {
					;(Promise && Promise.resolve) ||
						Tl.warn(
							'This browser does not have Promise support, and can not use the segment integration'
						)
					var l = (u, d) => {
						if (!d) return u
						u.event.userId ||
							u.event.anonymousId === o.get_distinct_id() ||
							(Tl.info('No userId set, resetting PostHog'), o.reset()),
							u.event.userId &&
								u.event.userId !== o.get_distinct_id() &&
								(Tl.info('UserId set, identifying with PostHog'), o.identify(u.event.userId))
						var p = o.calculateEventProperties(d, u.event.properties)
						return (u.event.properties = Object.assign({}, p, u.event.properties)), u
					}
					return {
						name: 'PostHog JS',
						type: 'enrichment',
						version: '1.0.0',
						isLoaded: () => !0,
						load: () => Promise.resolve(),
						track: (u) => l(u, u.event.event),
						page: (u) => l(u, '$pageview'),
						identify: (u) => l(u, '$identify'),
						screen: (u) => l(u, '$screen'),
					}
				})(i)
			).then(() => {
				n()
			})
		})
	}
	var Lf = 'posthog-js'
	function Df(i, n) {
		var {
			organization: r,
			projectId: o,
			prefix: l,
			severityAllowList: u = ['error'],
		} = n === void 0 ? {} : n
		return (d) => {
			var p, h, g, m, w
			if (!(u === '*' || u.includes(d.level)) || !i.__loaded) return d
			d.tags || (d.tags = {})
			var _ = i.requestRouter.endpointFor(
				'ui',
				'/project/' + i.config.token + '/person/' + i.get_distinct_id()
			)
			;(d.tags['PostHog Person URL'] = _),
				i.sessionRecordingStarted() &&
					(d.tags['PostHog Recording URL'] = i.get_session_replay_url({ withTimestamp: !0 }))
			var S = ((p = d.exception) == null ? void 0 : p.values) || [],
				M = S.map((F) =>
					Z({}, F, {
						stacktrace: F.stacktrace
							? Z({}, F.stacktrace, {
									type: 'raw',
									frames: (F.stacktrace.frames || []).map((j) =>
										Z({}, j, { platform: 'web:javascript' })
									),
								})
							: void 0,
					})
				),
				k = {
					$exception_message: ((h = S[0]) == null ? void 0 : h.value) || d.message,
					$exception_type: (g = S[0]) == null ? void 0 : g.type,
					$exception_personURL: _,
					$exception_level: d.level,
					$exception_list: M,
					$sentry_event_id: d.event_id,
					$sentry_exception: d.exception,
					$sentry_exception_message: ((m = S[0]) == null ? void 0 : m.value) || d.message,
					$sentry_exception_type: (w = S[0]) == null ? void 0 : w.type,
					$sentry_tags: d.tags,
				}
			return (
				r &&
					o &&
					(k.$sentry_url =
						(l || 'https://sentry.io/organizations/') +
						r +
						'/issues/?project=' +
						o +
						'&query=' +
						d.event_id),
				i.exceptions.sendExceptionEvent(k),
				d
			)
		}
	}
	class ty {
		constructor(n, r, o, l, u) {
			;(this.name = Lf),
				(this.setupOnce = function (d) {
					d(Df(n, { organization: r, projectId: o, prefix: l, severityAllowList: u }))
				})
		}
	}
	var ny =
			N != null && N.location
				? qs(N.location.hash, '__posthog') || qs(location.hash, 'state')
				: null,
		Af = '_postHogToolbarParams',
		$f = nt('[Toolbar]'),
		Fn = (function (i) {
			return (
				(i[(i.UNINITIALIZED = 0)] = 'UNINITIALIZED'),
				(i[(i.LOADING = 1)] = 'LOADING'),
				(i[(i.LOADED = 2)] = 'LOADED'),
				i
			)
		})(Fn || {})
	class ry {
		constructor(n) {
			this.instance = n
		}
		Di(n) {
			me.ph_toolbar_state = n
		}
		Li() {
			var n
			return (n = me.ph_toolbar_state) !== null && n !== void 0 ? n : Fn.UNINITIALIZED
		}
		maybeLoadToolbar(n, r, o) {
			if (
				(n === void 0 && (n = void 0),
				r === void 0 && (r = void 0),
				o === void 0 && (o = void 0),
				!N || !J)
			)
				return !1
			;(n = n ?? N.location), (o = o ?? N.history)
			try {
				if (!r) {
					try {
						N.localStorage.setItem('test', 'test'), N.localStorage.removeItem('test')
					} catch {
						return !1
					}
					r = N?.localStorage
				}
				var l,
					u = ny || qs(n.hash, '__posthog') || qs(n.hash, 'state'),
					d = u
						? Cd(() => JSON.parse(atob(decodeURIComponent(u)))) ||
							Cd(() => JSON.parse(decodeURIComponent(u)))
						: null
				return (
					d && d.action === 'ph_authorize'
						? (((l = d).source = 'url'),
							l &&
								Object.keys(l).length > 0 &&
								(d.desiredHash
									? (n.hash = d.desiredHash)
									: o
										? o.replaceState(o.state, '', n.pathname + n.search)
										: (n.hash = '')))
						: (((l = JSON.parse(r.getItem(Af) || '{}')).source = 'localstorage'),
							delete l.userIntent),
					!(!l.token || this.instance.config.token !== l.token) && (this.loadToolbar(l), !0)
				)
			} catch {
				return !1
			}
		}
		Ni(n) {
			var r = me.ph_load_toolbar || me.ph_load_editor
			!xe(r) && Ft(r) ? r(n, this.instance) : $f.warn('No toolbar load function found')
		}
		loadToolbar(n) {
			var r = !(J == null || !J.getElementById(jd))
			if (!N || r) return !1
			var o =
					this.instance.requestRouter.region === 'custom' &&
					this.instance.config.advanced_disable_toolbar_metrics,
				l = Z(
					{ token: this.instance.config.token },
					n,
					{ apiURL: this.instance.requestRouter.endpointFor('ui') },
					o ? { instrument: !1 } : {}
				)
			if (
				(N.localStorage.setItem(Af, JSON.stringify(Z({}, l, { source: void 0 }))),
				this.Li() === Fn.LOADED)
			)
				this.Ni(l)
			else if (this.Li() === Fn.UNINITIALIZED) {
				var u
				this.Di(Fn.LOADING),
					(u = me.__PosthogExtensions__) == null ||
						u.loadExternalDependency == null ||
						u.loadExternalDependency(this.instance, 'toolbar', (d) => {
							if (d) return $f.error('[Toolbar] Failed to load', d), void this.Di(Fn.UNINITIALIZED)
							this.Di(Fn.LOADED), this.Ni(l)
						}),
					Ae(N, 'turbolinks:load', () => {
						this.Di(Fn.UNINITIALIZED), this.loadToolbar(l)
					})
			}
			return !0
		}
		ji(n) {
			return this.loadToolbar(n)
		}
		maybeLoadEditor(n, r, o) {
			return (
				n === void 0 && (n = void 0),
				r === void 0 && (r = void 0),
				o === void 0 && (o = void 0),
				this.maybeLoadToolbar(n, r, o)
			)
		}
	}
	var iy = nt('[TracingHeaders]')
	class sy {
		constructor(n) {
			;(this.zi = void 0),
				(this.Ui = void 0),
				(this.V = () => {
					var r, o
					K(this.zi) &&
						((r = me.__PosthogExtensions__) == null ||
							(r = r.tracingHeadersPatchFns) == null ||
							r._patchXHR(this._instance.sessionManager)),
						K(this.Ui) &&
							((o = me.__PosthogExtensions__) == null ||
								(o = o.tracingHeadersPatchFns) == null ||
								o._patchFetch(this._instance.sessionManager))
				}),
				(this._instance = n)
		}
		G(n) {
			var r, o
			;(r = me.__PosthogExtensions__) != null && r.tracingHeadersPatchFns && n(),
				(o = me.__PosthogExtensions__) == null ||
					o.loadExternalDependency == null ||
					o.loadExternalDependency(this._instance, 'tracing-headers', (l) => {
						if (l) return iy.error('failed to load script', l)
						n()
					})
		}
		startIfEnabledOrStop() {
			var n, r
			this._instance.config.__add_tracing_headers
				? this.G(this.V)
				: ((n = this.zi) == null || n.call(this),
					(r = this.Ui) == null || r.call(this),
					(this.zi = void 0),
					(this.Ui = void 0))
		}
	}
	var Mn = nt('[Web Vitals]'),
		zf = 9e5
	class oy {
		constructor(n) {
			var r
			;(this.qi = !1),
				(this.i = !1),
				(this.M = { url: void 0, metrics: [], firstMetricTimestamp: void 0 }),
				(this.Bi = () => {
					clearTimeout(this.Hi),
						this.M.metrics.length !== 0 &&
							(this._instance.capture(
								'$web_vitals',
								this.M.metrics.reduce(
									(o, l) =>
										Z({}, o, {
											['$web_vitals_' + l.name + '_event']: Z({}, l),
											['$web_vitals_' + l.name + '_value']: l.value,
										}),
									{}
								)
							),
							(this.M = { url: void 0, metrics: [], firstMetricTimestamp: void 0 }))
				}),
				(this.Wi = (o) => {
					var l,
						u =
							(l = this._instance.sessionManager) == null
								? void 0
								: l.checkAndGetSessionAndWindowId(!0)
					if (K(u)) Mn.error('Could not read session ID. Dropping metrics!')
					else {
						this.M = this.M || { url: void 0, metrics: [], firstMetricTimestamp: void 0 }
						var d = this.Gi()
						K(d) ||
							(xe(o?.name) || xe(o?.value)
								? Mn.error('Invalid metric received', o)
								: this.Ji && o.value >= this.Ji
									? Mn.error('Ignoring metric with value >= ' + this.Ji, o)
									: (this.M.url !== d &&
											(this.Bi(), (this.Hi = setTimeout(this.Bi, this.flushToCaptureTimeoutMs))),
										K(this.M.url) && (this.M.url = d),
										(this.M.firstMetricTimestamp = K(this.M.firstMetricTimestamp)
											? Date.now()
											: this.M.firstMetricTimestamp),
										o.attribution &&
											o.attribution.interactionTargetElement &&
											(o.attribution.interactionTargetElement = void 0),
										this.M.metrics.push(
											Z({}, o, {
												$current_url: d,
												$session_id: u.sessionId,
												$window_id: u.windowId,
												timestamp: Date.now(),
											})
										),
										this.M.metrics.length === this.allowedMetrics.length && this.Bi()))
					}
				}),
				(this.V = () => {
					var o,
						l,
						u,
						d,
						p = me.__PosthogExtensions__
					K(p) ||
						K(p.postHogWebVitalsCallbacks) ||
						({ onLCP: o, onCLS: l, onFCP: u, onINP: d } = p.postHogWebVitalsCallbacks),
						o && l && u && d
							? (this.allowedMetrics.indexOf('LCP') > -1 && o(this.Wi.bind(this)),
								this.allowedMetrics.indexOf('CLS') > -1 && l(this.Wi.bind(this)),
								this.allowedMetrics.indexOf('FCP') > -1 && u(this.Wi.bind(this)),
								this.allowedMetrics.indexOf('INP') > -1 && d(this.Wi.bind(this)),
								(this.i = !0))
							: Mn.error('web vitals callbacks not loaded - not starting')
				}),
				(this._instance = n),
				(this.qi = !((r = this._instance.persistence) == null || !r.props[Td])),
				this.startIfEnabled()
		}
		get allowedMetrics() {
			var n,
				r,
				o = je(this._instance.config.capture_performance)
					? (n = this._instance.config.capture_performance) == null
						? void 0
						: n.web_vitals_allowed_metrics
					: void 0
			return K(o)
				? ((r = this._instance.persistence) == null ? void 0 : r.props[Nd]) || [
						'CLS',
						'FCP',
						'INP',
						'LCP',
					]
				: o
		}
		get flushToCaptureTimeoutMs() {
			return (
				(je(this._instance.config.capture_performance)
					? this._instance.config.capture_performance.web_vitals_delayed_flush_ms
					: void 0) || 5e3
			)
		}
		get Ji() {
			var n =
				je(this._instance.config.capture_performance) &&
				ot(this._instance.config.capture_performance.__web_vitals_max_value)
					? this._instance.config.capture_performance.__web_vitals_max_value
					: zf
			return 0 < n && n <= 6e4 ? zf : n
		}
		get isEnabled() {
			var n = yt?.protocol
			if (n !== 'http:' && n !== 'https:')
				return Mn.info('Web Vitals are disabled on non-http/https protocols'), !1
			var r = je(this._instance.config.capture_performance)
				? this._instance.config.capture_performance.web_vitals
				: Jt(this._instance.config.capture_performance)
					? this._instance.config.capture_performance
					: void 0
			return Jt(r) ? r : this.qi
		}
		startIfEnabled() {
			this.isEnabled && !this.i && (Mn.info('enabled, starting...'), this.G(this.V))
		}
		onRemoteConfig(n) {
			var r = je(n.capturePerformance) && !!n.capturePerformance.web_vitals,
				o = je(n.capturePerformance) ? n.capturePerformance.web_vitals_allowed_metrics : void 0
			this._instance.persistence &&
				(this._instance.persistence.register({ [Td]: r }),
				this._instance.persistence.register({ [Nd]: o })),
				(this.qi = r),
				this.startIfEnabled()
		}
		G(n) {
			var r, o
			;(r = me.__PosthogExtensions__) != null && r.postHogWebVitalsCallbacks && n(),
				(o = me.__PosthogExtensions__) == null ||
					o.loadExternalDependency == null ||
					o.loadExternalDependency(this._instance, 'web-vitals', (l) => {
						l ? Mn.error('failed to load script', l) : n()
					})
		}
		Gi() {
			var n = N ? N.location.href : void 0
			return n || Mn.error('Could not determine current URL'), n
		}
	}
	var ay = nt('[Heatmaps]')
	function jf(i) {
		return je(i) && 'clientX' in i && 'clientY' in i && ot(i.clientX) && ot(i.clientY)
	}
	class ly {
		constructor(n) {
			var r
			;(this.rageclicks = new tf()),
				(this.qi = !1),
				(this.i = !1),
				(this.Vi = null),
				(this.instance = n),
				(this.qi = !((r = this.instance.persistence) == null || !r.props[Ga]))
		}
		get flushIntervalMilliseconds() {
			var n = 5e3
			return (
				je(this.instance.config.capture_heatmaps) &&
					this.instance.config.capture_heatmaps.flush_interval_milliseconds &&
					(n = this.instance.config.capture_heatmaps.flush_interval_milliseconds),
				n
			)
		}
		get isEnabled() {
			return K(this.instance.config.capture_heatmaps)
				? K(this.instance.config.enable_heatmaps)
					? this.qi
					: this.instance.config.enable_heatmaps
				: this.instance.config.capture_heatmaps !== !1
		}
		startIfEnabled() {
			if (this.isEnabled) {
				if (this.i) return
				ay.info('starting...'),
					this.Ki(),
					(this.Vi = setInterval(this.Yi.bind(this), this.flushIntervalMilliseconds))
			} else {
				var n, r
				clearInterval((n = this.Vi) !== null && n !== void 0 ? n : void 0),
					(r = this.Xi) == null || r.stop(),
					this.getAndClearBuffer()
			}
		}
		onRemoteConfig(n) {
			var r = !!n.heatmaps
			this.instance.persistence && this.instance.persistence.register({ [Ga]: r }),
				(this.qi = r),
				this.startIfEnabled()
		}
		getAndClearBuffer() {
			var n = this.M
			return (this.M = void 0), n
		}
		Qi(n) {
			this.Zi(n.originalEvent, 'deadclick')
		}
		Ki() {
			N &&
				J &&
				(Ae(N, 'beforeunload', this.Yi.bind(this)),
				Ae(J, 'click', (n) => this.Zi(n || N?.event), { capture: !0 }),
				Ae(J, 'mousemove', (n) => this.te(n || N?.event), { capture: !0 }),
				(this.Xi = new af(this.instance, f_, this.Qi.bind(this))),
				this.Xi.startIfEnabled(),
				(this.i = !0))
		}
		ie(n, r) {
			var o = this.instance.scrollManager.scrollY(),
				l = this.instance.scrollManager.scrollX(),
				u = this.instance.scrollManager.scrollElement(),
				d = (function (p, h, g) {
					for (var m = p; m && Bs(m) && !Tn(m, 'body'); ) {
						if (m === g) return !1
						if (ye(h, N?.getComputedStyle(m).position)) return !0
						m = Qd(m)
					}
					return !1
				})(Gd(n), ['fixed', 'sticky'], u)
			return { x: n.clientX + (d ? 0 : l), y: n.clientY + (d ? 0 : o), target_fixed: d, type: r }
		}
		Zi(n, r) {
			var o
			if ((r === void 0 && (r = 'click'), !Bd(n.target) && jf(n))) {
				var l = this.ie(n, r)
				;(o = this.rageclicks) != null &&
					o.isRageClick(n.clientX, n.clientY, new Date().getTime()) &&
					this.ee(Z({}, l, { type: 'rageclick' })),
					this.ee(l)
			}
		}
		te(n) {
			!Bd(n.target) &&
				jf(n) &&
				(clearTimeout(this.re),
				(this.re = setTimeout(() => {
					this.ee(this.ie(n, 'mousemove'))
				}, 500)))
		}
		ee(n) {
			if (N) {
				var r = N.location.href
				;(this.M = this.M || {}), this.M[r] || (this.M[r] = []), this.M[r].push(n)
			}
		}
		Yi() {
			this.M &&
				!br(this.M) &&
				this.instance.capture('$$heatmap', { $heatmap_data: this.getAndClearBuffer() })
		}
	}
	class uy {
		constructor(n) {
			this._instance = n
		}
		doPageView(n, r) {
			var o,
				l = this.se(n, r)
			return (
				(this.ne = {
					pathname: (o = N?.location.pathname) !== null && o !== void 0 ? o : '',
					pageViewId: r,
					timestamp: n,
				}),
				this._instance.scrollManager.resetContext(),
				l
			)
		}
		doPageLeave(n) {
			var r
			return this.se(n, (r = this.ne) == null ? void 0 : r.pageViewId)
		}
		doEvent() {
			var n
			return { $pageview_id: (n = this.ne) == null ? void 0 : n.pageViewId }
		}
		se(n, r) {
			var o = this.ne
			if (!o) return { $pageview_id: r }
			var l = { $pageview_id: r, $prev_pageview_id: o.pageViewId },
				u = this._instance.scrollManager.getContext()
			if (u && !this._instance.config.disable_scroll_properties) {
				var {
					maxScrollHeight: d,
					lastScrollY: p,
					maxScrollY: h,
					maxContentHeight: g,
					lastContentY: m,
					maxContentY: w,
				} = u
				if (!(K(d) || K(p) || K(h) || K(g) || K(m) || K(w))) {
					;(d = Math.ceil(d)),
						(p = Math.ceil(p)),
						(h = Math.ceil(h)),
						(g = Math.ceil(g)),
						(m = Math.ceil(m)),
						(w = Math.ceil(w))
					var _ = d <= 1 ? 1 : Mt(p / d, 0, 1),
						S = d <= 1 ? 1 : Mt(h / d, 0, 1),
						M = g <= 1 ? 1 : Mt(m / g, 0, 1),
						k = g <= 1 ? 1 : Mt(w / g, 0, 1)
					l = Ge(l, {
						$prev_pageview_last_scroll: p,
						$prev_pageview_last_scroll_percentage: _,
						$prev_pageview_max_scroll: h,
						$prev_pageview_max_scroll_percentage: S,
						$prev_pageview_last_content: m,
						$prev_pageview_last_content_percentage: M,
						$prev_pageview_max_content: w,
						$prev_pageview_max_content_percentage: k,
					})
				}
			}
			return (
				o.pathname && (l.$prev_pageview_pathname = o.pathname),
				o.timestamp && (l.$prev_pageview_duration = (n.getTime() - o.timestamp.getTime()) / 1e3),
				l
			)
		}
	}
	var cy = function (i) {
			var n,
				r,
				o,
				l,
				u = ''
			for (
				n = r = 0,
					o = (i = (i + '')
						.replace(
							/\r\n/g,
							`
`
						)
						.replace(
							/\r/g,
							`
`
						)).length,
					l = 0;
				l < o;
				l++
			) {
				var d = i.charCodeAt(l),
					p = null
				d < 128
					? r++
					: (p =
							d > 127 && d < 2048
								? String.fromCharCode((d >> 6) | 192, (63 & d) | 128)
								: String.fromCharCode((d >> 12) | 224, ((d >> 6) & 63) | 128, (63 & d) | 128)),
					Rn(p) || (r > n && (u += i.substring(n, r)), (u += p), (n = r = l + 1))
			}
			return r > n && (u += i.substring(n, i.length)), u
		},
		dy = !!Ba || !!Ua,
		Uf = 'text/plain',
		io = (i, n) => {
			var [r, o] = i.split('?'),
				l = Z({}, n)
			o?.split('&').forEach((d) => {
				var [p] = d.split('=')
				delete l[p]
			})
			var u = Jm(l)
			return r + '?' + (u = u ? (o ? o + '&' : '') + u : o)
		},
		Ri = (i, n) => JSON.stringify(i, (r, o) => (typeof o == 'bigint' ? o.toString() : o), n),
		Ol = (i) => {
			var { data: n, compression: r } = i
			if (n) {
				if (r === pn.GZipJS) {
					var o = Rf(If(Ri(n)), { mtime: 0 }),
						l = new Blob([o], { type: Uf })
					return { contentType: Uf, body: l, estimatedSize: l.size }
				}
				if (r === pn.Base64) {
					var u = (function (h) {
							var g,
								m,
								w,
								_,
								S,
								M = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
								k = 0,
								F = 0,
								j = '',
								q = []
							if (!h) return h
							h = cy(h)
							do
								(g =
									((S = (h.charCodeAt(k++) << 16) | (h.charCodeAt(k++) << 8) | h.charCodeAt(k++)) >>
										18) &
									63),
									(m = (S >> 12) & 63),
									(w = (S >> 6) & 63),
									(_ = 63 & S),
									(q[F++] = M.charAt(g) + M.charAt(m) + M.charAt(w) + M.charAt(_))
							while (k < h.length)
							switch (((j = q.join('')), h.length % 3)) {
								case 1:
									j = j.slice(0, -2) + '=='
									break
								case 2:
									j = j.slice(0, -1) + '='
							}
							return j
						})(Ri(n)),
						d = ((h) => 'data=' + encodeURIComponent(typeof h == 'string' ? h : Ri(h)))(u)
					return {
						contentType: 'application/x-www-form-urlencoded',
						body: d,
						estimatedSize: new Blob([d]).size,
					}
				}
				var p = Ri(n)
				return { contentType: 'application/json', body: p, estimatedSize: new Blob([p]).size }
			}
		},
		Ii = []
	Ua &&
		Ii.push({
			transport: 'fetch',
			method: (i) => {
				var n,
					r,
					{
						contentType: o,
						body: l,
						estimatedSize: u,
					} = (n = Ol(i)) !== null && n !== void 0 ? n : {},
					d = new Headers()
				be(i.headers, function (m, w) {
					d.append(w, m)
				}),
					o && d.append('Content-Type', o)
				var p = i.url,
					h = null
				if (yd) {
					var g = new yd()
					h = { signal: g.signal, timeout: setTimeout(() => g.abort(), i.timeout) }
				}
				Ua(
					p,
					Z(
						{
							method: i?.method || 'GET',
							headers: d,
							keepalive: i.method === 'POST' && (u || 0) < 52428.8,
							body: l,
							signal: (r = h) == null ? void 0 : r.signal,
						},
						i.fetchOptions
					)
				)
					.then((m) =>
						m.text().then((w) => {
							var _ = { statusCode: m.status, text: w }
							if (m.status === 200)
								try {
									_.json = JSON.parse(w)
								} catch (S) {
									ie.error(S)
								}
							i.callback == null || i.callback(_)
						})
					)
					.catch((m) => {
						ie.error(m), i.callback == null || i.callback({ statusCode: 0, text: m })
					})
					.finally(() => (h ? clearTimeout(h.timeout) : null))
			},
		}),
		Ba &&
			Ii.push({
				transport: 'XHR',
				method: (i) => {
					var n,
						r = new Ba()
					r.open(i.method || 'GET', i.url, !0)
					var { contentType: o, body: l } = (n = Ol(i)) !== null && n !== void 0 ? n : {}
					be(i.headers, function (u, d) {
						r.setRequestHeader(d, u)
					}),
						o && r.setRequestHeader('Content-Type', o),
						i.timeout && (r.timeout = i.timeout),
						(r.withCredentials = !0),
						(r.onreadystatechange = () => {
							if (r.readyState === 4) {
								var u = { statusCode: r.status, text: r.responseText }
								if (r.status === 200)
									try {
										u.json = JSON.parse(r.responseText)
									} catch {}
								i.callback == null || i.callback(u)
							}
						}),
						r.send(l)
				},
			}),
		Rt != null &&
			Rt.sendBeacon &&
			Ii.push({
				transport: 'sendBeacon',
				method: (i) => {
					var n = io(i.url, { beacon: '1' })
					try {
						var r,
							{ contentType: o, body: l } = (r = Ol(i)) !== null && r !== void 0 ? r : {},
							u = typeof l == 'string' ? new Blob([l], { type: o }) : l
						Rt.sendBeacon(n, u)
					} catch {}
				},
			})
	var Mr = function (i, n) {
		if (
			!(function (r) {
				try {
					new RegExp(r)
				} catch {
					return !1
				}
				return !0
			})(n)
		)
			return !1
		try {
			return new RegExp(n).test(i)
		} catch {
			return !1
		}
	}
	function Bf(i, n, r) {
		return Ri({ distinct_id: i, userPropertiesToSet: n, userPropertiesToSetOnce: r })
	}
	var fy = {
			exact: (i, n) => n.some((r) => i.some((o) => r === o)),
			is_not: (i, n) => n.every((r) => i.every((o) => r !== o)),
			regex: (i, n) => n.some((r) => i.some((o) => Mr(r, o))),
			not_regex: (i, n) => n.every((r) => i.every((o) => !Mr(r, o))),
			icontains: (i, n) => n.map(so).some((r) => i.map(so).some((o) => r.includes(o))),
			not_icontains: (i, n) => n.map(so).every((r) => i.map(so).every((o) => !r.includes(o))),
		},
		so = (i) => i.toLowerCase(),
		py = nt('[Error tracking]')
	class hy {
		constructor(n) {
			var r, o
			;(this.oe = []),
				(this._instance = n),
				(this.oe =
					(r = (o = this._instance.persistence) == null ? void 0 : o.get_property(Qa)) !== null &&
					r !== void 0
						? r
						: [])
		}
		onRemoteConfig(n) {
			var r,
				o,
				l =
					(r = (o = n.errorTracking) == null ? void 0 : o.suppressionRules) !== null && r !== void 0
						? r
						: []
			;(this.oe = l),
				this._instance.persistence && this._instance.persistence.register({ [Qa]: this.oe })
		}
		sendExceptionEvent(n) {
			this.ae(n)
				? py.info('Skipping exception capture because a suppression rule matched')
				: this._instance.capture('$exception', n, { _noTruncate: !0, _batchKey: 'exceptionEvent' })
		}
		ae(n) {
			var r = n.$exception_list
			if (!r || !Le(r) || r.length === 0) return !1
			var o = r.reduce(
				(l, u) => {
					var { type: d, value: p } = u
					return (
						Ue(d) && d.length > 0 && l.$exception_types.push(d),
						Ue(p) && p.length > 0 && l.$exception_messages.push(p),
						l
					)
				},
				{ $exception_types: [], $exception_messages: [] }
			)
			return this.oe.some((l) => {
				var u = l.values.map((d) => {
					var p = fy[d.operator],
						h = Le(d.value) ? d.value : [d.value],
						g = o[d.key]
					return h.length > 0 && p(h, g)
				})
				return l.type === 'OR' ? u.some(Boolean) : u.every(Boolean)
			})
		}
	}
	var Dt = 'Mobile',
		oo = 'iOS',
		nn = 'Android',
		Ti = 'Tablet',
		Wf = nn + ' ' + Ti,
		Hf = 'iPad',
		Vf = 'Apple',
		qf = Vf + ' Watch',
		Oi = 'Safari',
		Lr = 'BlackBerry',
		Gf = 'Samsung',
		Qf = Gf + 'Browser',
		Kf = Gf + ' Internet',
		ur = 'Chrome',
		vy = ur + ' OS',
		Xf = ur + ' ' + oo,
		Nl = 'Internet Explorer',
		Yf = Nl + ' ' + Dt,
		Fl = 'Opera',
		gy = Fl + ' Mini',
		Ml = 'Edge',
		Zf = 'Microsoft ' + Ml,
		Dr = 'Firefox',
		Jf = Dr + ' ' + oo,
		Ni = 'Nintendo',
		Fi = 'PlayStation',
		Ar = 'Xbox',
		ep = nn + ' ' + Dt,
		tp = Dt + ' ' + Oi,
		Mi = 'Windows',
		Ll = Mi + ' Phone',
		np = 'Nokia',
		Dl = 'Ouya',
		rp = 'Generic',
		my = rp + ' ' + Dt.toLowerCase(),
		ip = rp + ' ' + Ti.toLowerCase(),
		Al = 'Konqueror',
		ht = '(\\d+(\\.\\d+)?)',
		$l = new RegExp('Version/' + ht),
		_y = new RegExp(Ar, 'i'),
		yy = new RegExp(Fi + ' \\w+', 'i'),
		wy = new RegExp(Ni + ' \\w+', 'i'),
		zl = new RegExp(Lr + '|PlayBook|BB10', 'i'),
		Sy = {
			'NT3.51': 'NT 3.11',
			'NT4.0': 'NT 4.0',
			'5.0': '2000',
			5.1: 'XP',
			5.2: 'XP',
			'6.0': 'Vista',
			6.1: '7',
			6.2: '8',
			6.3: '8.1',
			6.4: '10',
			'10.0': '10',
		},
		Ey = (i, n) =>
			(n && ye(n, Vf)) ||
			(function (r) {
				return ye(r, Oi) && !ye(r, ur) && !ye(r, nn)
			})(i),
		sp = function (i, n) {
			return (
				(n = n || ''),
				ye(i, ' OPR/') && ye(i, 'Mini')
					? gy
					: ye(i, ' OPR/')
						? Fl
						: zl.test(i)
							? Lr
							: ye(i, 'IE' + Dt) || ye(i, 'WPDesktop')
								? Yf
								: ye(i, Qf)
									? Kf
									: ye(i, Ml) || ye(i, 'Edg/')
										? Zf
										: ye(i, 'FBIOS')
											? 'Facebook ' + Dt
											: ye(i, 'UCWEB') || ye(i, 'UCBrowser')
												? 'UC Browser'
												: ye(i, 'CriOS')
													? Xf
													: ye(i, 'CrMo') || ye(i, ur)
														? ur
														: ye(i, nn) && ye(i, Oi)
															? ep
															: ye(i, 'FxiOS')
																? Jf
																: ye(i.toLowerCase(), Al.toLowerCase())
																	? Al
																	: Ey(i, n)
																		? ye(i, Dt)
																			? tp
																			: Oi
																		: ye(i, Dr)
																			? Dr
																			: ye(i, 'MSIE') || ye(i, 'Trident/')
																				? Nl
																				: ye(i, 'Gecko')
																					? Dr
																					: ''
			)
		},
		ky = {
			[Yf]: [new RegExp('rv:' + ht)],
			[Zf]: [new RegExp(Ml + '?\\/' + ht)],
			[ur]: [new RegExp('(' + ur + '|CrMo)\\/' + ht)],
			[Xf]: [new RegExp('CriOS\\/' + ht)],
			'UC Browser': [new RegExp('(UCBrowser|UCWEB)\\/' + ht)],
			[Oi]: [$l],
			[tp]: [$l],
			[Fl]: [new RegExp('(Opera|OPR)\\/' + ht)],
			[Dr]: [new RegExp(Dr + '\\/' + ht)],
			[Jf]: [new RegExp('FxiOS\\/' + ht)],
			[Al]: [new RegExp('Konqueror[:/]?' + ht, 'i')],
			[Lr]: [new RegExp(Lr + ' ' + ht), $l],
			[ep]: [new RegExp('android\\s' + ht, 'i')],
			[Kf]: [new RegExp(Qf + '\\/' + ht)],
			[Nl]: [new RegExp('(rv:|MSIE )' + ht)],
			Mozilla: [new RegExp('rv:' + ht)],
		},
		xy = function (i, n) {
			var r = sp(i, n),
				o = ky[r]
			if (K(o)) return null
			for (var l = 0; l < o.length; l++) {
				var u = o[l],
					d = i.match(u)
				if (d) return parseFloat(d[d.length - 2])
			}
			return null
		},
		op = [
			[new RegExp(Ar + '; ' + Ar + ' (.*?)[);]', 'i'), (i) => [Ar, (i && i[1]) || '']],
			[new RegExp(Ni, 'i'), [Ni, '']],
			[new RegExp(Fi, 'i'), [Fi, '']],
			[zl, [Lr, '']],
			[
				new RegExp(Mi, 'i'),
				(i, n) => {
					if (/Phone/.test(n) || /WPDesktop/.test(n)) return [Ll, '']
					if (new RegExp(Dt).test(n) && !/IEMobile\b/.test(n)) return [Mi + ' ' + Dt, '']
					var r = /Windows NT ([0-9.]+)/i.exec(n)
					if (r && r[1]) {
						var o = r[1],
							l = Sy[o] || ''
						return /arm/i.test(n) && (l = 'RT'), [Mi, l]
					}
					return [Mi, '']
				},
			],
			[
				/((iPhone|iPad|iPod).*?OS (\d+)_(\d+)_?(\d+)?|iPhone)/,
				(i) => {
					if (i && i[3]) {
						var n = [i[3], i[4], i[5] || '0']
						return [oo, n.join('.')]
					}
					return [oo, '']
				},
			],
			[
				/(watch.*\/(\d+\.\d+\.\d+)|watch os,(\d+\.\d+),)/i,
				(i) => {
					var n = ''
					return i && i.length >= 3 && (n = K(i[2]) ? i[3] : i[2]), ['watchOS', n]
				},
			],
			[
				new RegExp('(' + nn + ' (\\d+)\\.(\\d+)\\.?(\\d+)?|' + nn + ')', 'i'),
				(i) => {
					if (i && i[2]) {
						var n = [i[2], i[3], i[4] || '0']
						return [nn, n.join('.')]
					}
					return [nn, '']
				},
			],
			[
				/Mac OS X (\d+)[_.](\d+)[_.]?(\d+)?/i,
				(i) => {
					var n = ['Mac OS X', '']
					if (i && i[1]) {
						var r = [i[1], i[2], i[3] || '0']
						n[1] = r.join('.')
					}
					return n
				},
			],
			[/Mac/i, ['Mac OS X', '']],
			[/CrOS/, [vy, '']],
			[/Linux|debian/i, ['Linux', '']],
		],
		ap = function (i) {
			return wy.test(i)
				? Ni
				: yy.test(i)
					? Fi
					: _y.test(i)
						? Ar
						: new RegExp(Dl, 'i').test(i)
							? Dl
							: new RegExp('(' + Ll + '|WPDesktop)', 'i').test(i)
								? Ll
								: /iPad/.test(i)
									? Hf
									: /iPod/.test(i)
										? 'iPod Touch'
										: /iPhone/.test(i)
											? 'iPhone'
											: /(watch)(?: ?os[,/]|\d,\d\/)[\d.]+/i.test(i)
												? qf
												: zl.test(i)
													? Lr
													: /(kobo)\s(ereader|touch)/i.test(i)
														? 'Kobo'
														: new RegExp(np, 'i').test(i)
															? np
															: /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i.test(i) ||
																  /(kf[a-z]+)( bui|\)).+silk\//i.test(i)
																? 'Kindle Fire'
																: /(Android|ZTE)/i.test(i)
																	? !new RegExp(Dt).test(i) ||
																		/(9138B|TB782B|Nexus [97]|pixel c|HUAWEISHT|BTV|noble nook|smart ultra 6)/i.test(
																			i
																		)
																		? (/pixel[\daxl ]{1,6}/i.test(i) && !/pixel c/i.test(i)) ||
																			/(huaweimed-al00|tah-|APA|SM-G92|i980|zte|U304AA)/i.test(i) ||
																			(/lmy47v/i.test(i) && !/QTAQZ3/i.test(i))
																			? nn
																			: Wf
																		: nn
																	: new RegExp('(pda|' + Dt + ')', 'i').test(i)
																		? my
																		: new RegExp(Ti, 'i').test(i) &&
																			  !new RegExp(Ti + ' pc', 'i').test(i)
																			? ip
																			: ''
		},
		ao = 'https?://(.*)',
		lo = [
			'gclid',
			'gclsrc',
			'dclid',
			'gbraid',
			'wbraid',
			'fbclid',
			'msclkid',
			'twclid',
			'li_fat_id',
			'igshid',
			'ttclid',
			'rdt_cid',
			'epik',
			'qclid',
			'sccid',
			'irclid',
			'_kx',
		],
		Cy = Ms(
			[
				'utm_source',
				'utm_medium',
				'utm_campaign',
				'utm_content',
				'utm_term',
				'gad_source',
				'mc_cid',
			],
			lo
		),
		jl = '<masked>'
	function lp(i, n, r) {
		if (!J) return {}
		var o = n ? Ms([], lo, r || []) : []
		return up(al(J.URL, o, jl), i)
	}
	function up(i, n) {
		var r = Cy.concat(n || []),
			o = {}
		return (
			be(r, function (l) {
				var u = Vs(i, l)
				o[l] = u || null
			}),
			o
		)
	}
	function cp(i) {
		var n = (function (u) {
				return u
					? u.search(ao + 'google.([^/?]*)') === 0
						? 'google'
						: u.search(ao + 'bing.com') === 0
							? 'bing'
							: u.search(ao + 'yahoo.com') === 0
								? 'yahoo'
								: u.search(ao + 'duckduckgo.com') === 0
									? 'duckduckgo'
									: null
					: null
			})(i),
			r = n != 'yahoo' ? 'q' : 'p',
			o = {}
		if (!Rn(n)) {
			o.$search_engine = n
			var l = J ? Vs(J.referrer, r) : ''
			l.length && (o.ph_keyword = l)
		}
		return o
	}
	function dp() {
		return navigator.language || navigator.userLanguage
	}
	function fp() {
		return J?.referrer || '$direct'
	}
	function pp(i, n) {
		var r = i ? Ms([], lo, n || []) : [],
			o = yt?.href.substring(0, 1e3)
		return { r: fp().substring(0, 1e3), u: o ? al(o, r, jl) : void 0 }
	}
	function hp(i) {
		var n,
			{ r, u: o } = i,
			l = {
				$referrer: r,
				$referring_domain:
					r == null ? void 0 : r == '$direct' ? '$direct' : (n = Tr(r)) == null ? void 0 : n.host,
			}
		if (o) {
			l.$current_url = o
			var u = Tr(o)
			;(l.$host = u?.host), (l.$pathname = u?.pathname)
			var d = up(o)
			Ge(l, d)
		}
		if (r) {
			var p = cp(r)
			Ge(l, p)
		}
		return l
	}
	function vp() {
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone
		} catch {
			return
		}
	}
	function Py() {
		try {
			return new Date().getTimezoneOffset()
		} catch {
			return
		}
	}
	function by(i, n) {
		if (!wt) return {}
		var r,
			o,
			l,
			u = i ? Ms([], lo, n || []) : [],
			[d, p] = (function (h) {
				for (var g = 0; g < op.length; g++) {
					var [m, w] = op[g],
						_ = m.exec(h),
						S = _ && (Ft(w) ? w(_, h) : w)
					if (S) return S
				}
				return ['', '']
			})(wt)
		return Ge(
			qa({
				$os: d,
				$os_version: p,
				$browser: sp(wt, navigator.vendor),
				$device: ap(wt),
				$device_type:
					((o = wt),
					(l = ap(o)),
					l === Hf || l === Wf || l === 'Kobo' || l === 'Kindle Fire' || l === ip
						? Ti
						: l === Ni || l === Ar || l === Fi || l === Dl
							? 'Console'
							: l === qf
								? 'Wearable'
								: l
									? Dt
									: 'Desktop'),
				$timezone: vp(),
				$timezone_offset: Py(),
			}),
			{
				$current_url: al(yt?.href, u, jl),
				$host: yt?.host,
				$pathname: yt?.pathname,
				$raw_user_agent: wt.length > 1e3 ? wt.substring(0, 997) + '...' : wt,
				$browser_version: xy(wt, navigator.vendor),
				$browser_language: dp(),
				$browser_language_prefix: ((r = dp()), typeof r == 'string' ? r.split('-')[0] : void 0),
				$screen_height: N?.screen.height,
				$screen_width: N?.screen.width,
				$viewport_height: N?.innerHeight,
				$viewport_width: N?.innerWidth,
				$lib: 'web',
				$lib_version: fn.LIB_VERSION,
				$insert_id:
					Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10),
				$time: Date.now() / 1e3,
			}
		)
	}
	var rn = nt('[FeatureFlags]'),
		Ul = '$active_feature_flags',
		$r = '$override_feature_flags',
		gp = '$feature_flag_payloads',
		Li = '$override_feature_flag_payloads',
		mp = '$feature_flag_request_id',
		_p = (i) => {
			var n = {}
			for (var [r, o] of Ls(i || {})) o && (n[r] = o)
			return n
		},
		Ry = (i) => {
			var n = i.flags
			return (
				n
					? ((i.featureFlags = Object.fromEntries(
							Object.keys(n).map((r) => {
								var o
								return [r, (o = n[r].variant) !== null && o !== void 0 ? o : n[r].enabled]
							})
						)),
						(i.featureFlagPayloads = Object.fromEntries(
							Object.keys(n)
								.filter((r) => n[r].enabled)
								.filter((r) => {
									var o
									return (o = n[r].metadata) == null ? void 0 : o.payload
								})
								.map((r) => {
									var o
									return [r, (o = n[r].metadata) == null ? void 0 : o.payload]
								})
						)))
					: rn.warn(
							'Using an older version of the feature flags endpoint. Please upgrade your PostHog server to the latest version'
						),
				i
			)
		},
		Iy = (function (i) {
			return (i.FeatureFlags = 'feature_flags'), (i.Recordings = 'recordings'), i
		})({})
	class Ty {
		constructor(n) {
			;(this.le = !1),
				(this.ue = !1),
				(this.he = !1),
				(this.de = !1),
				(this.ve = !1),
				(this.ce = !1),
				(this.fe = !1),
				(this._instance = n),
				(this.featureFlagEventHandlers = [])
		}
		decide() {
			if (this._instance.config.__preview_remote_config) this.ce = !0
			else {
				var n =
					!this.pe &&
					(this._instance.config.advanced_disable_feature_flags ||
						this._instance.config.advanced_disable_feature_flags_on_first_load)
				this.ge({ disableFlags: n })
			}
		}
		get hasLoadedFlags() {
			return this.ue
		}
		getFlags() {
			return Object.keys(this.getFlagVariants())
		}
		getFlagsWithDetails() {
			var n = this._instance.get_property(Za),
				r = this._instance.get_property($r),
				o = this._instance.get_property(Li)
			if (!o && !r) return n || {}
			var l = Ge({}, n || {}),
				u = [...new Set([...Object.keys(o || {}), ...Object.keys(r || {})])]
			for (var d of u) {
				var p,
					h,
					g = l[d],
					m = r?.[d],
					w = K(m) ? (p = g?.enabled) !== null && p !== void 0 && p : !!m,
					_ = K(m) ? g.variant : typeof m == 'string' ? m : void 0,
					S = o?.[d],
					M = Z({}, g, { enabled: w, variant: w ? _ ?? g?.variant : void 0 })
				w !== g?.enabled && (M.original_enabled = g?.enabled),
					_ !== g?.variant && (M.original_variant = g?.variant),
					S &&
						(M.metadata = Z({}, g?.metadata, {
							payload: S,
							original_payload: g == null || (h = g.metadata) == null ? void 0 : h.payload,
						})),
					(l[d] = M)
			}
			return (
				this.le ||
					(rn.warn(' Overriding feature flag details!', {
						flagDetails: n,
						overriddenPayloads: o,
						finalDetails: l,
					}),
					(this.le = !0)),
				l
			)
		}
		getFlagVariants() {
			var n = this._instance.get_property(Rr),
				r = this._instance.get_property($r)
			if (!r) return n || {}
			for (var o = Ge({}, n), l = Object.keys(r), u = 0; u < l.length; u++) o[l[u]] = r[l[u]]
			return (
				this.le ||
					(rn.warn(' Overriding feature flags!', {
						enabledFlags: n,
						overriddenFlags: r,
						finalFlags: o,
					}),
					(this.le = !0)),
				o
			)
		}
		getFlagPayloads() {
			var n = this._instance.get_property(gp),
				r = this._instance.get_property(Li)
			if (!r) return n || {}
			for (var o = Ge({}, n || {}), l = Object.keys(r), u = 0; u < l.length; u++) o[l[u]] = r[l[u]]
			return (
				this.le ||
					(rn.warn(' Overriding feature flag payloads!', {
						flagPayloads: n,
						overriddenPayloads: r,
						finalPayloads: o,
					}),
					(this.le = !0)),
				o
			)
		}
		reloadFeatureFlags() {
			this.de ||
				this._instance.config.advanced_disable_feature_flags ||
				this.pe ||
				(this.pe = setTimeout(() => {
					this.ge()
				}, 5))
		}
		_e() {
			clearTimeout(this.pe), (this.pe = void 0)
		}
		ensureFlagsLoaded() {
			this.ue || this.he || this.pe || this.reloadFeatureFlags()
		}
		setAnonymousDistinctId(n) {
			this.$anon_distinct_id = n
		}
		setReloadingPaused(n) {
			this.de = n
		}
		ge(n) {
			var r
			if ((this._e(), !this._instance.config.advanced_disable_decide))
				if (this.he) this.ve = !0
				else {
					var o = {
						token: this._instance.config.token,
						distinct_id: this._instance.get_distinct_id(),
						groups: this._instance.getGroups(),
						$anon_distinct_id: this.$anon_distinct_id,
						person_properties: Z(
							{},
							((r = this._instance.persistence) == null ? void 0 : r.get_initial_props()) || {},
							this._instance.get_property(Ei) || {}
						),
						group_properties: this._instance.get_property(rr),
					}
					;((n != null && n.disableFlags) ||
						this._instance.config.advanced_disable_feature_flags) &&
						(o.disable_flags = !0)
					var l =
						this._instance.config.__preview_flags_v2 &&
						this._instance.config.__preview_remote_config
					l && (o.timezone = vp()),
						(this.he = !0),
						this._instance.me({
							method: 'POST',
							url: this._instance.requestRouter.endpointFor(
								'api',
								l ? '/flags/?v=2' : '/decide/?v=4'
							),
							data: o,
							compression: this._instance.config.disable_compression ? void 0 : pn.Base64,
							timeout: this._instance.config.feature_flag_request_timeout_ms,
							callback: (u) => {
								var d,
									p,
									h = !0
								if (
									(u.statusCode === 200 && (this.ve || (this.$anon_distinct_id = void 0), (h = !1)),
									(this.he = !1),
									this.ce ||
										((this.ce = !0),
										this._instance.be((p = u.json) !== null && p !== void 0 ? p : {})),
									!o.disable_flags || this.ve)
								)
									if (
										((this.fe = !h),
										u.json && (d = u.json.quotaLimited) != null && d.includes(Iy.FeatureFlags))
									)
										rn.warn(
											'You have hit your feature flags quota limit, and will not be able to load feature flags until the quota is reset.  Please visit https://posthog.com/docs/billing/limits-alerts to learn more.'
										)
									else {
										var g
										o.disable_flags ||
											this.receivedFeatureFlags((g = u.json) !== null && g !== void 0 ? g : {}, h),
											this.ve && ((this.ve = !1), this.ge())
									}
							},
						})
				}
		}
		getFeatureFlag(n, r) {
			if ((r === void 0 && (r = {}), this.ue || (this.getFlags() && this.getFlags().length > 0))) {
				var o = this.getFlagVariants()[n],
					l = '' + o,
					u = this._instance.get_property(mp) || void 0,
					d = this._instance.get_property(zs) || {}
				if ((r.send_event || !('send_event' in r)) && (!(n in d) || !d[n].includes(l))) {
					var p, h, g, m, w, _, S, M, k
					Le(d[n]) ? d[n].push(l) : (d[n] = [l]),
						(p = this._instance.persistence) == null || p.register({ [zs]: d })
					var F = this.getFeatureFlagDetails(n),
						j = {
							$feature_flag: n,
							$feature_flag_response: o,
							$feature_flag_payload: this.getFeatureFlagPayload(n) || null,
							$feature_flag_request_id: u,
							$feature_flag_bootstrapped_response:
								((h = this._instance.config.bootstrap) == null || (h = h.featureFlags) == null
									? void 0
									: h[n]) || null,
							$feature_flag_bootstrapped_payload:
								((g = this._instance.config.bootstrap) == null ||
								(g = g.featureFlagPayloads) == null
									? void 0
									: g[n]) || null,
							$used_bootstrap_value: !this.fe,
						}
					K(F == null || (m = F.metadata) == null ? void 0 : m.version) ||
						(j.$feature_flag_version = F.metadata.version)
					var q,
						G =
							(w = F == null || (_ = F.reason) == null ? void 0 : _.description) !== null &&
							w !== void 0
								? w
								: F == null || (S = F.reason) == null
									? void 0
									: S.code
					G && (j.$feature_flag_reason = G),
						F != null && (M = F.metadata) != null && M.id && (j.$feature_flag_id = F.metadata.id),
						(K(F?.original_variant) && K(F?.original_enabled)) ||
							(j.$feature_flag_original_response = K(F.original_variant)
								? F.original_enabled
								: F.original_variant),
						F != null &&
							(k = F.metadata) != null &&
							k.original_payload &&
							(j.$feature_flag_original_payload =
								F == null || (q = F.metadata) == null ? void 0 : q.original_payload),
						this._instance.capture('$feature_flag_called', j)
				}
				return o
			}
			rn.warn('getFeatureFlag for key "' + n + `" failed. Feature flags didn't load in time.`)
		}
		getFeatureFlagDetails(n) {
			return this.getFlagsWithDetails()[n]
		}
		getFeatureFlagPayload(n) {
			return this.getFlagPayloads()[n]
		}
		getRemoteConfigPayload(n, r) {
			var o = this._instance.config.token
			this._instance.me({
				method: 'POST',
				url: this._instance.requestRouter.endpointFor('api', '/decide/?v=4'),
				data: { distinct_id: this._instance.get_distinct_id(), token: o },
				compression: this._instance.config.disable_compression ? void 0 : pn.Base64,
				timeout: this._instance.config.feature_flag_request_timeout_ms,
				callback: (l) => {
					var u,
						d = (u = l.json) == null ? void 0 : u.featureFlagPayloads
					r(d?.[n] || void 0)
				},
			})
		}
		isFeatureEnabled(n, r) {
			if ((r === void 0 && (r = {}), this.ue || (this.getFlags() && this.getFlags().length > 0)))
				return !!this.getFeatureFlag(n, r)
			rn.warn('isFeatureEnabled for key "' + n + `" failed. Feature flags didn't load in time.`)
		}
		addFeatureFlagsHandler(n) {
			this.featureFlagEventHandlers.push(n)
		}
		removeFeatureFlagsHandler(n) {
			this.featureFlagEventHandlers = this.featureFlagEventHandlers.filter((r) => r !== n)
		}
		receivedFeatureFlags(n, r) {
			if (this._instance.persistence) {
				this.ue = !0
				var o = this.getFlagVariants(),
					l = this.getFlagPayloads(),
					u = this.getFlagsWithDetails()
				;(function (d, p, h, g, m) {
					h === void 0 && (h = {}), g === void 0 && (g = {}), m === void 0 && (m = {})
					var w = Ry(d),
						_ = w.flags,
						S = w.featureFlags,
						M = w.featureFlagPayloads
					if (S) {
						var k = d.requestId
						if (Le(S)) {
							rn.warn(
								'v1 of the feature flags endpoint is deprecated. Please use the latest version.'
							)
							var F = {}
							if (S) for (var j = 0; j < S.length; j++) F[S[j]] = !0
							p && p.register({ [Ul]: S, [Rr]: F })
						} else {
							var q = S,
								G = M,
								Q = _
							d.errorsWhileComputingFlags &&
								((q = Z({}, h, q)), (G = Z({}, g, G)), (Q = Z({}, m, Q))),
								p &&
									p.register(
										Z(
											{ [Ul]: Object.keys(_p(q)), [Rr]: q || {}, [gp]: G || {}, [Za]: Q || {} },
											k ? { [mp]: k } : {}
										)
									)
						}
					}
				})(n, this._instance.persistence, o, l, u),
					this.we(r)
			}
		}
		override(n, r) {
			r === void 0 && (r = !1),
				rn.warn('override is deprecated. Please use overrideFeatureFlags instead.'),
				this.overrideFeatureFlags({ flags: n, suppressWarning: r })
		}
		overrideFeatureFlags(n) {
			if (!this._instance.__loaded || !this._instance.persistence)
				return rn.uninitializedWarning('posthog.featureFlags.overrideFeatureFlags')
			if (n === !1)
				return (
					this._instance.persistence.unregister($r),
					this._instance.persistence.unregister(Li),
					void this.we()
				)
			if (n && typeof n == 'object' && ('flags' in n || 'payloads' in n)) {
				var r,
					o = n
				if (((this.le = !!((r = o.suppressWarning) !== null && r !== void 0 && r)), 'flags' in o)) {
					if (o.flags === !1) this._instance.persistence.unregister($r)
					else if (o.flags)
						if (Le(o.flags)) {
							for (var l = {}, u = 0; u < o.flags.length; u++) l[o.flags[u]] = !0
							this._instance.persistence.register({ [$r]: l })
						} else this._instance.persistence.register({ [$r]: o.flags })
				}
				return (
					'payloads' in o &&
						(o.payloads === !1
							? this._instance.persistence.unregister(Li)
							: o.payloads && this._instance.persistence.register({ [Li]: o.payloads })),
					void this.we()
				)
			}
			this.we()
		}
		onFeatureFlags(n) {
			if ((this.addFeatureFlagsHandler(n), this.ue)) {
				var { flags: r, flagVariants: o } = this.ye()
				n(r, o)
			}
			return () => this.removeFeatureFlagsHandler(n)
		}
		updateEarlyAccessFeatureEnrollment(n, r) {
			var o,
				l = (this._instance.get_property(As) || []).find((h) => h.flagKey === n),
				u = { ['$feature_enrollment/' + n]: r },
				d = { $feature_flag: n, $feature_enrollment: r, $set: u }
			l && (d.$early_access_feature_name = l.name),
				this._instance.capture('$feature_enrollment_update', d),
				this.setPersonPropertiesForFlags(u, !1)
			var p = Z({}, this.getFlagVariants(), { [n]: r })
			;(o = this._instance.persistence) == null ||
				o.register({ [Ul]: Object.keys(_p(p)), [Rr]: p }),
				this.we()
		}
		getEarlyAccessFeatures(n, r, o) {
			r === void 0 && (r = !1)
			var l = this._instance.get_property(As),
				u = o ? '&' + o.map((d) => 'stage=' + d).join('&') : ''
			if (l && !r) return n(l)
			this._instance.me({
				url: this._instance.requestRouter.endpointFor(
					'api',
					'/api/early_access_features/?token=' + this._instance.config.token + u
				),
				method: 'GET',
				callback: (d) => {
					var p
					if (d.json) {
						var h = d.json.earlyAccessFeatures
						return (p = this._instance.persistence) == null || p.register({ [As]: h }), n(h)
					}
				},
			})
		}
		ye() {
			var n = this.getFlags(),
				r = this.getFlagVariants()
			return {
				flags: n.filter((o) => r[o]),
				flagVariants: Object.keys(r)
					.filter((o) => r[o])
					.reduce((o, l) => ((o[l] = r[l]), o), {}),
			}
		}
		we(n) {
			var { flags: r, flagVariants: o } = this.ye()
			this.featureFlagEventHandlers.forEach((l) => l(r, o, { errorsLoading: n }))
		}
		setPersonPropertiesForFlags(n, r) {
			r === void 0 && (r = !0)
			var o = this._instance.get_property(Ei) || {}
			this._instance.register({ [Ei]: Z({}, o, n) }), r && this._instance.reloadFeatureFlags()
		}
		resetPersonPropertiesForFlags() {
			this._instance.unregister(Ei)
		}
		setGroupPropertiesForFlags(n, r) {
			r === void 0 && (r = !0)
			var o = this._instance.get_property(rr) || {}
			Object.keys(o).length !== 0 &&
				Object.keys(o).forEach((l) => {
					;(o[l] = Z({}, o[l], n[l])), delete n[l]
				}),
				this._instance.register({ [rr]: Z({}, o, n) }),
				r && this._instance.reloadFeatureFlags()
		}
		resetGroupPropertiesForFlags(n) {
			if (n) {
				var r = this._instance.get_property(rr) || {}
				this._instance.register({ [rr]: Z({}, r, { [n]: {} }) })
			} else this._instance.unregister(rr)
		}
	}
	var Oy = ['cookie', 'localstorage', 'localstorage+cookie', 'sessionstorage', 'memory']
	class Bl {
		constructor(n) {
			;(this.S = n),
				(this.props = {}),
				(this.Se = !1),
				(this.$e = ((r) => {
					var o = ''
					return (
						r.token && (o = r.token.replace(/\+/g, 'PL').replace(/\//g, 'SL').replace(/=/g, 'EQ')),
						r.persistence_name ? 'ph_' + r.persistence_name : 'ph_' + o + '_posthog'
					)
				})(n)),
				(this.q = this.ke(n)),
				this.load(),
				n.debug && ie.info('Persistence loaded', n.persistence, Z({}, this.props)),
				this.update_config(n, n),
				this.save()
		}
		ke(n) {
			Oy.indexOf(n.persistence.toLowerCase()) === -1 &&
				(ie.critical(
					'Unknown persistence type ' + n.persistence + '; falling back to localStorage+cookie'
				),
				(n.persistence = 'localStorage+cookie'))
			var r = n.persistence.toLowerCase()
			return r === 'localstorage' && Ke.O()
				? Ke
				: r === 'localstorage+cookie' && Qs.O()
					? Qs
					: r === 'sessionstorage' && rt.O()
						? rt
						: r === 'memory'
							? c_
							: r === 'cookie'
								? vn
								: Qs.O()
									? Qs
									: vn
		}
		properties() {
			var n = {}
			return (
				be(this.props, function (r, o) {
					if (o === Rr && je(r))
						for (var l = Object.keys(r), u = 0; u < l.length; u++) n['$feature/' + l[u]] = r[l[u]]
					else
						(p = o),
							(h = !1),
							(Rn((d = Hm))
								? h
								: _d && d.indexOf === _d
									? d.indexOf(p) != -1
									: (be(d, function (g) {
											if (h || (h = g === p)) return Fs
										}),
										h)) || (n[o] = r)
					var d, p, h
				}),
				n
			)
		}
		load() {
			if (!this.xe) {
				var n = this.q.D(this.$e)
				n && (this.props = Ge({}, n))
			}
		}
		save() {
			this.xe || this.q.L(this.$e, this.props, this.Ee, this.Ie, this.Pe, this.S.debug)
		}
		remove() {
			this.q.N(this.$e, !1), this.q.N(this.$e, !0)
		}
		clear() {
			this.remove(), (this.props = {})
		}
		register_once(n, r, o) {
			if (je(n)) {
				K(r) && (r = 'None'), (this.Ee = K(o) ? this.Re : o)
				var l = !1
				if (
					(be(n, (u, d) => {
						;(this.props.hasOwnProperty(d) && this.props[d] !== r) ||
							((this.props[d] = u), (l = !0))
					}),
					l)
				)
					return this.save(), !0
			}
			return !1
		}
		register(n, r) {
			if (je(n)) {
				this.Ee = K(r) ? this.Re : r
				var o = !1
				if (
					(be(n, (l, u) => {
						n.hasOwnProperty(u) && this.props[u] !== l && ((this.props[u] = l), (o = !0))
					}),
					o)
				)
					return this.save(), !0
			}
			return !1
		}
		unregister(n) {
			n in this.props && (delete this.props[n], this.save())
		}
		update_campaign_params() {
			if (!this.Se) {
				var n = lp(
					this.S.custom_campaign_params,
					this.S.mask_personal_data_properties,
					this.S.custom_personal_data_properties
				)
				br(qa(n)) || this.register(n), (this.Se = !0)
			}
		}
		update_search_keyword() {
			var n
			this.register((n = J?.referrer) ? cp(n) : {})
		}
		update_referrer_info() {
			var n
			this.register_once(
				{
					$referrer: fp(),
					$referring_domain:
						(J != null && J.referrer && ((n = Tr(J.referrer)) == null ? void 0 : n.host)) ||
						'$direct',
				},
				void 0
			)
		}
		set_initial_person_info() {
			this.props[nl] ||
				this.props[rl] ||
				this.register_once(
					{
						[js]: pp(this.S.mask_personal_data_properties, this.S.custom_personal_data_properties),
					},
					void 0
				)
		}
		get_initial_props() {
			var n = {}
			be([rl, nl], (d) => {
				var p = this.props[d]
				p &&
					be(p, function (h, g) {
						n['$initial_' + Ha(g)] = h
					})
			})
			var r,
				o,
				l = this.props[js]
			if (l) {
				var u =
					((r = hp(l)),
					(o = {}),
					be(r, function (d, p) {
						o['$initial_' + Ha(p)] = d
					}),
					o)
				Ge(n, u)
			}
			return n
		}
		safe_merge(n) {
			return (
				be(this.props, function (r, o) {
					o in n || (n[o] = r)
				}),
				n
			)
		}
		update_config(n, r) {
			if (
				((this.Re = this.Ee = n.cookie_expiration),
				this.set_disabled(n.disable_persistence),
				this.set_cross_subdomain(n.cross_subdomain_cookie),
				this.set_secure(n.secure_cookie),
				n.persistence !== r.persistence)
			) {
				var o = this.ke(n),
					l = this.props
				this.clear(), (this.q = o), (this.props = l), this.save()
			}
		}
		set_disabled(n) {
			;(this.xe = n), this.xe ? this.remove() : this.save()
		}
		set_cross_subdomain(n) {
			n !== this.Ie && ((this.Ie = n), this.remove(), this.save())
		}
		set_secure(n) {
			n !== this.Pe && ((this.Pe = n), this.remove(), this.save())
		}
		set_event_timer(n, r) {
			var o = this.props[wi] || {}
			;(o[n] = r), (this.props[wi] = o), this.save()
		}
		remove_event_timer(n) {
			var r = (this.props[wi] || {})[n]
			return K(r) || (delete this.props[wi][n], this.save()), r
		}
		get_property(n) {
			return this.props[n]
		}
		set_property(n, r) {
			;(this.props[n] = r), this.save()
		}
	}
	class yp {
		constructor() {
			;(this.Te = {}), (this.Te = {})
		}
		on(n, r) {
			return (
				this.Te[n] || (this.Te[n] = []),
				this.Te[n].push(r),
				() => {
					this.Te[n] = this.Te[n].filter((o) => o !== r)
				}
			)
		}
		emit(n, r) {
			for (var o of this.Te[n] || []) o(r)
			for (var l of this.Te['*'] || []) l(n, r)
		}
	}
	class cr {
		constructor(n) {
			;(this.Me = new yp()),
				(this.Ce = (r, o) => this.Oe(r, o) && this.Fe(r, o) && this.Ae(r, o)),
				(this.Oe = (r, o) => o == null || !o.event || r?.event === o?.event),
				(this._instance = n),
				(this.De = new Set()),
				(this.Le = new Set())
		}
		init() {
			var n
			if (!K((n = this._instance) == null ? void 0 : n.Ne)) {
				var r
				;(r = this._instance) == null ||
					r.Ne((o, l) => {
						this.on(o, l)
					})
			}
		}
		register(n) {
			var r, o
			if (
				!K((r = this._instance) == null ? void 0 : r.Ne) &&
				(n.forEach((d) => {
					var p, h
					;(p = this.Le) == null || p.add(d),
						(h = d.steps) == null ||
							h.forEach((g) => {
								var m
								;(m = this.De) == null || m.add(g?.event || '')
							})
				}),
				(o = this._instance) != null && o.autocapture)
			) {
				var l,
					u = new Set()
				n.forEach((d) => {
					var p
					;(p = d.steps) == null ||
						p.forEach((h) => {
							h != null && h.selector && u.add(h?.selector)
						})
				}),
					(l = this._instance) == null || l.autocapture.setElementSelectors(u)
			}
		}
		on(n, r) {
			var o
			r != null &&
				n.length != 0 &&
				(this.De.has(n) || this.De.has(r?.event)) &&
				this.Le &&
				((o = this.Le) == null ? void 0 : o.size) > 0 &&
				this.Le.forEach((l) => {
					this.je(r, l) && this.Me.emit('actionCaptured', l.name)
				})
		}
		ze(n) {
			this.onAction('actionCaptured', (r) => n(r))
		}
		je(n, r) {
			if (r?.steps == null) return !1
			for (var o of r.steps) if (this.Ce(n, o)) return !0
			return !1
		}
		onAction(n, r) {
			return this.Me.on(n, r)
		}
		Fe(n, r) {
			if (r != null && r.url) {
				var o,
					l = n == null || (o = n.properties) == null ? void 0 : o.$current_url
				if (!l || typeof l != 'string' || !cr.Ue(l, r?.url, r?.url_matching || 'contains'))
					return !1
			}
			return !0
		}
		static Ue(n, r, o) {
			switch (o) {
				case 'regex':
					return !!N && Mr(n, r)
				case 'exact':
					return r === n
				case 'contains':
					var l = cr.qe(r).replace(/_/g, '.').replace(/%/g, '.*')
					return Mr(n, l)
				default:
					return !1
			}
		}
		static qe(n) {
			return n.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d')
		}
		Ae(n, r) {
			if (
				((r != null && r.href) || (r != null && r.tag_name) || (r != null && r.text)) &&
				!this.Be(n).some(
					(u) =>
						!(r != null && r.href && !cr.Ue(u.href || '', r?.href, r?.href_matching || 'exact')) &&
						(r == null || !r.tag_name || u.tag_name === r?.tag_name) &&
						!(
							r != null &&
							r.text &&
							!cr.Ue(u.text || '', r?.text, r?.text_matching || 'exact') &&
							!cr.Ue(u.$el_text || '', r?.text, r?.text_matching || 'exact')
						)
				)
			)
				return !1
			if (r != null && r.selector) {
				var o,
					l = n == null || (o = n.properties) == null ? void 0 : o.$element_selectors
				if (!l || !l.includes(r?.selector)) return !1
			}
			return !0
		}
		Be(n) {
			return n?.properties.$elements == null ? [] : n?.properties.$elements
		}
	}
	var Xe = nt('[Surveys]')
	class Ny {
		constructor(n) {
			;(this._instance = n), (this.He = new Map()), (this.We = new Map())
		}
		register(n) {
			var r
			K((r = this._instance) == null ? void 0 : r.Ne) || (this.Ge(n), this.Je(n))
		}
		Je(n) {
			var r = n.filter((o) => {
				var l, u
				return (
					((l = o.conditions) == null ? void 0 : l.actions) &&
					((u = o.conditions) == null || (u = u.actions) == null || (u = u.values) == null
						? void 0
						: u.length) > 0
				)
			})
			r.length !== 0 &&
				(this.Ve == null &&
					((this.Ve = new cr(this._instance)),
					this.Ve.init(),
					this.Ve.ze((o) => {
						this.onAction(o)
					})),
				r.forEach((o) => {
					var l, u, d, p, h
					o.conditions &&
						(l = o.conditions) != null &&
						l.actions &&
						(u = o.conditions) != null &&
						(u = u.actions) != null &&
						u.values &&
						((d = o.conditions) == null || (d = d.actions) == null || (d = d.values) == null
							? void 0
							: d.length) > 0 &&
						((p = this.Ve) == null || p.register(o.conditions.actions.values),
						(h = o.conditions) == null ||
							(h = h.actions) == null ||
							(h = h.values) == null ||
							h.forEach((g) => {
								if (g && g.name) {
									var m = this.We.get(g.name)
									m && m.push(o.id), this.We.set(g.name, m || [o.id])
								}
							}))
				}))
		}
		Ge(n) {
			var r
			n.filter((o) => {
				var l, u
				return (
					((l = o.conditions) == null ? void 0 : l.events) &&
					((u = o.conditions) == null || (u = u.events) == null || (u = u.values) == null
						? void 0
						: u.length) > 0
				)
			}).length !== 0 &&
				((r = this._instance) == null ||
					r.Ne((o, l) => {
						this.onEvent(o, l)
					}),
				n.forEach((o) => {
					var l
					;(l = o.conditions) == null ||
						(l = l.events) == null ||
						(l = l.values) == null ||
						l.forEach((u) => {
							if (u && u.name) {
								var d = this.He.get(u.name)
								d && d.push(o.id), this.He.set(u.name, d || [o.id])
							}
						})
				}))
		}
		onEvent(n, r) {
			var o,
				l =
					((o = this._instance) == null || (o = o.persistence) == null ? void 0 : o.props[$s]) || []
			if (n === 'survey shown' && r && l.length > 0) {
				var u
				Xe.info('survey event matched, removing survey from activated surveys', {
					event: n,
					eventPayload: r,
					existingActivatedSurveys: l,
				})
				var d = r == null || (u = r.properties) == null ? void 0 : u.$survey_id
				if (d) {
					var p = l.indexOf(d)
					p >= 0 && (l.splice(p, 1), this.Ke(l))
				}
			} else
				this.He.has(n) &&
					(Xe.info('survey event matched, updating activated surveys', {
						event: n,
						surveys: this.He.get(n),
					}),
					this.Ke(l.concat(this.He.get(n) || [])))
		}
		onAction(n) {
			var r,
				o =
					((r = this._instance) == null || (r = r.persistence) == null ? void 0 : r.props[$s]) || []
			this.We.has(n) && this.Ke(o.concat(this.We.get(n) || []))
		}
		Ke(n) {
			var r
			;(r = this._instance) == null ||
				(r = r.persistence) == null ||
				r.register({ [$s]: [...new Set(n)] })
		}
		getSurveys() {
			var n,
				r = (n = this._instance) == null || (n = n.persistence) == null ? void 0 : n.props[$s]
			return r || []
		}
		getEventToSurveys() {
			return this.He
		}
		Ye() {
			return this.Ve
		}
	}
	class Fy {
		constructor(n) {
			;(this.Xe = null),
				(this.Qe = !1),
				(this.Ze = !1),
				(this.tr = []),
				(this._instance = n),
				(this._surveyEventReceiver = null)
		}
		onRemoteConfig(n) {
			var r = n.surveys
			if (xe(r)) return Xe.warn('Decide not loaded yet. Not loading surveys.')
			var o = Le(r)
			;(this.ir = o ? r.length > 0 : r),
				Xe.info('decide response received, hasSurveys: ' + this.ir),
				this.ir && this.loadIfEnabled()
		}
		reset() {
			localStorage.removeItem('lastSeenSurveyDate')
			for (var n = [], r = 0; r < localStorage.length; r++) {
				var o = localStorage.key(r)
				;((o != null && o.startsWith('seenSurvey_')) ||
					(o != null && o.startsWith('inProgressSurvey_'))) &&
					n.push(o)
			}
			n.forEach((l) => localStorage.removeItem(l))
		}
		loadIfEnabled() {
			if (!this.Xe)
				if (this.Ze) Xe.info('Already initializing surveys, skipping...')
				else if (this._instance.config.disable_surveys) Xe.info('Disabled. Not loading surveys.')
				else if (this.ir) {
					var n = me?.__PosthogExtensions__
					if (n) {
						this.Ze = !0
						try {
							var r = n.generateSurveys
							if (r) return void this.er(r)
							var o = n.loadExternalDependency
							if (!o) return void this.rr('PostHog loadExternalDependency extension not found.')
							o(this._instance, 'surveys', (l) => {
								l || !n.generateSurveys
									? this.rr('Could not load surveys script', l)
									: this.er(n.generateSurveys)
							})
						} catch (l) {
							throw (this.rr('Error initializing surveys', l), l)
						} finally {
							this.Ze = !1
						}
					} else Xe.error('PostHog Extensions not found.')
				} else Xe.info('No surveys to load.')
		}
		er(n) {
			;(this.Xe = n(this._instance)),
				(this._surveyEventReceiver = new Ny(this._instance)),
				Xe.info('Surveys loaded successfully'),
				this.sr({ isLoaded: !0 })
		}
		rr(n, r) {
			Xe.error(n, r), this.sr({ isLoaded: !1, error: n })
		}
		onSurveysLoaded(n) {
			return (
				this.tr.push(n),
				this.Xe && this.sr({ isLoaded: !0 }),
				() => {
					this.tr = this.tr.filter((r) => r !== n)
				}
			)
		}
		getSurveys(n, r) {
			if ((r === void 0 && (r = !1), this._instance.config.disable_surveys))
				return Xe.info('Disabled. Not loading surveys.'), n([])
			var o = this._instance.get_property(Ja)
			if (o && !r) return n(o, { isLoaded: !0 })
			if (this.Qe) return n([], { isLoaded: !1, error: 'Surveys are already being loaded' })
			try {
				;(this.Qe = !0),
					this._instance.me({
						url: this._instance.requestRouter.endpointFor(
							'api',
							'/api/surveys/?token=' + this._instance.config.token
						),
						method: 'GET',
						timeout: this._instance.config.surveys_request_timeout_ms,
						callback: (l) => {
							var u
							this.Qe = !1
							var d = l.statusCode
							if (d !== 200 || !l.json) {
								var p = 'Surveys API could not be loaded, status: ' + d
								return Xe.error(p), n([], { isLoaded: !1, error: p })
							}
							var h,
								g = l.json.surveys || [],
								m = g.filter(
									(w) =>
										(function (_) {
											return !(!_.start_date || _.end_date)
										})(w) &&
										((function (_) {
											var S
											return !(
												(S = _.conditions) == null ||
												(S = S.events) == null ||
												(S = S.values) == null ||
												!S.length
											)
										})(w) ||
											(function (_) {
												var S
												return !(
													(S = _.conditions) == null ||
													(S = S.actions) == null ||
													(S = S.values) == null ||
													!S.length
												)
											})(w))
								)
							return (
								m.length > 0 && ((h = this._surveyEventReceiver) == null || h.register(m)),
								(u = this._instance.persistence) == null || u.register({ [Ja]: g }),
								n(g, { isLoaded: !0 })
							)
						},
					})
			} catch (l) {
				throw ((this.Qe = !1), l)
			}
		}
		sr(n) {
			for (var r of this.tr)
				try {
					n.isLoaded ? this.getSurveys(r) : r([], n)
				} catch (o) {
					Xe.error('Error in survey callback', o)
				}
		}
		getActiveMatchingSurveys(n, r) {
			if ((r === void 0 && (r = !1), !xe(this.Xe))) return this.Xe.getActiveMatchingSurveys(n, r)
			Xe.warn('init was not called')
		}
		nr(n) {
			var r = null
			return (
				this.getSurveys((o) => {
					var l
					r = (l = o.find((u) => u.id === n)) !== null && l !== void 0 ? l : null
				}),
				r
			)
		}
		ar(n) {
			if (xe(this.Xe))
				return {
					eligible: !1,
					reason: 'SDK is not enabled or survey functionality is not yet loaded',
				}
			var r = typeof n == 'string' ? this.nr(n) : n
			return r ? this.Xe.checkSurveyEligibility(r) : { eligible: !1, reason: 'Survey not found' }
		}
		canRenderSurvey(n) {
			if (xe(this.Xe))
				return (
					Xe.warn('init was not called'),
					{
						visible: !1,
						disabledReason: 'SDK is not enabled or survey functionality is not yet loaded',
					}
				)
			var r = this.ar(n)
			return { visible: r.eligible, disabledReason: r.reason }
		}
		canRenderSurveyAsync(n, r) {
			return xe(this.Xe)
				? (Xe.warn('init was not called'),
					Promise.resolve({
						visible: !1,
						disabledReason: 'SDK is not enabled or survey functionality is not yet loaded',
					}))
				: new Promise((o) => {
						this.getSurveys((l) => {
							var u,
								d = (u = l.find((h) => h.id === n)) !== null && u !== void 0 ? u : null
							if (d) {
								var p = this.ar(d)
								o({ visible: p.eligible, disabledReason: p.reason })
							} else o({ visible: !1, disabledReason: 'Survey not found' })
						}, r)
					})
		}
		renderSurvey(n, r) {
			if (xe(this.Xe)) Xe.warn('init was not called')
			else {
				var o = this.nr(n),
					l = J?.querySelector(r)
				o
					? l
						? this.Xe.renderSurvey(o, l)
						: Xe.warn('Survey element not found')
					: Xe.warn('Survey not found')
			}
		}
	}
	var wp = nt('[RateLimiter]')
	class My {
		constructor(n) {
			var r, o
			;(this.serverLimits = {}),
				(this.lastEventRateLimited = !1),
				(this.checkForLimiting = (l) => {
					var u = l.text
					if (u && u.length)
						try {
							;(JSON.parse(u).quota_limited || []).forEach((d) => {
								wp.info((d || 'events') + ' is quota limited.'),
									(this.serverLimits[d] = new Date().getTime() + 6e4)
							})
						} catch (d) {
							return void wp.warn(
								'could not rate limit - continuing. Error: "' + d?.message + '"',
								{ text: u }
							)
						}
				}),
				(this.instance = n),
				(this.captureEventsPerSecond =
					((r = n.config.rate_limiting) == null ? void 0 : r.events_per_second) || 10),
				(this.captureEventsBurstLimit = Math.max(
					((o = n.config.rate_limiting) == null ? void 0 : o.events_burst_limit) ||
						10 * this.captureEventsPerSecond,
					this.captureEventsPerSecond
				)),
				(this.lastEventRateLimited = this.clientRateLimitContext(!0).isRateLimited)
		}
		clientRateLimitContext(n) {
			var r, o, l
			n === void 0 && (n = !1)
			var u = new Date().getTime(),
				d =
					(r = (o = this.instance.persistence) == null ? void 0 : o.get_property(tl)) !== null &&
					r !== void 0
						? r
						: { tokens: this.captureEventsBurstLimit, last: u }
			;(d.tokens += ((u - d.last) / 1e3) * this.captureEventsPerSecond),
				(d.last = u),
				d.tokens > this.captureEventsBurstLimit && (d.tokens = this.captureEventsBurstLimit)
			var p = d.tokens < 1
			return (
				p || n || (d.tokens = Math.max(0, d.tokens - 1)),
				!p ||
					this.lastEventRateLimited ||
					n ||
					this.instance.capture(
						'$$client_ingestion_warning',
						{
							$$client_ingestion_warning_message:
								'posthog-js client rate limited. Config is set to ' +
								this.captureEventsPerSecond +
								' events per second and ' +
								this.captureEventsBurstLimit +
								' events burst limit.',
						},
						{ skip_client_rate_limiting: !0 }
					),
				(this.lastEventRateLimited = p),
				(l = this.instance.persistence) == null || l.set_property(tl, d),
				{ isRateLimited: p, remainingTokens: d.tokens }
			)
		}
		isServerRateLimited(n) {
			var r = this.serverLimits[n || 'events'] || !1
			return r !== !1 && new Date().getTime() < r
		}
	}
	var dr = nt('[RemoteConfig]')
	class Ly {
		constructor(n) {
			this._instance = n
		}
		get remoteConfig() {
			var n
			return (n = me._POSTHOG_REMOTE_CONFIG) == null || (n = n[this._instance.config.token]) == null
				? void 0
				: n.config
		}
		lr(n) {
			var r, o
			;(r = me.__PosthogExtensions__) != null && r.loadExternalDependency
				? (o = me.__PosthogExtensions__) == null ||
					o.loadExternalDependency == null ||
					o.loadExternalDependency(this._instance, 'remote-config', () => n(this.remoteConfig))
				: (dr.error('PostHog Extensions not found. Cannot load remote config.'), n())
		}
		ur(n) {
			this._instance.me({
				method: 'GET',
				url: this._instance.requestRouter.endpointFor(
					'assets',
					'/array/' + this._instance.config.token + '/config'
				),
				callback: (r) => {
					n(r.json)
				},
			})
		}
		load() {
			try {
				if (this.remoteConfig)
					return (
						dr.info('Using preloaded remote config', this.remoteConfig),
						void this.be(this.remoteConfig)
					)
				if (this._instance.config.advanced_disable_decide)
					return void dr.warn('Remote config is disabled. Falling back to local config.')
				this.lr((n) => {
					if (!n)
						return (
							dr.info('No config found after loading remote JS config. Falling back to JSON.'),
							void this.ur((r) => {
								this.be(r)
							})
						)
					this.be(n)
				})
			} catch (n) {
				dr.error('Error loading remote config', n)
			}
		}
		be(n) {
			n
				? this._instance.config.__preview_remote_config
					? (this._instance.be(n),
						n.hasFeatureFlags !== !1 && this._instance.featureFlags.ensureFlagsLoaded())
					: dr.info('__preview_remote_config is disabled. Logging config instead', n)
				: dr.error('Failed to fetch remote config from PostHog.')
		}
	}
	var Wl = 3e3
	class Dy {
		constructor(n, r) {
			;(this.hr = !0),
				(this.dr = []),
				(this.vr = Mt(r?.flush_interval_ms || Wl, 250, 5e3, 'flush interval', Wl)),
				(this.cr = n)
		}
		enqueue(n) {
			this.dr.push(n), this.pr || this.gr()
		}
		unload() {
			this._r()
			var n = this.dr.length > 0 ? this.mr() : {},
				r = Object.values(n)
			;[
				...r.filter((o) => o.url.indexOf('/e') === 0),
				...r.filter((o) => o.url.indexOf('/e') !== 0),
			].map((o) => {
				this.cr(Z({}, o, { transport: 'sendBeacon' }))
			})
		}
		enable() {
			;(this.hr = !1), this.gr()
		}
		gr() {
			var n = this
			this.hr ||
				(this.pr = setTimeout(() => {
					if ((this._r(), this.dr.length > 0)) {
						var r = this.mr(),
							o = function () {
								var u = r[l],
									d = new Date().getTime()
								u.data &&
									Le(u.data) &&
									be(u.data, (p) => {
										;(p.offset = Math.abs(p.timestamp - d)), delete p.timestamp
									}),
									n.cr(u)
							}
						for (var l in r) o()
					}
				}, this.vr))
		}
		_r() {
			clearTimeout(this.pr), (this.pr = void 0)
		}
		mr() {
			var n = {}
			return (
				be(this.dr, (r) => {
					var o,
						l = r,
						u = (l ? l.batchKey : null) || l.url
					K(n[u]) && (n[u] = Z({}, l, { data: [] })), (o = n[u].data) == null || o.push(l.data)
				}),
				(this.dr = []),
				n
			)
		}
	}
	var Ay = ['retriesPerformedSoFar']
	class $y {
		constructor(n) {
			;(this.br = !1),
				(this.wr = 3e3),
				(this.dr = []),
				(this._instance = n),
				(this.dr = []),
				(this.yr = !0),
				!K(N) &&
					'onLine' in N.navigator &&
					((this.yr = N.navigator.onLine),
					Ae(N, 'online', () => {
						;(this.yr = !0), this.Yi()
					}),
					Ae(N, 'offline', () => {
						this.yr = !1
					}))
		}
		get length() {
			return this.dr.length
		}
		retriableRequest(n) {
			var { retriesPerformedSoFar: r } = n,
				o = xd(n, Ay)
			ot(r) && r > 0 && (o.url = io(o.url, { retry_count: r })),
				this._instance.me(
					Z({}, o, {
						callback: (l) => {
							l.statusCode !== 200 && (l.statusCode < 400 || l.statusCode >= 500) && (r ?? 0) < 10
								? this.Sr(Z({ retriesPerformedSoFar: r }, o))
								: o.callback == null || o.callback(l)
						},
					})
				)
		}
		Sr(n) {
			var r = n.retriesPerformedSoFar || 0
			n.retriesPerformedSoFar = r + 1
			var o = (function (d) {
					var p = 3e3 * Math.pow(2, d),
						h = p / 2,
						g = Math.min(18e5, p),
						m = (Math.random() - 0.5) * (g - h)
					return Math.ceil(g + m)
				})(r),
				l = Date.now() + o
			this.dr.push({ retryAt: l, requestOptions: n })
			var u = 'Enqueued failed request for retry in ' + o
			navigator.onLine || (u += ' (Browser is offline)'),
				ie.warn(u),
				this.br || ((this.br = !0), this.$r())
		}
		$r() {
			this.kr && clearTimeout(this.kr),
				(this.kr = setTimeout(() => {
					this.yr && this.dr.length > 0 && this.Yi(), this.$r()
				}, this.wr))
		}
		Yi() {
			var n = Date.now(),
				r = [],
				o = this.dr.filter((u) => u.retryAt < n || (r.push(u), !1))
			if (((this.dr = r), o.length > 0))
				for (var { requestOptions: l } of o) this.retriableRequest(l)
		}
		unload() {
			for (var { requestOptions: n } of (this.kr && (clearTimeout(this.kr), (this.kr = void 0)),
			this.dr))
				try {
					this._instance.me(Z({}, n, { transport: 'sendBeacon' }))
				} catch (r) {
					ie.error(r)
				}
			this.dr = []
		}
	}
	class zy {
		constructor(n) {
			;(this.Er = () => {
				var r, o, l, u
				this.Ir || (this.Ir = {})
				var d = this.scrollElement(),
					p = this.scrollY(),
					h = d ? Math.max(0, d.scrollHeight - d.clientHeight) : 0,
					g = p + (d?.clientHeight || 0),
					m = d?.scrollHeight || 0
				;(this.Ir.lastScrollY = Math.ceil(p)),
					(this.Ir.maxScrollY = Math.max(
						p,
						(r = this.Ir.maxScrollY) !== null && r !== void 0 ? r : 0
					)),
					(this.Ir.maxScrollHeight = Math.max(
						h,
						(o = this.Ir.maxScrollHeight) !== null && o !== void 0 ? o : 0
					)),
					(this.Ir.lastContentY = g),
					(this.Ir.maxContentY = Math.max(
						g,
						(l = this.Ir.maxContentY) !== null && l !== void 0 ? l : 0
					)),
					(this.Ir.maxContentHeight = Math.max(
						m,
						(u = this.Ir.maxContentHeight) !== null && u !== void 0 ? u : 0
					))
			}),
				(this._instance = n)
		}
		getContext() {
			return this.Ir
		}
		resetContext() {
			var n = this.Ir
			return setTimeout(this.Er, 0), n
		}
		startMeasuringScrollPosition() {
			Ae(N, 'scroll', this.Er, { capture: !0 }),
				Ae(N, 'scrollend', this.Er, { capture: !0 }),
				Ae(N, 'resize', this.Er)
		}
		scrollElement() {
			if (!this._instance.config.scroll_root_selector) return N?.document.documentElement
			var n = Le(this._instance.config.scroll_root_selector)
				? this._instance.config.scroll_root_selector
				: [this._instance.config.scroll_root_selector]
			for (var r of n) {
				var o = N?.document.querySelector(r)
				if (o) return o
			}
		}
		scrollY() {
			if (this._instance.config.scroll_root_selector) {
				var n = this.scrollElement()
				return (n && n.scrollTop) || 0
			}
			return (N && (N.scrollY || N.pageYOffset || N.document.documentElement.scrollTop)) || 0
		}
		scrollX() {
			if (this._instance.config.scroll_root_selector) {
				var n = this.scrollElement()
				return (n && n.scrollLeft) || 0
			}
			return (N && (N.scrollX || N.pageXOffset || N.document.documentElement.scrollLeft)) || 0
		}
	}
	var jy = (i) =>
		pp(i?.config.mask_personal_data_properties, i?.config.custom_personal_data_properties)
	class Uy {
		constructor(n, r, o, l) {
			;(this.Pr = (u) => {
				var d = this.Rr()
				if (!d || d.sessionId !== u) {
					var p = { sessionId: u, props: this.Tr(this._instance) }
					this.Mr.register({ [el]: p })
				}
			}),
				(this._instance = n),
				(this.Cr = r),
				(this.Mr = o),
				(this.Tr = l || jy),
				this.Cr.onSessionId(this.Pr)
		}
		Rr() {
			return this.Mr.props[el]
		}
		getSetOnceProps() {
			var n,
				r = (n = this.Rr()) == null ? void 0 : n.props
			return r
				? 'r' in r
					? hp(r)
					: {
							$referring_domain: r.referringDomain,
							$pathname: r.initialPathName,
							utm_source: r.utm_source,
							utm_campaign: r.utm_campaign,
							utm_medium: r.utm_medium,
							utm_content: r.utm_content,
							utm_term: r.utm_term,
						}
				: {}
		}
		getSessionProps() {
			var n = {}
			return (
				be(qa(this.getSetOnceProps()), (r, o) => {
					o === '$current_url' && (o = 'url'), (n['$session_entry_' + Ha(o)] = r)
				}),
				n
			)
		}
	}
	var Sp = nt('[SessionId]')
	class By {
		constructor(n, r, o) {
			var l
			if (((this.Or = []), !n.persistence))
				throw new Error('SessionIdManager requires a PostHogPersistence instance')
			if (n.config.__preview_experimental_cookieless_mode)
				throw new Error(
					'SessionIdManager cannot be used with __preview_experimental_cookieless_mode'
				)
			;(this.S = n.config),
				(this.Mr = n.persistence),
				(this.oi = void 0),
				(this.kt = void 0),
				(this._sessionStartTimestamp = null),
				(this._sessionActivityTimestamp = null),
				(this.Fr = r || On),
				(this.Ar = o || On)
			var u = this.S.persistence_name || this.S.token,
				d = this.S.session_idle_timeout_seconds || 1800
			if (
				((this._sessionTimeoutMs = 1e3 * Mt(d, 60, 36e3, 'session_idle_timeout_seconds', 1800)),
				n.register({ $configured_session_timeout_ms: this._sessionTimeoutMs }),
				this.Dr(),
				(this.Lr = 'ph_' + u + '_window_id'),
				(this.Nr = 'ph_' + u + '_primary_window_exists'),
				this.jr())
			) {
				var p = rt.D(this.Lr),
					h = rt.D(this.Nr)
				p && !h ? (this.oi = p) : rt.N(this.Lr), rt.L(this.Nr, !0)
			}
			if ((l = this.S.bootstrap) != null && l.sessionID)
				try {
					var g = ((m) => {
						var w = m.replace(/-/g, '')
						if (w.length !== 32) throw new Error('Not a valid UUID')
						if (w[12] !== '7') throw new Error('Not a UUIDv7')
						return parseInt(w.substring(0, 12), 16)
					})(this.S.bootstrap.sessionID)
					this.zr(this.S.bootstrap.sessionID, new Date().getTime(), g)
				} catch (m) {
					Sp.error('Invalid sessionID in bootstrap', m)
				}
			this.Ur()
		}
		get sessionTimeoutMs() {
			return this._sessionTimeoutMs
		}
		onSessionId(n) {
			return (
				K(this.Or) && (this.Or = []),
				this.Or.push(n),
				this.kt && n(this.kt, this.oi),
				() => {
					this.Or = this.Or.filter((r) => r !== n)
				}
			)
		}
		jr() {
			return this.S.persistence !== 'memory' && !this.Mr.xe && rt.O()
		}
		qr(n) {
			n !== this.oi && ((this.oi = n), this.jr() && rt.L(this.Lr, n))
		}
		Br() {
			return this.oi ? this.oi : this.jr() ? rt.D(this.Lr) : null
		}
		zr(n, r, o) {
			;(n === this.kt &&
				r === this._sessionActivityTimestamp &&
				o === this._sessionStartTimestamp) ||
				((this._sessionStartTimestamp = o),
				(this._sessionActivityTimestamp = r),
				(this.kt = n),
				this.Mr.register({ [Ds]: [r, n, o] }))
		}
		Hr() {
			if (this.kt && this._sessionActivityTimestamp && this._sessionStartTimestamp)
				return [this._sessionActivityTimestamp, this.kt, this._sessionStartTimestamp]
			var n = this.Mr.props[Ds]
			return Le(n) && n.length === 2 && n.push(n[0]), n || [0, null, 0]
		}
		resetSessionId() {
			this.zr(null, null, null)
		}
		Ur() {
			Ae(
				N,
				'beforeunload',
				() => {
					this.jr() && rt.N(this.Nr)
				},
				{ capture: !1 }
			)
		}
		checkAndGetSessionAndWindowId(n, r) {
			if (
				(n === void 0 && (n = !1),
				r === void 0 && (r = null),
				this.S.__preview_experimental_cookieless_mode)
			)
				throw new Error(
					'checkAndGetSessionAndWindowId should not be called in __preview_experimental_cookieless_mode'
				)
			var o = r || new Date().getTime(),
				[l, u, d] = this.Hr(),
				p = this.Br(),
				h = ot(d) && d > 0 && Math.abs(o - d) > 864e5,
				g = !1,
				m = !u,
				w = !n && Math.abs(o - l) > this.sessionTimeoutMs
			m || w || h
				? ((u = this.Fr()),
					(p = this.Ar()),
					Sp.info('new session ID generated', {
						sessionId: u,
						windowId: p,
						changeReason: { noSessionId: m, activityTimeout: w, sessionPastMaximumLength: h },
					}),
					(d = o),
					(g = !0))
				: p || ((p = this.Ar()), (g = !0))
			var _ = l === 0 || !n || h ? o : l,
				S = d === 0 ? new Date().getTime() : d
			return (
				this.qr(p),
				this.zr(u, _, S),
				n || this.Dr(),
				g &&
					this.Or.forEach((M) =>
						M(
							u,
							p,
							g ? { noSessionId: m, activityTimeout: w, sessionPastMaximumLength: h } : void 0
						)
					),
				{
					sessionId: u,
					windowId: p,
					sessionStartTimestamp: S,
					changeReason: g
						? { noSessionId: m, activityTimeout: w, sessionPastMaximumLength: h }
						: void 0,
					lastActivityTimestamp: l,
				}
			)
		}
		Dr() {
			clearTimeout(this.Wr),
				(this.Wr = setTimeout(() => {
					this.resetSessionId()
				}, 1.1 * this.sessionTimeoutMs))
		}
	}
	var Wy = ['$set_once', '$set'],
		Ln = nt('[SiteApps]')
	class Hy {
		constructor(n) {
			;(this._instance = n), (this.Gr = []), (this.apps = {})
		}
		get isEnabled() {
			return !!this._instance.config.opt_in_site_apps
		}
		Jr(n, r) {
			if (r) {
				var o = this.globalsForEvent(r)
				this.Gr.push(o), this.Gr.length > 1e3 && (this.Gr = this.Gr.slice(10))
			}
		}
		get siteAppLoaders() {
			var n
			return (n = me._POSTHOG_REMOTE_CONFIG) == null || (n = n[this._instance.config.token]) == null
				? void 0
				: n.siteApps
		}
		init() {
			if (this.isEnabled) {
				var n = this._instance.Ne(this.Jr.bind(this))
				this.Vr = () => {
					n(), (this.Gr = []), (this.Vr = void 0)
				}
			}
		}
		globalsForEvent(n) {
			var r, o, l, u, d, p, h
			if (!n) throw new Error('Event payload is required')
			var g = {},
				m = this._instance.get_property('$groups') || [],
				w = this._instance.get_property('$stored_group_properties') || {}
			for (var [_, S] of Object.entries(w)) g[_] = { id: m[_], type: _, properties: S }
			var { $set_once: M, $set: k } = n
			return {
				event: Z({}, xd(n, Wy), {
					properties: Z(
						{},
						n.properties,
						k
							? {
									$set: Z(
										{},
										(r = (o = n.properties) == null ? void 0 : o.$set) !== null && r !== void 0
											? r
											: {},
										k
									),
								}
							: {},
						M
							? {
									$set_once: Z(
										{},
										(l = (u = n.properties) == null ? void 0 : u.$set_once) !== null && l !== void 0
											? l
											: {},
										M
									),
								}
							: {}
					),
					elements_chain:
						(d = (p = n.properties) == null ? void 0 : p.$elements_chain) !== null && d !== void 0
							? d
							: '',
					distinct_id: (h = n.properties) == null ? void 0 : h.distinct_id,
				}),
				person: { properties: this._instance.get_property('$stored_person_properties') },
				groups: g,
			}
		}
		setupSiteApp(n) {
			var r = this.apps[n.id],
				o = () => {
					var p
					!r.errored &&
						this.Gr.length &&
						(Ln.info('Processing ' + this.Gr.length + ' events for site app with id ' + n.id),
						this.Gr.forEach((h) => (r.processEvent == null ? void 0 : r.processEvent(h))),
						(r.processedBuffer = !0)),
						Object.values(this.apps).every((h) => h.processedBuffer || h.errored) &&
							((p = this.Vr) == null || p.call(this))
				},
				l = !1,
				u = (p) => {
					;(r.errored = !p),
						(r.loaded = !0),
						Ln.info('Site app with id ' + n.id + ' ' + (p ? 'loaded' : 'errored')),
						l && o()
				}
			try {
				var { processEvent: d } = n.init({
					posthog: this._instance,
					callback: (p) => {
						u(p)
					},
				})
				d && (r.processEvent = d), (l = !0)
			} catch (p) {
				Ln.error('Error while initializing PostHog app with config id ' + n.id, p), u(!1)
			}
			if (l && r.loaded)
				try {
					o()
				} catch (p) {
					Ln.error('Error while processing buffered events PostHog app with config id ' + n.id, p),
						(r.errored = !0)
				}
		}
		Kr() {
			var n = this.siteAppLoaders || []
			for (var r of n) this.apps[r.id] = { id: r.id, loaded: !1, errored: !1, processedBuffer: !1 }
			for (var o of n) this.setupSiteApp(o)
		}
		Yr(n) {
			if (Object.keys(this.apps).length !== 0) {
				var r = this.globalsForEvent(n)
				for (var o of Object.values(this.apps))
					try {
						o.processEvent == null || o.processEvent(r)
					} catch (l) {
						Ln.error('Error while processing event ' + n.event + ' for site app ' + o.id, l)
					}
			}
		}
		onRemoteConfig(n) {
			var r,
				o,
				l,
				u = this
			if ((r = this.siteAppLoaders) != null && r.length)
				return this.isEnabled
					? (this.Kr(), void this._instance.on('eventCaptured', (g) => this.Yr(g)))
					: void Ln.error(
							'PostHog site apps are disabled. Enable the "opt_in_site_apps" config to proceed.'
						)
			if (((o = this.Vr) == null || o.call(this), (l = n.siteApps) != null && l.length))
				if (this.isEnabled) {
					var d = function (g) {
						var m
						;(me['__$$ph_site_app_' + g] = u._instance),
							(m = me.__PosthogExtensions__) == null ||
								m.loadSiteApp == null ||
								m.loadSiteApp(u._instance, h, (w) => {
									if (w)
										return Ln.error('Error while initializing PostHog app with config id ' + g, w)
								})
					}
					for (var { id: p, url: h } of n.siteApps) d(p)
				} else
					Ln.error(
						'PostHog site apps are disabled. Enable the "opt_in_site_apps" config to proceed.'
					)
		}
	}
	var Vy = [
			'amazonbot',
			'amazonproductbot',
			'app.hypefactors.com',
			'applebot',
			'archive.org_bot',
			'awariobot',
			'backlinksextendedbot',
			'baiduspider',
			'bingbot',
			'bingpreview',
			'chrome-lighthouse',
			'dataforseobot',
			'deepscan',
			'duckduckbot',
			'facebookexternal',
			'facebookcatalog',
			'http://yandex.com/bots',
			'hubspot',
			'ia_archiver',
			'linkedinbot',
			'meta-externalagent',
			'mj12bot',
			'msnbot',
			'nessus',
			'petalbot',
			'pinterest',
			'prerender',
			'rogerbot',
			'screaming frog',
			'sebot-wa',
			'sitebulb',
			'slackbot',
			'slurp',
			'trendictionbot',
			'turnitin',
			'twitterbot',
			'vercelbot',
			'yahoo! slurp',
			'yandexbot',
			'zoombot',
			'bot.htm',
			'bot.php',
			'(bot;',
			'bot/',
			'crawler',
			'ahrefsbot',
			'ahrefssiteaudit',
			'semrushbot',
			'siteauditbot',
			'splitsignalbot',
			'gptbot',
			'oai-searchbot',
			'chatgpt-user',
			'perplexitybot',
			'better uptime bot',
			'sentryuptimebot',
			'uptimerobot',
			'headlesschrome',
			'cypress',
			'google-hoteladsverifier',
			'adsbot-google',
			'apis-google',
			'duplexweb-google',
			'feedfetcher-google',
			'google favicon',
			'google web preview',
			'google-read-aloud',
			'googlebot',
			'googleother',
			'google-cloudvertexbot',
			'googleweblight',
			'mediapartners-google',
			'storebot-google',
			'google-inspectiontool',
			'bytespider',
		],
		Ep = function (i, n) {
			if (!i) return !1
			var r = i.toLowerCase()
			return Vy.concat(n || []).some((o) => {
				var l = o.toLowerCase()
				return r.indexOf(l) !== -1
			})
		},
		kp = function (i, n) {
			if (!i) return !1
			var r = i.userAgent
			if (r && Ep(r, n)) return !0
			try {
				var o = i?.userAgentData
				if (o != null && o.brands && o.brands.some((l) => Ep(l?.brand, n))) return !0
			} catch {}
			return !!i.webdriver
		},
		Di = (function (i) {
			return (i.US = 'us'), (i.EU = 'eu'), (i.CUSTOM = 'custom'), i
		})({}),
		xp = 'i.posthog.com'
	class qy {
		constructor(n) {
			;(this.Xr = {}), (this.instance = n)
		}
		get apiHost() {
			var n = this.instance.config.api_host.trim().replace(/\/$/, '')
			return n === 'https://app.posthog.com' ? 'https://us.i.posthog.com' : n
		}
		get uiHost() {
			var n,
				r = (n = this.instance.config.ui_host) == null ? void 0 : n.replace(/\/$/, '')
			return (
				r || (r = this.apiHost.replace('.' + xp, '.posthog.com')),
				r === 'https://app.posthog.com' ? 'https://us.posthog.com' : r
			)
		}
		get region() {
			return (
				this.Xr[this.apiHost] ||
					(/https:\/\/(app|us|us-assets)(\.i)?\.posthog\.com/i.test(this.apiHost)
						? (this.Xr[this.apiHost] = Di.US)
						: /https:\/\/(eu|eu-assets)(\.i)?\.posthog\.com/i.test(this.apiHost)
							? (this.Xr[this.apiHost] = Di.EU)
							: (this.Xr[this.apiHost] = Di.CUSTOM)),
				this.Xr[this.apiHost]
			)
		}
		endpointFor(n, r) {
			if ((r === void 0 && (r = ''), r && (r = r[0] === '/' ? r : '/' + r), n === 'ui'))
				return this.uiHost + r
			if (this.region === Di.CUSTOM) return this.apiHost + r
			var o = xp + r
			switch (n) {
				case 'assets':
					return 'https://' + this.region + '-assets.' + o
				case 'api':
					return 'https://' + this.region + '.' + o
			}
		}
	}
	var Gy = {
		icontains: (i, n) => !!N && n.href.toLowerCase().indexOf(i.toLowerCase()) > -1,
		not_icontains: (i, n) => !!N && n.href.toLowerCase().indexOf(i.toLowerCase()) === -1,
		regex: (i, n) => !!N && Mr(n.href, i),
		not_regex: (i, n) => !!N && !Mr(n.href, i),
		exact: (i, n) => n.href === i,
		is_not: (i, n) => n.href !== i,
	}
	class ut {
		constructor(n) {
			var r = this
			;(this.getWebExperimentsAndEvaluateDisplayLogic = function (o) {
				o === void 0 && (o = !1),
					r.getWebExperiments((l) => {
						ut.Qr('retrieved web experiments from the server'),
							(r.Zr = new Map()),
							l.forEach((u) => {
								if (u.feature_flag_key) {
									var d
									r.Zr &&
										(ut.Qr('setting flag key ', u.feature_flag_key, ' to web experiment ', u),
										(d = r.Zr) == null || d.set(u.feature_flag_key, u))
									var p = r._instance.getFeatureFlag(u.feature_flag_key)
									Ue(p) && u.variants[p] && r.ts(u.name, p, u.variants[p].transforms)
								} else if (u.variants)
									for (var h in u.variants) {
										var g = u.variants[h]
										ut.es(g) && r.ts(u.name, h, g.transforms)
									}
							})
					}, o)
			}),
				(this._instance = n),
				this._instance.onFeatureFlags((o) => {
					this.onFeatureFlags(o)
				})
		}
		onFeatureFlags(n) {
			if (this._is_bot())
				ut.Qr('Refusing to render web experiment since the viewer is a likely bot')
			else if (!this._instance.config.disable_web_experiments) {
				if (xe(this.Zr))
					return (this.Zr = new Map()), this.loadIfEnabled(), void this.previewWebExperiment()
				ut.Qr('applying feature flags', n),
					n.forEach((r) => {
						var o
						if (this.Zr && (o = this.Zr) != null && o.has(r)) {
							var l,
								u = this._instance.getFeatureFlag(r),
								d = (l = this.Zr) == null ? void 0 : l.get(r)
							u && d != null && d.variants[u] && this.ts(d.name, u, d.variants[u].transforms)
						}
					})
			}
		}
		previewWebExperiment() {
			var n = ut.getWindowLocation()
			if (n != null && n.search) {
				var r = Vs(n?.search, '__experiment_id'),
					o = Vs(n?.search, '__experiment_variant')
				r &&
					o &&
					(ut.Qr('previewing web experiments ' + r + ' && ' + o),
					this.getWebExperiments(
						(l) => {
							this.rs(parseInt(r), o, l)
						},
						!1,
						!0
					))
			}
		}
		loadIfEnabled() {
			this._instance.config.disable_web_experiments ||
				this.getWebExperimentsAndEvaluateDisplayLogic()
		}
		getWebExperiments(n, r, o) {
			if (this._instance.config.disable_web_experiments && !o) return n([])
			var l = this._instance.get_property('$web_experiments')
			if (l && !r) return n(l)
			this._instance.me({
				url: this._instance.requestRouter.endpointFor(
					'api',
					'/api/web_experiments/?token=' + this._instance.config.token
				),
				method: 'GET',
				callback: (u) => {
					if (u.statusCode !== 200 || !u.json) return n([])
					var d = u.json.experiments || []
					return n(d)
				},
			})
		}
		rs(n, r, o) {
			var l = o.filter((u) => u.id === n)
			l &&
				l.length > 0 &&
				(ut.Qr('Previewing web experiment [' + l[0].name + '] with variant [' + r + ']'),
				this.ts(l[0].name, r, l[0].variants[r].transforms))
		}
		static es(n) {
			return !xe(n.conditions) && ut.ss(n) && ut.ns(n)
		}
		static ss(n) {
			var r
			if (xe(n.conditions) || xe((r = n.conditions) == null ? void 0 : r.url)) return !0
			var o,
				l,
				u,
				d = ut.getWindowLocation()
			return (
				!!d &&
				((o = n.conditions) == null ||
					!o.url ||
					Gy[
						(l = (u = n.conditions) == null ? void 0 : u.urlMatchType) !== null && l !== void 0
							? l
							: 'icontains'
					](n.conditions.url, d))
			)
		}
		static getWindowLocation() {
			return N?.location
		}
		static ns(n) {
			var r
			if (xe(n.conditions) || xe((r = n.conditions) == null ? void 0 : r.utm)) return !0
			var o = lp()
			if (o.utm_source) {
				var l,
					u,
					d,
					p,
					h,
					g,
					m,
					w,
					_ =
						(l = n.conditions) == null ||
						(l = l.utm) == null ||
						!l.utm_campaign ||
						((u = n.conditions) == null || (u = u.utm) == null ? void 0 : u.utm_campaign) ==
							o.utm_campaign,
					S =
						(d = n.conditions) == null ||
						(d = d.utm) == null ||
						!d.utm_source ||
						((p = n.conditions) == null || (p = p.utm) == null ? void 0 : p.utm_source) ==
							o.utm_source,
					M =
						(h = n.conditions) == null ||
						(h = h.utm) == null ||
						!h.utm_medium ||
						((g = n.conditions) == null || (g = g.utm) == null ? void 0 : g.utm_medium) ==
							o.utm_medium,
					k =
						(m = n.conditions) == null ||
						(m = m.utm) == null ||
						!m.utm_term ||
						((w = n.conditions) == null || (w = w.utm) == null ? void 0 : w.utm_term) == o.utm_term
				return _ && M && k && S
			}
			return !1
		}
		static Qr(n) {
			for (var r = arguments.length, o = new Array(r > 1 ? r - 1 : 0), l = 1; l < r; l++)
				o[l - 1] = arguments[l]
			ie.info('[WebExperiments] ' + n, o)
		}
		ts(n, r, o) {
			this._is_bot()
				? ut.Qr('Refusing to render web experiment since the viewer is a likely bot')
				: r !== 'control'
					? o.forEach((l) => {
							if (l.selector) {
								var u
								ut.Qr('applying transform of variant ' + r + ' for experiment ' + n + ' ', l)
								var d = (u = document) == null ? void 0 : u.querySelectorAll(l.selector)
								d?.forEach((p) => {
									var h = p
									l.html && (h.innerHTML = l.html), l.css && h.setAttribute('style', l.css)
								})
							}
						})
					: ut.Qr('Control variants leave the page unmodified.')
		}
		_is_bot() {
			return Rt && this._instance ? kp(Rt, this._instance.config.custom_blocked_useragents) : void 0
		}
	}
	var Ai = {},
		Hl = () => {},
		zr = 'posthog',
		Cp = !dy && wt?.indexOf('MSIE') === -1 && wt?.indexOf('Mozilla') === -1,
		Pp = (i) => {
			var n
			return {
				api_host: 'https://us.i.posthog.com',
				ui_host: null,
				token: '',
				autocapture: !0,
				rageclick: !0,
				cross_subdomain_cookie: Wm(J?.location),
				persistence: 'localStorage+cookie',
				persistence_name: '',
				loaded: Hl,
				save_campaign_params: !0,
				custom_campaign_params: [],
				custom_blocked_useragents: [],
				save_referrer: !0,
				capture_pageview: i !== '2025-05-24' || 'history_change',
				capture_pageleave: 'if_capture_pageview',
				defaults: i ?? 'unset',
				debug: (yt && Ue(yt?.search) && yt.search.indexOf('__posthog_debug=true') !== -1) || !1,
				cookie_expiration: 365,
				upgrade: !1,
				disable_session_recording: !1,
				disable_persistence: !1,
				disable_web_experiments: !0,
				disable_surveys: !1,
				disable_external_dependency_loading: !1,
				enable_recording_console_log: void 0,
				secure_cookie: (N == null || (n = N.location) == null ? void 0 : n.protocol) === 'https:',
				ip: !0,
				opt_out_capturing_by_default: !1,
				opt_out_persistence_by_default: !1,
				opt_out_useragent_filter: !1,
				opt_out_capturing_persistence_type: 'localStorage',
				opt_out_capturing_cookie_prefix: null,
				opt_in_site_apps: !1,
				property_denylist: [],
				respect_dnt: !1,
				sanitize_properties: null,
				request_headers: {},
				request_batching: !0,
				properties_string_max_length: 65535,
				session_recording: {},
				mask_all_element_attributes: !1,
				mask_all_text: !1,
				mask_personal_data_properties: !1,
				custom_personal_data_properties: [],
				advanced_disable_decide: !1,
				advanced_disable_feature_flags: !1,
				advanced_disable_feature_flags_on_first_load: !1,
				advanced_disable_toolbar_metrics: !1,
				feature_flag_request_timeout_ms: 3e3,
				surveys_request_timeout_ms: 1e4,
				on_request_error: (r) => {
					var o = 'Bad HTTP status: ' + r.statusCode + ' ' + r.text
					ie.error(o)
				},
				get_device_id: (r) => r,
				capture_performance: void 0,
				name: 'posthog',
				bootstrap: {},
				disable_compression: !1,
				session_idle_timeout_seconds: 1800,
				person_profiles: 'identified_only',
				before_send: void 0,
				request_queue_config: { flush_interval_ms: Wl },
				_onCapture: Hl,
			}
		},
		bp = (i) => {
			var n = {}
			K(i.process_person) || (n.person_profiles = i.process_person),
				K(i.xhr_headers) || (n.request_headers = i.xhr_headers),
				K(i.cookie_name) || (n.persistence_name = i.cookie_name),
				K(i.disable_cookie) || (n.disable_persistence = i.disable_cookie),
				K(i.store_google) || (n.save_campaign_params = i.store_google),
				K(i.verbose) || (n.debug = i.verbose)
			var r = Ge({}, n, i)
			return (
				Le(i.property_blacklist) &&
					(K(i.property_denylist)
						? (r.property_denylist = i.property_blacklist)
						: Le(i.property_denylist)
							? (r.property_denylist = [...i.property_blacklist, ...i.property_denylist])
							: ie.error('Invalid value for property_denylist config: ' + i.property_denylist)),
				r
			)
		}
	class Qy {
		constructor() {
			this.__forceAllowLocalhost = !1
		}
		get os() {
			return this.__forceAllowLocalhost
		}
		set os(n) {
			ie.error(
				'WebPerformanceObserver is deprecated and has no impact on network capture. Use `_forceAllowLocalhostNetworkCapture` on `posthog.sessionRecording`'
			),
				(this.__forceAllowLocalhost = n)
		}
	}
	class uo {
		get decideEndpointWasHit() {
			var n, r
			return (
				(n = (r = this.featureFlags) == null ? void 0 : r.hasLoadedFlags) !== null &&
				n !== void 0 &&
				n
			)
		}
		constructor() {
			;(this.webPerformance = new Qy()),
				(this.ls = !1),
				(this.version = fn.LIB_VERSION),
				(this.us = new yp()),
				(this._calculate_event_properties = this.calculateEventProperties.bind(this)),
				(this.config = Pp()),
				(this.SentryIntegration = ty),
				(this.sentryIntegration = (n) =>
					(function (r, o) {
						var l = Df(r, o)
						return { name: Lf, processEvent: (u) => l(u) }
					})(this, n)),
				(this.__request_queue = []),
				(this.__loaded = !1),
				(this.analyticsDefaultEndpoint = '/e/'),
				(this.hs = !1),
				(this.ds = null),
				(this.vs = null),
				(this.cs = null),
				(this.featureFlags = new Ty(this)),
				(this.toolbar = new ry(this)),
				(this.scrollManager = new zy(this)),
				(this.pageViewManager = new uy(this)),
				(this.surveys = new Fy(this)),
				(this.experiments = new ut(this)),
				(this.exceptions = new hy(this)),
				(this.rateLimiter = new My(this)),
				(this.requestRouter = new qy(this)),
				(this.consent = new d_(this)),
				(this.people = {
					set: (n, r, o) => {
						var l = Ue(n) ? { [n]: r } : n
						this.setPersonProperties(l), o?.({})
					},
					set_once: (n, r, o) => {
						var l = Ue(n) ? { [n]: r } : n
						this.setPersonProperties(void 0, l), o?.({})
					},
				}),
				this.on('eventCaptured', (n) => ie.info('send "' + n?.event + '"', n))
		}
		init(n, r, o) {
			if (o && o !== zr) {
				var l,
					u = (l = Ai[o]) !== null && l !== void 0 ? l : new uo()
				return u._init(n, r, o), (Ai[o] = u), (Ai[zr][o] = u), u
			}
			return this._init(n, r, o)
		}
		_init(n, r, o) {
			var l, u
			if ((r === void 0 && (r = {}), K(n) || Va(n)))
				return (
					ie.critical(
						'PostHog was initialized without a token. This likely indicates a misconfiguration. Please check the first argument passed to posthog.init()'
					),
					this
				)
			if (this.__loaded)
				return ie.warn('You have already initialized PostHog! Re-initializing is a no-op'), this
			;(this.__loaded = !0),
				(this.config = {}),
				(this.fs = []),
				r.person_profiles && (this.vs = r.person_profiles),
				this.set_config(Ge({}, Pp(r.defaults), bp(r), { name: o, token: n })),
				this.config.on_xhr_error &&
					ie.error('on_xhr_error is deprecated. Use on_request_error instead'),
				(this.compression = r.disable_compression ? void 0 : pn.GZipJS),
				(this.persistence = new Bl(this.config)),
				(this.sessionPersistence =
					this.config.persistence === 'sessionStorage' || this.config.persistence === 'memory'
						? this.persistence
						: new Bl(Z({}, this.config, { persistence: 'sessionStorage' })))
			var d = Z({}, this.persistence.props),
				p = Z({}, this.sessionPersistence.props)
			if (
				((this.ps = new Dy((j) => this.gs(j), this.config.request_queue_config)),
				(this._s = new $y(this)),
				(this.__request_queue = []),
				this.config.__preview_experimental_cookieless_mode ||
					((this.sessionManager = new By(this)),
					(this.sessionPropsManager = new Uy(this, this.sessionManager, this.persistence))),
				new sy(this).startIfEnabledOrStop(),
				(this.siteApps = new Hy(this)),
				(l = this.siteApps) == null || l.init(),
				this.config.__preview_experimental_cookieless_mode ||
					((this.sessionRecording = new J_(this)), this.sessionRecording.startIfEnabledOrStop()),
				this.config.disable_scroll_properties || this.scrollManager.startMeasuringScrollPosition(),
				(this.autocapture = new r_(this)),
				this.autocapture.startIfEnabled(),
				this.surveys.loadIfEnabled(),
				(this.heatmaps = new ly(this)),
				this.heatmaps.startIfEnabled(),
				(this.webVitalsAutocapture = new oy(this)),
				(this.exceptionObserver = new h_(this)),
				this.exceptionObserver.startIfEnabled(),
				(this.deadClicksAutocapture = new af(this, p_)),
				this.deadClicksAutocapture.startIfEnabled(),
				(this.historyAutocapture = new R_(this)),
				this.historyAutocapture.startIfEnabled(),
				(fn.DEBUG = fn.DEBUG || this.config.debug),
				fn.DEBUG &&
					ie.info('Starting in debug mode', {
						this: this,
						config: r,
						thisC: Z({}, this.config),
						p: d,
						s: p,
					}),
				this.bs(),
				((u = r.bootstrap) == null ? void 0 : u.distinctID) !== void 0)
			) {
				var h,
					g,
					m = this.config.get_device_id(On()),
					w = (h = r.bootstrap) != null && h.isIdentifiedID ? m : r.bootstrap.distinctID
				this.persistence.set_property(
					hn,
					(g = r.bootstrap) != null && g.isIdentifiedID ? 'identified' : 'anonymous'
				),
					this.register({ distinct_id: r.bootstrap.distinctID, $device_id: w })
			}
			if (this.ws()) {
				var _,
					S,
					M = Object.keys(((_ = r.bootstrap) == null ? void 0 : _.featureFlags) || {})
						.filter((j) => {
							var q
							return !((q = r.bootstrap) == null || (q = q.featureFlags) == null || !q[j])
						})
						.reduce((j, q) => {
							var G
							return (
								(j[q] =
									((G = r.bootstrap) == null || (G = G.featureFlags) == null ? void 0 : G[q]) ||
									!1),
								j
							)
						}, {}),
					k = Object.keys(((S = r.bootstrap) == null ? void 0 : S.featureFlagPayloads) || {})
						.filter((j) => M[j])
						.reduce((j, q) => {
							var G, Q
							return (
								(G = r.bootstrap) != null &&
									(G = G.featureFlagPayloads) != null &&
									G[q] &&
									(j[q] =
										(Q = r.bootstrap) == null || (Q = Q.featureFlagPayloads) == null
											? void 0
											: Q[q]),
								j
							)
						}, {})
				this.featureFlags.receivedFeatureFlags({ featureFlags: M, featureFlagPayloads: k })
			}
			if (this.config.__preview_experimental_cookieless_mode)
				this.register_once({ distinct_id: Ud, $device_id: null }, '')
			else if (!this.get_distinct_id()) {
				var F = this.config.get_device_id(On())
				this.register_once({ distinct_id: F, $device_id: F }, ''),
					this.persistence.set_property(hn, 'anonymous')
			}
			return (
				Ae(N, 'onpagehide' in self ? 'pagehide' : 'unload', this._handle_unload.bind(this), {
					passive: !1,
				}),
				this.toolbar.maybeLoadToolbar(),
				r.segment ? ey(this, () => this.ys()) : this.ys(),
				Ft(this.config._onCapture) &&
					this.config._onCapture !== Hl &&
					(ie.warn('onCapture is deprecated. Please use `before_send` instead'),
					this.on('eventCaptured', (j) => this.config._onCapture(j.event, j))),
				this
			)
		}
		be(n) {
			var r, o, l, u, d, p, h, g
			if (!J || !J.body)
				return (
					ie.info('document not ready yet, trying again in 500 milliseconds...'),
					void setTimeout(() => {
						this.be(n)
					}, 500)
				)
			;(this.compression = void 0),
				n.supportedCompression &&
					!this.config.disable_compression &&
					(this.compression = ye(n.supportedCompression, pn.GZipJS)
						? pn.GZipJS
						: ye(n.supportedCompression, pn.Base64)
							? pn.Base64
							: void 0),
				(r = n.analytics) != null &&
					r.endpoint &&
					(this.analyticsDefaultEndpoint = n.analytics.endpoint),
				this.set_config({ person_profiles: this.vs ? this.vs : 'identified_only' }),
				(o = this.siteApps) == null || o.onRemoteConfig(n),
				(l = this.sessionRecording) == null || l.onRemoteConfig(n),
				(u = this.autocapture) == null || u.onRemoteConfig(n),
				(d = this.heatmaps) == null || d.onRemoteConfig(n),
				this.surveys.onRemoteConfig(n),
				(p = this.webVitalsAutocapture) == null || p.onRemoteConfig(n),
				(h = this.exceptionObserver) == null || h.onRemoteConfig(n),
				this.exceptions.onRemoteConfig(n),
				(g = this.deadClicksAutocapture) == null || g.onRemoteConfig(n)
		}
		ys() {
			try {
				this.config.loaded(this)
			} catch (n) {
				ie.critical('`loaded` function failed', n)
			}
			this.Ss(),
				this.config.capture_pageview &&
					setTimeout(() => {
						this.consent.isOptedIn() && this.$s()
					}, 1),
				new Ly(this).load(),
				this.featureFlags.decide()
		}
		Ss() {
			var n
			this.has_opted_out_capturing() ||
				(this.config.request_batching && ((n = this.ps) == null || n.enable()))
		}
		_dom_loaded() {
			this.has_opted_out_capturing() || In(this.__request_queue, (n) => this.gs(n)),
				(this.__request_queue = []),
				this.Ss()
		}
		_handle_unload() {
			var n, r
			this.config.request_batching
				? (this.ks() && this.capture('$pageleave'),
					(n = this.ps) == null || n.unload(),
					(r = this._s) == null || r.unload())
				: this.ks() && this.capture('$pageleave', null, { transport: 'sendBeacon' })
		}
		me(n) {
			this.__loaded &&
				(Cp
					? this.__request_queue.push(n)
					: this.rateLimiter.isServerRateLimited(n.batchKey) ||
						((n.transport = n.transport || this.config.api_transport),
						(n.url = io(n.url, { ip: this.config.ip ? 1 : 0 })),
						(n.headers = Z({}, this.config.request_headers)),
						(n.compression = n.compression === 'best-available' ? this.compression : n.compression),
						(n.fetchOptions = n.fetchOptions || this.config.fetch_options),
						((r) => {
							var o,
								l,
								u,
								d = Z({}, r)
							;(d.timeout = d.timeout || 6e4),
								(d.url = io(d.url, {
									_: new Date().getTime().toString(),
									ver: fn.LIB_VERSION,
									compression: d.compression,
								}))
							var p = (o = d.transport) !== null && o !== void 0 ? o : 'fetch',
								h =
									(l = (u = Pd(Ii, (g) => g.transport === p)) == null ? void 0 : u.method) !==
										null && l !== void 0
										? l
										: Ii[0].method
							if (!h) throw new Error('No available transport method')
							h(d)
						})(
							Z({}, n, {
								callback: (r) => {
									var o, l
									this.rateLimiter.checkForLimiting(r),
										r.statusCode >= 400 &&
											((o = (l = this.config).on_request_error) == null || o.call(l, r)),
										n.callback == null || n.callback(r)
								},
							})
						)))
		}
		gs(n) {
			this._s ? this._s.retriableRequest(n) : this.me(n)
		}
		_execute_array(n) {
			var r,
				o = [],
				l = [],
				u = []
			In(n, (p) => {
				p &&
					((r = p[0]),
					Le(r)
						? u.push(p)
						: Ft(p)
							? p.call(this)
							: Le(p) && r === 'alias'
								? o.push(p)
								: Le(p) && r.indexOf('capture') !== -1 && Ft(this[r])
									? u.push(p)
									: l.push(p))
			})
			var d = function (p, h) {
				In(
					p,
					function (g) {
						if (Le(g[0])) {
							var m = h
							be(g, function (w) {
								m = m[w[0]].apply(m, w.slice(1))
							})
						} else this[g[0]].apply(this, g.slice(1))
					},
					h
				)
			}
			d(o, this), d(l, this), d(u, this)
		}
		ws() {
			var n, r
			return (
				(((n = this.config.bootstrap) == null ? void 0 : n.featureFlags) &&
					Object.keys((r = this.config.bootstrap) == null ? void 0 : r.featureFlags).length > 0) ||
				!1
			)
		}
		push(n) {
			this._execute_array([n])
		}
		capture(n, r, o) {
			var l
			if (this.__loaded && this.persistence && this.sessionPersistence && this.ps) {
				if (!this.consent.isOptedOut())
					if (!K(n) && Ue(n)) {
						if (this.config.opt_out_useragent_filter || !this._is_bot()) {
							var u =
								o != null && o.skip_client_rate_limiting
									? void 0
									: this.rateLimiter.clientRateLimitContext()
							if (u == null || !u.isRateLimited) {
								r != null &&
									r.$current_url &&
									!Ue(r?.$current_url) &&
									(ie.error(
										'Invalid `$current_url` property provided to `posthog.capture`. Input must be a string. Ignoring provided value.'
									),
									r == null || delete r.$current_url),
									this.sessionPersistence.update_search_keyword(),
									this.config.save_campaign_params &&
										this.sessionPersistence.update_campaign_params(),
									this.config.save_referrer && this.sessionPersistence.update_referrer_info(),
									(this.config.save_campaign_params || this.config.save_referrer) &&
										this.persistence.set_initial_person_info()
								var d = new Date(),
									p = o?.timestamp || d,
									h = On(),
									g = {
										uuid: h,
										event: n,
										properties: this.calculateEventProperties(n, r || {}, p, h),
									}
								u && (g.properties.$lib_rate_limit_remaining_tokens = u.remainingTokens),
									o?.$set && (g.$set = o?.$set)
								var m = this.xs(o?.$set_once)
								m && (g.$set_once = m),
									((g = Um(
										g,
										o != null && o._noTruncate ? null : this.config.properties_string_max_length
									)).timestamp = p),
									K(o?.timestamp) ||
										((g.properties.$event_time_override_provided = !0),
										(g.properties.$event_time_override_system_time = d))
								var w = Z({}, g.properties.$set, g.$set)
								if ((br(w) || this.setPersonPropertiesForFlags(w), !xe(this.config.before_send))) {
									var _ = this.Es(g)
									if (!_) return
									g = _
								}
								this.us.emit('eventCaptured', g)
								var S = {
									method: 'POST',
									url:
										(l = o?._url) !== null && l !== void 0
											? l
											: this.requestRouter.endpointFor('api', this.analyticsDefaultEndpoint),
									data: g,
									compression: 'best-available',
									batchKey: o?._batchKey,
								}
								return (
									!this.config.request_batching ||
									(o && (o == null || !o._batchKey)) ||
									(o != null && o.send_instantly)
										? this.gs(S)
										: this.ps.enqueue(S),
									g
								)
							}
							ie.critical('This capture call is ignored due to client rate limiting.')
						}
					} else ie.error('No event name provided to posthog.capture')
			} else ie.uninitializedWarning('posthog.capture')
		}
		Ne(n) {
			return this.on('eventCaptured', (r) => n(r.event, r))
		}
		calculateEventProperties(n, r, o, l, u) {
			if (((o = o || new Date()), !this.persistence || !this.sessionPersistence)) return r
			var d = u ? void 0 : this.persistence.remove_event_timer(n),
				p = Z({}, r)
			if (
				((p.token = this.config.token),
				(p.$config_defaults = this.config.defaults),
				this.config.__preview_experimental_cookieless_mode && (p.$cookieless_mode = !0),
				n === '$snapshot')
			) {
				var h = Z({}, this.persistence.properties(), this.sessionPersistence.properties())
				return (
					(p.distinct_id = h.distinct_id),
					((!Ue(p.distinct_id) && !ot(p.distinct_id)) || Va(p.distinct_id)) &&
						ie.error(
							'Invalid distinct_id for replay event. This indicates a bug in your implementation'
						),
					p
				)
			}
			var g,
				m = by(
					this.config.mask_personal_data_properties,
					this.config.custom_personal_data_properties
				)
			if (this.sessionManager) {
				var { sessionId: w, windowId: _ } = this.sessionManager.checkAndGetSessionAndWindowId(
					u,
					o.getTime()
				)
				;(p.$session_id = w), (p.$window_id = _)
			}
			this.sessionPropsManager && Ge(p, this.sessionPropsManager.getSessionProps())
			try {
				var S
				this.sessionRecording && Ge(p, this.sessionRecording.sdkDebugProperties),
					(p.$sdk_debug_retry_queue_size = (S = this._s) == null ? void 0 : S.length)
			} catch (j) {
				p.$sdk_debug_error_capturing_properties = String(j)
			}
			if (
				(this.requestRouter.region === Di.CUSTOM && (p.$lib_custom_api_host = this.config.api_host),
				(g =
					n !== '$pageview' || u
						? n !== '$pageleave' || u
							? this.pageViewManager.doEvent()
							: this.pageViewManager.doPageLeave(o)
						: this.pageViewManager.doPageView(o, l)),
				(p = Ge(p, g)),
				n === '$pageview' && J && (p.title = J.title),
				!K(d))
			) {
				var M = o.getTime() - d
				p.$duration = parseFloat((M / 1e3).toFixed(3))
			}
			wt &&
				this.config.opt_out_useragent_filter &&
				(p.$browser_type = this._is_bot() ? 'bot' : 'browser'),
				((p = Ge(
					{},
					m,
					this.persistence.properties(),
					this.sessionPersistence.properties(),
					p
				)).$is_identified = this._isIdentified()),
				Le(this.config.property_denylist)
					? be(this.config.property_denylist, function (j) {
							delete p[j]
						})
					: ie.error(
							'Invalid value for property_denylist config: ' +
								this.config.property_denylist +
								' or property_blacklist config: ' +
								this.config.property_blacklist
						)
			var k = this.config.sanitize_properties
			k && (ie.error('sanitize_properties is deprecated. Use before_send instead'), (p = k(p, n)))
			var F = this.Is()
			return (p.$process_person_profile = F), F && !u && this.Ps('_calculate_event_properties'), p
		}
		xs(n) {
			var r
			if (!this.persistence || !this.Is() || this.ls) return n
			var o = this.persistence.get_initial_props(),
				l = (r = this.sessionPropsManager) == null ? void 0 : r.getSetOnceProps(),
				u = Ge({}, o, l || {}, n || {}),
				d = this.config.sanitize_properties
			return (
				d &&
					(ie.error('sanitize_properties is deprecated. Use before_send instead'),
					(u = d(u, '$set_once'))),
				(this.ls = !0),
				br(u) ? void 0 : u
			)
		}
		register(n, r) {
			var o
			;(o = this.persistence) == null || o.register(n, r)
		}
		register_once(n, r, o) {
			var l
			;(l = this.persistence) == null || l.register_once(n, r, o)
		}
		register_for_session(n) {
			var r
			;(r = this.sessionPersistence) == null || r.register(n)
		}
		unregister(n) {
			var r
			;(r = this.persistence) == null || r.unregister(n)
		}
		unregister_for_session(n) {
			var r
			;(r = this.sessionPersistence) == null || r.unregister(n)
		}
		Rs(n, r) {
			this.register({ [n]: r })
		}
		getFeatureFlag(n, r) {
			return this.featureFlags.getFeatureFlag(n, r)
		}
		getFeatureFlagPayload(n) {
			var r = this.featureFlags.getFeatureFlagPayload(n)
			try {
				return JSON.parse(r)
			} catch {
				return r
			}
		}
		isFeatureEnabled(n, r) {
			return this.featureFlags.isFeatureEnabled(n, r)
		}
		reloadFeatureFlags() {
			this.featureFlags.reloadFeatureFlags()
		}
		updateEarlyAccessFeatureEnrollment(n, r) {
			this.featureFlags.updateEarlyAccessFeatureEnrollment(n, r)
		}
		getEarlyAccessFeatures(n, r, o) {
			return r === void 0 && (r = !1), this.featureFlags.getEarlyAccessFeatures(n, r, o)
		}
		on(n, r) {
			return this.us.on(n, r)
		}
		onFeatureFlags(n) {
			return this.featureFlags.onFeatureFlags(n)
		}
		onSurveysLoaded(n) {
			return this.surveys.onSurveysLoaded(n)
		}
		onSessionId(n) {
			var r, o
			return (r = (o = this.sessionManager) == null ? void 0 : o.onSessionId(n)) !== null &&
				r !== void 0
				? r
				: () => {}
		}
		getSurveys(n, r) {
			r === void 0 && (r = !1), this.surveys.getSurveys(n, r)
		}
		getActiveMatchingSurveys(n, r) {
			r === void 0 && (r = !1), this.surveys.getActiveMatchingSurveys(n, r)
		}
		renderSurvey(n, r) {
			this.surveys.renderSurvey(n, r)
		}
		canRenderSurvey(n) {
			return this.surveys.canRenderSurvey(n)
		}
		canRenderSurveyAsync(n, r) {
			return r === void 0 && (r = !1), this.surveys.canRenderSurveyAsync(n, r)
		}
		identify(n, r, o) {
			if (!this.__loaded || !this.persistence) return ie.uninitializedWarning('posthog.identify')
			if (
				(ot(n) &&
					((n = n.toString()),
					ie.warn(
						'The first argument to posthog.identify was a number, but it should be a string. It has been converted to a string.'
					)),
				n)
			) {
				if (['distinct_id', 'distinctid'].includes(n.toLowerCase()))
					ie.critical(
						'The string "' +
							n +
							'" was set in posthog.identify which indicates an error. This ID should be unique to the user and not a hardcoded string.'
					)
				else if (this.Ps('posthog.identify')) {
					var l = this.get_distinct_id()
					if ((this.register({ $user_id: n }), !this.get_property('$device_id'))) {
						var u = l
						this.register_once({ $had_persisted_distinct_id: !0, $device_id: u }, '')
					}
					n !== l &&
						n !== this.get_property(yi) &&
						(this.unregister(yi), this.register({ distinct_id: n }))
					var d = (this.persistence.get_property(hn) || 'anonymous') === 'anonymous'
					n !== l && d
						? (this.persistence.set_property(hn, 'identified'),
							this.setPersonPropertiesForFlags(Z({}, o || {}, r || {}), !1),
							this.capture(
								'$identify',
								{ distinct_id: n, $anon_distinct_id: l },
								{ $set: r || {}, $set_once: o || {} }
							),
							(this.cs = Bf(n, r, o)),
							this.featureFlags.setAnonymousDistinctId(l))
						: (r || o) && this.setPersonProperties(r, o),
						n !== l && (this.reloadFeatureFlags(), this.unregister(zs))
				}
			} else ie.error('Unique user id has not been set in posthog.identify')
		}
		setPersonProperties(n, r) {
			if ((n || r) && this.Ps('posthog.setPersonProperties')) {
				var o = Bf(this.get_distinct_id(), n, r)
				this.cs !== o
					? (this.setPersonPropertiesForFlags(Z({}, r || {}, n || {})),
						this.capture('$set', { $set: n || {}, $set_once: r || {} }),
						(this.cs = o))
					: ie.info(
							'A duplicate setPersonProperties call was made with the same properties. It has been ignored.'
						)
			}
		}
		group(n, r, o) {
			if (n && r) {
				if (this.Ps('posthog.group')) {
					var l = this.getGroups()
					l[n] !== r && this.resetGroupPropertiesForFlags(n),
						this.register({ $groups: Z({}, l, { [n]: r }) }),
						o &&
							(this.capture('$groupidentify', { $group_type: n, $group_key: r, $group_set: o }),
							this.setGroupPropertiesForFlags({ [n]: o })),
						l[n] === r || o || this.reloadFeatureFlags()
				}
			} else ie.error('posthog.group requires a group type and group key')
		}
		resetGroups() {
			this.register({ $groups: {} }), this.resetGroupPropertiesForFlags(), this.reloadFeatureFlags()
		}
		setPersonPropertiesForFlags(n, r) {
			r === void 0 && (r = !0), this.featureFlags.setPersonPropertiesForFlags(n, r)
		}
		resetPersonPropertiesForFlags() {
			this.featureFlags.resetPersonPropertiesForFlags()
		}
		setGroupPropertiesForFlags(n, r) {
			r === void 0 && (r = !0),
				this.Ps('posthog.setGroupPropertiesForFlags') &&
					this.featureFlags.setGroupPropertiesForFlags(n, r)
		}
		resetGroupPropertiesForFlags(n) {
			this.featureFlags.resetGroupPropertiesForFlags(n)
		}
		reset(n) {
			var r, o, l, u
			if ((ie.info('reset'), !this.__loaded)) return ie.uninitializedWarning('posthog.reset')
			var d = this.get_property('$device_id')
			if (
				(this.consent.reset(),
				(r = this.persistence) == null || r.clear(),
				(o = this.sessionPersistence) == null || o.clear(),
				this.surveys.reset(),
				(l = this.persistence) == null || l.set_property(hn, 'anonymous'),
				(u = this.sessionManager) == null || u.resetSessionId(),
				(this.cs = null),
				this.config.__preview_experimental_cookieless_mode)
			)
				this.register_once({ distinct_id: Ud, $device_id: null }, '')
			else {
				var p = this.config.get_device_id(On())
				this.register_once({ distinct_id: p, $device_id: n ? p : d }, '')
			}
			this.register({ $last_posthog_reset: new Date().toISOString() }, 1)
		}
		get_distinct_id() {
			return this.get_property('distinct_id')
		}
		getGroups() {
			return this.get_property('$groups') || {}
		}
		get_session_id() {
			var n, r
			return (n =
				(r = this.sessionManager) == null
					? void 0
					: r.checkAndGetSessionAndWindowId(!0).sessionId) !== null && n !== void 0
				? n
				: ''
		}
		get_session_replay_url(n) {
			if (!this.sessionManager) return ''
			var { sessionId: r, sessionStartTimestamp: o } =
					this.sessionManager.checkAndGetSessionAndWindowId(!0),
				l = this.requestRouter.endpointFor('ui', '/project/' + this.config.token + '/replay/' + r)
			if (n != null && n.withTimestamp && o) {
				var u,
					d = (u = n.timestampLookBack) !== null && u !== void 0 ? u : 10
				if (!o) return l
				l += '?t=' + Math.max(Math.floor((new Date().getTime() - o) / 1e3) - d, 0)
			}
			return l
		}
		alias(n, r) {
			return n === this.get_property(bd)
				? (ie.critical('Attempting to create alias for existing People user - aborting.'), -2)
				: this.Ps('posthog.alias')
					? (K(r) && (r = this.get_distinct_id()),
						n !== r
							? (this.Rs(yi, n), this.capture('$create_alias', { alias: n, distinct_id: r }))
							: (ie.warn('alias matches current distinct_id - skipping api call.'),
								this.identify(n),
								-1))
					: void 0
		}
		set_config(n) {
			var r,
				o,
				l,
				u,
				d = Z({}, this.config)
			je(n) &&
				(Ge(this.config, bp(n)),
				(r = this.persistence) == null || r.update_config(this.config, d),
				(this.sessionPersistence =
					this.config.persistence === 'sessionStorage' || this.config.persistence === 'memory'
						? this.persistence
						: new Bl(Z({}, this.config, { persistence: 'sessionStorage' }))),
				Ke.O() && Ke.A('ph_debug') === 'true' && (this.config.debug = !0),
				this.config.debug &&
					((fn.DEBUG = !0),
					ie.info(
						'set_config',
						JSON.stringify({ config: n, oldConfig: d, newConfig: Z({}, this.config) }, null, 2)
					)),
				(o = this.sessionRecording) == null || o.startIfEnabledOrStop(),
				(l = this.autocapture) == null || l.startIfEnabled(),
				(u = this.heatmaps) == null || u.startIfEnabled(),
				this.surveys.loadIfEnabled(),
				this.bs())
		}
		startSessionRecording(n) {
			var r = n === !0,
				o = {
					sampling: r || !(n == null || !n.sampling),
					linked_flag: r || !(n == null || !n.linked_flag),
					url_trigger: r || !(n == null || !n.url_trigger),
					event_trigger: r || !(n == null || !n.event_trigger),
				}
			if (Object.values(o).some(Boolean)) {
				var l, u, d, p, h
				;(l = this.sessionManager) == null || l.checkAndGetSessionAndWindowId(),
					o.sampling && ((u = this.sessionRecording) == null || u.overrideSampling()),
					o.linked_flag && ((d = this.sessionRecording) == null || d.overrideLinkedFlag()),
					o.url_trigger && ((p = this.sessionRecording) == null || p.overrideTrigger('url')),
					o.event_trigger && ((h = this.sessionRecording) == null || h.overrideTrigger('event'))
			}
			this.set_config({ disable_session_recording: !1 })
		}
		stopSessionRecording() {
			this.set_config({ disable_session_recording: !0 })
		}
		sessionRecordingStarted() {
			var n
			return !((n = this.sessionRecording) == null || !n.started)
		}
		captureException(n, r) {
			var o = new Error('PostHog syntheticException')
			this.exceptions.sendExceptionEvent(
				Z(
					{},
					b_(((l) => l instanceof Error)(n) ? { error: n, event: n.message } : { event: n }, {
						syntheticException: o,
					}),
					r
				)
			)
		}
		loadToolbar(n) {
			return this.toolbar.loadToolbar(n)
		}
		get_property(n) {
			var r
			return (r = this.persistence) == null ? void 0 : r.props[n]
		}
		getSessionProperty(n) {
			var r
			return (r = this.sessionPersistence) == null ? void 0 : r.props[n]
		}
		toString() {
			var n,
				r = (n = this.config.name) !== null && n !== void 0 ? n : zr
			return r !== zr && (r = zr + '.' + r), r
		}
		_isIdentified() {
			var n, r
			return (
				((n = this.persistence) == null ? void 0 : n.get_property(hn)) === 'identified' ||
				((r = this.sessionPersistence) == null ? void 0 : r.get_property(hn)) === 'identified'
			)
		}
		Is() {
			var n, r
			return !(
				this.config.person_profiles === 'never' ||
				(this.config.person_profiles === 'identified_only' &&
					!this._isIdentified() &&
					br(this.getGroups()) &&
					((n = this.persistence) == null || (n = n.props) == null || !n[yi]) &&
					((r = this.persistence) == null || (r = r.props) == null || !r[Us]))
			)
		}
		ks() {
			return (
				this.config.capture_pageleave === !0 ||
				(this.config.capture_pageleave === 'if_capture_pageview' &&
					(this.config.capture_pageview === !0 ||
						this.config.capture_pageview === 'history_change'))
			)
		}
		createPersonProfile() {
			this.Is() || (this.Ps('posthog.createPersonProfile') && this.setPersonProperties({}, {}))
		}
		Ps(n) {
			return this.config.person_profiles === 'never'
				? (ie.error(
						n + ' was called, but process_person is set to "never". This call will be ignored.'
					),
					!1)
				: (this.Rs(Us, !0), !0)
		}
		bs() {
			var n,
				r,
				o,
				l,
				u = this.consent.isOptedOut(),
				d = this.config.opt_out_persistence_by_default,
				p = this.config.disable_persistence || (u && !!d)
			;((n = this.persistence) == null ? void 0 : n.xe) !== p &&
				((o = this.persistence) == null || o.set_disabled(p)),
				((r = this.sessionPersistence) == null ? void 0 : r.xe) !== p &&
					((l = this.sessionPersistence) == null || l.set_disabled(p))
		}
		opt_in_capturing(n) {
			var r
			this.consent.optInOut(!0),
				this.bs(),
				(K(n?.captureEventName) || (n != null && n.captureEventName)) &&
					this.capture(
						(r = n?.captureEventName) !== null && r !== void 0 ? r : '$opt_in',
						n?.captureProperties,
						{ send_instantly: !0 }
					),
				this.config.capture_pageview && this.$s()
		}
		opt_out_capturing() {
			this.consent.optInOut(!1), this.bs()
		}
		has_opted_in_capturing() {
			return this.consent.isOptedIn()
		}
		has_opted_out_capturing() {
			return this.consent.isOptedOut()
		}
		clear_opt_in_out_capturing() {
			this.consent.reset(), this.bs()
		}
		_is_bot() {
			return Rt ? kp(Rt, this.config.custom_blocked_useragents) : void 0
		}
		$s() {
			J &&
				(J.visibilityState === 'visible'
					? this.hs ||
						((this.hs = !0),
						this.capture('$pageview', { title: J.title }, { send_instantly: !0 }),
						this.ds && (J.removeEventListener('visibilitychange', this.ds), (this.ds = null)))
					: this.ds || ((this.ds = this.$s.bind(this)), Ae(J, 'visibilitychange', this.ds)))
		}
		debug(n) {
			n === !1
				? (N?.console.log("You've disabled debug mode."),
					localStorage && localStorage.removeItem('ph_debug'),
					this.set_config({ debug: !1 }))
				: (N?.console.log(
						"You're now in debug mode. All calls to PostHog will be logged in your console.\nYou can disable this with `posthog.debug(false)`."
					),
					localStorage && localStorage.setItem('ph_debug', 'true'),
					this.set_config({ debug: !0 }))
		}
		Es(n) {
			if (xe(this.config.before_send)) return n
			var r = Le(this.config.before_send) ? this.config.before_send : [this.config.before_send],
				o = n
			for (var l of r) {
				if (((o = l(o)), xe(o))) {
					var u = "Event '" + n.event + "' was rejected in beforeSend function"
					return (
						$m(n.event) ? ie.warn(u + '. This can cause unexpected behavior.') : ie.info(u), null
					)
				}
				;(o.properties && !br(o.properties)) ||
					ie.warn(
						"Event '" +
							n.event +
							"' has no properties after beforeSend function, this is likely an error."
					)
			}
			return o
		}
		getPageViewId() {
			var n
			return (n = this.pageViewManager.ne) == null ? void 0 : n.pageViewId
		}
		captureTraceFeedback(n, r) {
			this.capture('$ai_feedback', { $ai_trace_id: String(n), $ai_feedback_text: r })
		}
		captureTraceMetric(n, r, o) {
			this.capture('$ai_metric', {
				$ai_trace_id: String(n),
				$ai_metric_name: r,
				$ai_metric_value: String(o),
			})
		}
	}
	;(function (i, n) {
		for (var r = 0; r < n.length; r++) i.prototype[n[r]] = jm(i.prototype[n[r]])
	})(uo, ['identify'])
	var Rp
	;(function (i) {
		return (i.Button = 'button'), (i.Tab = 'tab'), (i.Selector = 'selector'), i
	})({}),
		(function (i) {
			return (
				(i.TopLeft = 'top_left'),
				(i.TopRight = 'top_right'),
				(i.TopCenter = 'top_center'),
				(i.MiddleLeft = 'middle_left'),
				(i.MiddleRight = 'middle_right'),
				(i.MiddleCenter = 'middle_center'),
				(i.Left = 'left'),
				(i.Center = 'center'),
				(i.Right = 'right'),
				(i.NextToTrigger = 'next_to_trigger'),
				i
			)
		})({}),
		(function (i) {
			return (i.Popover = 'popover'), (i.API = 'api'), (i.Widget = 'widget'), i
		})({}),
		(function (i) {
			return (
				(i.Open = 'open'),
				(i.MultipleChoice = 'multiple_choice'),
				(i.SingleChoice = 'single_choice'),
				(i.Rating = 'rating'),
				(i.Link = 'link'),
				i
			)
		})({}),
		(function (i) {
			return (
				(i.NextQuestion = 'next_question'),
				(i.End = 'end'),
				(i.ResponseBased = 'response_based'),
				(i.SpecificQuestion = 'specific_question'),
				i
			)
		})({}),
		(function (i) {
			return (i.Once = 'once'), (i.Recurring = 'recurring'), (i.Always = 'always'), i
		})({})
	var sn =
			((Rp = Ai[zr] = new uo()),
			(function () {
				function i() {
					i.done ||
						((i.done = !0),
						(Cp = !1),
						be(Ai, function (n) {
							n._dom_loaded()
						}))
				}
				J != null && J.addEventListener
					? J.readyState === 'complete'
						? i()
						: Ae(J, 'DOMContentLoaded', i, { capture: !1 })
					: N &&
						ie.error(
							"Browser doesn't support `document.addEventListener` so PostHog couldn't be initialized"
						)
			})(),
			Rp),
		Ip = dd()
	const Ky = Na(Ip)
	function Tp(i, n) {
		if (typeof i == 'function') return i(n)
		i != null && (i.current = n)
	}
	function Op(...i) {
		return (n) => {
			let r = !1
			const o = i.map((l) => {
				const u = Tp(l, n)
				return !r && typeof u == 'function' && (r = !0), u
			})
			if (r)
				return () => {
					for (let l = 0; l < o.length; l++) {
						const u = o[l]
						typeof u == 'function' ? u() : Tp(i[l], null)
					}
				}
		}
	}
	function _n(...i) {
		return R.useCallback(Op(...i), i)
	}
	function Np(i) {
		const n = Xy(i),
			r = R.forwardRef((o, l) => {
				const { children: u, ...d } = o,
					p = R.Children.toArray(u),
					h = p.find(Zy)
				if (h) {
					const g = h.props.children,
						m = p.map((w) =>
							w === h
								? R.Children.count(g) > 1
									? R.Children.only(null)
									: R.isValidElement(g)
										? g.props.children
										: null
								: w
						)
					return ne.jsx(n, {
						...d,
						ref: l,
						children: R.isValidElement(g) ? R.cloneElement(g, void 0, m) : null,
					})
				}
				return ne.jsx(n, { ...d, ref: l, children: u })
			})
		return (r.displayName = `${i}.Slot`), r
	}
	function Xy(i) {
		const n = R.forwardRef((r, o) => {
			const { children: l, ...u } = r
			if (R.isValidElement(l)) {
				const d = e0(l),
					p = Jy(u, l.props)
				return l.type !== R.Fragment && (p.ref = o ? Op(o, d) : d), R.cloneElement(l, p)
			}
			return R.Children.count(l) > 1 ? R.Children.only(null) : null
		})
		return (n.displayName = `${i}.SlotClone`), n
	}
	var Yy = Symbol('radix.slottable')
	function Zy(i) {
		return (
			R.isValidElement(i) &&
			typeof i.type == 'function' &&
			'__radixId' in i.type &&
			i.type.__radixId === Yy
		)
	}
	function Jy(i, n) {
		const r = { ...n }
		for (const o in n) {
			const l = i[o],
				u = n[o]
			;/^on[A-Z]/.test(o)
				? l && u
					? (r[o] = (...p) => {
							u(...p), l(...p)
						})
					: l && (r[o] = l)
				: o === 'style'
					? (r[o] = { ...l, ...u })
					: o === 'className' && (r[o] = [l, u].filter(Boolean).join(' '))
		}
		return { ...i, ...r }
	}
	function e0(i) {
		let n = Object.getOwnPropertyDescriptor(i.props, 'ref')?.get,
			r = n && 'isReactWarning' in n && n.isReactWarning
		return r
			? i.ref
			: ((n = Object.getOwnPropertyDescriptor(i, 'ref')?.get),
				(r = n && 'isReactWarning' in n && n.isReactWarning),
				r ? i.props.ref : i.props.ref || i.ref)
	}
	var t0 = [
			'a',
			'button',
			'div',
			'form',
			'h2',
			'h3',
			'img',
			'input',
			'label',
			'li',
			'nav',
			'ol',
			'p',
			'select',
			'span',
			'svg',
			'ul',
		],
		Ht = t0.reduce((i, n) => {
			const r = Np(`Primitive.${n}`),
				o = R.forwardRef((l, u) => {
					const { asChild: d, ...p } = l,
						h = d ? r : n
					return (
						typeof window < 'u' && (window[Symbol.for('radix-ui')] = !0),
						ne.jsx(h, { ...p, ref: u })
					)
				})
			return (o.displayName = `Primitive.${n}`), { ...i, [n]: o }
		}, {})
	function n0(i, n) {
		i && Ip.flushSync(() => i.dispatchEvent(n))
	}
	function r0(i, n) {
		const r = R.createContext(n),
			o = (u) => {
				const { children: d, ...p } = u,
					h = R.useMemo(() => p, Object.values(p))
				return ne.jsx(r.Provider, { value: h, children: d })
			}
		o.displayName = i + 'Provider'
		function l(u) {
			const d = R.useContext(r)
			if (d) return d
			if (n !== void 0) return n
			throw new Error(`\`${u}\` must be used within \`${i}\``)
		}
		return [o, l]
	}
	function Fp(i, n = []) {
		let r = []
		function o(u, d) {
			const p = R.createContext(d),
				h = r.length
			r = [...r, d]
			const g = (w) => {
				const { scope: _, children: S, ...M } = w,
					k = _?.[i]?.[h] || p,
					F = R.useMemo(() => M, Object.values(M))
				return ne.jsx(k.Provider, { value: F, children: S })
			}
			g.displayName = u + 'Provider'
			function m(w, _) {
				const S = _?.[i]?.[h] || p,
					M = R.useContext(S)
				if (M) return M
				if (d !== void 0) return d
				throw new Error(`\`${w}\` must be used within \`${u}\``)
			}
			return [g, m]
		}
		const l = () => {
			const u = r.map((d) => R.createContext(d))
			return function (p) {
				const h = p?.[i] || u
				return R.useMemo(() => ({ [`__scope${i}`]: { ...p, [i]: h } }), [p, h])
			}
		}
		return (l.scopeName = i), [o, i0(l, ...n)]
	}
	function i0(...i) {
		const n = i[0]
		if (i.length === 1) return n
		const r = () => {
			const o = i.map((l) => ({ useScope: l(), scopeName: l.scopeName }))
			return function (u) {
				const d = o.reduce((p, { useScope: h, scopeName: g }) => {
					const w = h(u)[`__scope${g}`]
					return { ...p, ...w }
				}, {})
				return R.useMemo(() => ({ [`__scope${n.scopeName}`]: d }), [d])
			}
		}
		return (r.scopeName = n.scopeName), r
	}
	function yn(i, n, { checkForDefaultPrevented: r = !0 } = {}) {
		return function (l) {
			if ((i?.(l), r === !1 || !l.defaultPrevented)) return n?.(l)
		}
	}
	var jr = globalThis?.document ? R.useLayoutEffect : () => {},
		s0 = od[' useInsertionEffect '.trim().toString()] || jr
	function Mp({ prop: i, defaultProp: n, onChange: r = () => {}, caller: o }) {
		const [l, u, d] = o0({ defaultProp: n, onChange: r }),
			p = i !== void 0,
			h = p ? i : l
		{
			const m = R.useRef(i !== void 0)
			R.useEffect(() => {
				const w = m.current
				w !== p &&
					console.warn(
						`${o} is changing from ${w ? 'controlled' : 'uncontrolled'} to ${p ? 'controlled' : 'uncontrolled'}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
					),
					(m.current = p)
			}, [p, o])
		}
		const g = R.useCallback(
			(m) => {
				if (p) {
					const w = a0(m) ? m(i) : m
					w !== i && d.current?.(w)
				} else u(m)
			},
			[p, i, u, d]
		)
		return [h, g]
	}
	function o0({ defaultProp: i, onChange: n }) {
		const [r, o] = R.useState(i),
			l = R.useRef(r),
			u = R.useRef(n)
		return (
			s0(() => {
				u.current = n
			}, [n]),
			R.useEffect(() => {
				l.current !== r && (u.current?.(r), (l.current = r))
			}, [r, l]),
			[r, o, u]
		)
	}
	function a0(i) {
		return typeof i == 'function'
	}
	function l0(i, n) {
		return R.useReducer((r, o) => n[r][o] ?? r, i)
	}
	var co = (i) => {
		const { present: n, children: r } = i,
			o = u0(n),
			l = typeof r == 'function' ? r({ present: o.isPresent }) : R.Children.only(r),
			u = _n(o.ref, c0(l))
		return typeof r == 'function' || o.isPresent ? R.cloneElement(l, { ref: u }) : null
	}
	co.displayName = 'Presence'
	function u0(i) {
		const [n, r] = R.useState(),
			o = R.useRef(null),
			l = R.useRef(i),
			u = R.useRef('none'),
			d = i ? 'mounted' : 'unmounted',
			[p, h] = l0(d, {
				mounted: { UNMOUNT: 'unmounted', ANIMATION_OUT: 'unmountSuspended' },
				unmountSuspended: { MOUNT: 'mounted', ANIMATION_END: 'unmounted' },
				unmounted: { MOUNT: 'mounted' },
			})
		return (
			R.useEffect(() => {
				const g = fo(o.current)
				u.current = p === 'mounted' ? g : 'none'
			}, [p]),
			jr(() => {
				const g = o.current,
					m = l.current
				if (m !== i) {
					const _ = u.current,
						S = fo(g)
					i
						? h('MOUNT')
						: S === 'none' || g?.display === 'none'
							? h('UNMOUNT')
							: h(m && _ !== S ? 'ANIMATION_OUT' : 'UNMOUNT'),
						(l.current = i)
				}
			}, [i, h]),
			jr(() => {
				if (n) {
					let g
					const m = n.ownerDocument.defaultView ?? window,
						w = (S) => {
							const k = fo(o.current).includes(S.animationName)
							if (S.target === n && k && (h('ANIMATION_END'), !l.current)) {
								const F = n.style.animationFillMode
								;(n.style.animationFillMode = 'forwards'),
									(g = m.setTimeout(() => {
										n.style.animationFillMode === 'forwards' && (n.style.animationFillMode = F)
									}))
							}
						},
						_ = (S) => {
							S.target === n && (u.current = fo(o.current))
						}
					return (
						n.addEventListener('animationstart', _),
						n.addEventListener('animationcancel', w),
						n.addEventListener('animationend', w),
						() => {
							m.clearTimeout(g),
								n.removeEventListener('animationstart', _),
								n.removeEventListener('animationcancel', w),
								n.removeEventListener('animationend', w)
						}
					)
				} else h('ANIMATION_END')
			}, [n, h]),
			{
				isPresent: ['mounted', 'unmountSuspended'].includes(p),
				ref: R.useCallback((g) => {
					;(o.current = g ? getComputedStyle(g) : null), r(g)
				}, []),
			}
		)
	}
	function fo(i) {
		return i?.animationName || 'none'
	}
	function c0(i) {
		let n = Object.getOwnPropertyDescriptor(i.props, 'ref')?.get,
			r = n && 'isReactWarning' in n && n.isReactWarning
		return r
			? i.ref
			: ((n = Object.getOwnPropertyDescriptor(i, 'ref')?.get),
				(r = n && 'isReactWarning' in n && n.isReactWarning),
				r ? i.props.ref : i.props.ref || i.ref)
	}
	var d0 = od[' useId '.trim().toString()] || (() => {}),
		f0 = 0
	function Vl(i) {
		const [n, r] = R.useState(d0())
		return (
			jr(() => {
				r((o) => o ?? String(f0++))
			}, [i]),
			i || (n ? `radix-${n}` : '')
		)
	}
	function $i(i) {
		const n = R.useRef(i)
		return (
			R.useEffect(() => {
				n.current = i
			}),
			R.useMemo(
				() =>
					(...r) =>
						n.current?.(...r),
				[]
			)
		)
	}
	function p0(i, n = globalThis?.document) {
		const r = $i(i)
		R.useEffect(() => {
			const o = (l) => {
				l.key === 'Escape' && r(l)
			}
			return (
				n.addEventListener('keydown', o, { capture: !0 }),
				() => n.removeEventListener('keydown', o, { capture: !0 })
			)
		}, [r, n])
	}
	var h0 = 'DismissableLayer',
		ql = 'dismissableLayer.update',
		v0 = 'dismissableLayer.pointerDownOutside',
		g0 = 'dismissableLayer.focusOutside',
		Lp,
		Dp = R.createContext({
			layers: new Set(),
			layersWithOutsidePointerEventsDisabled: new Set(),
			branches: new Set(),
		}),
		Ap = R.forwardRef((i, n) => {
			const {
					disableOutsidePointerEvents: r = !1,
					onEscapeKeyDown: o,
					onPointerDownOutside: l,
					onFocusOutside: u,
					onInteractOutside: d,
					onDismiss: p,
					...h
				} = i,
				g = R.useContext(Dp),
				[m, w] = R.useState(null),
				_ = m?.ownerDocument ?? globalThis?.document,
				[, S] = R.useState({}),
				M = _n(n, (ae) => w(ae)),
				k = Array.from(g.layers),
				[F] = [...g.layersWithOutsidePointerEventsDisabled].slice(-1),
				j = k.indexOf(F),
				q = m ? k.indexOf(m) : -1,
				G = g.layersWithOutsidePointerEventsDisabled.size > 0,
				Q = q >= j,
				ue = y0((ae) => {
					const le = ae.target,
						pe = [...g.branches].some((Ce) => Ce.contains(le))
					!Q || pe || (l?.(ae), d?.(ae), ae.defaultPrevented || p?.())
				}, _),
				ve = w0((ae) => {
					const le = ae.target
					;[...g.branches].some((Ce) => Ce.contains(le)) ||
						(u?.(ae), d?.(ae), ae.defaultPrevented || p?.())
				}, _)
			return (
				p0((ae) => {
					q === g.layers.size - 1 &&
						(o?.(ae), !ae.defaultPrevented && p && (ae.preventDefault(), p()))
				}, _),
				R.useEffect(() => {
					if (m)
						return (
							r &&
								(g.layersWithOutsidePointerEventsDisabled.size === 0 &&
									((Lp = _.body.style.pointerEvents), (_.body.style.pointerEvents = 'none')),
								g.layersWithOutsidePointerEventsDisabled.add(m)),
							g.layers.add(m),
							$p(),
							() => {
								r &&
									g.layersWithOutsidePointerEventsDisabled.size === 1 &&
									(_.body.style.pointerEvents = Lp)
							}
						)
				}, [m, _, r, g]),
				R.useEffect(
					() => () => {
						m && (g.layers.delete(m), g.layersWithOutsidePointerEventsDisabled.delete(m), $p())
					},
					[m, g]
				),
				R.useEffect(() => {
					const ae = () => S({})
					return document.addEventListener(ql, ae), () => document.removeEventListener(ql, ae)
				}, []),
				ne.jsx(Ht.div, {
					...h,
					ref: M,
					style: { pointerEvents: G ? (Q ? 'auto' : 'none') : void 0, ...i.style },
					onFocusCapture: yn(i.onFocusCapture, ve.onFocusCapture),
					onBlurCapture: yn(i.onBlurCapture, ve.onBlurCapture),
					onPointerDownCapture: yn(i.onPointerDownCapture, ue.onPointerDownCapture),
				})
			)
		})
	Ap.displayName = h0
	var m0 = 'DismissableLayerBranch',
		_0 = R.forwardRef((i, n) => {
			const r = R.useContext(Dp),
				o = R.useRef(null),
				l = _n(n, o)
			return (
				R.useEffect(() => {
					const u = o.current
					if (u)
						return (
							r.branches.add(u),
							() => {
								r.branches.delete(u)
							}
						)
				}, [r.branches]),
				ne.jsx(Ht.div, { ...i, ref: l })
			)
		})
	_0.displayName = m0
	function y0(i, n = globalThis?.document) {
		const r = $i(i),
			o = R.useRef(!1),
			l = R.useRef(() => {})
		return (
			R.useEffect(() => {
				const u = (p) => {
						if (p.target && !o.current) {
							let h = function () {
								zp(v0, r, g, { discrete: !0 })
							}
							const g = { originalEvent: p }
							p.pointerType === 'touch'
								? (n.removeEventListener('click', l.current),
									(l.current = h),
									n.addEventListener('click', l.current, { once: !0 }))
								: h()
						} else n.removeEventListener('click', l.current)
						o.current = !1
					},
					d = window.setTimeout(() => {
						n.addEventListener('pointerdown', u)
					}, 0)
				return () => {
					window.clearTimeout(d),
						n.removeEventListener('pointerdown', u),
						n.removeEventListener('click', l.current)
				}
			}, [n, r]),
			{ onPointerDownCapture: () => (o.current = !0) }
		)
	}
	function w0(i, n = globalThis?.document) {
		const r = $i(i),
			o = R.useRef(!1)
		return (
			R.useEffect(() => {
				const l = (u) => {
					u.target && !o.current && zp(g0, r, { originalEvent: u }, { discrete: !1 })
				}
				return n.addEventListener('focusin', l), () => n.removeEventListener('focusin', l)
			}, [n, r]),
			{ onFocusCapture: () => (o.current = !0), onBlurCapture: () => (o.current = !1) }
		)
	}
	function $p() {
		const i = new CustomEvent(ql)
		document.dispatchEvent(i)
	}
	function zp(i, n, r, { discrete: o }) {
		const l = r.originalEvent.target,
			u = new CustomEvent(i, { bubbles: !1, cancelable: !0, detail: r })
		n && l.addEventListener(i, n, { once: !0 }), o ? n0(l, u) : l.dispatchEvent(u)
	}
	var Gl = 'focusScope.autoFocusOnMount',
		Ql = 'focusScope.autoFocusOnUnmount',
		jp = { bubbles: !1, cancelable: !0 },
		S0 = 'FocusScope',
		Up = R.forwardRef((i, n) => {
			const { loop: r = !1, trapped: o = !1, onMountAutoFocus: l, onUnmountAutoFocus: u, ...d } = i,
				[p, h] = R.useState(null),
				g = $i(l),
				m = $i(u),
				w = R.useRef(null),
				_ = _n(n, (k) => h(k)),
				S = R.useRef({
					paused: !1,
					pause() {
						this.paused = !0
					},
					resume() {
						this.paused = !1
					},
				}).current
			R.useEffect(() => {
				if (o) {
					let k = function (G) {
							if (S.paused || !p) return
							const Q = G.target
							p.contains(Q) ? (w.current = Q) : Dn(w.current, { select: !0 })
						},
						F = function (G) {
							if (S.paused || !p) return
							const Q = G.relatedTarget
							Q !== null && (p.contains(Q) || Dn(w.current, { select: !0 }))
						},
						j = function (G) {
							if (document.activeElement === document.body)
								for (const ue of G) ue.removedNodes.length > 0 && Dn(p)
						}
					document.addEventListener('focusin', k), document.addEventListener('focusout', F)
					const q = new MutationObserver(j)
					return (
						p && q.observe(p, { childList: !0, subtree: !0 }),
						() => {
							document.removeEventListener('focusin', k),
								document.removeEventListener('focusout', F),
								q.disconnect()
						}
					)
				}
			}, [o, p, S.paused]),
				R.useEffect(() => {
					if (p) {
						Hp.add(S)
						const k = document.activeElement
						if (!p.contains(k)) {
							const j = new CustomEvent(Gl, jp)
							p.addEventListener(Gl, g),
								p.dispatchEvent(j),
								j.defaultPrevented ||
									(E0(b0(Bp(p)), { select: !0 }), document.activeElement === k && Dn(p))
						}
						return () => {
							p.removeEventListener(Gl, g),
								setTimeout(() => {
									const j = new CustomEvent(Ql, jp)
									p.addEventListener(Ql, m),
										p.dispatchEvent(j),
										j.defaultPrevented || Dn(k ?? document.body, { select: !0 }),
										p.removeEventListener(Ql, m),
										Hp.remove(S)
								}, 0)
						}
					}
				}, [p, g, m, S])
			const M = R.useCallback(
				(k) => {
					if ((!r && !o) || S.paused) return
					const F = k.key === 'Tab' && !k.altKey && !k.ctrlKey && !k.metaKey,
						j = document.activeElement
					if (F && j) {
						const q = k.currentTarget,
							[G, Q] = k0(q)
						G && Q
							? !k.shiftKey && j === Q
								? (k.preventDefault(), r && Dn(G, { select: !0 }))
								: k.shiftKey && j === G && (k.preventDefault(), r && Dn(Q, { select: !0 }))
							: j === q && k.preventDefault()
					}
				},
				[r, o, S.paused]
			)
			return ne.jsx(Ht.div, { tabIndex: -1, ...d, ref: _, onKeyDown: M })
		})
	Up.displayName = S0
	function E0(i, { select: n = !1 } = {}) {
		const r = document.activeElement
		for (const o of i) if ((Dn(o, { select: n }), document.activeElement !== r)) return
	}
	function k0(i) {
		const n = Bp(i),
			r = Wp(n, i),
			o = Wp(n.reverse(), i)
		return [r, o]
	}
	function Bp(i) {
		const n = [],
			r = document.createTreeWalker(i, NodeFilter.SHOW_ELEMENT, {
				acceptNode: (o) => {
					const l = o.tagName === 'INPUT' && o.type === 'hidden'
					return o.disabled || o.hidden || l
						? NodeFilter.FILTER_SKIP
						: o.tabIndex >= 0
							? NodeFilter.FILTER_ACCEPT
							: NodeFilter.FILTER_SKIP
				},
			})
		for (; r.nextNode(); ) n.push(r.currentNode)
		return n
	}
	function Wp(i, n) {
		for (const r of i) if (!x0(r, { upTo: n })) return r
	}
	function x0(i, { upTo: n }) {
		if (getComputedStyle(i).visibility === 'hidden') return !0
		for (; i; ) {
			if (n !== void 0 && i === n) return !1
			if (getComputedStyle(i).display === 'none') return !0
			i = i.parentElement
		}
		return !1
	}
	function C0(i) {
		return i instanceof HTMLInputElement && 'select' in i
	}
	function Dn(i, { select: n = !1 } = {}) {
		if (i && i.focus) {
			const r = document.activeElement
			i.focus({ preventScroll: !0 }), i !== r && C0(i) && n && i.select()
		}
	}
	var Hp = P0()
	function P0() {
		let i = []
		return {
			add(n) {
				const r = i[0]
				n !== r && r?.pause(), (i = Vp(i, n)), i.unshift(n)
			},
			remove(n) {
				;(i = Vp(i, n)), i[0]?.resume()
			},
		}
	}
	function Vp(i, n) {
		const r = [...i],
			o = r.indexOf(n)
		return o !== -1 && r.splice(o, 1), r
	}
	function b0(i) {
		return i.filter((n) => n.tagName !== 'A')
	}
	var R0 = 'Portal',
		qp = R.forwardRef((i, n) => {
			const { container: r, ...o } = i,
				[l, u] = R.useState(!1)
			jr(() => u(!0), [])
			const d = r || (l && globalThis?.document?.body)
			return d ? Ky.createPortal(ne.jsx(Ht.div, { ...o, ref: n }), d) : null
		})
	qp.displayName = R0
	var Kl = 0
	function I0() {
		R.useEffect(() => {
			const i = document.querySelectorAll('[data-radix-focus-guard]')
			return (
				document.body.insertAdjacentElement('afterbegin', i[0] ?? Gp()),
				document.body.insertAdjacentElement('beforeend', i[1] ?? Gp()),
				Kl++,
				() => {
					Kl === 1 &&
						document.querySelectorAll('[data-radix-focus-guard]').forEach((n) => n.remove()),
						Kl--
				}
			)
		}, [])
	}
	function Gp() {
		const i = document.createElement('span')
		return (
			i.setAttribute('data-radix-focus-guard', ''),
			(i.tabIndex = 0),
			(i.style.outline = 'none'),
			(i.style.opacity = '0'),
			(i.style.position = 'fixed'),
			(i.style.pointerEvents = 'none'),
			i
		)
	}
	var on = function () {
		return (
			(on =
				Object.assign ||
				function (n) {
					for (var r, o = 1, l = arguments.length; o < l; o++) {
						r = arguments[o]
						for (var u in r) Object.prototype.hasOwnProperty.call(r, u) && (n[u] = r[u])
					}
					return n
				}),
			on.apply(this, arguments)
		)
	}
	function Qp(i, n) {
		var r = {}
		for (var o in i) Object.prototype.hasOwnProperty.call(i, o) && n.indexOf(o) < 0 && (r[o] = i[o])
		if (i != null && typeof Object.getOwnPropertySymbols == 'function')
			for (var l = 0, o = Object.getOwnPropertySymbols(i); l < o.length; l++)
				n.indexOf(o[l]) < 0 &&
					Object.prototype.propertyIsEnumerable.call(i, o[l]) &&
					(r[o[l]] = i[o[l]])
		return r
	}
	function T0(i, n, r) {
		if (r || arguments.length === 2)
			for (var o = 0, l = n.length, u; o < l; o++)
				(u || !(o in n)) && (u || (u = Array.prototype.slice.call(n, 0, o)), (u[o] = n[o]))
		return i.concat(u || Array.prototype.slice.call(n))
	}
	typeof SuppressedError == 'function' && SuppressedError
	var po = 'right-scroll-bar-position',
		ho = 'width-before-scroll-bar',
		O0 = 'with-scroll-bars-hidden',
		N0 = '--removed-body-scroll-bar-size'
	function Xl(i, n) {
		return typeof i == 'function' ? i(n) : i && (i.current = n), i
	}
	function F0(i, n) {
		var r = R.useState(function () {
			return {
				value: i,
				callback: n,
				facade: {
					get current() {
						return r.value
					},
					set current(o) {
						var l = r.value
						l !== o && ((r.value = o), r.callback(o, l))
					},
				},
			}
		})[0]
		return (r.callback = n), r.facade
	}
	var M0 = typeof window < 'u' ? R.useLayoutEffect : R.useEffect,
		Kp = new WeakMap()
	function L0(i, n) {
		var r = F0(null, function (o) {
			return i.forEach(function (l) {
				return Xl(l, o)
			})
		})
		return (
			M0(
				function () {
					var o = Kp.get(r)
					if (o) {
						var l = new Set(o),
							u = new Set(i),
							d = r.current
						l.forEach(function (p) {
							u.has(p) || Xl(p, null)
						}),
							u.forEach(function (p) {
								l.has(p) || Xl(p, d)
							})
					}
					Kp.set(r, i)
				},
				[i]
			),
			r
		)
	}
	function D0(i) {
		return i
	}
	function A0(i, n) {
		n === void 0 && (n = D0)
		var r = [],
			o = !1,
			l = {
				read: function () {
					if (o)
						throw new Error(
							'Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.'
						)
					return r.length ? r[r.length - 1] : i
				},
				useMedium: function (u) {
					var d = n(u, o)
					return (
						r.push(d),
						function () {
							r = r.filter(function (p) {
								return p !== d
							})
						}
					)
				},
				assignSyncMedium: function (u) {
					for (o = !0; r.length; ) {
						var d = r
						;(r = []), d.forEach(u)
					}
					r = {
						push: function (p) {
							return u(p)
						},
						filter: function () {
							return r
						},
					}
				},
				assignMedium: function (u) {
					o = !0
					var d = []
					if (r.length) {
						var p = r
						;(r = []), p.forEach(u), (d = r)
					}
					var h = function () {
							var m = d
							;(d = []), m.forEach(u)
						},
						g = function () {
							return Promise.resolve().then(h)
						}
					g(),
						(r = {
							push: function (m) {
								d.push(m), g()
							},
							filter: function (m) {
								return (d = d.filter(m)), r
							},
						})
				},
			}
		return l
	}
	function $0(i) {
		i === void 0 && (i = {})
		var n = A0(null)
		return (n.options = on({ async: !0, ssr: !1 }, i)), n
	}
	var Xp = function (i) {
		var n = i.sideCar,
			r = Qp(i, ['sideCar'])
		if (!n) throw new Error('Sidecar: please provide `sideCar` property to import the right car')
		var o = n.read()
		if (!o) throw new Error('Sidecar medium not found')
		return R.createElement(o, on({}, r))
	}
	Xp.isSideCarExport = !0
	function z0(i, n) {
		return i.useMedium(n), Xp
	}
	var Yp = $0(),
		Yl = function () {},
		vo = R.forwardRef(function (i, n) {
			var r = R.useRef(null),
				o = R.useState({ onScrollCapture: Yl, onWheelCapture: Yl, onTouchMoveCapture: Yl }),
				l = o[0],
				u = o[1],
				d = i.forwardProps,
				p = i.children,
				h = i.className,
				g = i.removeScrollBar,
				m = i.enabled,
				w = i.shards,
				_ = i.sideCar,
				S = i.noIsolation,
				M = i.inert,
				k = i.allowPinchZoom,
				F = i.as,
				j = F === void 0 ? 'div' : F,
				q = i.gapMode,
				G = Qp(i, [
					'forwardProps',
					'children',
					'className',
					'removeScrollBar',
					'enabled',
					'shards',
					'sideCar',
					'noIsolation',
					'inert',
					'allowPinchZoom',
					'as',
					'gapMode',
				]),
				Q = _,
				ue = L0([r, n]),
				ve = on(on({}, G), l)
			return R.createElement(
				R.Fragment,
				null,
				m &&
					R.createElement(Q, {
						sideCar: Yp,
						removeScrollBar: g,
						shards: w,
						noIsolation: S,
						inert: M,
						setCallbacks: u,
						allowPinchZoom: !!k,
						lockRef: r,
						gapMode: q,
					}),
				d
					? R.cloneElement(R.Children.only(p), on(on({}, ve), { ref: ue }))
					: R.createElement(j, on({}, ve, { className: h, ref: ue }), p)
			)
		})
	;(vo.defaultProps = { enabled: !0, removeScrollBar: !0, inert: !1 }),
		(vo.classNames = { fullWidth: ho, zeroRight: po })
	var j0 = function () {
		if (typeof __webpack_nonce__ < 'u') return __webpack_nonce__
	}
	function U0() {
		if (!document) return null
		var i = document.createElement('style')
		i.type = 'text/css'
		var n = j0()
		return n && i.setAttribute('nonce', n), i
	}
	function B0(i, n) {
		i.styleSheet ? (i.styleSheet.cssText = n) : i.appendChild(document.createTextNode(n))
	}
	function W0(i) {
		var n = document.head || document.getElementsByTagName('head')[0]
		n.appendChild(i)
	}
	var H0 = function () {
			var i = 0,
				n = null
			return {
				add: function (r) {
					i == 0 && (n = U0()) && (B0(n, r), W0(n)), i++
				},
				remove: function () {
					i--, !i && n && (n.parentNode && n.parentNode.removeChild(n), (n = null))
				},
			}
		},
		V0 = function () {
			var i = H0()
			return function (n, r) {
				R.useEffect(
					function () {
						return (
							i.add(n),
							function () {
								i.remove()
							}
						)
					},
					[n && r]
				)
			}
		},
		Zp = function () {
			var i = V0(),
				n = function (r) {
					var o = r.styles,
						l = r.dynamic
					return i(o, l), null
				}
			return n
		},
		q0 = { left: 0, top: 0, right: 0, gap: 0 },
		Zl = function (i) {
			return parseInt(i || '', 10) || 0
		},
		G0 = function (i) {
			var n = window.getComputedStyle(document.body),
				r = n[i === 'padding' ? 'paddingLeft' : 'marginLeft'],
				o = n[i === 'padding' ? 'paddingTop' : 'marginTop'],
				l = n[i === 'padding' ? 'paddingRight' : 'marginRight']
			return [Zl(r), Zl(o), Zl(l)]
		},
		Q0 = function (i) {
			if ((i === void 0 && (i = 'margin'), typeof window > 'u')) return q0
			var n = G0(i),
				r = document.documentElement.clientWidth,
				o = window.innerWidth
			return { left: n[0], top: n[1], right: n[2], gap: Math.max(0, o - r + n[2] - n[0]) }
		},
		K0 = Zp(),
		Ur = 'data-scroll-locked',
		X0 = function (i, n, r, o) {
			var l = i.left,
				u = i.top,
				d = i.right,
				p = i.gap
			return (
				r === void 0 && (r = 'margin'),
				`
  .`
					.concat(
						O0,
						` {
   overflow: hidden `
					)
					.concat(
						o,
						`;
   padding-right: `
					)
					.concat(p, 'px ')
					.concat(
						o,
						`;
  }
  body[`
					)
					.concat(
						Ur,
						`] {
    overflow: hidden `
					)
					.concat(
						o,
						`;
    overscroll-behavior: contain;
    `
					)
					.concat(
						[
							n && 'position: relative '.concat(o, ';'),
							r === 'margin' &&
								`
    padding-left: `
									.concat(
										l,
										`px;
    padding-top: `
									)
									.concat(
										u,
										`px;
    padding-right: `
									)
									.concat(
										d,
										`px;
    margin-left:0;
    margin-top:0;
    margin-right: `
									)
									.concat(p, 'px ')
									.concat(
										o,
										`;
    `
									),
							r === 'padding' && 'padding-right: '.concat(p, 'px ').concat(o, ';'),
						]
							.filter(Boolean)
							.join(''),
						`
  }
  
  .`
					)
					.concat(
						po,
						` {
    right: `
					)
					.concat(p, 'px ')
					.concat(
						o,
						`;
  }
  
  .`
					)
					.concat(
						ho,
						` {
    margin-right: `
					)
					.concat(p, 'px ')
					.concat(
						o,
						`;
  }
  
  .`
					)
					.concat(po, ' .')
					.concat(
						po,
						` {
    right: 0 `
					)
					.concat(
						o,
						`;
  }
  
  .`
					)
					.concat(ho, ' .')
					.concat(
						ho,
						` {
    margin-right: 0 `
					)
					.concat(
						o,
						`;
  }
  
  body[`
					)
					.concat(
						Ur,
						`] {
    `
					)
					.concat(N0, ': ')
					.concat(
						p,
						`px;
  }
`
					)
			)
		},
		Jp = function () {
			var i = parseInt(document.body.getAttribute(Ur) || '0', 10)
			return isFinite(i) ? i : 0
		},
		Y0 = function () {
			R.useEffect(function () {
				return (
					document.body.setAttribute(Ur, (Jp() + 1).toString()),
					function () {
						var i = Jp() - 1
						i <= 0
							? document.body.removeAttribute(Ur)
							: document.body.setAttribute(Ur, i.toString())
					}
				)
			}, [])
		},
		Z0 = function (i) {
			var n = i.noRelative,
				r = i.noImportant,
				o = i.gapMode,
				l = o === void 0 ? 'margin' : o
			Y0()
			var u = R.useMemo(
				function () {
					return Q0(l)
				},
				[l]
			)
			return R.createElement(K0, { styles: X0(u, !n, l, r ? '' : '!important') })
		},
		Jl = !1
	if (typeof window < 'u')
		try {
			var go = Object.defineProperty({}, 'passive', {
				get: function () {
					return (Jl = !0), !0
				},
			})
			window.addEventListener('test', go, go), window.removeEventListener('test', go, go)
		} catch {
			Jl = !1
		}
	var Br = Jl ? { passive: !1 } : !1,
		J0 = function (i) {
			return i.tagName === 'TEXTAREA'
		},
		eh = function (i, n) {
			if (!(i instanceof Element)) return !1
			var r = window.getComputedStyle(i)
			return r[n] !== 'hidden' && !(r.overflowY === r.overflowX && !J0(i) && r[n] === 'visible')
		},
		ew = function (i) {
			return eh(i, 'overflowY')
		},
		tw = function (i) {
			return eh(i, 'overflowX')
		},
		th = function (i, n) {
			var r = n.ownerDocument,
				o = n
			do {
				typeof ShadowRoot < 'u' && o instanceof ShadowRoot && (o = o.host)
				var l = nh(i, o)
				if (l) {
					var u = rh(i, o),
						d = u[1],
						p = u[2]
					if (d > p) return !0
				}
				o = o.parentNode
			} while (o && o !== r.body)
			return !1
		},
		nw = function (i) {
			var n = i.scrollTop,
				r = i.scrollHeight,
				o = i.clientHeight
			return [n, r, o]
		},
		rw = function (i) {
			var n = i.scrollLeft,
				r = i.scrollWidth,
				o = i.clientWidth
			return [n, r, o]
		},
		nh = function (i, n) {
			return i === 'v' ? ew(n) : tw(n)
		},
		rh = function (i, n) {
			return i === 'v' ? nw(n) : rw(n)
		},
		iw = function (i, n) {
			return i === 'h' && n === 'rtl' ? -1 : 1
		},
		sw = function (i, n, r, o, l) {
			var u = iw(i, window.getComputedStyle(n).direction),
				d = u * o,
				p = r.target,
				h = n.contains(p),
				g = !1,
				m = d > 0,
				w = 0,
				_ = 0
			do {
				var S = rh(i, p),
					M = S[0],
					k = S[1],
					F = S[2],
					j = k - F - u * M
				;(M || j) && nh(i, p) && ((w += j), (_ += M)),
					p instanceof ShadowRoot ? (p = p.host) : (p = p.parentNode)
			} while ((!h && p !== document.body) || (h && (n.contains(p) || n === p)))
			return ((m && Math.abs(w) < 1) || (!m && Math.abs(_) < 1)) && (g = !0), g
		},
		mo = function (i) {
			return 'changedTouches' in i
				? [i.changedTouches[0].clientX, i.changedTouches[0].clientY]
				: [0, 0]
		},
		ih = function (i) {
			return [i.deltaX, i.deltaY]
		},
		sh = function (i) {
			return i && 'current' in i ? i.current : i
		},
		ow = function (i, n) {
			return i[0] === n[0] && i[1] === n[1]
		},
		aw = function (i) {
			return `
  .block-interactivity-`
				.concat(
					i,
					` {pointer-events: none;}
  .allow-interactivity-`
				)
				.concat(
					i,
					` {pointer-events: all;}
`
				)
		},
		lw = 0,
		Wr = []
	function uw(i) {
		var n = R.useRef([]),
			r = R.useRef([0, 0]),
			o = R.useRef(),
			l = R.useState(lw++)[0],
			u = R.useState(Zp)[0],
			d = R.useRef(i)
		R.useEffect(
			function () {
				d.current = i
			},
			[i]
		),
			R.useEffect(
				function () {
					if (i.inert) {
						document.body.classList.add('block-interactivity-'.concat(l))
						var k = T0([i.lockRef.current], (i.shards || []).map(sh), !0).filter(Boolean)
						return (
							k.forEach(function (F) {
								return F.classList.add('allow-interactivity-'.concat(l))
							}),
							function () {
								document.body.classList.remove('block-interactivity-'.concat(l)),
									k.forEach(function (F) {
										return F.classList.remove('allow-interactivity-'.concat(l))
									})
							}
						)
					}
				},
				[i.inert, i.lockRef.current, i.shards]
			)
		var p = R.useCallback(function (k, F) {
				if (('touches' in k && k.touches.length === 2) || (k.type === 'wheel' && k.ctrlKey))
					return !d.current.allowPinchZoom
				var j = mo(k),
					q = r.current,
					G = 'deltaX' in k ? k.deltaX : q[0] - j[0],
					Q = 'deltaY' in k ? k.deltaY : q[1] - j[1],
					ue,
					ve = k.target,
					ae = Math.abs(G) > Math.abs(Q) ? 'h' : 'v'
				if ('touches' in k && ae === 'h' && ve.type === 'range') return !1
				var le = th(ae, ve)
				if (!le) return !0
				if ((le ? (ue = ae) : ((ue = ae === 'v' ? 'h' : 'v'), (le = th(ae, ve))), !le)) return !1
				if ((!o.current && 'changedTouches' in k && (G || Q) && (o.current = ue), !ue)) return !0
				var pe = o.current || ue
				return sw(pe, F, k, pe === 'h' ? G : Q)
			}, []),
			h = R.useCallback(function (k) {
				var F = k
				if (!(!Wr.length || Wr[Wr.length - 1] !== u)) {
					var j = 'deltaY' in F ? ih(F) : mo(F),
						q = n.current.filter(function (ue) {
							return (
								ue.name === F.type &&
								(ue.target === F.target || F.target === ue.shadowParent) &&
								ow(ue.delta, j)
							)
						})[0]
					if (q && q.should) {
						F.cancelable && F.preventDefault()
						return
					}
					if (!q) {
						var G = (d.current.shards || [])
								.map(sh)
								.filter(Boolean)
								.filter(function (ue) {
									return ue.contains(F.target)
								}),
							Q = G.length > 0 ? p(F, G[0]) : !d.current.noIsolation
						Q && F.cancelable && F.preventDefault()
					}
				}
			}, []),
			g = R.useCallback(function (k, F, j, q) {
				var G = { name: k, delta: F, target: j, should: q, shadowParent: cw(j) }
				n.current.push(G),
					setTimeout(function () {
						n.current = n.current.filter(function (Q) {
							return Q !== G
						})
					}, 1)
			}, []),
			m = R.useCallback(function (k) {
				;(r.current = mo(k)), (o.current = void 0)
			}, []),
			w = R.useCallback(function (k) {
				g(k.type, ih(k), k.target, p(k, i.lockRef.current))
			}, []),
			_ = R.useCallback(function (k) {
				g(k.type, mo(k), k.target, p(k, i.lockRef.current))
			}, [])
		R.useEffect(function () {
			return (
				Wr.push(u),
				i.setCallbacks({ onScrollCapture: w, onWheelCapture: w, onTouchMoveCapture: _ }),
				document.addEventListener('wheel', h, Br),
				document.addEventListener('touchmove', h, Br),
				document.addEventListener('touchstart', m, Br),
				function () {
					;(Wr = Wr.filter(function (k) {
						return k !== u
					})),
						document.removeEventListener('wheel', h, Br),
						document.removeEventListener('touchmove', h, Br),
						document.removeEventListener('touchstart', m, Br)
				}
			)
		}, [])
		var S = i.removeScrollBar,
			M = i.inert
		return R.createElement(
			R.Fragment,
			null,
			M ? R.createElement(u, { styles: aw(l) }) : null,
			S ? R.createElement(Z0, { gapMode: i.gapMode }) : null
		)
	}
	function cw(i) {
		for (var n = null; i !== null; )
			i instanceof ShadowRoot && ((n = i.host), (i = i.host)), (i = i.parentNode)
		return n
	}
	const dw = z0(Yp, uw)
	var oh = R.forwardRef(function (i, n) {
		return R.createElement(vo, on({}, i, { ref: n, sideCar: dw }))
	})
	oh.classNames = vo.classNames
	var fw = function (i) {
			if (typeof document > 'u') return null
			var n = Array.isArray(i) ? i[0] : i
			return n.ownerDocument.body
		},
		Hr = new WeakMap(),
		_o = new WeakMap(),
		yo = {},
		eu = 0,
		ah = function (i) {
			return i && (i.host || ah(i.parentNode))
		},
		pw = function (i, n) {
			return n
				.map(function (r) {
					if (i.contains(r)) return r
					var o = ah(r)
					return o && i.contains(o)
						? o
						: (console.error('aria-hidden', r, 'in not contained inside', i, '. Doing nothing'),
							null)
				})
				.filter(function (r) {
					return !!r
				})
		},
		hw = function (i, n, r, o) {
			var l = pw(n, Array.isArray(i) ? i : [i])
			yo[r] || (yo[r] = new WeakMap())
			var u = yo[r],
				d = [],
				p = new Set(),
				h = new Set(l),
				g = function (w) {
					!w || p.has(w) || (p.add(w), g(w.parentNode))
				}
			l.forEach(g)
			var m = function (w) {
				!w ||
					h.has(w) ||
					Array.prototype.forEach.call(w.children, function (_) {
						if (p.has(_)) m(_)
						else
							try {
								var S = _.getAttribute(o),
									M = S !== null && S !== 'false',
									k = (Hr.get(_) || 0) + 1,
									F = (u.get(_) || 0) + 1
								Hr.set(_, k),
									u.set(_, F),
									d.push(_),
									k === 1 && M && _o.set(_, !0),
									F === 1 && _.setAttribute(r, 'true'),
									M || _.setAttribute(o, 'true')
							} catch (j) {
								console.error('aria-hidden: cannot operate on ', _, j)
							}
					})
			}
			return (
				m(n),
				p.clear(),
				eu++,
				function () {
					d.forEach(function (w) {
						var _ = Hr.get(w) - 1,
							S = u.get(w) - 1
						Hr.set(w, _),
							u.set(w, S),
							_ || (_o.has(w) || w.removeAttribute(o), _o.delete(w)),
							S || w.removeAttribute(r)
					}),
						eu--,
						eu || ((Hr = new WeakMap()), (Hr = new WeakMap()), (_o = new WeakMap()), (yo = {}))
				}
			)
		},
		vw = function (i, n, r) {
			r === void 0 && (r = 'data-aria-hidden')
			var o = Array.from(Array.isArray(i) ? i : [i]),
				l = fw(i)
			return l
				? (o.push.apply(o, Array.from(l.querySelectorAll('[aria-live]'))),
					hw(o, l, r, 'aria-hidden'))
				: function () {
						return null
					}
		},
		wo = 'Dialog',
		[lh, KS] = Fp(wo),
		[gw, Vt] = lh(wo),
		uh = (i) => {
			const {
					__scopeDialog: n,
					children: r,
					open: o,
					defaultOpen: l,
					onOpenChange: u,
					modal: d = !0,
				} = i,
				p = R.useRef(null),
				h = R.useRef(null),
				[g, m] = Mp({ prop: o, defaultProp: l ?? !1, onChange: u, caller: wo })
			return ne.jsx(gw, {
				scope: n,
				triggerRef: p,
				contentRef: h,
				contentId: Vl(),
				titleId: Vl(),
				descriptionId: Vl(),
				open: g,
				onOpenChange: m,
				onOpenToggle: R.useCallback(() => m((w) => !w), [m]),
				modal: d,
				children: r,
			})
		}
	uh.displayName = wo
	var ch = 'DialogTrigger',
		mw = R.forwardRef((i, n) => {
			const { __scopeDialog: r, ...o } = i,
				l = Vt(ch, r),
				u = _n(n, l.triggerRef)
			return ne.jsx(Ht.button, {
				type: 'button',
				'aria-haspopup': 'dialog',
				'aria-expanded': l.open,
				'aria-controls': l.contentId,
				'data-state': ru(l.open),
				...o,
				ref: u,
				onClick: yn(i.onClick, l.onOpenToggle),
			})
		})
	mw.displayName = ch
	var tu = 'DialogPortal',
		[_w, dh] = lh(tu, { forceMount: void 0 }),
		fh = (i) => {
			const { __scopeDialog: n, forceMount: r, children: o, container: l } = i,
				u = Vt(tu, n)
			return ne.jsx(_w, {
				scope: n,
				forceMount: r,
				children: R.Children.map(o, (d) =>
					ne.jsx(co, {
						present: r || u.open,
						children: ne.jsx(qp, { asChild: !0, container: l, children: d }),
					})
				),
			})
		}
	fh.displayName = tu
	var So = 'DialogOverlay',
		ph = R.forwardRef((i, n) => {
			const r = dh(So, i.__scopeDialog),
				{ forceMount: o = r.forceMount, ...l } = i,
				u = Vt(So, i.__scopeDialog)
			return u.modal
				? ne.jsx(co, { present: o || u.open, children: ne.jsx(ww, { ...l, ref: n }) })
				: null
		})
	ph.displayName = So
	var yw = Np('DialogOverlay.RemoveScroll'),
		ww = R.forwardRef((i, n) => {
			const { __scopeDialog: r, ...o } = i,
				l = Vt(So, r)
			return ne.jsx(oh, {
				as: yw,
				allowPinchZoom: !0,
				shards: [l.contentRef],
				children: ne.jsx(Ht.div, {
					'data-state': ru(l.open),
					...o,
					ref: n,
					style: { pointerEvents: 'auto', ...o.style },
				}),
			})
		}),
		fr = 'DialogContent',
		hh = R.forwardRef((i, n) => {
			const r = dh(fr, i.__scopeDialog),
				{ forceMount: o = r.forceMount, ...l } = i,
				u = Vt(fr, i.__scopeDialog)
			return ne.jsx(co, {
				present: o || u.open,
				children: u.modal ? ne.jsx(Sw, { ...l, ref: n }) : ne.jsx(Ew, { ...l, ref: n }),
			})
		})
	hh.displayName = fr
	var Sw = R.forwardRef((i, n) => {
			const r = Vt(fr, i.__scopeDialog),
				o = R.useRef(null),
				l = _n(n, r.contentRef, o)
			return (
				R.useEffect(() => {
					const u = o.current
					if (u) return vw(u)
				}, []),
				ne.jsx(vh, {
					...i,
					ref: l,
					trapFocus: r.open,
					disableOutsidePointerEvents: !0,
					onCloseAutoFocus: yn(i.onCloseAutoFocus, (u) => {
						u.preventDefault(), r.triggerRef.current?.focus()
					}),
					onPointerDownOutside: yn(i.onPointerDownOutside, (u) => {
						const d = u.detail.originalEvent,
							p = d.button === 0 && d.ctrlKey === !0
						;(d.button === 2 || p) && u.preventDefault()
					}),
					onFocusOutside: yn(i.onFocusOutside, (u) => u.preventDefault()),
				})
			)
		}),
		Ew = R.forwardRef((i, n) => {
			const r = Vt(fr, i.__scopeDialog),
				o = R.useRef(!1),
				l = R.useRef(!1)
			return ne.jsx(vh, {
				...i,
				ref: n,
				trapFocus: !1,
				disableOutsidePointerEvents: !1,
				onCloseAutoFocus: (u) => {
					i.onCloseAutoFocus?.(u),
						u.defaultPrevented || (o.current || r.triggerRef.current?.focus(), u.preventDefault()),
						(o.current = !1),
						(l.current = !1)
				},
				onInteractOutside: (u) => {
					i.onInteractOutside?.(u),
						u.defaultPrevented ||
							((o.current = !0), u.detail.originalEvent.type === 'pointerdown' && (l.current = !0))
					const d = u.target
					r.triggerRef.current?.contains(d) && u.preventDefault(),
						u.detail.originalEvent.type === 'focusin' && l.current && u.preventDefault()
				},
			})
		}),
		vh = R.forwardRef((i, n) => {
			const { __scopeDialog: r, trapFocus: o, onOpenAutoFocus: l, onCloseAutoFocus: u, ...d } = i,
				p = Vt(fr, r),
				h = R.useRef(null),
				g = _n(n, h)
			return (
				I0(),
				ne.jsxs(ne.Fragment, {
					children: [
						ne.jsx(Up, {
							asChild: !0,
							loop: !0,
							trapped: o,
							onMountAutoFocus: l,
							onUnmountAutoFocus: u,
							children: ne.jsx(Ap, {
								role: 'dialog',
								id: p.contentId,
								'aria-describedby': p.descriptionId,
								'aria-labelledby': p.titleId,
								'data-state': ru(p.open),
								...d,
								ref: g,
								onDismiss: () => p.onOpenChange(!1),
							}),
						}),
						ne.jsxs(ne.Fragment, {
							children: [
								ne.jsx(kw, { titleId: p.titleId }),
								ne.jsx(Cw, { contentRef: h, descriptionId: p.descriptionId }),
							],
						}),
					],
				})
			)
		}),
		nu = 'DialogTitle',
		gh = R.forwardRef((i, n) => {
			const { __scopeDialog: r, ...o } = i,
				l = Vt(nu, r)
			return ne.jsx(Ht.h2, { id: l.titleId, ...o, ref: n })
		})
	gh.displayName = nu
	var mh = 'DialogDescription',
		_h = R.forwardRef((i, n) => {
			const { __scopeDialog: r, ...o } = i,
				l = Vt(mh, r)
			return ne.jsx(Ht.p, { id: l.descriptionId, ...o, ref: n })
		})
	_h.displayName = mh
	var yh = 'DialogClose',
		wh = R.forwardRef((i, n) => {
			const { __scopeDialog: r, ...o } = i,
				l = Vt(yh, r)
			return ne.jsx(Ht.button, {
				type: 'button',
				...o,
				ref: n,
				onClick: yn(i.onClick, () => l.onOpenChange(!1)),
			})
		})
	wh.displayName = yh
	function ru(i) {
		return i ? 'open' : 'closed'
	}
	var Sh = 'DialogTitleWarning',
		[XS, Eh] = r0(Sh, { contentName: fr, titleName: nu, docsSlug: 'dialog' }),
		kw = ({ titleId: i }) => {
			const n = Eh(Sh),
				r = `\`${n.contentName}\` requires a \`${n.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${n.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${n.docsSlug}`
			return (
				R.useEffect(() => {
					i && (document.getElementById(i) || console.error(r))
				}, [r, i]),
				null
			)
		},
		xw = 'DialogDescriptionWarning',
		Cw = ({ contentRef: i, descriptionId: n }) => {
			const o = `Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${Eh(xw).contentName}}.`
			return (
				R.useEffect(() => {
					const l = i.current?.getAttribute('aria-describedby')
					n && l && (document.getElementById(n) || console.warn(o))
				}, [o, i, n]),
				null
			)
		},
		Pw = uh,
		bw = fh,
		Rw = ph,
		Iw = hh,
		Tw = gh,
		Ow = _h,
		Nw = wh
	function Fw(i) {
		const n = R.useRef({ value: i, previous: i })
		return R.useMemo(
			() => (
				n.current.value !== i && ((n.current.previous = n.current.value), (n.current.value = i)),
				n.current.previous
			),
			[i]
		)
	}
	function Mw(i) {
		const [n, r] = R.useState(void 0)
		return (
			jr(() => {
				if (i) {
					r({ width: i.offsetWidth, height: i.offsetHeight })
					const o = new ResizeObserver((l) => {
						if (!Array.isArray(l) || !l.length) return
						const u = l[0]
						let d, p
						if ('borderBoxSize' in u) {
							const h = u.borderBoxSize,
								g = Array.isArray(h) ? h[0] : h
							;(d = g.inlineSize), (p = g.blockSize)
						} else (d = i.offsetWidth), (p = i.offsetHeight)
						r({ width: d, height: p })
					})
					return o.observe(i, { box: 'border-box' }), () => o.unobserve(i)
				} else r(void 0)
			}, [i]),
			n
		)
	}
	var Eo = 'Switch',
		[Lw, YS] = Fp(Eo),
		[Dw, Aw] = Lw(Eo),
		kh = R.forwardRef((i, n) => {
			const {
					__scopeSwitch: r,
					name: o,
					checked: l,
					defaultChecked: u,
					required: d,
					disabled: p,
					value: h = 'on',
					onCheckedChange: g,
					form: m,
					...w
				} = i,
				[_, S] = R.useState(null),
				M = _n(n, (G) => S(G)),
				k = R.useRef(!1),
				F = _ ? m || !!_.closest('form') : !0,
				[j, q] = Mp({ prop: l, defaultProp: u ?? !1, onChange: g, caller: Eo })
			return ne.jsxs(Dw, {
				scope: r,
				checked: j,
				disabled: p,
				children: [
					ne.jsx(Ht.button, {
						type: 'button',
						role: 'switch',
						'aria-checked': j,
						'aria-required': d,
						'data-state': bh(j),
						'data-disabled': p ? '' : void 0,
						disabled: p,
						value: h,
						...w,
						ref: M,
						onClick: yn(i.onClick, (G) => {
							q((Q) => !Q),
								F && ((k.current = G.isPropagationStopped()), k.current || G.stopPropagation())
						}),
					}),
					F &&
						ne.jsx(Ph, {
							control: _,
							bubbles: !k.current,
							name: o,
							value: h,
							checked: j,
							required: d,
							disabled: p,
							form: m,
							style: { transform: 'translateX(-100%)' },
						}),
				],
			})
		})
	kh.displayName = Eo
	var xh = 'SwitchThumb',
		Ch = R.forwardRef((i, n) => {
			const { __scopeSwitch: r, ...o } = i,
				l = Aw(xh, r)
			return ne.jsx(Ht.span, {
				'data-state': bh(l.checked),
				'data-disabled': l.disabled ? '' : void 0,
				...o,
				ref: n,
			})
		})
	Ch.displayName = xh
	var $w = 'SwitchBubbleInput',
		Ph = R.forwardRef(({ __scopeSwitch: i, control: n, checked: r, bubbles: o = !0, ...l }, u) => {
			const d = R.useRef(null),
				p = _n(d, u),
				h = Fw(r),
				g = Mw(n)
			return (
				R.useEffect(() => {
					const m = d.current
					if (!m) return
					const w = window.HTMLInputElement.prototype,
						S = Object.getOwnPropertyDescriptor(w, 'checked').set
					if (h !== r && S) {
						const M = new Event('click', { bubbles: o })
						S.call(m, r), m.dispatchEvent(M)
					}
				}, [h, r, o]),
				ne.jsx('input', {
					type: 'checkbox',
					'aria-hidden': !0,
					defaultChecked: r,
					...l,
					tabIndex: -1,
					ref: p,
					style: {
						...l.style,
						...g,
						position: 'absolute',
						pointerEvents: 'none',
						opacity: 0,
						margin: 0,
					},
				})
			)
		})
	Ph.displayName = $w
	function bh(i) {
		return i ? 'checked' : 'unchecked'
	}
	var zw = kh,
		jw = Ch,
		iu = {},
		su = {},
		ou = {},
		Rh
	function Uw() {
		return (
			Rh ||
				((Rh = 1),
				(function (i) {
					Object.defineProperty(i, '__esModule', { value: !0 }), (i.default = void 0)
					var n = function () {
							for (var l = arguments.length, u = new Array(l), d = 0; d < l; d++)
								u[d] = arguments[d]
							if (typeof window < 'u') {
								var p
								typeof window.gtag > 'u' &&
									((window.dataLayer = window.dataLayer || []),
									(window.gtag = function () {
										window.dataLayer.push(arguments)
									})),
									(p = window).gtag.apply(p, u)
							}
						},
						r = n
					i.default = r
				})(ou)),
			ou
		)
	}
	var au = {},
		Ih
	function Bw() {
		return (
			Ih ||
				((Ih = 1),
				(function (i) {
					Object.defineProperty(i, '__esModule', { value: !0 }), (i.default = d)
					var n = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i
					function r(p) {
						return p
							.toString()
							.trim()
							.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function (h, g, m) {
								return g > 0 &&
									g + h.length !== m.length &&
									h.search(n) > -1 &&
									m.charAt(g - 2) !== ':' &&
									(m.charAt(g + h.length) !== '-' || m.charAt(g - 1) === '-') &&
									m.charAt(g - 1).search(/[^\s-]/) < 0
									? h.toLowerCase()
									: h.substr(1).search(/[A-Z]|\../) > -1
										? h
										: h.charAt(0).toUpperCase() + h.substr(1)
							})
					}
					function o(p) {
						return typeof p == 'string' && p.indexOf('@') !== -1
					}
					var l = 'REDACTED (Potential Email Address)'
					function u(p) {
						return o(p) ? (console.warn('This arg looks like an email address, redacting.'), l) : p
					}
					function d() {
						var p = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : '',
							h = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0,
							g = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0,
							m = p || ''
						return h && (m = r(p)), g && (m = u(m)), m
					}
				})(au)),
			au
		)
	}
	var Th
	function Ww() {
		return (
			Th ||
				((Th = 1),
				(function (i) {
					Object.defineProperty(i, '__esModule', { value: !0 }), (i.default = i.GA4 = void 0)
					var n = d(Uw()),
						r = d(Bw()),
						o = ['eventCategory', 'eventAction', 'eventLabel', 'eventValue', 'hitType'],
						l = ['title', 'location'],
						u = ['page', 'hitType']
					function d(z) {
						return z && z.__esModule ? z : { default: z }
					}
					function p(z, I) {
						if (z == null) return {}
						var A = h(z, I),
							D,
							T
						if (Object.getOwnPropertySymbols) {
							var $ = Object.getOwnPropertySymbols(z)
							for (T = 0; T < $.length; T++)
								(D = $[T]),
									!(I.indexOf(D) >= 0) &&
										Object.prototype.propertyIsEnumerable.call(z, D) &&
										(A[D] = z[D])
						}
						return A
					}
					function h(z, I) {
						if (z == null) return {}
						var A = {},
							D = Object.keys(z),
							T,
							$
						for ($ = 0; $ < D.length; $++) (T = D[$]), !(I.indexOf(T) >= 0) && (A[T] = z[T])
						return A
					}
					function g(z) {
						'@babel/helpers - typeof'
						return (
							(g =
								typeof Symbol == 'function' && typeof Symbol.iterator == 'symbol'
									? function (I) {
											return typeof I
										}
									: function (I) {
											return I &&
												typeof Symbol == 'function' &&
												I.constructor === Symbol &&
												I !== Symbol.prototype
												? 'symbol'
												: typeof I
										}),
							g(z)
						)
					}
					function m(z) {
						return S(z) || _(z) || q(z) || w()
					}
					function w() {
						throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
					}
					function _(z) {
						if ((typeof Symbol < 'u' && z[Symbol.iterator] != null) || z['@@iterator'] != null)
							return Array.from(z)
					}
					function S(z) {
						if (Array.isArray(z)) return G(z)
					}
					function M(z, I) {
						var A = Object.keys(z)
						if (Object.getOwnPropertySymbols) {
							var D = Object.getOwnPropertySymbols(z)
							I &&
								(D = D.filter(function (T) {
									return Object.getOwnPropertyDescriptor(z, T).enumerable
								})),
								A.push.apply(A, D)
						}
						return A
					}
					function k(z) {
						for (var I = 1; I < arguments.length; I++) {
							var A = arguments[I] != null ? arguments[I] : {}
							I % 2
								? M(Object(A), !0).forEach(function (D) {
										pe(z, D, A[D])
									})
								: Object.getOwnPropertyDescriptors
									? Object.defineProperties(z, Object.getOwnPropertyDescriptors(A))
									: M(Object(A)).forEach(function (D) {
											Object.defineProperty(z, D, Object.getOwnPropertyDescriptor(A, D))
										})
						}
						return z
					}
					function F(z, I) {
						return ue(z) || Q(z, I) || q(z, I) || j()
					}
					function j() {
						throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
					}
					function q(z, I) {
						if (z) {
							if (typeof z == 'string') return G(z, I)
							var A = Object.prototype.toString.call(z).slice(8, -1)
							if (
								(A === 'Object' && z.constructor && (A = z.constructor.name),
								A === 'Map' || A === 'Set')
							)
								return Array.from(z)
							if (A === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(A))
								return G(z, I)
						}
					}
					function G(z, I) {
						;(I == null || I > z.length) && (I = z.length)
						for (var A = 0, D = new Array(I); A < I; A++) D[A] = z[A]
						return D
					}
					function Q(z, I) {
						var A =
							z == null ? null : (typeof Symbol < 'u' && z[Symbol.iterator]) || z['@@iterator']
						if (A != null) {
							var D,
								T,
								$,
								W,
								x = [],
								L = !0,
								X = !1
							try {
								if ((($ = (A = A.call(z)).next), I !== 0))
									for (; !(L = (D = $.call(A)).done) && (x.push(D.value), x.length !== I); L = !0);
							} catch (ee) {
								;(X = !0), (T = ee)
							} finally {
								try {
									if (!L && A.return != null && ((W = A.return()), Object(W) !== W)) return
								} finally {
									if (X) throw T
								}
							}
							return x
						}
					}
					function ue(z) {
						if (Array.isArray(z)) return z
					}
					function ve(z, I) {
						if (!(z instanceof I)) throw new TypeError('Cannot call a class as a function')
					}
					function ae(z, I) {
						for (var A = 0; A < I.length; A++) {
							var D = I[A]
							;(D.enumerable = D.enumerable || !1),
								(D.configurable = !0),
								'value' in D && (D.writable = !0),
								Object.defineProperty(z, Ce(D.key), D)
						}
					}
					function le(z, I, A) {
						return (
							I && ae(z.prototype, I), Object.defineProperty(z, 'prototype', { writable: !1 }), z
						)
					}
					function pe(z, I, A) {
						return (
							(I = Ce(I)),
							I in z
								? Object.defineProperty(z, I, {
										value: A,
										enumerable: !0,
										configurable: !0,
										writable: !0,
									})
								: (z[I] = A),
							z
						)
					}
					function Ce(z) {
						var I = He(z, 'string')
						return g(I) === 'symbol' ? I : String(I)
					}
					function He(z, I) {
						if (g(z) !== 'object' || z === null) return z
						var A = z[Symbol.toPrimitive]
						if (A !== void 0) {
							var D = A.call(z, I)
							if (g(D) !== 'object') return D
							throw new TypeError('@@toPrimitive must return a primitive value.')
						}
						return (I === 'string' ? String : Number)(z)
					}
					var Re = (function () {
						function z() {
							var I = this
							ve(this, z),
								pe(this, 'reset', function () {
									;(I.isInitialized = !1),
										(I._testMode = !1),
										I._currentMeasurementId,
										(I._hasLoadedGA = !1),
										(I._isQueuing = !1),
										(I._queueGtag = [])
								}),
								pe(this, '_gtag', function () {
									for (var A = arguments.length, D = new Array(A), T = 0; T < A; T++)
										D[T] = arguments[T]
									I._testMode || I._isQueuing ? I._queueGtag.push(D) : n.default.apply(void 0, D)
								}),
								pe(this, '_loadGA', function (A, D) {
									var T =
										arguments.length > 2 && arguments[2] !== void 0
											? arguments[2]
											: 'https://www.googletagmanager.com/gtag/js'
									if (!(typeof window > 'u' || typeof document > 'u') && !I._hasLoadedGA) {
										var $ = document.createElement('script')
										;($.async = !0),
											($.src = ''.concat(T, '?id=').concat(A)),
											D && $.setAttribute('nonce', D),
											document.body.appendChild($),
											(window.dataLayer = window.dataLayer || []),
											(window.gtag = function () {
												window.dataLayer.push(arguments)
											}),
											(I._hasLoadedGA = !0)
									}
								}),
								pe(this, '_toGtagOptions', function (A) {
									if (A) {
										var D = {
												cookieUpdate: 'cookie_update',
												cookieExpires: 'cookie_expires',
												cookieDomain: 'cookie_domain',
												cookieFlags: 'cookie_flags',
												userId: 'user_id',
												clientId: 'client_id',
												anonymizeIp: 'anonymize_ip',
												contentGroup1: 'content_group1',
												contentGroup2: 'content_group2',
												contentGroup3: 'content_group3',
												contentGroup4: 'content_group4',
												contentGroup5: 'content_group5',
												allowAdFeatures: 'allow_google_signals',
												allowAdPersonalizationSignals: 'allow_ad_personalization_signals',
												nonInteraction: 'non_interaction',
												page: 'page_path',
												hitCallback: 'event_callback',
											},
											T = Object.entries(A).reduce(function ($, W) {
												var x = F(W, 2),
													L = x[0],
													X = x[1]
												return D[L] ? ($[D[L]] = X) : ($[L] = X), $
											}, {})
										return T
									}
								}),
								pe(this, 'initialize', function (A) {
									var D = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}
									if (!A) throw new Error('Require GA_MEASUREMENT_ID')
									var T = typeof A == 'string' ? [{ trackingId: A }] : A
									I._currentMeasurementId = T[0].trackingId
									var $ = D.gaOptions,
										W = D.gtagOptions,
										x = D.nonce,
										L = D.testMode,
										X = L === void 0 ? !1 : L,
										ee = D.gtagUrl
									if (
										((I._testMode = X),
										X || I._loadGA(I._currentMeasurementId, x, ee),
										I.isInitialized ||
											(I._gtag('js', new Date()),
											T.forEach(function (Se) {
												var we = k(
													k(k({}, I._toGtagOptions(k(k({}, $), Se.gaOptions))), W),
													Se.gtagOptions
												)
												Object.keys(we).length
													? I._gtag('config', Se.trackingId, we)
													: I._gtag('config', Se.trackingId)
											})),
										(I.isInitialized = !0),
										!X)
									) {
										var ge = m(I._queueGtag)
										for (I._queueGtag = [], I._isQueuing = !1; ge.length; ) {
											var he = ge.shift()
											I._gtag.apply(I, m(he)), he[0] === 'get' && (I._isQueuing = !0)
										}
									}
								}),
								pe(this, 'set', function (A) {
									if (!A) {
										console.warn('`fieldsObject` is required in .set()')
										return
									}
									if (g(A) !== 'object') {
										console.warn('Expected `fieldsObject` arg to be an Object')
										return
									}
									Object.keys(A).length === 0 &&
										console.warn('empty `fieldsObject` given to .set()'),
										I._gaCommand('set', A)
								}),
								pe(this, '_gaCommandSendEvent', function (A, D, T, $, W) {
									I._gtag(
										'event',
										D,
										k(
											k(
												{ event_category: A, event_label: T, value: $ },
												W && { non_interaction: W.nonInteraction }
											),
											I._toGtagOptions(W)
										)
									)
								}),
								pe(this, '_gaCommandSendEventParameters', function () {
									for (var A = arguments.length, D = new Array(A), T = 0; T < A; T++)
										D[T] = arguments[T]
									if (typeof D[0] == 'string') I._gaCommandSendEvent.apply(I, m(D.slice(1)))
									else {
										var $ = D[0],
											W = $.eventCategory,
											x = $.eventAction,
											L = $.eventLabel,
											X = $.eventValue
										$.hitType
										var ee = p($, o)
										I._gaCommandSendEvent(W, x, L, X, ee)
									}
								}),
								pe(this, '_gaCommandSendTiming', function (A, D, T, $) {
									I._gtag('event', 'timing_complete', {
										name: D,
										value: T,
										event_category: A,
										event_label: $,
									})
								}),
								pe(this, '_gaCommandSendPageview', function (A, D) {
									if (D && Object.keys(D).length) {
										var T = I._toGtagOptions(D),
											$ = T.title,
											W = T.location,
											x = p(T, l)
										I._gtag(
											'event',
											'page_view',
											k(
												k(
													k(k({}, A && { page_path: A }), $ && { page_title: $ }),
													W && { page_location: W }
												),
												x
											)
										)
									} else
										A
											? I._gtag('event', 'page_view', { page_path: A })
											: I._gtag('event', 'page_view')
								}),
								pe(this, '_gaCommandSendPageviewParameters', function () {
									for (var A = arguments.length, D = new Array(A), T = 0; T < A; T++)
										D[T] = arguments[T]
									if (typeof D[0] == 'string') I._gaCommandSendPageview.apply(I, m(D.slice(1)))
									else {
										var $ = D[0],
											W = $.page
										$.hitType
										var x = p($, u)
										I._gaCommandSendPageview(W, x)
									}
								}),
								pe(this, '_gaCommandSend', function () {
									for (var A = arguments.length, D = new Array(A), T = 0; T < A; T++)
										D[T] = arguments[T]
									var $ = typeof D[0] == 'string' ? D[0] : D[0].hitType
									switch ($) {
										case 'event':
											I._gaCommandSendEventParameters.apply(I, D)
											break
										case 'pageview':
											I._gaCommandSendPageviewParameters.apply(I, D)
											break
										case 'timing':
											I._gaCommandSendTiming.apply(I, m(D.slice(1)))
											break
										case 'screenview':
										case 'transaction':
										case 'item':
										case 'social':
										case 'exception':
											console.warn('Unsupported send command: '.concat($))
											break
										default:
											console.warn("Send command doesn't exist: ".concat($))
									}
								}),
								pe(this, '_gaCommandSet', function () {
									for (var A = arguments.length, D = new Array(A), T = 0; T < A; T++)
										D[T] = arguments[T]
									typeof D[0] == 'string' && (D[0] = pe({}, D[0], D[1])),
										I._gtag('set', I._toGtagOptions(D[0]))
								}),
								pe(this, '_gaCommand', function (A) {
									for (
										var D = arguments.length, T = new Array(D > 1 ? D - 1 : 0), $ = 1;
										$ < D;
										$++
									)
										T[$ - 1] = arguments[$]
									switch (A) {
										case 'send':
											I._gaCommandSend.apply(I, T)
											break
										case 'set':
											I._gaCommandSet.apply(I, T)
											break
										default:
											console.warn("Command doesn't exist: ".concat(A))
									}
								}),
								pe(this, 'ga', function () {
									for (var A = arguments.length, D = new Array(A), T = 0; T < A; T++)
										D[T] = arguments[T]
									if (typeof D[0] == 'string') I._gaCommand.apply(I, D)
									else {
										var $ = D[0]
										I._gtag('get', I._currentMeasurementId, 'client_id', function (W) {
											I._isQueuing = !1
											var x = I._queueGtag
											for (
												$({
													get: function (ee) {
														return ee === 'clientId'
															? W
															: ee === 'trackingId'
																? I._currentMeasurementId
																: ee === 'apiVersion'
																	? '1'
																	: void 0
													},
												});
												x.length;

											) {
												var L = x.shift()
												I._gtag.apply(I, m(L))
											}
										}),
											(I._isQueuing = !0)
									}
									return I.ga
								}),
								pe(this, 'event', function (A, D) {
									if (typeof A == 'string') I._gtag('event', A, I._toGtagOptions(D))
									else {
										var T = A.action,
											$ = A.category,
											W = A.label,
											x = A.value,
											L = A.nonInteraction,
											X = A.transport
										if (!$ || !T) {
											console.warn('args.category AND args.action are required in event()')
											return
										}
										var ee = {
											hitType: 'event',
											eventCategory: (0, r.default)($),
											eventAction: (0, r.default)(T),
										}
										W && (ee.eventLabel = (0, r.default)(W)),
											typeof x < 'u' &&
												(typeof x != 'number'
													? console.warn('Expected `args.value` arg to be a Number.')
													: (ee.eventValue = x)),
											typeof L < 'u' &&
												(typeof L != 'boolean'
													? console.warn('`args.nonInteraction` must be a boolean.')
													: (ee.nonInteraction = L)),
											typeof X < 'u' &&
												(typeof X != 'string'
													? console.warn('`args.transport` must be a string.')
													: (['beacon', 'xhr', 'image'].indexOf(X) === -1 &&
															console.warn(
																'`args.transport` must be either one of these values: `beacon`, `xhr` or `image`'
															),
														(ee.transport = X))),
											I._gaCommand('send', ee)
									}
								}),
								pe(this, 'send', function (A) {
									I._gaCommand('send', A)
								}),
								this.reset()
						}
						return (
							le(z, [
								{
									key: 'gtag',
									value: function () {
										this._gtag.apply(this, arguments)
									},
								},
							]),
							z
						)
					})()
					i.GA4 = Re
					var Ne = new Re()
					i.default = Ne
				})(su)),
			su
		)
	}
	var Oh
	function Hw() {
		return (
			Oh ||
				((Oh = 1),
				(function (i) {
					function n(p) {
						'@babel/helpers - typeof'
						return (
							(n =
								typeof Symbol == 'function' && typeof Symbol.iterator == 'symbol'
									? function (h) {
											return typeof h
										}
									: function (h) {
											return h &&
												typeof Symbol == 'function' &&
												h.constructor === Symbol &&
												h !== Symbol.prototype
												? 'symbol'
												: typeof h
										}),
							n(p)
						)
					}
					Object.defineProperty(i, '__esModule', { value: !0 }),
						(i.default = i.ReactGAImplementation = void 0)
					var r = l(Ww())
					function o(p) {
						if (typeof WeakMap != 'function') return null
						var h = new WeakMap(),
							g = new WeakMap()
						return (o = function (w) {
							return w ? g : h
						})(p)
					}
					function l(p, h) {
						if (p && p.__esModule) return p
						if (p === null || (n(p) !== 'object' && typeof p != 'function')) return { default: p }
						var g = o(h)
						if (g && g.has(p)) return g.get(p)
						var m = {},
							w = Object.defineProperty && Object.getOwnPropertyDescriptor
						for (var _ in p)
							if (_ !== 'default' && Object.prototype.hasOwnProperty.call(p, _)) {
								var S = w ? Object.getOwnPropertyDescriptor(p, _) : null
								S && (S.get || S.set) ? Object.defineProperty(m, _, S) : (m[_] = p[_])
							}
						return (m.default = p), g && g.set(p, m), m
					}
					var u = r.GA4
					i.ReactGAImplementation = u
					var d = r.default
					i.default = d
				})(iu)),
			iu
		)
	}
	var Vw = Hw()
	const Et = Na(Vw)
	let Nh = !1,
		lu = '',
		uu,
		cu = 'unknown'
	window.posthog = sn
	function ko() {
		return document.documentElement.getAttribute('style')?.includes('color-scheme: dark')
			? 'dark'
			: 'light'
	}
	function qw() {
		const [i, n] = R.useState(!1),
			[r, o] = R.useState('unknown'),
			[l, u] = R.useState(ko())
		R.useEffect(() => {
			const p = new MutationObserver((h) => {
				h.forEach((g) => {
					g.attributeName === 'style' && u(ko())
				})
			})
			return (
				p.observe(document.documentElement, { attributes: !0, attributeFilter: ['style'] }),
				() => p.disconnect()
			)
		}, [])
		const d = (p) => {
			Ts.set('allowTracking', p ? 'true' : 'false'), o(p ? 'opted-in' : 'opted-out')
		}
		return (
			R.useEffect(() => {
				const p = Ts.get('allowTracking')
				o(p === 'true' ? 'opted-in' : p === 'false' ? 'opted-out' : 'unknown'), n(!0)
			}, []),
			R.useEffect(() => {
				if (
					(Nh ||
						(sn.init('phc_i8oKgMzgV38sn3GfjswW9mevQ3gFlo7bJXekZFeDN6', {
							api_host: 'https://analytics.tldraw.com/i',
							ui_host: 'https://eu.i.posthog.com',
							persistence: 'memory',
							capture_pageview: 'history_change',
						}),
						window.TL_GA4_MEASUREMENT_ID &&
							(Et.gtag('consent', 'default', {
								ad_storage: 'denied',
								ad_user_data: 'denied',
								ad_personalization: 'denied',
								analytics_storage: 'denied',
								wait_for_update: 500,
							}),
							Et.initialize(window.TL_GA4_MEASUREMENT_ID, { gaOptions: { anonymize_ip: !0 } }),
							window.TL_GOOGLE_ADS_ID && Et.gtag('config', window.TL_GOOGLE_ADS_ID),
							Et.send('pageview')),
						(Nh = !0)),
					(cu = r),
					r === 'opted-in')
				) {
					if (
						(sn.set_config({ persistence: 'localStorage+cookie' }),
						sn.opt_in_capturing(),
						Et.set({ anonymize_ip: !1 }),
						Et.gtag('consent', 'update', {
							ad_user_data: 'granted',
							ad_personalization: 'granted',
							ad_storage: 'granted',
							analytics_storage: 'granted',
						}),
						lu && uu && Fh(lu, uu),
						!document.getElementById('hs-script-loader'))
					) {
						const p = document.createElement('script')
						;(p.id = 'hs-script-loader'),
							(p.src = 'https://js-eu1.hs-scripts.com/145620695.js'),
							(p.defer = !0),
							document.head.appendChild(p)
					}
					if (!document.getElementById('reo-script-loader')) {
						const p = '47839e47a5ed202',
							h = document.createElement('script')
						;(h.id = 'reo-script-loader'),
							(h.src = `https://static.reo.dev/${p}/reo.js`),
							(h.defer = !0),
							(h.onload = () => window.Reo.init({ clientID: p })),
							document.head.appendChild(h)
					}
				} else
					sn.reset(),
						sn.set_config({ persistence: 'memory' }),
						sn.opt_out_capturing(),
						Et.reset(),
						Et.set({ anonymize_ip: !0 }),
						Et.gtag('consent', 'update', {
							ad_user_data: 'denied',
							ad_personalization: 'denied',
							ad_storage: 'denied',
							analytics_storage: 'denied',
						}),
						window.Reo?.reset?.()
			}, [r]),
			!i || r !== 'unknown'
				? null
				: ne.jsxs('div', {
						className: 'tl-analytics-banner',
						'data-theme': l,
						children: [
							ne.jsxs('p', {
								children: [
									'We use cookies on this website.',
									ne.jsx('br', {}),
									' Learn more in our',
									' ',
									ne.jsx('a', {
										href: 'https://tldraw.notion.site/devcookiepolicy',
										target: '_blank',
										rel: 'noreferrer',
										children: 'Cookie Policy',
									}),
									'.',
								],
							}),
							ne.jsxs('div', {
								className: 'tl-analytics-buttons',
								children: [
									ne.jsx('button', {
										className: 'tl-analytics-button tl-analytics-button-secondary',
										onClick: () => d(!1),
										children: 'Opt out',
									}),
									ne.jsx('button', {
										className: 'tl-analytics-button tl-analytics-button-primary',
										onClick: () => d(!0),
										children: 'Accept',
									}),
								],
							}),
						],
					})
		)
	}
	function Gw() {
		sn.capture('$pageview'), Et.send('pageview')
	}
	function Fh(i, n) {
		;(lu = i),
			(uu = n),
			cu === 'opted-in' &&
				(sn.identify(i, n),
				Et.set({ userId: i }),
				Et.set(n),
				window.Reo?.identify?.({
					...n,
					userId: i,
					firstname: n?.name || '',
					username: n?.email || '',
					type: 'email',
				}))
	}
	function Qw(i, n) {
		sn.capture(i, n), Et.event(i, n)
	}
	function Kw(...i) {
		cu === 'opted-in' && Et.gtag(...i)
	}
	function Xw() {
		const i = Ts.get('allowTracking') === 'true' ? 'opted-in' : 'opted-out',
			[n, r] = R.useState(i === 'opted-in'),
			[o, l] = R.useState(ko())
		R.useEffect(() => {
			const p = new MutationObserver((h) => {
				h.forEach((g) => {
					g.attributeName === 'style' && l(ko())
				})
			})
			return (
				p.observe(document.documentElement, { attributes: !0, attributeFilter: ['style'] }),
				() => p.disconnect()
			)
		}, [])
		const u = (p) => {
				Ts.set('allowTracking', p ? 'true' : 'false'), r(p)
			},
			d = () => {
				window.location.reload()
			}
		return ne.jsx(Pw, {
			open: !0,
			children: ne.jsxs(bw, {
				children: [
					ne.jsx(Rw, { className: 'tl-analytics-dialog', 'data-theme': o }),
					ne.jsx('div', {
						className: 'tl-analytics-dialog-wrapper',
						'data-theme': o,
						children: ne.jsxs(Iw, {
							onInteractOutside: d,
							onPointerDownOutside: d,
							onEscapeKeyDown: d,
							className: 'tl-analytics-dialog-content',
							children: [
								ne.jsx(Tw, {
									className: 'tl-analytics-dialog-title',
									children: 'Privacy settings',
								}),
								ne.jsxs(Ow, {
									className: 'tl-analytics-dialog-body',
									children: [
										'This website uses cookies to collect analytics from visitors. Read our',
										' ',
										ne.jsx('a', {
											href: 'https://tldraw.notion.site/devcookiepolicy',
											target: '_blank',
											rel: 'noreferrer',
											children: 'cookie policy',
										}),
										' ',
										'to learn more.',
									],
								}),
								ne.jsx(Nw, {
									className: 'tl-analytics-dialog-close',
									asChild: !0,
									children: ne.jsx('button', {
										'aria-label': 'Close',
										onClick: d,
										children: ne.jsx('svg', {
											width: '24',
											height: '24',
											fill: 'none',
											viewBox: '0 0 24 24',
											stroke: 'currentColor',
											children: ne.jsx('path', {
												strokeLinecap: 'round',
												strokeLinejoin: 'round',
												strokeWidth: 2,
												d: 'M6 18L18 6M6 6l12 12',
											}),
										}),
									}),
								}),
								ne.jsxs('div', {
									className: 'tl-analytics-checkbox-group',
									children: [
										ne.jsxs('label', {
											className: 'tl-analytics-checkbox-label',
											htmlFor: 'privacy-analytics',
											children: [
												ne.jsx('strong', { children: 'Analytics' }),
												ne.jsx('br', {}),
												'Optional. Help us understand how people use this website so that we can make it better.',
											],
										}),
										ne.jsx('div', {
											children: ne.jsx(zw, {
												className: 'tl-analytics-checkbox',
												id: 'privacy-analytics',
												checked: n,
												onCheckedChange: u,
												children: ne.jsx(jw, {}),
											}),
										}),
									],
								}),
							],
						}),
					}),
				],
			}),
		})
	}
	const Yw =
			':root{--tl-analytics-bg: white;--tl-analytics-text: #111827;--tl-analytics-text-secondary: #374151;--tl-analytics-border: #e5e7eb;--tl-analytics-link: #3b82f6;--tl-analytics-link-hover: #2563eb;--tl-analytics-overlay: rgba(255, 255, 255, .9);--tl-analytics-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06)}[data-theme=dark]{--tl-analytics-bg: #18181b;--tl-analytics-text: #f4f4f5;--tl-analytics-text-secondary: #a1a1aa;--tl-analytics-border: #27272a;--tl-analytics-link: #60a5fa;--tl-analytics-link-hover: #93c5fd;--tl-analytics-overlay: rgba(0, 0, 0, .9);--tl-analytics-shadow: 0 4px 6px -1px rgba(0, 0, 0, .3), 0 2px 4px -1px rgba(0, 0, 0, .2)}#tl-analytics-root{font-weight:400}.tl-analytics-banner{position:fixed;bottom:8px;left:8px;z-index:1000;max-width:100%;padding:12px;border-radius:8px;box-shadow:var(--tl-analytics-shadow);border:1px solid var(--tl-analytics-border);background-color:var(--tl-analytics-bg);display:flex;flex-direction:column;gap:12px}@media (min-width: 640px){.tl-analytics-banner{flex-direction:row;align-items:center;gap:32px}}.tl-analytics-banner p{font-size:12px;line-height:1.5;color:var(--tl-analytics-text);margin:0}.tl-analytics-banner a{color:var(--tl-analytics-link);text-decoration:none}.tl-analytics-banner a:hover{color:var(--tl-analytics-link-hover)}.tl-analytics-buttons{display:flex;gap:16px;justify-content:space-between;width:100%}@media (min-width: 640px){.tl-analytics-buttons{width:auto}}.tl-analytics-button{font-size:14px;cursor:pointer;text-decoration:none;border:none;padding:8px 16px;border-radius:9999px}.tl-analytics-button-primary{background-color:var(--tl-analytics-link);color:#fff;font-weight:700}.tl-analytics-button-primary:hover{background-color:var(--tl-analytics-link-hover)}.tl-analytics-button-secondary{background:none;color:var(--tl-analytics-text)}.tl-analytics-button-secondary:hover{color:var(--tl-analytics-text-secondary)}.tl-analytics-dialog{position:fixed;inset:0;z-index:100;background-color:var(--tl-analytics-overlay)}.tl-analytics-dialog-wrapper{position:fixed;inset:0;z-index:150;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh}.tl-analytics-dialog-content{position:relative;max-width:32rem;padding:2rem;background-color:var(--tl-analytics-bg);border-radius:.375rem;box-shadow:var(--tl-analytics-shadow);font-size:1rem;text-align:left}.tl-analytics-dialog-title{font-weight:700;color:var(--tl-analytics-text);margin:0 0 1rem}.tl-analytics-dialog-close{position:absolute;top:8px;right:8px;padding:4px;border:none;background:none;cursor:pointer;color:var(--tl-analytics-text-secondary)}.tl-analytics-dialog-close:hover{color:var(--tl-analytics-text)}.tl-analytics-dialog-body{margin-top:1.5rem}.tl-analytics-dialog-body p{margin:0 0 1rem;color:var(--tl-analytics-text-secondary)}.tl-analytics-dialog-body a{color:var(--tl-analytics-link);text-decoration:none}.tl-analytics-dialog-body a:hover{color:var(--tl-analytics-link-hover)}.tl-analytics-checkbox-group{display:flex;align-items:center;gap:8px;margin-bottom:1rem}.tl-analytics-checkbox{width:3rem;height:1.75rem;background-color:var(--tl-analytics-text-secondary);border-radius:9999px;position:relative;cursor:pointer}.tl-analytics-checkbox[data-state=checked]{background-color:var(--tl-analytics-link)}.tl-analytics-checkbox>span{display:block;width:1.25rem;height:1.25rem;background-color:var(--tl-analytics-bg);border-radius:9999px;transition:transform .1s;transform:translate(.25rem)}.tl-analytics-checkbox[data-state=checked]>span{transform:translate(1.5rem)}.tl-analytics-checkbox-label{margin-top:1.5rem;margin-bottom:.5rem;color:var(--tl-analytics-text-secondary)}.tl-analytics-dialog-footer{margin-top:1.5rem;display:flex;justify-content:flex-end;gap:8px}',
		Mh = document.createElement('style')
	;(Mh.textContent = Yw), document.head.appendChild(Mh)
	const du = document.createElement('div')
	;(du.id = 'tl-analytics-root'),
		document.body.appendChild(du),
		pd.createRoot(du).render(La.createElement(qw))
	const fu = document.createElement('div')
	;(fu.id = 'tl-analytics-privacy-root'), document.body.appendChild(fu)
	const Zw = pd.createRoot(fu)
	window.tlanalytics = {
		openPrivacySettings: () => {
			Zw.render(La.createElement(Xw))
		},
		page: Gw,
		identify: Fh,
		track: Qw,
		gtag: Kw,
	}
})
