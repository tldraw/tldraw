var __assign =
	(this && this.__assign) ||
	function () {
		__assign =
			Object.assign ||
			function (t) {
				for (var s, i = 1, n = arguments.length; i < n; i++) {
					s = arguments[i]
					for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]
				}
				return t
			}
		return __assign.apply(this, arguments)
	}
var __awaiter =
	(this && this.__awaiter) ||
	function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
				? value
				: new P(function (resolve) {
						resolve(value)
					})
		}
		return new (P || (P = Promise))(function (resolve, reject) {
			function fulfilled(value) {
				try {
					step(generator.next(value))
				} catch (e) {
					reject(e)
				}
			}
			function rejected(value) {
				try {
					step(generator['throw'](value))
				} catch (e) {
					reject(e)
				}
			}
			function step(result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected)
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next())
		})
	}
var __generator =
	(this && this.__generator) ||
	function (thisArg, body) {
		var _ = {
				label: 0,
				sent: function () {
					if (t[0] & 1) throw t[1]
					return t[1]
				},
				trys: [],
				ops: [],
			},
			f,
			y,
			t,
			g
		return (
			(g = { next: verb(0), throw: verb(1), return: verb(2) }),
			typeof Symbol === 'function' &&
				(g[Symbol.iterator] = function () {
					return this
				}),
			g
		)
		function verb(n) {
			return function (v) {
				return step([n, v])
			}
		}
		function step(op) {
			if (f) throw new TypeError('Generator is already executing.')
			while ((g && ((g = 0), op[0] && (_ = 0)), _))
				try {
					if (
						((f = 1),
						y &&
							(t =
								op[0] & 2
									? y['return']
									: op[0]
										? y['throw'] || ((t = y['return']) && t.call(y), 0)
										: y.next) &&
							!(t = t.call(y, op[1])).done)
					)
						return t
					if (((y = 0), t)) op = [op[0] & 2, t.value]
					switch (op[0]) {
						case 0:
						case 1:
							t = op
							break
						case 4:
							_.label++
							return { value: op[1], done: false }
						case 5:
							_.label++
							y = op[1]
							op = [0]
							continue
						case 7:
							op = _.ops.pop()
							_.trys.pop()
							continue
						default:
							if (
								!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
								(op[0] === 6 || op[0] === 2)
							) {
								_ = 0
								continue
							}
							if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
								_.label = op[1]
								break
							}
							if (op[0] === 6 && _.label < t[1]) {
								_.label = t[1]
								t = op
								break
							}
							if (t && _.label < t[2]) {
								_.label = t[2]
								_.ops.push(op)
								break
							}
							if (t[2]) _.ops.pop()
							_.trys.pop()
							continue
					}
					op = body.call(thisArg, _)
				} catch (e) {
					op = [6, e]
					y = 0
				} finally {
					f = t = 0
				}
			if (op[0] & 5) throw op[1]
			return { value: op[0] ? op[1] : void 0, done: true }
		}
	}
