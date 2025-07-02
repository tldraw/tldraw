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
import { error } from 'itty-router'
// assets are stored in the bucket under the /uploads path
function getAssetObjectName(uploadId) {
	return 'uploads/'.concat(uploadId.replace(/[^a-zA-Z0-9\_\-]+/g, '_'))
}
// when a user uploads an asset, we store it in the bucket. we only allow image and video assets.
export function handleAssetUpload(request, env) {
	return __awaiter(this, void 0, void 0, function () {
		var objectName, contentType
		var _a
		return __generator(this, function (_b) {
			switch (_b.label) {
				case 0:
					objectName = getAssetObjectName(request.params.uploadId)
					contentType =
						(_a = request.headers.get('content-type')) !== null && _a !== void 0 ? _a : ''
					if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
						return [2 /*return*/, error(400, 'Invalid content type')]
					}
					return [4 /*yield*/, env.TLDRAW_BUCKET.head(objectName)]
				case 1:
					if (_b.sent()) {
						return [2 /*return*/, error(409, 'Upload already exists')]
					}
					return [
						4 /*yield*/,
						env.TLDRAW_BUCKET.put(objectName, request.body, {
							httpMetadata: request.headers,
						}),
					]
				case 2:
					_b.sent()
					return [2 /*return*/, { ok: true }]
			}
		})
	})
}
// when a user downloads an asset, we retrieve it from the bucket. we also cache the response for performance.
export function handleAssetDownload(request, env, ctx) {
	return __awaiter(this, void 0, void 0, function () {
		var objectName,
			cacheKey,
			cachedResponse,
			object,
			headers,
			contentRange,
			start,
			end,
			start,
			end,
			body,
			status,
			_a,
			cacheBody,
			responseBody
		var _b
		return __generator(this, function (_c) {
			switch (_c.label) {
				case 0:
					objectName = getAssetObjectName(request.params.uploadId)
					cacheKey = new Request(request.url, { headers: request.headers })
					return [4 /*yield*/, caches.default.match(cacheKey)]
				case 1:
					cachedResponse = _c.sent()
					if (cachedResponse) {
						return [2 /*return*/, cachedResponse]
					}
					return [
						4 /*yield*/,
						env.TLDRAW_BUCKET.get(objectName, {
							range: request.headers,
							onlyIf: request.headers,
						}),
					]
				case 2:
					object = _c.sent()
					if (!object) {
						return [2 /*return*/, error(404)]
					}
					headers = new Headers()
					object.writeHttpMetadata(headers)
					// assets are immutable, so we can cache them basically forever:
					headers.set('cache-control', 'public, max-age=31536000, immutable')
					headers.set('etag', object.httpEtag)
					// we set CORS headers so all clients can access assets. we do this here so our `cors` helper in
					// worker.ts doesn't try to set extra cors headers on responses that have been read from the
					// cache, which isn't allowed by cloudflare.
					headers.set('access-control-allow-origin', '*')
					if (object.range) {
						if ('suffix' in object.range) {
							start = object.size - object.range.suffix
							end = object.size - 1
							contentRange = 'bytes '.concat(start, '-').concat(end, '/').concat(object.size)
						} else {
							start = (_b = object.range.offset) !== null && _b !== void 0 ? _b : 0
							end = object.range.length ? start + object.range.length - 1 : object.size - 1
							if (start !== 0 || end !== object.size - 1) {
								contentRange = 'bytes '.concat(start, '-').concat(end, '/').concat(object.size)
							}
						}
					}
					if (contentRange) {
						headers.set('content-range', contentRange)
					}
					body = 'body' in object && object.body ? object.body : null
					status = body ? (contentRange ? 206 : 200) : 304
					// we only cache complete (200) responses
					if (status === 200) {
						;(_a = body.tee()), (cacheBody = _a[0]), (responseBody = _a[1])
						ctx.waitUntil(
							caches.default.put(
								cacheKey,
								new Response(cacheBody, { headers: headers, status: status })
							)
						)
						return [2 /*return*/, new Response(responseBody, { headers: headers, status: status })]
					}
					return [2 /*return*/, new Response(body, { headers: headers, status: status })]
			}
		})
	})
}