import { TLSocketRoom } from '@tldraw/sync-core'
import {
	createTLSchema,
	// defaultBindingSchemas,
	defaultShapeSchemas,
} from '@tldraw/tlschema'
import { AutoRouter, error } from 'itty-router'
import throttle from 'lodash.throttle'
// add custom shapes and bindings here if needed:
var schema = createTLSchema({
	shapes: __assign({}, defaultShapeSchemas),
	// bindings: { ...defaultBindingSchemas },
})
// each whiteboard room is hosted in a DurableObject:
// https://developers.cloudflare.com/durable-objects/
// there's only ever one durable object instance per room. it keeps all the room state in memory and
// handles websocket connections. periodically, it persists the room state to the R2 bucket.
var TldrawDurableObject = /** @class */ (function () {
	function TldrawDurableObject(ctx, env) {
		var _this = this
		this.ctx = ctx
		// the room ID will be missing while the room is being initialized
		this.roomId = null
		// when we load the room from the R2 bucket, we keep it here. it's a promise so we only ever
		// load it once.
		this.roomPromise = null
		this.router = AutoRouter({
			catch: function (e) {
				console.log(e)
				return error(e)
			},
		})
			// when we get a connection request, we stash the room id if needed and handle the connection
			.get('/connect/:roomId', function (request) {
				return __awaiter(_this, void 0, void 0, function () {
					var _this = this
					return __generator(this, function (_a) {
						switch (_a.label) {
							case 0:
								if (!!this.roomId) return [3 /*break*/, 2]
								return [
									4 /*yield*/,
									this.ctx.blockConcurrencyWhile(function () {
										return __awaiter(_this, void 0, void 0, function () {
											return __generator(this, function (_a) {
												switch (_a.label) {
													case 0:
														return [
															4 /*yield*/,
															this.ctx.storage.put('roomId', request.params.roomId),
														]
													case 1:
														_a.sent()
														this.roomId = request.params.roomId
														return [2 /*return*/]
												}
											})
										})
									}),
								]
							case 1:
								_a.sent()
								_a.label = 2
							case 2:
								return [2 /*return*/, this.handleConnect(request)]
						}
					})
				})
			})
		// we throttle persistance so it only happens every 10 seconds
		this.schedulePersistToR2 = throttle(function () {
			return __awaiter(_this, void 0, void 0, function () {
				var room, snapshot
				return __generator(this, function (_a) {
					switch (_a.label) {
						case 0:
							if (!this.roomPromise || !this.roomId) return [2 /*return*/]
							return [
								4 /*yield*/,
								this.getRoom(),
								// convert the room to JSON and upload it to R2
							]
						case 1:
							room = _a.sent()
							snapshot = JSON.stringify(room.getCurrentSnapshot())
							return [4 /*yield*/, this.r2.put('rooms/'.concat(this.roomId), snapshot)]
						case 2:
							_a.sent()
							return [2 /*return*/]
					}
				})
			})
		}, 10000)
		this.r2 = env.TLDRAW_BUCKET
		ctx.blockConcurrencyWhile(function () {
			return __awaiter(_this, void 0, void 0, function () {
				var _a
				var _b
				return __generator(this, function (_c) {
					switch (_c.label) {
						case 0:
							_a = this
							return [4 /*yield*/, this.ctx.storage.get('roomId')]
						case 1:
							_a.roomId = (_b = _c.sent()) !== null && _b !== void 0 ? _b : null
							return [2 /*return*/]
					}
				})
			})
		})
	}
	// `fetch` is the entry point for all requests to the Durable Object
	TldrawDurableObject.prototype.fetch = function (request) {
		return this.router.fetch(request)
	}
	// what happens when someone tries to connect to this room?
	TldrawDurableObject.prototype.handleConnect = function (request) {
		return __awaiter(this, void 0, void 0, function () {
			var sessionId, _a, clientWebSocket, serverWebSocket, room
			return __generator(this, function (_b) {
				switch (_b.label) {
					case 0:
						sessionId = request.query.sessionId
						if (!sessionId)
							return [
								2 /*return*/,
								error(400, 'Missing sessionId'),
								// Create the websocket pair for the client
							]
						;(_a = new WebSocketPair()), (clientWebSocket = _a[0]), (serverWebSocket = _a[1])
						serverWebSocket.accept()
						return [
							4 /*yield*/,
							this.getRoom(),
							// connect the client to the room
						]
					case 1:
						room = _b.sent()
						// connect the client to the room
						room.handleSocketConnect({ sessionId: sessionId, socket: serverWebSocket })
						// return the websocket connection to the client
						return [2 /*return*/, new Response(null, { status: 101, webSocket: clientWebSocket })]
				}
			})
		})
	}
	TldrawDurableObject.prototype.getRoom = function () {
		var _this = this
		var roomId = this.roomId
		if (!roomId) throw new Error('Missing roomId')
		if (!this.roomPromise) {
			this.roomPromise = (function () {
				return __awaiter(_this, void 0, void 0, function () {
					var roomFromBucket, initialSnapshot, _a
					var _this = this
					return __generator(this, function (_b) {
						switch (_b.label) {
							case 0:
								return [
									4 /*yield*/,
									this.r2.get('rooms/'.concat(roomId)),
									// if it doesn't exist, we'll just create a new empty room
								]
							case 1:
								roomFromBucket = _b.sent()
								if (!roomFromBucket) return [3 /*break*/, 3]
								return [4 /*yield*/, roomFromBucket.json()]
							case 2:
								_a = _b.sent()
								return [3 /*break*/, 4]
							case 3:
								_a = undefined
								_b.label = 4
							case 4:
								initialSnapshot = _a
								// create a new TLSocketRoom. This handles all the sync protocol & websocket connections.
								// it's up to us to persist the room state to R2 when needed though.
								return [
									2 /*return*/,
									new TLSocketRoom({
										schema: schema,
										initialSnapshot: initialSnapshot,
										onDataChange: function () {
											// and persist whenever the data in the room changes
											_this.schedulePersistToR2()
										},
									}),
								]
						}
					})
				})
			})()
		}
		return this.roomPromise
	}
	return TldrawDurableObject
})()
export { TldrawDurableObject }
