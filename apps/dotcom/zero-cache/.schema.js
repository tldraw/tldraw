var __defProp = Object.defineProperty
var __export = (target, all) => {
	for (var name in all) __defProp(target, name, { get: all[name], enumerable: true })
}

// ../../../node_modules/@rocicorp/zero/out/chunk-HARIWJ2J.js
var objectPrototypeHasOwnProperty = Object.prototype.hasOwnProperty
var hasOwn = Object.hasOwn || ((object2, key) => objectPrototypeHasOwnProperty.call(object2, key))

// ../../../node_modules/compare-utf8/src/index.js
function compareUTF8(a, b) {
	const aLength = a.length
	const bLength = b.length
	const length = Math.min(aLength, bLength)
	for (let i = 0; i < length; ) {
		const aCodePoint =
			/** @type {number} */
			a.codePointAt(i)
		const bCodePoint =
			/** @type {number} */
			b.codePointAt(i)
		if (aCodePoint !== bCodePoint) {
			if (aCodePoint < 128 && bCodePoint < 128) {
				return aCodePoint - bCodePoint
			}
			const aLength2 = utf8Bytes(aCodePoint, aBytes)
			const bLength2 = utf8Bytes(bCodePoint, bBytes)
			return compareArrays(aBytes, aLength2, bBytes, bLength2)
		}
		i += utf16LengthForCodePoint(aCodePoint)
	}
	return aLength - bLength
}
function compareArrays(a, aLength, b, bLength) {
	const length = Math.min(aLength, bLength)
	for (let i = 0; i < length; i++) {
		const aValue = a[i]
		const bValue = b[i]
		if (aValue !== bValue) {
			return aValue - bValue
		}
	}
	return aLength - bLength
}
function utf16LengthForCodePoint(aCodePoint) {
	return aCodePoint > 65535 ? 2 : 1
}
var arr = () => Array.from({ length: 4 }, () => 0)
var aBytes = arr()
var bBytes = arr()
function utf8Bytes(codePoint, bytes) {
	if (codePoint < 128) {
		bytes[0] = codePoint
		return 1
	}
	let count
	let offset
	if (codePoint <= 2047) {
		count = 1
		offset = 192
	} else if (codePoint <= 65535) {
		count = 2
		offset = 224
	} else if (codePoint <= 1114111) {
		count = 3
		offset = 240
	} else {
		throw new Error('Invalid code point')
	}
	bytes[0] = (codePoint >> (6 * count)) + offset
	let i = 1
	for (; count > 0; count--) {
		const temp = codePoint >> (6 * (count - 1))
		bytes[i++] = 128 | (temp & 63)
	}
	return i
}

// ../../../node_modules/@rocicorp/zero/out/chunk-Q6D7EOS6.js
function assert(b, msg = 'Assertion failed') {
	if (!b) {
		const msgStr = typeof msg === 'string' ? msg : msg()
		throw new Error(msgStr)
	}
}
function assertString(v) {
	assertType(v, 'string')
}
function assertNumber(v) {
	assertType(v, 'number')
}
function assertBoolean(v) {
	assertType(v, 'boolean')
}
function assertType(v, t) {
	if (typeof v !== t) {
		throwInvalidType(v, t)
	}
}
function assertObject(v) {
	if (v === null) {
		throwInvalidType(v, 'object')
	}
	assertType(v, 'object')
}
function assertArray(v) {
	if (!Array.isArray(v)) {
		throwInvalidType(v, 'array')
	}
}
function invalidType(v, t) {
	let s = 'Invalid type: '
	if (v === null || v === void 0) {
		s += v
	} else {
		s += `${typeof v} \`${v}\``
	}
	return s + `, expected ${t}`
}
function throwInvalidType(v, t) {
	throw new Error(invalidType(v, t))
}
function assertUndefined(v, msg = 'Expected undefined value') {
	if (v !== void 0) {
		throw new Error(msg)
	}
}
function unreachable(_) {
	throw new Error('Unreachable')
}
function must(v, msg) {
	if (v == null) {
		throw new Error(msg ?? `Unexpected ${v} value`)
	}
	return v
}
function compareValues(a, b) {
	a = normalizeUndefined(a)
	b = normalizeUndefined(b)
	if (a === b) {
		return 0
	}
	if (a === null) {
		return -1
	}
	if (b === null) {
		return 1
	}
	if (typeof a === 'boolean') {
		assertBoolean(b)
		return a ? 1 : -1
	}
	if (typeof a === 'number') {
		assertNumber(b)
		return a - b
	}
	if (typeof a === 'string') {
		assertString(b)
		return compareUTF8(a, b)
	}
	throw new Error(`Unsupported type: ${a}`)
}
function normalizeUndefined(v) {
	return v ?? null
}
function valuesEqual(a, b) {
	if (a == null || b == null) {
		return false
	}
	return a === b
}
function drainStreams(node) {
	for (const stream of Object.values(node.relationships)) {
		for (const node2 of stream()) {
			drainStreams(node2)
		}
	}
}
function applyChange(parentEntry, change, schema2, relationship, format) {
	if (schema2.isHidden) {
		switch (change.type) {
			case 'add':
			case 'remove':
				for (const [relationship2, children] of Object.entries(change.node.relationships)) {
					const childSchema = must(schema2.relationships[relationship2])
					for (const node of children()) {
						applyChange(
							parentEntry,
							{ type: change.type, node },
							childSchema,
							relationship2,
							format
						)
					}
				}
				return
			case 'edit':
				return
			case 'child': {
				const childSchema = must(schema2.relationships[change.child.relationshipName])
				applyChange(parentEntry, change.child.change, childSchema, relationship, format)
				return
			}
			default:
				unreachable(change)
		}
	}
	const { singular, relationships: childFormats } = format
	switch (change.type) {
		case 'add': {
			const newEntry = {
				...change.node.row,
			}
			if (singular) {
				assertUndefined(parentEntry[relationship], 'single output already exists')
				parentEntry[relationship] = newEntry
			} else {
				const view = getChildEntryList(parentEntry, relationship)
				const { pos, found } = binarySearch(view, newEntry, schema2.compareRows)
				assert(!found, 'node already exists')
				view.splice(pos, 0, newEntry)
			}
			for (const [relationship2, children] of Object.entries(change.node.relationships)) {
				const childSchema = must(schema2.relationships[relationship2])
				const childFormat = childFormats[relationship2]
				if (childFormat === void 0) {
					continue
				}
				const newView = childFormat.singular ? void 0 : []
				newEntry[relationship2] = newView
				for (const node of children()) {
					applyChange(newEntry, { type: 'add', node }, childSchema, relationship2, childFormat)
				}
			}
			break
		}
		case 'remove': {
			if (singular) {
				assertObject(parentEntry[relationship])
				parentEntry[relationship] = void 0
			} else {
				const view = getChildEntryList(parentEntry, relationship)
				const { pos, found } = binarySearch(view, change.node.row, schema2.compareRows)
				assert(found, 'node does not exist')
				view.splice(pos, 1)
			}
			drainStreams(change.node)
			break
		}
		case 'child': {
			let existing
			if (singular) {
				assertObject(parentEntry[relationship])
				existing = parentEntry[relationship]
			} else {
				const view = getChildEntryList(parentEntry, relationship)
				const { pos, found } = binarySearch(view, change.node.row, schema2.compareRows)
				assert(found, 'node does not exist')
				existing = view[pos]
			}
			const childSchema = must(schema2.relationships[change.child.relationshipName])
			const childFormat = format.relationships[change.child.relationshipName]
			if (childFormat !== void 0) {
				applyChange(
					existing,
					change.child.change,
					childSchema,
					change.child.relationshipName,
					childFormat
				)
			}
			break
		}
		case 'edit': {
			if (singular) {
				assertObject(parentEntry[relationship])
				parentEntry[relationship] = {
					...parentEntry[relationship],
					...change.node.row,
				}
			} else {
				const view = parentEntry[relationship]
				assertArray(view)
				if (schema2.compareRows(change.oldNode.row, change.node.row) === 0) {
					const { pos, found } = binarySearch(view, change.oldNode.row, schema2.compareRows)
					assert(found, 'node does not exists')
					view[pos] = makeEntryPreserveRelationships(
						change.node.row,
						view[pos],
						schema2.relationships
					)
				} else {
					const { pos, found } = binarySearch(view, change.oldNode.row, schema2.compareRows)
					assert(found, 'node does not exists')
					const oldEntry = view[pos]
					view.splice(pos, 1)
					{
						const { pos: pos2, found: found2 } = binarySearch(
							view,
							change.node.row,
							schema2.compareRows
						)
						assert(!found2, 'node already exists')
						view.splice(
							pos2,
							0,
							makeEntryPreserveRelationships(change.node.row, oldEntry, schema2.relationships)
						)
					}
				}
			}
			break
		}
		default:
			unreachable(change)
	}
}
function binarySearch(view, target, comparator) {
	let low = 0
	let high = view.length - 1
	while (low <= high) {
		const mid = (low + high) >>> 1
		const comparison = comparator(view[mid], target)
		if (comparison < 0) {
			low = mid + 1
		} else if (comparison > 0) {
			high = mid - 1
		} else {
			return { pos: mid, found: true }
		}
	}
	return { pos: low, found: false }
}
function makeEntryPreserveRelationships(row, entry, relationships2) {
	const result = { ...row }
	for (const relationship in relationships2) {
		assert(!(relationship in row), 'Relationship already exists')
		result[relationship] = entry[relationship]
	}
	return result
}
function getChildEntryList(parentEntry, relationship) {
	const view = parentEntry[relationship]
	assertArray(view)
	return view
}

// ../../../node_modules/@rocicorp/zero/out/chunk-424PT5DM.js
var __defProp2 = Object.defineProperty
var __getOwnPropDesc = Object.getOwnPropertyDescriptor
var __getOwnPropNames = Object.getOwnPropertyNames
var __hasOwnProp = Object.prototype.hasOwnProperty
var __export2 = (target, all) => {
	for (var name in all) __defProp2(target, name, { get: all[name], enumerable: true })
}
var __copyProps = (to, from, except, desc) => {
	if ((from && typeof from === 'object') || typeof from === 'function') {
		for (let key of __getOwnPropNames(from))
			if (!__hasOwnProp.call(to, key) && key !== except)
				__defProp2(to, key, {
					get: () => from[key],
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
				})
	}
	return to
}
var __reExport = (target, mod, secondTarget) => (
	__copyProps(target, mod, 'default'), secondTarget && __copyProps(secondTarget, mod, 'default')
)

// ../../../node_modules/@rocicorp/resolver/out/resolver.js
function resolver() {
	let resolve
	let reject
	const promise = new Promise((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}

// ../../../node_modules/@badrap/valita/dist/node-mjs/index.mjs
var node_mjs_exports = {}
__export(node_mjs_exports, {
	ValitaError: () => ValitaError,
	array: () => array,
	bigint: () => bigint,
	boolean: () => boolean,
	err: () => err,
	lazy: () => lazy,
	literal: () => literal,
	never: () => never,
	null: () => null_,
	number: () => number,
	object: () => object,
	ok: () => ok,
	record: () => record,
	string: () => string,
	tuple: () => tuple,
	undefined: () => undefined_,
	union: () => union,
	unknown: () => unknown,
})
function joinIssues(left, right) {
	return left ? { ok: false, code: 'join', left, right } : right
}
function prependPath(key, tree) {
	return { ok: false, code: 'prepend', key, tree }
}
function cloneIssueWithPath(tree, path2) {
	const code = tree.code
	switch (code) {
		case 'invalid_type':
			return { code, path: path2, expected: tree.expected }
		case 'invalid_literal':
			return { code, path: path2, expected: tree.expected }
		case 'missing_value':
			return { code, path: path2 }
		case 'invalid_length':
			return {
				code,
				path: path2,
				minLength: tree.minLength,
				maxLength: tree.maxLength,
			}
		case 'unrecognized_keys':
			return { code, path: path2, keys: tree.keys }
		case 'invalid_union':
			return { code, path: path2, tree: tree.tree }
		default:
			return { code, path: path2, error: tree.error }
	}
}
function collectIssues(tree, path2 = [], issues = []) {
	for (;;) {
		if (tree.code === 'join') {
			collectIssues(tree.left, path2.slice(), issues)
			tree = tree.right
		} else if (tree.code === 'prepend') {
			path2.push(tree.key)
			tree = tree.tree
		} else {
			if (
				tree.code === 'custom_error' &&
				typeof tree.error === 'object' &&
				tree.error.path !== void 0
			) {
				path2.push(...tree.error.path)
			}
			issues.push(cloneIssueWithPath(tree, path2))
			return issues
		}
	}
}
function separatedList(list, sep) {
	if (list.length === 0) {
		return 'nothing'
	} else if (list.length === 1) {
		return list[0]
	} else {
		return `${list.slice(0, -1).join(', ')} ${sep} ${list[list.length - 1]}`
	}
}
function formatLiteral(value) {
	return typeof value === 'bigint' ? `${value}n` : JSON.stringify(value)
}
function countIssues(tree) {
	let count = 0
	for (;;) {
		if (tree.code === 'join') {
			count += countIssues(tree.left)
			tree = tree.right
		} else if (tree.code === 'prepend') {
			tree = tree.tree
		} else {
			return count + 1
		}
	}
}
function formatIssueTree(tree) {
	let path2 = ''
	let count = 0
	for (;;) {
		if (tree.code === 'join') {
			count += countIssues(tree.right)
			tree = tree.left
		} else if (tree.code === 'prepend') {
			path2 += '.' + tree.key
			tree = tree.tree
		} else {
			break
		}
	}
	let message = 'validation failed'
	if (tree.code === 'invalid_type') {
		message = `expected ${separatedList(tree.expected, 'or')}`
	} else if (tree.code === 'invalid_literal') {
		message = `expected ${separatedList(tree.expected.map(formatLiteral), 'or')}`
	} else if (tree.code === 'missing_value') {
		message = `missing value`
	} else if (tree.code === 'unrecognized_keys') {
		const keys = tree.keys
		message = `unrecognized ${keys.length === 1 ? 'key' : 'keys'} ${separatedList(keys.map(formatLiteral), 'and')}`
	} else if (tree.code === 'invalid_length') {
		const min = tree.minLength
		const max = tree.maxLength
		message = `expected an array with `
		if (min > 0) {
			if (max === min) {
				message += `${min}`
			} else if (max !== void 0) {
				message += `between ${min} and ${max}`
			} else {
				message += `at least ${min}`
			}
		} else {
			message += `at most ${max}`
		}
		message += ` item(s)`
	} else if (tree.code === 'custom_error') {
		const error = tree.error
		if (typeof error === 'string') {
			message = error
		} else if (error !== void 0) {
			if (error.message !== void 0) {
				message = error.message
			}
			if (error.path !== void 0) {
				path2 += '.' + error.path.join('.')
			}
		}
	}
	let msg = `${tree.code} at .${path2.slice(1)} (${message})`
	if (count === 1) {
		msg += ` (+ 1 other issue)`
	} else if (count > 1) {
		msg += ` (+ ${count} other issues)`
	}
	return msg
}
var ValitaError = class extends Error {
	constructor(issueTree) {
		super(formatIssueTree(issueTree))
		this.issueTree = issueTree
		Object.setPrototypeOf(this, new.target.prototype)
		this.name = new.target.name
		this._issues = void 0
	}
	get issues() {
		if (this._issues === void 0) {
			this._issues = collectIssues(this.issueTree)
		}
		return this._issues
	}
}
var ErrImpl = class {
	constructor(issueTree) {
		this.issueTree = issueTree
		this.ok = false
		this._issues = void 0
		this._message = void 0
	}
	get issues() {
		if (this._issues === void 0) {
			this._issues = collectIssues(this.issueTree)
		}
		return this._issues
	}
	get message() {
		if (this._message === void 0) {
			this._message = formatIssueTree(this.issueTree)
		}
		return this._message
	}
	throw() {
		throw new ValitaError(this.issueTree)
	}
}
function ok(value) {
	return { ok: true, value }
}
function err(error) {
	return new ErrImpl({ ok: false, code: 'custom_error', error })
}
function isObject(v) {
	return typeof v === 'object' && v !== null && !Array.isArray(v)
}
var FLAG_FORBID_EXTRA_KEYS = 1
var FLAG_STRIP_EXTRA_KEYS = 2
var FLAG_MISSING_VALUE = 4
var AbstractType = class {
	optional(defaultFn) {
		const optional = new Optional(this)
		if (!defaultFn) {
			return optional
		}
		return new TransformType(optional, (v) => {
			return v === void 0 ? { ok: true, value: defaultFn() } : void 0
		})
	}
	default(defaultValue) {
		const defaultResult = ok(defaultValue)
		return new TransformType(this.optional(), (v) => {
			return v === void 0 ? defaultResult : void 0
		})
	}
	assert(func, error) {
		const err2 = { ok: false, code: 'custom_error', error }
		return new TransformType(this, (v, options) => (func(v, options) ? void 0 : err2))
	}
	map(func) {
		return new TransformType(this, (v, options) => ({
			ok: true,
			value: func(v, options),
		}))
	}
	chain(func) {
		return new TransformType(this, (v, options) => {
			const r = func(v, options)
			return r.ok ? r : r.issueTree
		})
	}
}
var Type = class extends AbstractType {
	/**
	 * Return new validator that accepts both the original type and `null`.
	 */
	nullable() {
		return new Nullable(this)
	}
	toTerminals(func) {
		func(this)
	}
	/**
	 * Parse a value without throwing.
	 */
	try(v, options) {
		let flags = FLAG_FORBID_EXTRA_KEYS
		if (options?.mode === 'passthrough') {
			flags = 0
		} else if (options?.mode === 'strip') {
			flags = FLAG_STRIP_EXTRA_KEYS
		}
		const r = this.func(v, flags)
		if (r === void 0) {
			return { ok: true, value: v }
		} else if (r.ok) {
			return { ok: true, value: r.value }
		} else {
			return new ErrImpl(r)
		}
	}
	/**
	 * Parse a value. Throw a ValitaError on failure.
	 */
	parse(v, options) {
		let flags = FLAG_FORBID_EXTRA_KEYS
		if (options?.mode === 'passthrough') {
			flags = 0
		} else if (options?.mode === 'strip') {
			flags = FLAG_STRIP_EXTRA_KEYS
		}
		const r = this.func(v, flags)
		if (r === void 0) {
			return v
		} else if (r.ok) {
			return r.value
		} else {
			throw new ValitaError(r)
		}
	}
}
var Nullable = class extends Type {
	constructor(type) {
		super()
		this.type = type
		this.name = 'nullable'
	}
	func(v, flags) {
		return v === null ? void 0 : this.type.func(v, flags)
	}
	toTerminals(func) {
		func(nullSingleton)
		this.type.toTerminals(func)
	}
	nullable() {
		return this
	}
}
var Optional = class extends AbstractType {
	constructor(type) {
		super()
		this.type = type
		this.name = 'optional'
	}
	func(v, flags) {
		return v === void 0 || flags & FLAG_MISSING_VALUE ? void 0 : this.type.func(v, flags)
	}
	toTerminals(func) {
		func(this)
		func(undefinedSingleton)
		this.type.toTerminals(func)
	}
	optional(defaultFn) {
		if (!defaultFn) {
			return this
		}
		return new TransformType(this, (v) => {
			return v === void 0 ? { ok: true, value: defaultFn() } : void 0
		})
	}
}
function setBit(bits, index) {
	if (typeof bits !== 'number') {
		const idx = index >> 5
		for (let i = bits.length; i <= idx; i++) {
			bits.push(0)
		}
		bits[idx] |= 1 << index % 32
		return bits
	} else if (index < 32) {
		return bits | (1 << index)
	} else {
		return setBit([bits, 0], index)
	}
}
function getBit(bits, index) {
	if (typeof bits === 'number') {
		return index < 32 ? (bits >>> index) & 1 : 0
	} else {
		return (bits[index >> 5] >>> index % 32) & 1
	}
}
var ObjectType = class _ObjectType extends Type {
	constructor(shape, restType, checks) {
		super()
		this.shape = shape
		this.restType = restType
		this.checks = checks
		this.name = 'object'
		this._invalidType = {
			ok: false,
			code: 'invalid_type',
			expected: ['object'],
		}
	}
	check(func, error) {
		const issue = { ok: false, code: 'custom_error', error }
		return new _ObjectType(this.shape, this.restType, [
			...(this.checks ?? []),
			{
				func,
				issue,
			},
		])
	}
	func(v, flags) {
		if (!isObject(v)) {
			return this._invalidType
		}
		let func = this._func
		if (func === void 0) {
			func = createObjectMatcher(this.shape, this.restType, this.checks)
			this._func = func
		}
		return func(v, flags)
	}
	rest(restType) {
		return new _ObjectType(this.shape, restType)
	}
	extend(shape) {
		return new _ObjectType({ ...this.shape, ...shape }, this.restType)
	}
	pick(...keys) {
		const shape = {}
		keys.forEach((key) => {
			shape[key] = this.shape[key]
		})
		return new _ObjectType(shape, void 0)
	}
	omit(...keys) {
		const shape = { ...this.shape }
		keys.forEach((key) => {
			delete shape[key]
		})
		return new _ObjectType(shape, this.restType)
	}
	partial() {
		const shape = {}
		Object.keys(this.shape).forEach((key) => {
			shape[key] = this.shape[key].optional()
		})
		const rest = this.restType?.optional()
		return new _ObjectType(shape, rest)
	}
}
function createObjectMatcher(shape, rest, checks) {
	const requiredKeys = []
	const optionalKeys = []
	for (const key in shape) {
		let hasOptional = false
		shape[key].toTerminals((t) => {
			hasOptional ||= t.name === 'optional'
		})
		if (hasOptional) {
			optionalKeys.push(key)
		} else {
			requiredKeys.push(key)
		}
	}
	const keys = [...requiredKeys, ...optionalKeys]
	const totalCount = keys.length
	if (totalCount === 0 && rest?.name === 'unknown') {
		return function (obj, _) {
			if (checks !== void 0) {
				for (let i = 0; i < checks.length; i++) {
					if (!checks[i].func(obj)) {
						return checks[i].issue
					}
				}
			}
			return void 0
		}
	}
	const types = keys.map((key) => shape[key])
	const requiredCount = requiredKeys.length
	const invertedIndexes = /* @__PURE__ */ Object.create(null)
	keys.forEach((key, index) => {
		invertedIndexes[key] = ~index
	})
	const missingValues = requiredKeys.map((key) =>
		prependPath(key, {
			ok: false,
			code: 'missing_value',
		})
	)
	function set(obj, key, value) {
		if (key === '__proto__') {
			Object.defineProperty(obj, key, {
				value,
				writable: true,
				enumerable: true,
				configurable: true,
			})
		} else {
			obj[key] = value
		}
	}
	return function (obj, flags) {
		let copied = false
		let output = obj
		let issues
		let unrecognized = void 0
		let seenBits = 0
		let seenCount = 0
		if (flags & FLAG_FORBID_EXTRA_KEYS || flags & FLAG_STRIP_EXTRA_KEYS || rest !== void 0) {
			for (const key in obj) {
				const value = obj[key]
				const index = ~invertedIndexes[key]
				let r
				if (index >= 0) {
					seenCount++
					seenBits = setBit(seenBits, index)
					r = types[index].func(value, flags)
				} else if (rest !== void 0) {
					r = rest.func(value, flags)
				} else {
					if (flags & FLAG_FORBID_EXTRA_KEYS) {
						if (unrecognized === void 0) {
							unrecognized = [key]
						} else {
							unrecognized.push(key)
						}
					} else if (flags & FLAG_STRIP_EXTRA_KEYS && issues === void 0 && !copied) {
						output = {}
						copied = true
						for (let m = 0; m < totalCount; m++) {
							if (getBit(seenBits, m)) {
								const k = keys[m]
								set(output, k, obj[k])
							}
						}
					}
					continue
				}
				if (r === void 0) {
					if (copied && issues === void 0) {
						set(output, key, value)
					}
				} else if (!r.ok) {
					issues = joinIssues(issues, prependPath(key, r))
				} else if (issues === void 0) {
					if (!copied) {
						output = {}
						copied = true
						if (rest === void 0) {
							for (let m = 0; m < totalCount; m++) {
								if (m !== index && getBit(seenBits, m)) {
									const k = keys[m]
									set(output, k, obj[k])
								}
							}
						} else {
							for (const k in obj) {
								set(output, k, obj[k])
							}
						}
					}
					set(output, key, r.value)
				}
			}
		}
		if (seenCount < totalCount) {
			for (let i = 0; i < totalCount; i++) {
				if (getBit(seenBits, i)) {
					continue
				}
				const key = keys[i]
				const value = obj[key]
				let keyFlags = flags & ~FLAG_MISSING_VALUE
				if (value === void 0 && !(key in obj)) {
					if (i < requiredCount) {
						issues = joinIssues(issues, missingValues[i])
						continue
					}
					keyFlags |= FLAG_MISSING_VALUE
				}
				const r = types[i].func(value, keyFlags)
				if (r === void 0) {
					if (copied && issues === void 0 && !(keyFlags & FLAG_MISSING_VALUE)) {
						set(output, key, value)
					}
				} else if (!r.ok) {
					issues = joinIssues(issues, prependPath(key, r))
				} else if (issues === void 0) {
					if (!copied) {
						output = {}
						copied = true
						if (rest === void 0) {
							for (let m = 0; m < totalCount; m++) {
								if (m < i || getBit(seenBits, m)) {
									const k = keys[m]
									set(output, k, obj[k])
								}
							}
						} else {
							for (const k in obj) {
								set(output, k, obj[k])
							}
							for (let m = 0; m < i; m++) {
								if (!getBit(seenBits, m)) {
									const k = keys[m]
									set(output, k, obj[k])
								}
							}
						}
					}
					set(output, key, r.value)
				}
			}
		}
		if (unrecognized !== void 0) {
			issues = joinIssues(issues, {
				ok: false,
				code: 'unrecognized_keys',
				keys: unrecognized,
			})
		}
		if (issues === void 0 && checks !== void 0) {
			for (let i = 0; i < checks.length; i++) {
				if (!checks[i].func(output)) {
					return checks[i].issue
				}
			}
		}
		if (issues === void 0 && copied) {
			return { ok: true, value: output }
		} else {
			return issues
		}
	}
}
var ArrayOrTupleType = class _ArrayOrTupleType extends Type {
	constructor(prefix, rest, suffix) {
		super()
		this.prefix = prefix
		this.rest = rest
		this.suffix = suffix
		this.name = 'array'
		this.restType = rest ?? never()
		this.minLength = this.prefix.length + this.suffix.length
		this.maxLength = rest ? void 0 : this.minLength
		this.invalidType = {
			ok: false,
			code: 'invalid_type',
			expected: ['array'],
		}
		this.invalidLength = {
			ok: false,
			code: 'invalid_length',
			minLength: this.minLength,
			maxLength: this.maxLength,
		}
	}
	func(arr2, flags) {
		if (!Array.isArray(arr2)) {
			return this.invalidType
		}
		const length = arr2.length
		const minLength = this.minLength
		const maxLength = this.maxLength ?? Infinity
		if (length < minLength || length > maxLength) {
			return this.invalidLength
		}
		const headEnd = this.prefix.length
		const tailStart = arr2.length - this.suffix.length
		let issueTree = void 0
		let output = arr2
		for (let i = 0; i < arr2.length; i++) {
			const type =
				i < headEnd ? this.prefix[i] : i >= tailStart ? this.suffix[i - tailStart] : this.restType
			const r = type.func(arr2[i], flags)
			if (r !== void 0) {
				if (r.ok) {
					if (output === arr2) {
						output = arr2.slice()
					}
					output[i] = r.value
				} else {
					issueTree = joinIssues(issueTree, prependPath(i, r))
				}
			}
		}
		if (issueTree) {
			return issueTree
		} else if (arr2 === output) {
			return void 0
		} else {
			return { ok: true, value: output }
		}
	}
	concat(type) {
		if (this.rest) {
			if (type.rest) {
				throw new TypeError('can not concatenate two variadic types')
			}
			return new _ArrayOrTupleType(this.prefix, this.rest, [
				...this.suffix,
				...type.prefix,
				...type.suffix,
			])
		} else if (type.rest) {
			return new _ArrayOrTupleType(
				[...this.prefix, ...this.suffix, ...type.prefix],
				type.rest,
				type.suffix
			)
		} else {
			return new _ArrayOrTupleType(
				[...this.prefix, ...this.suffix, ...type.prefix, ...type.suffix],
				type.rest,
				type.suffix
			)
		}
	}
}
function toInputType(v) {
	const type = typeof v
	if (type !== 'object') {
		return type
	} else if (v === null) {
		return 'null'
	} else if (Array.isArray(v)) {
		return 'array'
	} else {
		return type
	}
}
function dedup(arr2) {
	return Array.from(new Set(arr2))
}
function findCommonKeys(rs) {
	const map = /* @__PURE__ */ new Map()
	rs.forEach((r) => {
		for (const key in r) {
			map.set(key, (map.get(key) || 0) + 1)
		}
	})
	const result = []
	map.forEach((count, key) => {
		if (count === rs.length) {
			result.push(key)
		}
	})
	return result
}
function groupTerminals(terminals) {
	const order = /* @__PURE__ */ new Map()
	const literals = /* @__PURE__ */ new Map()
	const types = /* @__PURE__ */ new Map()
	const unknowns = []
	const optionals = []
	const expectedTypes = []
	terminals.forEach(({ root, terminal }) => {
		order.set(root, order.get(root) ?? order.size)
		if (terminal.name === 'never') {
		} else if (terminal.name === 'optional') {
			optionals.push(root)
		} else if (terminal.name === 'unknown') {
			unknowns.push(root)
		} else if (terminal.name === 'literal') {
			const roots = literals.get(terminal.value) || []
			roots.push(root)
			literals.set(terminal.value, roots)
			expectedTypes.push(toInputType(terminal.value))
		} else {
			const roots = types.get(terminal.name) || []
			roots.push(root)
			types.set(terminal.name, roots)
			expectedTypes.push(terminal.name)
		}
	})
	literals.forEach((roots, value) => {
		const options = types.get(toInputType(value))
		if (options) {
			options.push(...roots)
			literals.delete(value)
		}
	})
	const byOrder = (a, b) => {
		return (order.get(a) ?? 0) - (order.get(b) ?? 0)
	}
	types.forEach((roots, type) => types.set(type, dedup(roots.concat(unknowns).sort(byOrder))))
	literals.forEach((roots, value) =>
		literals.set(value, dedup(roots.concat(unknowns)).sort(byOrder))
	)
	return {
		types,
		literals,
		unknowns: dedup(unknowns).sort(byOrder),
		optionals: dedup(optionals).sort(byOrder),
		expectedTypes: dedup(expectedTypes),
	}
}
function createObjectKeyMatcher(objects, key) {
	const list = []
	for (const { root, terminal } of objects) {
		terminal.shape[key].toTerminals((t) => list.push({ root, terminal: t }))
	}
	const { types, literals, optionals, unknowns, expectedTypes } = groupTerminals(list)
	if (unknowns.length > 0 || optionals.length > 1) {
		return void 0
	}
	for (const roots of literals.values()) {
		if (roots.length > 1) {
			return void 0
		}
	}
	for (const roots of types.values()) {
		if (roots.length > 1) {
			return void 0
		}
	}
	const missingValue = prependPath(key, { ok: false, code: 'missing_value' })
	const issue = prependPath(
		key,
		types.size === 0
			? {
					ok: false,
					code: 'invalid_literal',
					expected: Array.from(literals.keys()),
				}
			: {
					ok: false,
					code: 'invalid_type',
					expected: expectedTypes,
				}
	)
	const litMap = literals.size > 0 ? /* @__PURE__ */ new Map() : void 0
	for (const [literal2, options] of literals) {
		litMap.set(literal2, options[0])
	}
	const byType = types.size > 0 ? {} : void 0
	for (const [type, options] of types) {
		byType[type] = options[0]
	}
	return function (_obj, flags) {
		const obj = _obj
		const value = obj[key]
		if (value === void 0 && !(key in obj)) {
			return optionals.length > 0 ? optionals[0].func(obj, flags) : missingValue
		}
		const option = byType?.[toInputType(value)] ?? litMap?.get(value)
		return option ? option.func(obj, flags) : issue
	}
}
function createUnionObjectMatcher(terminals) {
	if (terminals.some(({ terminal: t }) => t.name === 'unknown')) {
		return void 0
	}
	const objects = terminals.filter((item) => {
		return item.terminal.name === 'object'
	})
	if (objects.length < 2) {
		return void 0
	}
	const shapes = objects.map(({ terminal }) => terminal.shape)
	for (const key of findCommonKeys(shapes)) {
		const matcher = createObjectKeyMatcher(objects, key)
		if (matcher) {
			return matcher
		}
	}
	return void 0
}
function createUnionBaseMatcher(terminals) {
	const { expectedTypes, literals, types, unknowns, optionals } = groupTerminals(terminals)
	const issue =
		types.size === 0 && unknowns.length === 0
			? {
					ok: false,
					code: 'invalid_literal',
					expected: Array.from(literals.keys()),
				}
			: {
					ok: false,
					code: 'invalid_type',
					expected: expectedTypes,
				}
	const litMap = literals.size > 0 ? literals : void 0
	const byType = types.size > 0 ? {} : void 0
	for (const [type, options] of types) {
		byType[type] = options
	}
	return function (value, flags) {
		let options
		if (flags & FLAG_MISSING_VALUE) {
			options = optionals
		} else {
			options = byType?.[toInputType(value)] ?? litMap?.get(value) ?? unknowns
		}
		if (!options) {
			return issue
		}
		let count = 0
		let issueTree = issue
		for (let i = 0; i < options.length; i++) {
			const r = options[i].func(value, flags)
			if (r === void 0 || r.ok) {
				return r
			}
			issueTree = count > 0 ? joinIssues(issueTree, r) : r
			count++
		}
		if (count > 1) {
			return { ok: false, code: 'invalid_union', tree: issueTree }
		}
		return issueTree
	}
}
var UnionType = class extends Type {
	constructor(options) {
		super()
		this.options = options
		this.name = 'union'
	}
	toTerminals(func) {
		this.options.forEach((o) => o.toTerminals(func))
	}
	func(v, flags) {
		let func = this._func
		if (func === void 0) {
			const flattened2 = []
			this.options.forEach((option) =>
				option.toTerminals((terminal) => {
					flattened2.push({ root: option, terminal })
				})
			)
			const base = createUnionBaseMatcher(flattened2)
			const object2 = createUnionObjectMatcher(flattened2)
			if (!object2) {
				func = base
			} else {
				func = function (v2, f) {
					if (isObject(v2)) {
						return object2(v2, f)
					}
					return base(v2, f)
				}
			}
			this._func = func
		}
		return func(v, flags)
	}
}
var STRICT = Object.freeze({ mode: 'strict' })
var STRIP = Object.freeze({ mode: 'strip' })
var PASSTHROUGH = Object.freeze({ mode: 'passthrough' })
var TransformType = class _TransformType extends Type {
	constructor(transformed, transform) {
		super()
		this.transformed = transformed
		this.transform = transform
		this.name = 'transform'
		this.undef = ok(void 0)
		this.transformChain = void 0
		this.transformRoot = void 0
	}
	func(v, flags) {
		let chain = this.transformChain
		if (!chain) {
			chain = []
			let next = this
			while (next instanceof _TransformType) {
				chain.push(next.transform)
				next = next.transformed
			}
			chain.reverse()
			this.transformChain = chain
			this.transformRoot = next
		}
		let result = this.transformRoot.func(v, flags)
		if (result !== void 0 && !result.ok) {
			return result
		}
		let current
		if (result !== void 0) {
			current = result.value
		} else if (flags & FLAG_MISSING_VALUE) {
			current = void 0
			result = this.undef
		} else {
			current = v
		}
		const options =
			flags & FLAG_FORBID_EXTRA_KEYS ? STRICT : flags & FLAG_STRIP_EXTRA_KEYS ? STRIP : PASSTHROUGH
		for (let i = 0; i < chain.length; i++) {
			const r = chain[i](current, options)
			if (r !== void 0) {
				if (!r.ok) {
					return r
				}
				current = r.value
				result = r
			}
		}
		return result
	}
	toTerminals(func) {
		this.transformed.toTerminals(func)
	}
}
var LazyType = class extends Type {
	constructor(definer) {
		super()
		this.definer = definer
		this.name = 'lazy'
		this.recursing = false
	}
	func(v, flags) {
		if (!this.type) {
			this.type = this.definer()
		}
		return this.type.func(v, flags)
	}
	toTerminals(func) {
		if (this.recursing) {
			return
		}
		try {
			this.recursing = true
			if (!this.type) {
				this.type = this.definer()
			}
			this.type.toTerminals(func)
		} finally {
			this.recursing = false
		}
	}
}
var NeverType = class extends Type {
	constructor() {
		super(...arguments)
		this.name = 'never'
		this.issue = {
			ok: false,
			code: 'invalid_type',
			expected: [],
		}
	}
	func(_, __) {
		return this.issue
	}
}
var neverSingleton = new NeverType()
function never() {
	return neverSingleton
}
var UnknownType = class extends Type {
	constructor() {
		super(...arguments)
		this.name = 'unknown'
	}
	func(_, __) {
		return void 0
	}
}
var unknownSingleton = new UnknownType()
function unknown() {
	return unknownSingleton
}
var UndefinedType = class extends Type {
	constructor() {
		super(...arguments)
		this.name = 'undefined'
		this.issue = {
			ok: false,
			code: 'invalid_type',
			expected: ['undefined'],
		}
	}
	func(v, _) {
		return v === void 0 ? void 0 : this.issue
	}
}
var undefinedSingleton = new UndefinedType()
function undefined_() {
	return undefinedSingleton
}
var NullType = class extends Type {
	constructor() {
		super(...arguments)
		this.name = 'null'
		this.issue = {
			ok: false,
			code: 'invalid_type',
			expected: ['null'],
		}
	}
	func(v, _) {
		return v === null ? void 0 : this.issue
	}
}
var nullSingleton = new NullType()
function null_() {
	return nullSingleton
}
var NumberType = class extends Type {
	constructor() {
		super(...arguments)
		this.name = 'number'
		this.issue = {
			ok: false,
			code: 'invalid_type',
			expected: ['number'],
		}
	}
	func(v, _) {
		return typeof v === 'number' ? void 0 : this.issue
	}
}
var numberSingleton = new NumberType()
function number() {
	return numberSingleton
}
var BigIntType = class extends Type {
	constructor() {
		super(...arguments)
		this.name = 'bigint'
		this.issue = {
			ok: false,
			code: 'invalid_type',
			expected: ['bigint'],
		}
	}
	func(v, _) {
		return typeof v === 'bigint' ? void 0 : this.issue
	}
}
var bigintSingleton = new BigIntType()
function bigint() {
	return bigintSingleton
}
var StringType = class extends Type {
	constructor() {
		super(...arguments)
		this.name = 'string'
		this.issue = {
			ok: false,
			code: 'invalid_type',
			expected: ['string'],
		}
	}
	func(v, _) {
		return typeof v === 'string' ? void 0 : this.issue
	}
}
var stringSingleton = new StringType()
function string() {
	return stringSingleton
}
var BooleanType = class extends Type {
	constructor() {
		super(...arguments)
		this.name = 'boolean'
		this.issue = {
			ok: false,
			code: 'invalid_type',
			expected: ['boolean'],
		}
	}
	func(v, _) {
		return typeof v === 'boolean' ? void 0 : this.issue
	}
}
var booleanSingleton = new BooleanType()
function boolean() {
	return booleanSingleton
}
var LiteralType = class extends Type {
	constructor(value) {
		super()
		this.value = value
		this.name = 'literal'
		this.issue = {
			ok: false,
			code: 'invalid_literal',
			expected: [value],
		}
	}
	func(v, _) {
		return v === this.value ? void 0 : this.issue
	}
}
function literal(value) {
	return new LiteralType(value)
}
function object(obj) {
	return new ObjectType(obj, void 0)
}
function record(valueType) {
	return new ObjectType({}, valueType ?? unknown())
}
function array(item) {
	return new ArrayOrTupleType([], item ?? unknown(), [])
}
function tuple(items) {
	return new ArrayOrTupleType(items, void 0, [])
}
function union(...options) {
	return new UnionType(options)
}
function lazy(definer) {
	return new LazyType(definer)
}

// ../../../node_modules/js-xxhash/dist/esm/xxHash32.js
var PRIME32_1 = 2654435761
var PRIME32_2 = 2246822519
var PRIME32_3 = 3266489917
var PRIME32_4 = 668265263
var PRIME32_5 = 374761393
var encoder
function xxHash32(input, seed = 0) {
	const buffer = typeof input === 'string' ? (encoder ??= new TextEncoder()).encode(input) : input
	const b = buffer
	let acc = (seed + PRIME32_5) & 4294967295
	let offset = 0
	if (b.length >= 16) {
		const accN = [
			(seed + PRIME32_1 + PRIME32_2) & 4294967295,
			(seed + PRIME32_2) & 4294967295,
			(seed + 0) & 4294967295,
			(seed - PRIME32_1) & 4294967295,
		]
		const b2 = buffer
		const limit2 = b2.length - 16
		let lane = 0
		for (offset = 0; (offset & 4294967280) <= limit2; offset += 4) {
			const i = offset
			const laneN0 = b2[i + 0] + (b2[i + 1] << 8)
			const laneN1 = b2[i + 2] + (b2[i + 3] << 8)
			const laneNP = laneN0 * PRIME32_2 + ((laneN1 * PRIME32_2) << 16)
			let acc2 = (accN[lane] + laneNP) & 4294967295
			acc2 = (acc2 << 13) | (acc2 >>> 19)
			const acc0 = acc2 & 65535
			const acc1 = acc2 >>> 16
			accN[lane] = (acc0 * PRIME32_1 + ((acc1 * PRIME32_1) << 16)) & 4294967295
			lane = (lane + 1) & 3
		}
		acc =
			(((accN[0] << 1) | (accN[0] >>> 31)) +
				((accN[1] << 7) | (accN[1] >>> 25)) +
				((accN[2] << 12) | (accN[2] >>> 20)) +
				((accN[3] << 18) | (accN[3] >>> 14))) &
			4294967295
	}
	acc = (acc + buffer.length) & 4294967295
	const limit = buffer.length - 4
	for (; offset <= limit; offset += 4) {
		const i = offset
		const laneN0 = b[i + 0] + (b[i + 1] << 8)
		const laneN1 = b[i + 2] + (b[i + 3] << 8)
		const laneP = laneN0 * PRIME32_3 + ((laneN1 * PRIME32_3) << 16)
		acc = (acc + laneP) & 4294967295
		acc = (acc << 17) | (acc >>> 15)
		acc = ((acc & 65535) * PRIME32_4 + (((acc >>> 16) * PRIME32_4) << 16)) & 4294967295
	}
	for (; offset < b.length; ++offset) {
		const lane = b[offset]
		acc = acc + lane * PRIME32_5
		acc = (acc << 11) | (acc >>> 21)
		acc = ((acc & 65535) * PRIME32_1 + (((acc >>> 16) * PRIME32_1) << 16)) & 4294967295
	}
	acc = acc ^ (acc >>> 15)
	acc = (((acc & 65535) * PRIME32_2) & 4294967295) + (((acc >>> 16) * PRIME32_2) << 16)
	acc = acc ^ (acc >>> 13)
	acc = (((acc & 65535) * PRIME32_3) & 4294967295) + (((acc >>> 16) * PRIME32_3) << 16)
	acc = acc ^ (acc >>> 16)
	return acc < 0 ? acc + 4294967296 : acc
}

// ../../../node_modules/@rocicorp/zero/out/chunk-3H6HM3CJ.js
var isProd = process.env.NODE_ENV === 'production'
function isJSONValue(v2, path2) {
	switch (typeof v2) {
		case 'boolean':
		case 'number':
		case 'string':
			return true
		case 'object':
			if (v2 === null) {
				return true
			}
			if (Array.isArray(v2)) {
				return isJSONArray(v2, path2)
			}
			return objectIsJSONObject(v2, path2)
	}
	return false
}
function isJSONObject(v2, path2) {
	if (typeof v2 !== 'object' || v2 === null) {
		return false
	}
	return objectIsJSONObject(v2, path2)
}
function objectIsJSONObject(v2, path2) {
	for (const k in v2) {
		if (hasOwn(v2, k)) {
			path2.push(k)
			const value = v2[k]
			if (value !== void 0 && !isJSONValue(value, path2)) {
				return false
			}
			path2.pop()
		}
	}
	return true
}
function isJSONArray(v2, path2) {
	for (let i = 0; i < v2.length; i++) {
		path2.push(i)
		if (!isJSONValue(v2[i], path2)) {
			return false
		}
		path2.pop()
	}
	return true
}
var promiseTrue = Promise.resolve(true)
var promiseFalse = Promise.resolve(false)
var promiseUndefined = Promise.resolve(void 0)
var promiseVoid = Promise.resolve()
var promiseNever = new Promise(() => {})
var deepFrozenObjects = /* @__PURE__ */ new WeakSet()
function deepFreeze(v2) {
	if (isProd) {
		return v2
	}
	deepFreezeInternal(v2, [])
	return v2
}
function deepFreezeInternal(v2, seen) {
	switch (typeof v2) {
		case 'undefined':
			throw new TypeError('Unexpected value undefined')
		case 'boolean':
		case 'number':
		case 'string':
			return
		case 'object': {
			if (v2 === null) {
				return
			}
			if (deepFrozenObjects.has(v2)) {
				return
			}
			deepFrozenObjects.add(v2)
			if (seen.includes(v2)) {
				throwInvalidType(v2, 'Cyclic JSON object')
			}
			seen.push(v2)
			Object.freeze(v2)
			if (Array.isArray(v2)) {
				deepFreezeArray(v2, seen)
			} else {
				deepFreezeObject(v2, seen)
			}
			seen.pop()
			return
		}
		default:
			throwInvalidType(v2, 'JSON value')
	}
}
function deepFreezeArray(v2, seen) {
	for (const item of v2) {
		deepFreezeInternal(item, seen)
	}
}
function deepFreezeObject(v2, seen) {
	for (const k in v2) {
		if (hasOwn(v2, k)) {
			const value = v2[k]
			if (value !== void 0) {
				deepFreezeInternal(value, seen)
			}
		}
	}
}
var deleteSentinel = Symbol()
var promiseVoid2 = Promise.resolve()
var promiseNever2 = new Promise(() => void 0)
function randomUint64() {
	const high = Math.floor(Math.random() * 4294967295)
	const low = Math.floor(Math.random() * 4294967295)
	return (BigInt(high) << 32n) | BigInt(low)
}
var valita_exports = {}
__export2(valita_exports, {
	assert: () => assert2,
	deepPartial: () => deepPartial,
	instanceOfAbstractType: () => instanceOfAbstractType,
	is: () => is,
	parse: () => parse,
	readonly: () => readonly,
	readonlyArray: () => readonlyArray,
	readonlyObject: () => readonlyObject,
	readonlyRecord: () => readonlyRecord,
	test: () => test,
	testOptional: () => testOptional,
})
__reExport(valita_exports, node_mjs_exports)
function toDisplay(value) {
	switch (typeof value) {
		case 'string':
		case 'number':
		case 'boolean':
			return JSON.stringify(value)
		case 'undefined':
			return 'undefined'
		case 'bigint':
			return value.toString() + 'n'
		default:
			if (value === null) {
				return 'null'
			}
			if (Array.isArray(value)) {
				return 'array'
			}
			return typeof value
	}
}
function toDisplayAtPath(v2, path2) {
	if (!path2?.length) {
		return toDisplay(v2)
	}
	let cur = v2
	for (const p of path2) {
		cur = cur[p]
	}
	return toDisplay(cur)
}
function displayList(word, expected, toDisplay2 = (x) => String(x)) {
	if (expected.length === 1) {
		return toDisplay2(expected[0])
	}
	const suffix = `${toDisplay2(
		expected[expected.length - 2]
	)} ${word} ${toDisplay2(expected[expected.length - 1])}`
	if (expected.length === 2) {
		return suffix
	}
	return `${expected.slice(0, -2).map(toDisplay2).join(', ')}, ${suffix}`
}
function getMessage(err2, v2, schema2, mode) {
	const firstIssue = err2.issues[0]
	const { path: path2 } = firstIssue
	const atPath = path2?.length ? ` at ${path2.join('.')}` : ''
	switch (firstIssue.code) {
		case 'invalid_type':
			return `Expected ${displayList(
				'or',
				firstIssue.expected
			)}${atPath}. Got ${toDisplayAtPath(v2, path2)}`
		case 'missing_value': {
			const atPath2 = path2 && path2.length > 1 ? ` at ${path2.slice(0, -1).join('.')}` : ''
			if (firstIssue.path?.length) {
				return `Missing property ${firstIssue.path.at(-1)}${atPath2}`
			}
			return `TODO Unknown missing property${atPath2}`
		}
		case 'invalid_literal':
			return `Expected literal value ${displayList(
				'or',
				firstIssue.expected,
				toDisplay
			)}${atPath} Got ${toDisplayAtPath(v2, path2)}`
		case 'invalid_length': {
			return `Expected array with length ${firstIssue.minLength === firstIssue.maxLength ? firstIssue.minLength : `between ${firstIssue.minLength} and ${firstIssue.maxLength}`}${atPath}. Got array with length ${v2.length}`
		}
		case 'unrecognized_keys':
			if (firstIssue.keys.length === 1) {
				return `Unexpected property ${firstIssue.keys[0]}${atPath}`
			}
			return `Unexpected properties ${displayList('and', firstIssue.keys)}${atPath}`
		case 'invalid_union':
			return schema2.name === 'union'
				? getDeepestUnionParseError(v2, schema2, mode ?? 'strict')
				: `Invalid union value${atPath}`
		case 'custom_error': {
			const { error } = firstIssue
			const message = !error
				? 'unknown'
				: typeof error === 'string'
					? error
					: (error.message ?? 'unknown')
			return `${message}${atPath}. Got ${toDisplayAtPath(v2, path2)}`
		}
	}
}
function getDeepestUnionParseError(value, schema2, mode) {
	const failures = []
	for (const type of schema2.options) {
		const r = type.try(value, { mode })
		if (!r.ok) {
			failures.push({ type, err: r })
		}
	}
	if (failures.length) {
		failures.sort(pathCmp)
		if (failures.length === 1 || pathCmp(failures[0], failures[1]) < 0) {
			return getMessage(failures[0].err, value, failures[0].type, mode)
		}
	}
	try {
		const str = JSON.stringify(value)
		return `Invalid union value: ${str}`
	} catch (e) {
		return `Invalid union value`
	}
}
function pathCmp(a, b) {
	const aPath = a.err.issues[0].path
	const bPath = b.err.issues[0].path
	if (aPath.length !== bPath.length) {
		return bPath.length - aPath.length
	}
	for (let i = 0; i < aPath.length; i++) {
		if (bPath[i] > aPath[i]) {
			return -1
		}
		if (bPath[i] < aPath[i]) {
			return 1
		}
	}
	return 0
}
function parse(value, schema2, mode) {
	const res = test(value, schema2, mode)
	if (!res.ok) {
		throw new TypeError(res.error)
	}
	return res.value
}
function is(value, schema2, mode) {
	return test(value, schema2, mode).ok
}
function assert2(value, schema2, mode) {
	parse(value, schema2, mode)
}
function test(value, schema2, mode) {
	const res = schema2.try(value, mode ? { mode } : void 0)
	if (!res.ok) {
		return {
			ok: false,
			error: getMessage(res, value, schema2, mode),
		}
	}
	return res
}
function testOptional(value, schema2, mode) {
	let flags = 1
	if (mode === 'passthrough') {
		flags = 0
	} else if (mode === 'strip') {
		flags = 2
	}
	const res = schema2.func(value, flags)
	if (res === void 0) {
		return { ok: true, value }
	} else if (res.ok) {
		return res
	}
	const err2 = new ValitaError(res)
	return { ok: false, error: getMessage(err2, value, schema2, mode) }
}
function readonly(t2) {
	return t2
}
function readonlyObject(t2) {
	return object(t2)
}
function readonlyArray(t2) {
	return array(t2)
}
function readonlyRecord(t2) {
	return record(t2)
}
var AbstractType2 = Object.getPrototypeOf(Object.getPrototypeOf(string().optional())).constructor
function instanceOfAbstractType(obj) {
	return obj instanceof AbstractType2
}
function deepPartial(s) {
	const shape = {}
	for (const [key, type] of Object.entries(s.shape)) {
		if (type.name === 'object') {
			shape[key] = deepPartial(type).optional()
		} else {
			shape[key] = type.optional()
		}
	}
	return object(shape)
}
var STRING_LENGTH = 22
var hashRe = /^[0-9a-v-]+$/
var emptyUUID = '0'.repeat(STRING_LENGTH)
var emptyHash = emptyUUID
var newRandomHash = makeNewRandomHashFunctionInternal()
function toStringAndSlice(n, len) {
	return n.toString(32).slice(-len).padStart(len, '0')
}
function makeNewRandomHashFunctionInternal() {
	let base = ''
	let i = 0
	return () => {
		if (!base) {
			base = toStringAndSlice(randomUint64(), 12)
		}
		const tail = toStringAndSlice(i++, 10)
		return base + tail
	}
}
function isHash(value) {
	return typeof value === 'string' && hashRe.test(value)
}
var hashSchema = valita_exports.string().assert(isHash, 'Invalid hash')
var deletedClientsSchema = readonlyObject({
	clientIDs: readonlyArray(valita_exports.string()),
	clientGroupIDs: readonlyArray(valita_exports.string()),
})
var legacyDeletedClientsSchema = readonlyArray(valita_exports.string())
var V7 = 7
var Latest = V7
var resolvedPromise = Promise.resolve()
var promiseThatNeverResolves = new Promise(() => void 0)
function* mergeIterables(iterables, comparator2, distinct = false) {
	const iterators = iterables.map((i) => i[Symbol.iterator]())
	try {
		const current = iterators.map((i) => i.next())
		let lastYielded
		while (current.some((c) => !c.done)) {
			const min = current.reduce(
				(acc, c, i) => {
					if (c.done) {
						return acc
					}
					if (acc === void 0 || comparator2(c.value, acc[0]) < 0) {
						return [c.value, i]
					}
					return acc
				},
				void 0
			)
			assert(min !== void 0, 'min is undefined')
			current[min[1]] = iterators[min[1]].next()
			if (lastYielded !== void 0 && distinct && comparator2(lastYielded, min[0]) === 0) {
				continue
			}
			lastYielded = min[0]
			yield min[0]
		}
	} finally {
		for (const it of iterators) {
			it.return?.()
		}
	}
}
var SIZE_TAG = 1
var SIZE_INT32 = 4
var entryFixed = 2 * SIZE_TAG + SIZE_INT32 + SIZE_TAG + SIZE_INT32
function binarySearch2(high, compare) {
	let low = 0
	while (low < high) {
		const mid = low + ((high - low) >> 1)
		const i = compare(mid)
		if (i === 0) {
			return mid
		}
		if (i > 0) {
			low = mid + 1
		} else {
			high = mid
		}
	}
	return low
}
function makeNodeChunkData(level, entries, formatVersion) {
	return deepFreeze([level, formatVersion >= V7 ? entries : entries.map((e) => e.slice(0, 2))])
}
function binarySearch22(key, entries) {
	return binarySearch2(entries.length, (i) => compareUTF8(key, entries[i][0]))
}
function binarySearchFound(i, entries, key) {
	return i !== entries.length && entries[i][0] === key
}
var NodeImpl = class {
	entries
	hash
	isMutable
	#childNodeSize = -1
	constructor(entries, hash2, isMutable) {
		this.entries = entries
		this.hash = hash2
		this.isMutable = isMutable
	}
	maxKey() {
		return this.entries[this.entries.length - 1][0]
	}
	getChildNodeSize(tree) {
		if (this.#childNodeSize !== -1) {
			return this.#childNodeSize
		}
		let sum = tree.chunkHeaderSize
		for (const entry of this.entries) {
			sum += entry[2]
		}
		return (this.#childNodeSize = sum)
	}
	_updateNode(tree) {
		this.#childNodeSize = -1
		tree.updateNode(this)
	}
}
var DataNodeImpl = class extends NodeImpl {
	level = 0
	set(key, value, entrySize, tree) {
		let deleteCount
		const i = binarySearch22(key, this.entries)
		if (!binarySearchFound(i, this.entries, key)) {
			deleteCount = 0
		} else {
			deleteCount = 1
		}
		return Promise.resolve(this.#splice(tree, i, deleteCount, [key, value, entrySize]))
	}
	#splice(tree, start, deleteCount, ...items) {
		if (this.isMutable) {
			this.entries.splice(start, deleteCount, ...items)
			this._updateNode(tree)
			return this
		}
		const entries = readonlySplice(this.entries, start, deleteCount, ...items)
		return tree.newDataNodeImpl(entries)
	}
	del(key, tree) {
		const i = binarySearch22(key, this.entries)
		if (!binarySearchFound(i, this.entries, key)) {
			return Promise.resolve(this)
		}
		return Promise.resolve(this.#splice(tree, i, 1))
	}
	async *keys(_tree) {
		for (const entry of this.entries) {
			yield entry[0]
		}
	}
	async *entriesIter(_tree) {
		for (const entry of this.entries) {
			yield entry
		}
	}
}
function readonlySplice(array8, start, deleteCount, ...items) {
	const arr2 = array8.slice(0, start)
	for (let i = 0; i < items.length; i++) {
		arr2.push(items[i])
	}
	for (let i = start + deleteCount; i < array8.length; i++) {
		arr2.push(array8[i])
	}
	return arr2
}
var emptyDataNode = makeNodeChunkData(0, [], Latest)
var emptyDataNodeImpl = new DataNodeImpl([], emptyHash, false)
var indexDefinitionSchema = readonlyObject({
	prefix: valita_exports.string().optional(),
	jsonPointer: valita_exports.string(),
	allowEmpty: valita_exports.boolean().optional(),
})
var indexDefinitionsSchema = readonlyRecord(indexDefinitionSchema)
var clientGroupSchema = readonlyObject({
	/**
	 * The hash of the commit in the perdag last persisted to this client group.
	 * Should only be updated by clients assigned to this client group.
	 */
	headHash: hashSchema,
	/**
	 * Set of mutator names common to all clients assigned to this client group.
	 */
	mutatorNames: readonlyArray(valita_exports.string()),
	/**
	 * Index definitions common to all clients assigned to this client group.
	 */
	indexes: indexDefinitionsSchema,
	/**
	 * The highest mutation ID of every client assigned to this client group.
	 * Should only be updated by clients assigned to this client group. Read by
	 * other clients to determine if there are unacknowledged pending mutations
	 * for them to try to recover. This is redundant with information in the
	 * commit graph at `headHash`, but allows other clients to determine if there
	 * are unacknowledged pending mutations without having to load the commit
	 * graph.
	 */
	mutationIDs: readonlyRecord(valita_exports.number()),
	/**
	 * The highest lastMutationID received from the server for every client
	 * assigned to this client group.
	 *
	 * Should be updated by the clients assigned to this client group whenever
	 * they persist to this client group. Read by other clients to determine if
	 * there are unacknowledged pending mutations for them to recover and
	 * *updated* by other clients upon successfully recovering pending mutations
	 * to avoid redundant pushes of pending mutations.
	 *
	 * Note: This will be the same as the `lastMutationIDs` of the base snapshot
	 * of the client group's commit graph when written by clients assigned to this
	 * client group.  However, when written by another client recovering mutations
	 * it may be different because the other client does not update the commit
	 * graph.
	 */
	lastServerAckdMutationIDs: valita_exports.record(valita_exports.number()),
	/**
	 * If the server deletes this client group it can signal that the client group
	 * was deleted. If that happens we mark this client group as disabled so that
	 * we do not use it again when creating new clients.
	 */
	disabled: valita_exports.boolean(),
})
var path = []
var jsonSchema = valita_exports.unknown().chain((v2) => {
	if (isProd) {
		return ok(v2)
	}
	const rv = isJSONValue(v2, path)
		? ok(v2)
		: err({
				message: `Not a JSON value`,
				path: path.slice(),
			})
	path.length = 0
	return rv
})
var jsonObjectSchema = valita_exports.unknown().chain((v2) => {
	if (isProd) {
		return ok(v2)
	}
	const rv = isJSONObject(v2, path)
		? ok(v2)
		: err({
				message: `Not a JSON object`,
				path: path.slice(),
			})
	path.length = 0
	return rv
})
var clientGroupIDSchema = valita_exports.string()
var clientIDSchema = valita_exports.string()
var mutationV1Schema = readonlyObject({
	id: valita_exports.number(),
	name: valita_exports.string(),
	args: jsonSchema,
	timestamp: valita_exports.number(),
	clientID: clientIDSchema,
})
var pushRequestV1Schema = valita_exports.object({
	pushVersion: valita_exports.literal(1),
	schemaVersion: valita_exports.string(),
	profileID: valita_exports.string(),
	clientGroupID: clientGroupIDSchema,
	mutations: valita_exports.array(mutationV1Schema),
})
var MUTATION_RECOVERY_LAZY_STORE_SOURCE_CHUNK_CACHE_SIZE_LIMIT = 10 * 2 ** 20
var clientV5Schema = readonlyObject({
	heartbeatTimestampMs: valita_exports.number(),
	headHash: hashSchema,
	/**
	 * The hash of a commit we are in the middle of refreshing into this client's
	 * memdag.
	 */
	tempRefreshHash: hashSchema.nullable(),
	/**
	 * ID of this client's perdag client group. This needs to be sent in pull
	 * request (to enable syncing all last mutation ids in the client group).
	 */
	clientGroupID: clientGroupIDSchema,
})
var clientV6Schema = readonlyObject({
	heartbeatTimestampMs: valita_exports.number(),
	/**
	 * A set of hashes, which contains:
	 * 1. The hash of the last commit this client refreshed from its client group
	 *    (this is the commit it bootstrapped from until it completes its first
	 *    refresh).
	 * 2. One or more hashes that were added to retain chunks of a commit while it
	 *    was being refreshed into this client's memdag. (This can be one or more
	 *    because refresh's cleanup step is a separate transaction and can fail).
	 * Upon refresh completing and successfully running its clean up step, this
	 * set will contain a single hash: the hash of the last commit this client
	 * refreshed.
	 */
	refreshHashes: readonlyArray(hashSchema),
	/**
	 * The hash of the last snapshot commit persisted by this client to this
	 * client's client group, or null if has never persisted a snapshot.
	 */
	persistHash: hashSchema.nullable(),
	/**
	 * ID of this client's perdag client group. This needs to be sent in pull
	 * request (to enable syncing all last mutation ids in the client group).
	 */
	clientGroupID: clientGroupIDSchema,
})
var clientSchema = valita_exports.union(clientV5Schema, clientV6Schema)
var CLIENT_MAX_INACTIVE_TIME = 24 * 60 * 60 * 1e3
var GC_INTERVAL = 5 * 60 * 1e3
var GC_INTERVAL_MS = 5 * 60 * 1e3
var HEARTBEAT_INTERVAL = 60 * 1e3
var IDB_DATABASES_VERSION = 0
var IDB_DATABASES_DB_NAME = 'replicache-dbs-v' + IDB_DATABASES_VERSION
var GATHER_SIZE_LIMIT = 5 * 2 ** 20
var unitializedLastValue = Symbol()
var LAZY_STORE_SOURCE_CHUNK_CACHE_SIZE_LIMIT = 100 * 2 ** 20
var RECOVER_MUTATIONS_INTERVAL_MS = 5 * 60 * 1e3
var COLLECT_IDB_INTERVAL = 12 * 60 * 60 * 1e3
var INITIAL_COLLECT_IDB_DELAY = 5 * 60 * 1e3
function relationships(table2, cb) {
	const relationships2 = cb({ many, one })
	return {
		name: table2.schema.name,
		relationships: relationships2,
	}
}
function many(...args) {
	return args.map((arg) => ({
		sourceField: arg.sourceField,
		destField: arg.destField,
		destSchema: arg.destSchema.schema.name,
		cardinality: 'many',
	}))
}
function one(...args) {
	return args.map((arg) => ({
		sourceField: arg.sourceField,
		destField: arg.destField,
		destSchema: arg.destSchema.schema.name,
		cardinality: 'one',
	}))
}
function table(name) {
	return new TableBuilder({
		name,
		columns: {},
		primaryKey: [],
	})
}
function string8() {
	return new ColumnBuilder({
		type: 'string',
		optional: false,
		customType: null,
	})
}
function number4() {
	return new ColumnBuilder({
		type: 'number',
		optional: false,
		customType: null,
	})
}
function boolean3() {
	return new ColumnBuilder({
		type: 'boolean',
		optional: false,
		customType: null,
	})
}
var TableBuilder = class _TableBuilder {
	#schema
	constructor(schema2) {
		this.#schema = schema2
	}
	from(serverName) {
		return new _TableBuilder({
			...this.#schema,
			serverName,
		})
	}
	columns(columns) {
		const columnSchemas = Object.fromEntries(
			Object.entries(columns).map(([k, v2]) => [k, v2.schema])
		)
		return new TableBuilderWithColumns({
			...this.#schema,
			columns: columnSchemas,
		})
	}
}
var TableBuilderWithColumns = class _TableBuilderWithColumns {
	#schema
	constructor(schema2) {
		this.#schema = schema2
	}
	primaryKey(...pkColumnNames) {
		return new _TableBuilderWithColumns({
			...this.#schema,
			primaryKey: pkColumnNames,
		})
	}
	get schema() {
		return this.#schema
	}
	build() {
		if (this.#schema.primaryKey.length === 0) {
			throw new Error(`Table "${this.#schema.name}" is missing a primary key`)
		}
		const names = /* @__PURE__ */ new Set()
		for (const [col, { serverName }] of Object.entries(this.#schema.columns)) {
			const name = serverName ?? col
			if (names.has(name)) {
				throw new Error(`Table "${this.#schema.name}" has multiple columns referencing "${name}"`)
			}
			names.add(name)
		}
		return this.#schema
	}
}
var ColumnBuilder = class _ColumnBuilder {
	#schema
	constructor(schema2) {
		this.#schema = schema2
	}
	from(serverName) {
		return new _ColumnBuilder({
			...this.#schema,
			serverName,
		})
	}
	optional() {
		return new _ColumnBuilder({
			...this.#schema,
			optional: true,
		})
	}
	get schema() {
		return this.#schema
	}
}
function createSchema(version3, options) {
	const retTables = {}
	const retRelationships = {}
	const serverNames = /* @__PURE__ */ new Set()
	options.tables.forEach((table2) => {
		const { serverName = table2.schema.name } = table2.schema
		if (serverNames.has(serverName)) {
			throw new Error(`Multiple tables reference the name "${serverName}"`)
		}
		serverNames.add(serverName)
		if (retTables[table2.schema.name]) {
			throw new Error(`Table "${table2.schema.name}" is defined more than once in the schema`)
		}
		retTables[table2.schema.name] = table2.build()
	})
	options.relationships?.forEach((relationships2) => {
		if (retRelationships[relationships2.name]) {
			throw new Error(
				`Relationships for table "${relationships2.name}" are defined more than once in the schema`
			)
		}
		retRelationships[relationships2.name] = relationships2.relationships
		checkRelationship(relationships2.relationships, relationships2.name, retTables)
	})
	return {
		version: version3,
		tables: retTables,
		relationships: retRelationships,
	}
}
function checkRelationship(relationships2, tableName, tables) {
	Object.entries(relationships2).forEach(([name, rel]) => {
		let source = tables[tableName]
		rel.forEach((connection) => {
			if (!tables[connection.destSchema]) {
				throw new Error(
					`For relationship "${tableName}"."${name}", destination table "${connection.destSchema}" is missing in the schema`
				)
			}
			if (!source.columns[connection.sourceField[0]]) {
				throw new Error(
					`For relationship "${tableName}"."${name}", the source field "${connection.sourceField[0]}" is missing in the table schema "${source.name}"`
				)
			}
			source = tables[connection.destSchema]
		})
	})
}
function defined(arr2) {
	let i = arr2.findIndex((x) => x === void 0)
	if (i < 0) {
		return arr2
	}
	const defined2 = arr2.slice(0, i)
	for (i++; i < arr2.length; i++) {
		const x = arr2[i]
		if (x !== void 0) {
			defined2.push(x)
		}
	}
	return defined2
}
function areEqual(arr1, arr2) {
	return arr1.length === arr2.length && arr1.every((e, i) => e === arr2[i])
}
var valueSchema = valita_exports.union(jsonSchema, valita_exports.undefined())
var rowSchema = readonlyRecord(valueSchema)
var selectorSchema = valita_exports.string()
var toStaticParam = Symbol()
var orderingElementSchema = readonly(
	valita_exports.tuple([
		selectorSchema,
		valita_exports.union(valita_exports.literal('asc'), valita_exports.literal('desc')),
	])
)
var orderingSchema = readonlyArray(orderingElementSchema)
var primitiveSchema = valita_exports.union(
	valita_exports.string(),
	valita_exports.number(),
	valita_exports.boolean(),
	valita_exports.null()
)
var equalityOpsSchema = valita_exports.union(
	valita_exports.literal('='),
	valita_exports.literal('!='),
	valita_exports.literal('IS'),
	valita_exports.literal('IS NOT')
)
var orderOpsSchema = valita_exports.union(
	valita_exports.literal('<'),
	valita_exports.literal('>'),
	valita_exports.literal('<='),
	valita_exports.literal('>=')
)
var likeOpsSchema = valita_exports.union(
	valita_exports.literal('LIKE'),
	valita_exports.literal('NOT LIKE'),
	valita_exports.literal('ILIKE'),
	valita_exports.literal('NOT ILIKE')
)
var inOpsSchema = valita_exports.union(
	valita_exports.literal('IN'),
	valita_exports.literal('NOT IN')
)
var simpleOperatorSchema = valita_exports.union(
	equalityOpsSchema,
	orderOpsSchema,
	likeOpsSchema,
	inOpsSchema
)
var literalReferenceSchema = readonlyObject({
	type: valita_exports.literal('literal'),
	value: valita_exports.union(
		valita_exports.string(),
		valita_exports.number(),
		valita_exports.boolean(),
		valita_exports.null(),
		readonlyArray(
			valita_exports.union(
				valita_exports.string(),
				valita_exports.number(),
				valita_exports.boolean()
			)
		)
	),
})
var columnReferenceSchema = readonlyObject({
	type: valita_exports.literal('column'),
	name: valita_exports.string(),
})
var parameterReferenceSchema = readonlyObject({
	type: valita_exports.literal('static'),
	// The "namespace" of the injected parameter.
	// Write authorization will send the value of a row
	// prior to the mutation being run (preMutationRow).
	// Read and write authorization will both send the
	// current authentication data (authData).
	anchor: valita_exports.union(
		valita_exports.literal('authData'),
		valita_exports.literal('preMutationRow')
	),
	field: valita_exports.union(
		valita_exports.string(),
		valita_exports.array(valita_exports.string())
	),
})
var conditionValueSchema = valita_exports.union(
	literalReferenceSchema,
	columnReferenceSchema,
	parameterReferenceSchema
)
var simpleConditionSchema = readonlyObject({
	type: valita_exports.literal('simple'),
	op: simpleOperatorSchema,
	left: conditionValueSchema,
	right: valita_exports.union(parameterReferenceSchema, literalReferenceSchema),
})
var correlatedSubqueryConditionOperatorSchema = valita_exports.union(
	valita_exports.literal('EXISTS'),
	valita_exports.literal('NOT EXISTS')
)
var correlatedSubqueryConditionSchema = readonlyObject({
	type: valita_exports.literal('correlatedSubquery'),
	related: valita_exports.lazy(() => correlatedSubquerySchema),
	op: correlatedSubqueryConditionOperatorSchema,
})
var conditionSchema = valita_exports.union(
	simpleConditionSchema,
	valita_exports.lazy(() => conjunctionSchema),
	valita_exports.lazy(() => disjunctionSchema),
	correlatedSubqueryConditionSchema
)
var conjunctionSchema = readonlyObject({
	type: valita_exports.literal('and'),
	conditions: readonlyArray(conditionSchema),
})
var disjunctionSchema = readonlyObject({
	type: valita_exports.literal('or'),
	conditions: readonlyArray(conditionSchema),
})
function mustCompoundKey(field) {
	assert(Array.isArray(field) && field.length >= 1)
	return field
}
var compoundKeySchema = readonly(
	valita_exports
		.tuple([valita_exports.string()])
		.concat(valita_exports.array(valita_exports.string()))
)
var correlationSchema = readonlyObject({
	parentField: compoundKeySchema,
	childField: compoundKeySchema,
})
var correlatedSubquerySchemaOmitSubquery = readonlyObject({
	correlation: correlationSchema,
	hidden: valita_exports.boolean().optional(),
	system: valita_exports
		.union(valita_exports.literal('permissions'), valita_exports.literal('client'))
		.optional(),
})
var correlatedSubquerySchema = correlatedSubquerySchemaOmitSubquery.extend({
	subquery: valita_exports.lazy(() => astSchema),
})
var astSchema = readonlyObject({
	schema: valita_exports.string().optional(),
	table: valita_exports.string(),
	alias: valita_exports.string().optional(),
	where: conditionSchema.optional(),
	related: readonlyArray(correlatedSubquerySchema).optional(),
	limit: valita_exports.number().optional(),
	orderBy: orderingSchema.optional(),
	start: valita_exports
		.object({
			row: rowSchema,
			exclusive: valita_exports.boolean(),
		})
		.optional(),
})
function transformAST(ast, transform) {
	const { tableName, columnName } = transform
	const colName = (c) => columnName(ast.table, c)
	const key = (table2, k) => {
		const serverKey = k.map((col) => columnName(table2, col))
		return mustCompoundKey(serverKey)
	}
	const where = ast.where ? transform.where(ast.where) : void 0
	const transformed = {
		schema: ast.schema,
		table: tableName(ast.table),
		alias: ast.alias,
		where: where ? transformWhere(where, ast.table, transform) : void 0,
		related: ast.related
			? transform.related(
					ast.related.map((r) => ({
						correlation: {
							parentField: key(ast.table, r.correlation.parentField),
							childField: key(r.subquery.table, r.correlation.childField),
						},
						hidden: r.hidden,
						subquery: transformAST(r.subquery, transform),
						system: r.system,
					}))
				)
			: void 0,
		start: ast.start
			? {
					...ast.start,
					row: Object.fromEntries(
						Object.entries(ast.start.row).map(([col, val]) => [colName(col), val])
					),
				}
			: void 0,
		limit: ast.limit,
		orderBy: ast.orderBy?.map(([col, dir]) => [colName(col), dir]),
	}
	return transformed
}
function transformWhere(where, table2, transform) {
	const { columnName } = transform
	const condValue = (c) => (c.type !== 'column' ? c : { ...c, name: columnName(table2, c.name) })
	const key = (table3, k) => {
		const serverKey = k.map((col) => columnName(table3, col))
		return mustCompoundKey(serverKey)
	}
	if (where.type === 'simple') {
		return { ...where, left: condValue(where.left) }
	} else if (where.type === 'correlatedSubquery') {
		const { correlation, subquery } = where.related
		return {
			...where,
			related: {
				...where.related,
				correlation: {
					parentField: key(table2, correlation.parentField),
					childField: key(subquery.table, correlation.childField),
				},
				subquery: transformAST(subquery, transform),
			},
		}
	}
	return {
		type: where.type,
		conditions: transform.conditions(
			where.conditions.map((c) => transformWhere(c, table2, transform))
		),
	}
}
var normalizeCache = /* @__PURE__ */ new WeakMap()
var NORMALIZE_TRANSFORM = {
	tableName: (t2) => t2,
	columnName: (_, c) => c,
	related: sortedRelated,
	where: flattened,
	conditions: (c) => c.sort(cmpCondition),
}
function normalizeAST(ast) {
	let normalized = normalizeCache.get(ast)
	if (!normalized) {
		normalized = transformAST(ast, NORMALIZE_TRANSFORM)
		normalizeCache.set(ast, normalized)
	}
	return normalized
}
function mapCondition(cond, table2, mapper) {
	return transformWhere(cond, table2, {
		tableName: (table3) => mapper.tableName(table3),
		columnName: (table3, col) => mapper.columnName(table3, col),
		related: (r) => r,
		where: (w) => w,
		conditions: (c) => c,
	})
}
function sortedRelated(related) {
	return related.sort(cmpRelated)
}
function cmpCondition(a, b) {
	if (a.type === 'simple') {
		if (b.type !== 'simple') {
			return -1
		}
		return (
			compareValuePosition(a.left, b.left) ||
			compareUTF8MaybeNull(a.op, b.op) ||
			compareValuePosition(a.right, b.right)
		)
	}
	if (b.type === 'simple') {
		return 1
	}
	if (a.type === 'correlatedSubquery') {
		if (b.type !== 'correlatedSubquery') {
			return -1
		}
		return cmpRelated(a.related, b.related) || compareUTF8MaybeNull(a.op, b.op)
	}
	if (b.type === 'correlatedSubquery') {
		return -1
	}
	const val = compareUTF8MaybeNull(a.type, b.type)
	if (val !== 0) {
		return val
	}
	for (let l = 0, r = 0; l < a.conditions.length && r < b.conditions.length; l++, r++) {
		const val2 = cmpCondition(a.conditions[l], b.conditions[r])
		if (val2 !== 0) {
			return val2
		}
	}
	return a.conditions.length - b.conditions.length
}
function compareValuePosition(a, b) {
	if (a.type !== b.type) {
		return compareUTF8(a.type, b.type)
	}
	switch (a.type) {
		case 'literal':
			assert(b.type === 'literal')
			return compareUTF8(String(a.value), String(b.value))
		case 'column':
			assert(b.type === 'column')
			return compareUTF8(a.name, b.name)
		case 'static':
			throw new Error('Static parameters should be resolved before normalization')
	}
}
function cmpRelated(a, b) {
	return compareUTF8(must(a.subquery.alias), must(b.subquery.alias))
}
function flattened(cond) {
	if (cond.type === 'simple' || cond.type === 'correlatedSubquery') {
		return cond
	}
	const conditions = defined(
		cond.conditions.flatMap((c) =>
			c.type === cond.type ? c.conditions.map((c2) => flattened(c2)) : flattened(c)
		)
	)
	switch (conditions.length) {
		case 0:
			return void 0
		case 1:
			return conditions[0]
		default:
			return {
				type: cond.type,
				conditions,
			}
	}
}
function compareUTF8MaybeNull(a, b) {
	if (a !== null && b !== null) {
		return compareUTF8(a, b)
	}
	if (b !== null) {
		return -1
	}
	if (a !== null) {
		return 1
	}
	return 0
}
var h64 = (s) => hash(s, 2)
function hash(str, words) {
	let hash2 = 0n
	for (let i = 0; i < words; i++) {
		hash2 = (hash2 << 32n) + BigInt(xxHash32(str, i))
	}
	return hash2
}
var hashCache = /* @__PURE__ */ new WeakMap()
function hashOfAST(ast) {
	const normalized = normalizeAST(ast)
	const cached = hashCache.get(normalized)
	if (cached) {
		return cached
	}
	const hash2 = h64(JSON.stringify(normalized)).toString(36)
	hashCache.set(normalized, hash2)
	return hash2
}
function isOneHop(r) {
	return r.length === 1
}
function isTwoHop(r) {
	return r.length === 2
}
var throwOutput = {
	push(_change) {
		throw new Error('Output not set')
	},
}
function* take(stream, limit) {
	if (limit < 1) {
		return
	}
	let count = 0
	for (const v2 of stream) {
		yield v2
		if (++count === limit) {
			break
		}
	}
}
function first(stream) {
	const it = stream[Symbol.iterator]()
	const { value } = it.next()
	it.return?.()
	return value
}
var Exists = class {
	#input
	#relationshipName
	#storage
	#not
	#parentJoinKey
	#skipCache
	#output = throwOutput
	constructor(input, storage, relationshipName, parentJoinKey, type) {
		this.#input = input
		this.#relationshipName = relationshipName
		this.#input.setOutput(this)
		this.#storage = storage
		assert(this.#input.getSchema().relationships[relationshipName])
		this.#not = type === 'NOT EXISTS'
		this.#parentJoinKey = parentJoinKey
		this.#skipCache = areEqual(parentJoinKey, this.#input.getSchema().primaryKey)
	}
	setOutput(output) {
		this.#output = output
	}
	destroy() {
		this.#input.destroy()
	}
	getSchema() {
		return this.#input.getSchema()
	}
	*fetch(req) {
		for (const node of this.#input.fetch(req)) {
			if (this.#filter(node)) {
				yield node
			}
		}
	}
	*cleanup(req) {
		for (const node of this.#input.cleanup(req)) {
			if (this.#filter(node)) {
				yield node
			} else {
				drainStreams(node)
			}
			this.#delSize(node)
		}
	}
	push(change) {
		switch (change.type) {
			// add, remove and edit cannot change the size of the
			// this.#relationshipName relationship, so simply #pushWithFilter
			case 'add':
			case 'edit': {
				this.#pushWithFilter(change)
				return
			}
			case 'remove': {
				const size = this.#getSize(change.node)
				if (size === void 0) {
					return
				}
				this.#pushWithFilter(change, size)
				this.#delSize(change.node)
				return
			}
			case 'child':
				if (
					change.child.relationshipName !== this.#relationshipName ||
					change.child.change.type === 'edit' ||
					change.child.change.type === 'child'
				) {
					this.#pushWithFilter(change)
					return
				}
				switch (change.child.change.type) {
					case 'add': {
						let size = this.#getSize(change.node)
						if (size !== void 0) {
							size++
							this.#setCachedSize(change.node, size)
							this.#setSize(change.node, size)
						} else {
							size = this.#fetchSize(change.node)
						}
						if (size === 1) {
							const type = this.#not ? 'remove' : 'add'
							if (type === 'remove') {
								this.#output.push(change)
							}
							this.#output.push({
								type,
								node: change.node,
							})
						} else {
							this.#pushWithFilter(change, size)
						}
						return
					}
					case 'remove': {
						let size = this.#getSize(change.node)
						if (size !== void 0) {
							if (size === 0) {
								return
							}
							size--
							this.#setCachedSize(change.node, size)
							this.#setSize(change.node, size)
						} else {
							size = this.#fetchSize(change.node)
						}
						if (size === 0) {
							const type = this.#not ? 'add' : 'remove'
							if (type === 'remove') {
								this.#output.push(change)
							}
							this.#output.push({
								type,
								node: change.node,
							})
						} else {
							this.#pushWithFilter(change, size)
						}
						return
					}
				}
				return
			default:
				unreachable(change)
		}
	}
	/**
	 * Returns whether or not the node's this.#relationshipName
	 * relationship passes the exist/not exists filter condition.
	 * If the optional `size` is passed it is used.
	 * Otherwise, if there is a stored size for the row it is used.
	 * Otherwise the size is computed by streaming the node's
	 * relationship with this.#relationshipName (this computed size is also
	 * stored).
	 */
	#filter(node, size) {
		const exists = (size ?? this.#getOrFetchSize(node)) > 0
		return this.#not ? !exists : exists
	}
	/**
	 * Pushes a change if this.#filter is true for its row.
	 */
	#pushWithFilter(change, size) {
		if (this.#filter(change.node, size)) {
			this.#output.push(change)
		}
	}
	#getSize(node) {
		return this.#storage.get(this.#makeSizeStorageKey(node))
	}
	#setSize(node, size) {
		this.#storage.set(this.#makeSizeStorageKey(node), size)
	}
	#setCachedSize(node, size) {
		if (this.#skipCache) {
			return
		}
		this.#storage.set(this.#makeCacheStorageKey(node), size)
	}
	#getCachedSize(node) {
		if (this.#skipCache) {
			return void 0
		}
		return this.#storage.get(this.#makeCacheStorageKey(node))
	}
	#delSize(node) {
		this.#storage.del(this.#makeSizeStorageKey(node))
		if (!this.#skipCache) {
			const cacheKey = this.#makeCacheStorageKey(node)
			if (first(this.#storage.scan({ prefix: `${cacheKey}/` })) === void 0) {
				this.#storage.del(cacheKey)
			}
		}
	}
	#getOrFetchSize(node) {
		const size = this.#getSize(node)
		if (size !== void 0) {
			return size
		}
		return this.#fetchSize(node)
	}
	#fetchSize(node) {
		const cachedSize = this.#getCachedSize(node)
		if (cachedSize !== void 0) {
			this.#setSize(node, cachedSize)
			return cachedSize
		}
		const relationship = node.relationships[this.#relationshipName]
		assert(relationship)
		let size = 0
		for (const _relatedNode of relationship()) {
			size++
		}
		this.#setCachedSize(node, size)
		this.#setSize(node, size)
		return size
	}
	#makeCacheStorageKey(node) {
		return `row/${JSON.stringify(this.#getKeyValues(node, this.#parentJoinKey))}`
	}
	#makeSizeStorageKey(node) {
		return `row/${this.#skipCache ? '' : JSON.stringify(this.#getKeyValues(node, this.#parentJoinKey))}/${JSON.stringify(
			this.#getKeyValues(node, this.#input.getSchema().primaryKey)
		)}`
	}
	#getKeyValues(node, def) {
		const values = []
		for (const key of def) {
			values.push(normalizeUndefined(node.row[key]))
		}
		return values
	}
}
var FanIn = class {
	#inputs
	#fanOut
	#schema
	#output = throwOutput
	constructor(fanOut, inputs) {
		this.#inputs = inputs
		this.#schema = fanOut.getSchema()
		this.#fanOut = fanOut
		for (const input of inputs) {
			input.setOutput(this)
			assert(this.#schema === input.getSchema(), `Schema mismatch in fan-in`)
		}
	}
	setOutput(output) {
		this.#output = output
	}
	destroy() {
		for (const input of this.#inputs) {
			input.destroy()
		}
	}
	getSchema() {
		return this.#schema
	}
	fetch(req) {
		return this.#fetchOrCleanup((input) => input.fetch(req))
	}
	cleanup(req) {
		return this.#fetchOrCleanup((input) => input.cleanup(req))
	}
	*#fetchOrCleanup(streamProvider) {
		const iterables = this.#inputs.map((input) => streamProvider(input))
		yield* mergeIterables(iterables, (l, r) => must(this.#schema).compareRows(l.row, r.row), true)
	}
	push(change) {
		this.#fanOut.onFanInReceivedPush()
		this.#output.push(change)
	}
}
var FanOut = class {
	#input
	#outputs = []
	// FanOut is paired with a FanIn.
	// Once FanIn has received a push from FanOut along
	// any branch, FanOut no longer needs to push that value
	// across the rest of its outputs..
	#fanInReceivedPush = false
	#destroyCount = 0
	constructor(input) {
		this.#input = input
		input.setOutput(this)
	}
	setOutput(output) {
		this.#outputs.push(output)
	}
	destroy() {
		if (this.#destroyCount < this.#outputs.length) {
			if (this.#destroyCount === 0) {
				this.#input.destroy()
			}
			++this.#destroyCount
		} else {
			throw new Error('FanOut already destroyed once for each output')
		}
	}
	getSchema() {
		return this.#input.getSchema()
	}
	fetch(req) {
		return this.#input.fetch(req)
	}
	cleanup(req) {
		return this.#input.cleanup(req)
	}
	onFanInReceivedPush() {
		this.#fanInReceivedPush = true
	}
	push(change) {
		this.#fanInReceivedPush = false
		for (const out of this.#outputs) {
			out.push(change)
			if (this.#fanInReceivedPush) {
				return
			}
		}
	}
}
function maybeSplitAndPushEditChange(change, predicate, output) {
	const oldWasPresent = predicate(change.oldNode.row)
	const newIsPresent = predicate(change.node.row)
	if (oldWasPresent && newIsPresent) {
		output.push(change)
	} else if (oldWasPresent && !newIsPresent) {
		output.push({
			type: 'remove',
			node: change.oldNode,
		})
	} else if (!oldWasPresent && newIsPresent) {
		output.push({
			type: 'add',
			node: change.node,
		})
	}
}
function filterPush(change, output, predicate) {
	if (!predicate) {
		output.push(change)
		return
	}
	switch (change.type) {
		case 'add':
		case 'remove':
			if (predicate(change.node.row)) {
				output.push(change)
			}
			break
		case 'child':
			if (predicate(change.node.row)) {
				output.push(change)
			}
			break
		case 'edit':
			maybeSplitAndPushEditChange(change, predicate, output)
			break
		default:
			unreachable(change)
	}
}
var Filter = class {
	#input
	#predicate
	#output = throwOutput
	constructor(input, predicate) {
		this.#input = input
		this.#predicate = predicate
		input.setOutput(this)
	}
	setOutput(output) {
		this.#output = output
	}
	destroy() {
		this.#input.destroy()
	}
	getSchema() {
		return this.#input.getSchema()
	}
	*fetch(req) {
		for (const node of this.#input.fetch(req)) {
			if (this.#predicate(node.row)) {
				yield node
			}
		}
	}
	*cleanup(req) {
		for (const node of this.#input.cleanup(req)) {
			if (this.#predicate(node.row)) {
				yield node
			} else {
				drainStreams(node)
			}
		}
	}
	push(change) {
		filterPush(change, this.#output, this.#predicate)
	}
}
var Join = class {
	#parent
	#child
	#storage
	#parentKey
	#childKey
	#relationshipName
	#schema
	#output = throwOutput
	constructor({ parent, child, storage, parentKey, childKey, relationshipName, hidden, system }) {
		assert(parent !== child, 'Parent and child must be different operators')
		assert(
			parentKey.length === childKey.length,
			'The parentKey and childKey keys must have same length'
		)
		this.#parent = parent
		this.#child = child
		this.#storage = storage
		this.#parentKey = parentKey
		this.#childKey = childKey
		this.#relationshipName = relationshipName
		const parentSchema = parent.getSchema()
		const childSchema = child.getSchema()
		this.#schema = {
			...parentSchema,
			relationships: {
				...parentSchema.relationships,
				[relationshipName]: {
					...childSchema,
					isHidden: hidden,
					system,
				},
			},
		}
		parent.setOutput({
			push: (change) => this.#pushParent(change),
		})
		child.setOutput({
			push: (change) => this.#pushChild(change),
		})
	}
	destroy() {
		this.#parent.destroy()
		this.#child.destroy()
	}
	setOutput(output) {
		this.#output = output
	}
	getSchema() {
		return this.#schema
	}
	*fetch(req) {
		for (const parentNode of this.#parent.fetch(req)) {
			yield this.#processParentNode(parentNode.row, parentNode.relationships, 'fetch')
		}
	}
	*cleanup(req) {
		for (const parentNode of this.#parent.cleanup(req)) {
			yield this.#processParentNode(parentNode.row, parentNode.relationships, 'cleanup')
		}
	}
	#pushParent(change) {
		switch (change.type) {
			case 'add':
				this.#output.push({
					type: 'add',
					node: this.#processParentNode(change.node.row, change.node.relationships, 'fetch'),
				})
				break
			case 'remove':
				this.#output.push({
					type: 'remove',
					node: this.#processParentNode(change.node.row, change.node.relationships, 'cleanup'),
				})
				break
			case 'child':
				this.#output.push({
					type: 'child',
					node: this.#processParentNode(change.node.row, change.node.relationships, 'fetch'),
					child: change.child,
				})
				break
			case 'edit': {
				if (rowEqualsForCompoundKey(change.oldNode.row, change.node.row, this.#parentKey)) {
					this.#output.push({
						type: 'edit',
						oldNode: this.#processParentNode(
							change.oldNode.row,
							change.oldNode.relationships,
							'cleanup'
						),
						node: this.#processParentNode(change.node.row, change.node.relationships, 'fetch'),
					})
				} else {
					this.#pushParent({
						type: 'remove',
						node: change.oldNode,
					})
					this.#pushParent({
						type: 'add',
						node: change.node,
					})
				}
				break
			}
			default:
				unreachable(change)
		}
	}
	#pushChild(change) {
		const pushChildChange = (childRow, change2) => {
			const parentNodes = this.#parent.fetch({
				constraint: Object.fromEntries(
					this.#parentKey.map((key, i) => [key, childRow[this.#childKey[i]]])
				),
			})
			for (const parentNode of parentNodes) {
				const childChange = {
					type: 'child',
					node: this.#processParentNode(parentNode.row, parentNode.relationships, 'fetch'),
					child: {
						relationshipName: this.#relationshipName,
						change: change2,
					},
				}
				this.#output.push(childChange)
			}
		}
		switch (change.type) {
			case 'add':
			case 'remove':
				pushChildChange(change.node.row, change)
				break
			case 'child':
				pushChildChange(change.node.row, change)
				break
			case 'edit': {
				const childRow = change.node.row
				const oldChildRow = change.oldNode.row
				if (rowEqualsForCompoundKey(oldChildRow, childRow, this.#childKey)) {
					pushChildChange(childRow, change)
				} else {
					pushChildChange(oldChildRow, {
						type: 'remove',
						node: change.oldNode,
					})
					pushChildChange(childRow, {
						type: 'add',
						node: change.node,
					})
				}
				break
			}
			default:
				unreachable(change)
		}
	}
	#processParentNode(parentNodeRow, parentNodeRelations, mode) {
		let method = mode
		let storageUpdated = false
		const childStream = () => {
			if (!storageUpdated) {
				if (mode === 'cleanup') {
					this.#storage.del(
						makeStorageKey(this.#parentKey, this.#parent.getSchema().primaryKey, parentNodeRow)
					)
					const empty =
						[
							...take(
								this.#storage.scan({
									prefix: makeStorageKeyPrefix(parentNodeRow, this.#parentKey),
								}),
								1
							),
						].length === 0
					method = empty ? 'cleanup' : 'fetch'
				}
				storageUpdated = true
				if (mode === 'fetch') {
					this.#storage.set(
						makeStorageKey(this.#parentKey, this.#parent.getSchema().primaryKey, parentNodeRow),
						true
					)
				}
			}
			return this.#child[method]({
				constraint: Object.fromEntries(
					this.#childKey.map((key, i) => [key, parentNodeRow[this.#parentKey[i]]])
				),
			})
		}
		return {
			row: parentNodeRow,
			relationships: {
				...parentNodeRelations,
				[this.#relationshipName]: childStream,
			},
		}
	}
}
function makeStorageKeyForValues(values) {
	const json2 = JSON.stringify(['pKeySet', ...values])
	return json2.substring(1, json2.length - 1) + ','
}
function makeStorageKeyPrefix(row, key) {
	return makeStorageKeyForValues(key.map((k) => row[k]))
}
function makeStorageKey(key, primaryKey, row) {
	const values = key.map((k) => row[k])
	for (const key2 of primaryKey) {
		values.push(row[key2])
	}
	return makeStorageKeyForValues(values)
}
function rowEqualsForCompoundKey(a, b, key) {
	for (let i = 0; i < key.length; i++) {
		if (!valuesEqual(a[key[i]], b[key[i]])) {
			return false
		}
	}
	return true
}
var Skip = class {
	#input
	#bound
	#comparator
	#output = throwOutput
	constructor(input, bound) {
		this.#input = input
		this.#bound = bound
		this.#comparator = input.getSchema().compareRows
		input.setOutput(this)
	}
	getSchema() {
		return this.#input.getSchema()
	}
	fetch(req) {
		return this.#fetchOrCleanup('fetch', req)
	}
	cleanup(req) {
		return this.#fetchOrCleanup('fetch', req)
	}
	*#fetchOrCleanup(method, req) {
		const start = this.#getStart(req)
		if (start === 'empty') {
			return
		}
		const nodes = this.#input[method]({ ...req, start })
		if (!req.reverse) {
			yield* nodes
			return
		}
		for (const node of nodes) {
			if (!this.#shouldBePresent(node.row)) {
				return
			}
			yield node
		}
	}
	setOutput(output) {
		this.#output = output
	}
	destroy() {
		this.#input.destroy()
	}
	#shouldBePresent(row) {
		const cmp2 = this.#comparator(this.#bound.row, row)
		return cmp2 < 0 || (cmp2 === 0 && !this.#bound.exclusive)
	}
	push(change) {
		const shouldBePresent = (row) => this.#shouldBePresent(row)
		if (change.type === 'edit') {
			maybeSplitAndPushEditChange(change, shouldBePresent, this.#output)
			return
		}
		change
		if (shouldBePresent(change.node.row)) {
			this.#output.push(change)
		}
	}
	#getStart(req) {
		const boundStart = {
			row: this.#bound.row,
			basis: this.#bound.exclusive ? 'after' : 'at',
		}
		if (!req.start) {
			if (req.reverse) {
				return void 0
			}
			return boundStart
		}
		const cmp2 = this.#comparator(this.#bound.row, req.start.row)
		if (!req.reverse) {
			if (cmp2 > 0) {
				return boundStart
			}
			if (cmp2 === 0) {
				if (this.#bound.exclusive || req.start.basis === 'after') {
					return {
						row: this.#bound.row,
						basis: 'after',
					}
				}
				return boundStart
			}
			return req.start
		}
		req.reverse
		if (cmp2 > 0) {
			return 'empty'
		}
		if (cmp2 === 0) {
			if (!this.#bound.exclusive && req.start.basis === 'at') {
				return boundStart
			}
			return 'empty'
		}
		return req.start
	}
}
var MAX_BOUND_KEY = 'maxBound'
var Take = class {
	#input
	#storage
	#limit
	#partitionKey
	#partitionKeyComparator
	#output = throwOutput
	constructor(input, storage, limit, partitionKey) {
		assert(limit >= 0)
		assertOrderingIncludesPK(input.getSchema().sort, input.getSchema().primaryKey)
		input.setOutput(this)
		this.#input = input
		this.#storage = storage
		this.#limit = limit
		this.#partitionKey = partitionKey
		this.#partitionKeyComparator = partitionKey && makePartitionKeyComparator(partitionKey)
	}
	setOutput(output) {
		this.#output = output
	}
	getSchema() {
		return this.#input.getSchema()
	}
	*fetch(req) {
		if (
			!this.#partitionKey ||
			(req.constraint && constraintMatchesPartitionKey(req.constraint, this.#partitionKey))
		) {
			const takeStateKey = getTakeStateKey(this.#partitionKey, req.constraint)
			const takeState = this.#storage.get(takeStateKey)
			if (!takeState) {
				yield* this.#initialFetch(req)
				return
			}
			if (takeState.bound === void 0) {
				return
			}
			for (const inputNode of this.#input.fetch(req)) {
				if (this.getSchema().compareRows(takeState.bound, inputNode.row) < 0) {
					return
				}
				yield inputNode
			}
			return
		}
		const maxBound = this.#storage.get(MAX_BOUND_KEY)
		if (maxBound === void 0) {
			return
		}
		for (const inputNode of this.#input.fetch(req)) {
			if (this.getSchema().compareRows(inputNode.row, maxBound) > 0) {
				return
			}
			const takeStateKey = getTakeStateKey(this.#partitionKey, inputNode.row)
			const takeState = this.#storage.get(takeStateKey)
			if (
				takeState?.bound !== void 0 &&
				this.getSchema().compareRows(takeState.bound, inputNode.row) >= 0
			) {
				yield inputNode
			}
		}
	}
	*#initialFetch(req) {
		assert(req.start === void 0)
		assert(!req.reverse)
		assert(constraintMatchesPartitionKey(req.constraint, this.#partitionKey))
		if (this.#limit === 0) {
			return
		}
		const takeStateKey = getTakeStateKey(this.#partitionKey, req.constraint)
		assert(this.#storage.get(takeStateKey) === void 0)
		let size = 0
		let bound
		let downstreamEarlyReturn = true
		let exceptionThrown = false
		try {
			for (const inputNode of this.#input.fetch(req)) {
				yield inputNode
				bound = inputNode.row
				size++
				if (size === this.#limit) {
					break
				}
			}
			downstreamEarlyReturn = false
		} catch (e) {
			exceptionThrown = true
			throw e
		} finally {
			if (!exceptionThrown) {
				this.#setTakeState(takeStateKey, size, bound, this.#storage.get(MAX_BOUND_KEY))
				assert(!downstreamEarlyReturn, 'Unexpected early return prevented full hydration')
			}
		}
	}
	*cleanup(req) {
		assert(req.start === void 0)
		assert(constraintMatchesPartitionKey(req.constraint, this.#partitionKey))
		const takeStateKey = getTakeStateKey(this.#partitionKey, req.constraint)
		this.#storage.del(takeStateKey)
		let size = 0
		for (const inputNode of this.#input.cleanup(req)) {
			if (size === this.#limit) {
				return
			}
			size++
			yield inputNode
		}
	}
	#getStateAndConstraint(row) {
		const takeStateKey = getTakeStateKey(this.#partitionKey, row)
		const takeState = this.#storage.get(takeStateKey)
		let maxBound
		let constraint
		if (takeState) {
			maxBound = this.#storage.get(MAX_BOUND_KEY)
			constraint =
				this.#partitionKey && Object.fromEntries(this.#partitionKey.map((key) => [key, row[key]]))
		}
		return { takeState, takeStateKey, maxBound, constraint }
	}
	push(change) {
		if (change.type === 'edit') {
			this.#pushEditChange(change)
			return
		}
		const { takeState, takeStateKey, maxBound, constraint } = this.#getStateAndConstraint(
			change.node.row
		)
		if (!takeState) {
			return
		}
		const { compareRows } = this.getSchema()
		if (change.type === 'add') {
			if (takeState.size < this.#limit) {
				this.#setTakeState(
					takeStateKey,
					takeState.size + 1,
					takeState.bound === void 0 || compareRows(takeState.bound, change.node.row) < 0
						? change.node.row
						: takeState.bound,
					maxBound
				)
				this.#output.push(change)
				return
			}
			if (takeState.bound === void 0 || compareRows(change.node.row, takeState.bound) >= 0) {
				return
			}
			let beforeBoundNode
			let boundNode
			if (this.#limit === 1) {
				boundNode = must(
					first(
						this.#input.fetch({
							start: {
								row: takeState.bound,
								basis: 'at',
							},
							constraint,
						})
					)
				)
			} else {
				;[boundNode, beforeBoundNode] = take(
					this.#input.fetch({
						start: {
							row: takeState.bound,
							basis: 'at',
						},
						constraint,
						reverse: true,
					}),
					2
				)
			}
			const removeChange = {
				type: 'remove',
				node: boundNode,
			}
			this.#setTakeState(
				takeStateKey,
				takeState.size,
				beforeBoundNode === void 0 || compareRows(change.node.row, beforeBoundNode.row) > 0
					? change.node.row
					: beforeBoundNode.row,
				maxBound
			)
			this.#output.push(removeChange)
			this.#output.push(change)
		} else if (change.type === 'remove') {
			if (takeState.bound === void 0) {
				return
			}
			const compToBound = compareRows(change.node.row, takeState.bound)
			if (compToBound > 0) {
				return
			}
			const [beforeBoundNode] = take(
				this.#input.fetch({
					start: {
						row: takeState.bound,
						basis: 'after',
					},
					constraint,
					reverse: true,
				}),
				1
			)
			let newBound
			if (beforeBoundNode) {
				const push2 = compareRows(beforeBoundNode.row, takeState.bound) > 0
				newBound = {
					node: beforeBoundNode,
					push: push2,
				}
			}
			if (!newBound?.push) {
				for (const node of this.#input.fetch({
					start: {
						row: takeState.bound,
						basis: 'at',
					},
					constraint,
				})) {
					const push2 = compareRows(node.row, takeState.bound) > 0
					newBound = {
						node,
						push: push2,
					}
					if (push2) {
						break
					}
				}
			}
			if (newBound?.push) {
				this.#setTakeState(takeStateKey, takeState.size, newBound.node.row, maxBound)
				this.#output.push(change)
				this.#output.push({
					type: 'add',
					node: newBound.node,
				})
				return
			}
			this.#setTakeState(takeStateKey, takeState.size - 1, newBound?.node.row, maxBound)
			this.#output.push(change)
		} else if (change.type === 'child') {
			if (takeState.bound && compareRows(change.node.row, takeState.bound) <= 0) {
				this.#output.push(change)
			}
		}
	}
	#pushEditChange(change) {
		if (
			this.#partitionKeyComparator &&
			this.#partitionKeyComparator(change.oldNode.row, change.node.row) !== 0
		) {
			this.push({
				type: 'remove',
				node: change.oldNode,
			})
			this.push({
				type: 'add',
				node: change.node,
			})
			return
		}
		const { takeState, takeStateKey, maxBound, constraint } = this.#getStateAndConstraint(
			change.oldNode.row
		)
		if (!takeState) {
			return
		}
		assert(takeState.bound, 'Bound should be set')
		const { compareRows } = this.getSchema()
		const oldCmp = compareRows(change.oldNode.row, takeState.bound)
		const newCmp = compareRows(change.node.row, takeState.bound)
		const replaceBoundAndForwardChange = () => {
			this.#setTakeState(takeStateKey, takeState.size, change.node.row, maxBound)
			this.#output.push(change)
		}
		if (oldCmp === 0) {
			if (newCmp === 0) {
				this.#output.push(change)
				return
			}
			if (newCmp < 0) {
				if (this.#limit === 1) {
					replaceBoundAndForwardChange()
					return
				}
				const beforeBoundNode = must(
					first(
						this.#input.fetch({
							start: {
								row: takeState.bound,
								basis: 'after',
							},
							constraint,
							reverse: true,
						})
					)
				)
				this.#setTakeState(takeStateKey, takeState.size, beforeBoundNode.row, maxBound)
				this.#output.push(change)
				return
			}
			assert(newCmp > 0)
			const newBoundNode = must(
				first(
					this.#input.fetch({
						start: {
							row: takeState.bound,
							basis: 'at',
						},
						constraint,
					})
				)
			)
			if (compareRows(newBoundNode.row, change.node.row) === 0) {
				replaceBoundAndForwardChange()
				return
			}
			this.#setTakeState(takeStateKey, takeState.size, newBoundNode.row, maxBound)
			this.#output.push({
				type: 'remove',
				node: change.oldNode,
			})
			this.#output.push({
				type: 'add',
				node: newBoundNode,
			})
			return
		}
		if (oldCmp > 0) {
			assert(newCmp !== 0, 'Invalid state. Row has duplicate primary key')
			if (newCmp > 0) {
				return
			}
			assert(newCmp < 0)
			const [oldBoundNode, newBoundNode] = take(
				this.#input.fetch({
					start: {
						row: takeState.bound,
						basis: 'at',
					},
					constraint,
					reverse: true,
				}),
				2
			)
			this.#setTakeState(takeStateKey, takeState.size, newBoundNode.row, maxBound)
			this.#output.push({
				type: 'remove',
				node: oldBoundNode,
			})
			this.#output.push({
				type: 'add',
				node: change.node,
			})
			return
		}
		if (oldCmp < 0) {
			assert(newCmp !== 0, 'Invalid state. Row has duplicate primary key')
			if (newCmp < 0) {
				this.#output.push(change)
				return
			}
			assert(newCmp > 0)
			const afterBoundNode = must(
				first(
					this.#input.fetch({
						start: {
							row: takeState.bound,
							basis: 'after',
						},
						constraint,
					})
				)
			)
			if (compareRows(afterBoundNode.row, change.node.row) === 0) {
				replaceBoundAndForwardChange()
				return
			}
			this.#setTakeState(takeStateKey, takeState.size, afterBoundNode.row, maxBound)
			this.#output.push({
				type: 'remove',
				node: change.oldNode,
			})
			this.#output.push({
				type: 'add',
				node: afterBoundNode,
			})
			return
		}
		unreachable()
	}
	#setTakeState(takeStateKey, size, bound, maxBound) {
		this.#storage.set(takeStateKey, {
			size,
			bound,
		})
		if (
			bound !== void 0 &&
			(maxBound === void 0 || this.getSchema().compareRows(bound, maxBound) > 0)
		) {
			this.#storage.set(MAX_BOUND_KEY, bound)
		}
	}
	destroy() {
		this.#input.destroy()
	}
}
function getTakeStateKey(partitionKey, rowOrConstraint) {
	const partitionValues = []
	if (partitionKey && rowOrConstraint) {
		for (const key of partitionKey) {
			partitionValues.push(rowOrConstraint[key])
		}
	}
	return JSON.stringify(['take', ...partitionValues])
}
function constraintMatchesPartitionKey(constraint, partitionKey) {
	if (constraint === void 0 || partitionKey === void 0) {
		return constraint === partitionKey
	}
	if (partitionKey.length !== Object.keys(constraint).length) {
		return false
	}
	for (const key of partitionKey) {
		if (!hasOwn(constraint, key)) {
			return false
		}
	}
	return true
}
function makePartitionKeyComparator(partitionKey) {
	return (a, b) => {
		for (const key of partitionKey) {
			const cmp2 = compareValues(a[key], b[key])
			if (cmp2 !== 0) {
				return cmp2
			}
		}
		return 0
	}
}
function getLikePredicate(pattern, flags) {
	const op = getLikeOp(String(pattern), flags)
	return (lhs) => {
		assertString(lhs)
		return op(String(lhs))
	}
}
function getLikeOp(pattern, flags) {
	if (!/_|%|\\/.test(pattern)) {
		if (flags === 'i') {
			const rhsLower = pattern.toLowerCase()
			return (lhs) => lhs.toLowerCase() === rhsLower
		}
		return (lhs) => lhs === pattern
	}
	const re = patternToRegExp(pattern, flags)
	return (lhs) => re.test(lhs)
}
var specialCharsRe = /[$()*+.?[\]\\^{|}]/
function patternToRegExp(source, flags = '') {
	let pattern = '^'
	for (let i = 0; i < source.length; i++) {
		let c = source[i]
		switch (c) {
			case '%':
				pattern += '.*'
				break
			case '_':
				pattern += '.'
				break
			// @ts-expect-error fallthrough
			case '\\':
				if (i === source.length - 1) {
					throw new Error('LIKE pattern must not end with escape character')
				}
				i++
				c = source[i]
			// fall through
			default:
				if (specialCharsRe.test(c)) {
					pattern += '\\'
				}
				pattern += c
				break
		}
	}
	return new RegExp(pattern + '$', flags + 'm')
}
function createPredicate(condition) {
	if (condition.type !== 'simple') {
		const predicates = condition.conditions.map((c) => createPredicate(c))
		return condition.type === 'and'
			? (row) => {
					for (const predicate of predicates) {
						if (!predicate(row)) {
							return false
						}
					}
					return true
				}
			: (row) => {
					for (const predicate of predicates) {
						if (predicate(row)) {
							return true
						}
					}
					return false
				}
	}
	const { left } = condition
	const { right } = condition
	assert(right.type !== 'static', 'static values should be resolved before creating predicates')
	assert(left.type !== 'static', 'static values should be resolved before creating predicates')
	switch (condition.op) {
		case 'IS':
		case 'IS NOT': {
			const impl2 = createIsPredicate(right.value, condition.op)
			if (left.type === 'literal') {
				const result = impl2(left.value)
				return () => result
			}
			return (row) => impl2(row[left.name])
		}
	}
	if (right.value === null || right.value === void 0) {
		return (_row) => false
	}
	const impl = createPredicateImpl(right.value, condition.op)
	if (left.type === 'literal') {
		if (left.value === null || left.value === void 0) {
			return (_row) => false
		}
		const result = impl(left.value)
		return () => result
	}
	return (row) => {
		const lhs = row[left.name]
		if (lhs === null || lhs === void 0) {
			return false
		}
		return impl(lhs)
	}
}
function createIsPredicate(rhs, operator) {
	switch (operator) {
		case 'IS':
			return (lhs) => lhs === rhs
		case 'IS NOT':
			return (lhs) => lhs !== rhs
	}
}
function createPredicateImpl(rhs, operator) {
	switch (operator) {
		case '=':
			return (lhs) => lhs === rhs
		case '!=':
			return (lhs) => lhs !== rhs
		case '<':
			return (lhs) => lhs < rhs
		case '<=':
			return (lhs) => lhs <= rhs
		case '>':
			return (lhs) => lhs > rhs
		case '>=':
			return (lhs) => lhs >= rhs
		case 'LIKE':
			return getLikePredicate(rhs, '')
		case 'NOT LIKE':
			return not(getLikePredicate(rhs, ''))
		case 'ILIKE':
			return getLikePredicate(rhs, 'i')
		case 'NOT ILIKE':
			return not(getLikePredicate(rhs, 'i'))
		case 'IN': {
			assert(Array.isArray(rhs))
			const set = new Set(rhs)
			return (lhs) => set.has(lhs)
		}
		case 'NOT IN': {
			assert(Array.isArray(rhs))
			const set = new Set(rhs)
			return (lhs) => !set.has(lhs)
		}
		default:
			operator
			throw new Error(`Unexpected operator: ${operator}`)
	}
}
function not(f) {
	return (lhs) => !f(lhs)
}
function buildPipeline(ast, delegate) {
	return buildPipelineInternal(ast, delegate)
}
function buildPipelineInternal(ast, delegate, partitionKey) {
	const source = delegate.getSource(ast.table)
	if (!source) {
		throw new Error(`Source not found: ${ast.table}`)
	}
	const conn = source.connect(must(ast.orderBy), ast.where)
	let end = conn
	const { fullyAppliedFilters } = conn
	ast = uniquifyCorrelatedSubqueryConditionAliases(ast)
	if (ast.start) {
		end = new Skip(end, ast.start)
	}
	for (const csq of gatherCorrelatedSubqueryQueriesFromCondition(ast.where)) {
		end = applyCorrelatedSubQuery(csq, delegate, end)
	}
	if (ast.where && !fullyAppliedFilters) {
		end = applyWhere(end, ast.where, delegate)
	}
	if (ast.limit) {
		end = new Take(end, delegate.createStorage(), ast.limit, partitionKey)
	}
	if (ast.related) {
		for (const csq of ast.related) {
			end = applyCorrelatedSubQuery(csq, delegate, end)
		}
	}
	return end
}
function applyWhere(input, condition, delegate) {
	switch (condition.type) {
		case 'and':
			return applyAnd(input, condition, delegate)
		case 'or':
			return applyOr(input, condition, delegate)
		case 'correlatedSubquery':
			return applyCorrelatedSubqueryCondition(input, condition, delegate)
		case 'simple':
			return applySimpleCondition(input, condition)
	}
}
function applyAnd(input, condition, delegate) {
	for (const subCondition of condition.conditions) {
		input = applyWhere(input, subCondition, delegate)
	}
	return input
}
function applyOr(input, condition, delegate) {
	const [subqueryConditions, otherConditions] = groupSubqueryConditions(condition)
	if (subqueryConditions.length === 0) {
		return new Filter(
			input,
			createPredicate({
				type: 'or',
				conditions: otherConditions,
			})
		)
	}
	const fanOut = new FanOut(input)
	const branches = subqueryConditions.map((subCondition) =>
		applyWhere(fanOut, subCondition, delegate)
	)
	if (otherConditions.length > 0) {
		branches.push(
			new Filter(
				fanOut,
				createPredicate({
					type: 'or',
					conditions: otherConditions,
				})
			)
		)
	}
	return new FanIn(fanOut, branches)
}
function groupSubqueryConditions(condition) {
	const partitioned = [[], []]
	for (const subCondition of condition.conditions) {
		if (isNotAndDoesNotContainSubquery(subCondition)) {
			partitioned[1].push(subCondition)
		} else {
			partitioned[0].push(subCondition)
		}
	}
	return partitioned
}
function isNotAndDoesNotContainSubquery(condition) {
	if (condition.type === 'correlatedSubquery') {
		return false
	}
	if (condition.type === 'and') {
		return condition.conditions.every(isNotAndDoesNotContainSubquery)
	}
	assert(condition.type !== 'or', 'where conditions are expected to be in DNF')
	return true
}
function applySimpleCondition(input, condition) {
	return new Filter(input, createPredicate(condition))
}
function applyCorrelatedSubQuery(sq, delegate, end) {
	assert(sq.subquery.alias, 'Subquery must have an alias')
	const child = buildPipelineInternal(sq.subquery, delegate, sq.correlation.childField)
	end = new Join({
		parent: end,
		child,
		storage: delegate.createStorage(),
		parentKey: sq.correlation.parentField,
		childKey: sq.correlation.childField,
		relationshipName: sq.subquery.alias,
		hidden: sq.hidden ?? false,
		system: sq.system ?? 'client',
	})
	return end
}
function applyCorrelatedSubqueryCondition(input, condition, delegate) {
	assert(condition.op === 'EXISTS' || condition.op === 'NOT EXISTS')
	return new Exists(
		input,
		delegate.createStorage(),
		must(condition.related.subquery.alias),
		condition.related.correlation.parentField,
		condition.op
	)
}
function gatherCorrelatedSubqueryQueriesFromCondition(condition) {
	const csqs = []
	const gather = (condition2) => {
		if (condition2.type === 'correlatedSubquery') {
			assert(condition2.op === 'EXISTS' || condition2.op === 'NOT EXISTS')
			csqs.push({
				...condition2.related,
				subquery: {
					...condition2.related.subquery,
					limit:
						condition2.related.system === 'permissions' ? PERMISSIONS_EXISTS_LIMIT : EXISTS_LIMIT,
				},
			})
			return
		}
		if (condition2.type === 'and' || condition2.type === 'or') {
			for (const c of condition2.conditions) {
				gather(c)
			}
			return
		}
	}
	if (condition) {
		gather(condition)
	}
	return csqs
}
var EXISTS_LIMIT = 3
var PERMISSIONS_EXISTS_LIMIT = 1
function assertOrderingIncludesPK(ordering, pk) {
	const orderingFields = ordering.map(([field]) => field)
	const missingFields = pk.filter((pkField) => !orderingFields.includes(pkField))
	if (missingFields.length > 0) {
		throw new Error(
			`Ordering must include all primary key fields. Missing: ${missingFields.join(
				', '
			)}. ZQL automatically appends primary key fields to the ordering if they are missing 
      so a common cause of this error is a casing mismatch between Postgres and ZQL.
      E.g., "userid" vs "userID".
      You may want to add double-quotes around your Postgres column names to prevent Postgres from lower-casing them:
      https://www.postgresql.org/docs/current/sql-syntax-lexical.htm`
		)
	}
}
function uniquifyCorrelatedSubqueryConditionAliases(ast) {
	if (!ast.where) {
		return ast
	}
	const { where } = ast
	if (where.type !== 'and' && where.type !== 'or') {
		return ast
	}
	let count = 0
	const uniquifyCorrelatedSubquery = (csqc) => ({
		...csqc,
		related: {
			...csqc.related,
			subquery: {
				...csqc.related.subquery,
				alias: (csqc.related.subquery.alias ?? '') + '_' + count++,
			},
		},
	})
	const uniquifyAnd = (and2) => {
		const conds2 = []
		for (const cond of and2.conditions) {
			if (cond.type === 'correlatedSubquery') {
				conds2.push(uniquifyCorrelatedSubquery(cond))
			} else {
				conds2.push(cond)
			}
		}
		return {
			...and2,
			conditions: conds2,
		}
	}
	if (where.type === 'and') {
		return {
			...ast,
			where: uniquifyAnd(where),
		}
	}
	const conds = []
	for (const cond of where.conditions) {
		if (cond.type === 'simple') {
			conds.push(cond)
		} else if (cond.type === 'correlatedSubquery') {
			conds.push(uniquifyCorrelatedSubquery(cond))
		} else if (cond.type === 'and') {
			conds.push(uniquifyAnd(cond))
		}
	}
	return {
		...ast,
		where: {
			...where,
			conditions: conds,
		},
	}
}
var ArrayView = class {
	#input
	#listeners = /* @__PURE__ */ new Set()
	#schema
	#format
	// Synthetic "root" entry that has a single "" relationship, so that we can
	// treat all changes, including the root change, generically.
	#root
	onDestroy
	#dirty = false
	#complete = false
	constructor(input, format = { singular: false, relationships: {} }, queryComplete = true) {
		this.#input = input
		this.#schema = input.getSchema()
		this.#format = format
		this.#root = { '': format.singular ? void 0 : [] }
		input.setOutput(this)
		if (queryComplete === true) {
			this.#complete = true
		} else {
			void queryComplete.then(() => {
				this.#complete = true
				this.#fireListeners()
			})
		}
		this.#hydrate()
	}
	get data() {
		return this.#root['']
	}
	addListener(listener) {
		assert(!this.#listeners.has(listener), 'Listener already registered')
		this.#listeners.add(listener)
		this.#fireListener(listener)
		return () => {
			this.#listeners.delete(listener)
		}
	}
	#fireListeners() {
		for (const listener of this.#listeners) {
			this.#fireListener(listener)
		}
	}
	#fireListener(listener) {
		listener(this.data, this.#complete ? 'complete' : 'unknown')
	}
	destroy() {
		this.onDestroy?.()
	}
	#hydrate() {
		this.#dirty = true
		for (const node of this.#input.fetch({})) {
			applyChange(this.#root, { type: 'add', node }, this.#schema, '', this.#format)
		}
		this.flush()
	}
	push(change) {
		this.#dirty = true
		applyChange(this.#root, change, this.#schema, '', this.#format)
	}
	flush() {
		if (!this.#dirty) {
			return
		}
		this.#dirty = false
		this.#fireListeners()
	}
}
var ExpressionBuilder = class {
	#exists
	constructor(exists) {
		this.#exists = exists
		this.exists = this.exists.bind(this)
	}
	get eb() {
		return this
	}
	cmp(field, opOrValue, value) {
		return cmp(field, opOrValue, value)
	}
	cmpLit(left, op, right) {
		return {
			type: 'simple',
			left: isParameterReference(left) ? left[toStaticParam]() : { type: 'literal', value: left },
			right: isParameterReference(right)
				? right[toStaticParam]()
				: { type: 'literal', value: right },
			op,
		}
	}
	and = and
	or = or
	not = not2
	exists(relationship, cb) {
		return this.#exists(relationship, cb)
	}
}
function and(...conditions) {
	const expressions = filterTrue(filterUndefined(conditions))
	if (expressions.length === 1) {
		return expressions[0]
	}
	if (expressions.some(isAlwaysFalse)) {
		return FALSE
	}
	return { type: 'and', conditions: expressions }
}
function or(...conditions) {
	const expressions = filterFalse(filterUndefined(conditions))
	if (expressions.length === 1) {
		return expressions[0]
	}
	if (expressions.some(isAlwaysTrue)) {
		return TRUE
	}
	return { type: 'or', conditions: expressions }
}
function not2(expression) {
	switch (expression.type) {
		case 'and':
			return {
				type: 'or',
				conditions: expression.conditions.map(not2),
			}
		case 'or':
			return {
				type: 'and',
				conditions: expression.conditions.map(not2),
			}
		case 'correlatedSubquery':
			return {
				type: 'correlatedSubquery',
				related: expression.related,
				op: negateOperator(expression.op),
			}
		case 'simple':
			return {
				type: 'simple',
				op: negateOperator(expression.op),
				left: expression.left,
				right: expression.right,
			}
	}
}
function cmp(field, opOrValue, value) {
	let op
	if (value === void 0) {
		value = opOrValue
		op = '='
	} else {
		op = opOrValue
	}
	return {
		type: 'simple',
		left: { type: 'column', name: field },
		right: isParameterReference(value) ? value[toStaticParam]() : { type: 'literal', value },
		op,
	}
}
function isParameterReference(value) {
	return value !== null && typeof value === 'object' && value[toStaticParam]
}
var TRUE = {
	type: 'and',
	conditions: [],
}
var FALSE = {
	type: 'or',
	conditions: [],
}
function isAlwaysTrue(condition) {
	return condition.type === 'and' && condition.conditions.length === 0
}
function isAlwaysFalse(condition) {
	return condition.type === 'or' && condition.conditions.length === 0
}
function flatten(type, conditions) {
	const flattened2 = []
	for (const c of conditions) {
		if (c.type === type) {
			flattened2.push(...c.conditions)
		} else {
			flattened2.push(c)
		}
	}
	return flattened2
}
var negateSimpleOperatorMap = {
	['=']: '!=',
	['!=']: '=',
	['<']: '>=',
	['>']: '<=',
	['>=']: '<',
	['<=']: '>',
	['IN']: 'NOT IN',
	['NOT IN']: 'IN',
	['LIKE']: 'NOT LIKE',
	['NOT LIKE']: 'LIKE',
	['ILIKE']: 'NOT ILIKE',
	['NOT ILIKE']: 'ILIKE',
	['IS']: 'IS NOT',
	['IS NOT']: 'IS',
}
var negateOperatorMap = {
	...negateSimpleOperatorMap,
	['EXISTS']: 'NOT EXISTS',
	['NOT EXISTS']: 'EXISTS',
}
function negateOperator(op) {
	return must(negateOperatorMap[op])
}
function filterUndefined(array8) {
	return array8.filter((e) => e !== void 0)
}
function filterTrue(conditions) {
	return conditions.filter((c) => !isAlwaysTrue(c))
}
function filterFalse(conditions) {
	return conditions.filter((c) => !isAlwaysFalse(c))
}
function dnf(condition) {
	return unwrap(dnfInner(condition))
}
function dnfInner(condition) {
	switch (condition.type) {
		case 'simple':
		case 'correlatedSubquery':
			return { type: 'or', conditions: [condition] }
		case 'and':
			return distributeAnd(condition.conditions.map(dnfInner))
		case 'or':
			return {
				type: 'or',
				conditions: flatten(
					'or',
					condition.conditions.map(dnfInner).flatMap((c) => c.conditions)
				),
			}
		default:
			unreachable(condition)
	}
}
function distributeAnd(conditions) {
	if (conditions.length === 0) {
		return { type: 'or', conditions: [TRUE] }
	}
	return conditions.reduce((acc, orCondition) => {
		const newConditions = []
		for (const accCondition of acc.conditions) {
			for (const orSubCondition of orCondition.conditions) {
				newConditions.push({
					type: 'and',
					conditions: [accCondition, orSubCondition],
				})
			}
		}
		return {
			type: 'or',
			conditions: flatten('or', newConditions),
		}
	})
}
function unwrap(c) {
	if (c.type === 'simple' || c.type === 'correlatedSubquery') {
		return c
	}
	if (c.conditions.length === 1) {
		return unwrap(c.conditions[0])
	}
	return { type: c.type, conditions: flatten(c.type, c.conditions.map(unwrap)) }
}
var astForTestingSymbol = Symbol()
function newQueryWithDetails(delegate, schema2, tableName, ast, ttl, format) {
	return new QueryImpl(delegate, schema2, tableName, ast, ttl, format)
}
function staticParam(anchorClass, field) {
	return {
		type: 'static',
		anchor: anchorClass,
		// for backwards compatibility
		field: field.length === 1 ? field[0] : field,
	}
}
var SUBQ_PREFIX = 'zsubq_'
var AbstractQuery = class {
	#schema
	#tableName
	#ast
	#ttl
	#format
	#hash = ''
	constructor(schema2, tableName, ast = { table: tableName }, ttl, format) {
		this.#schema = schema2
		this.#tableName = tableName
		this.#ast = ast
		this.#ttl = ttl
		this.#format = format ?? { singular: false, relationships: {} }
	}
	get format() {
		return this.#format
	}
	// Not part of Query or QueryInternal interface
	get [astForTestingSymbol]() {
		return this.#ast
	}
	hash() {
		if (!this.#hash) {
			const ast = this._completeAst()
			const hash2 = hashOfAST(ast)
			this.#hash = hash2
		}
		return this.#hash
	}
	one() {
		return this._newQuery(
			this.#schema,
			this.#tableName,
			{
				...this.#ast,
				limit: 1,
			},
			this.#ttl,
			{
				...this.#format,
				singular: true,
			}
		)
	}
	whereExists(relationship, cb) {
		return this.where(({ exists }) => exists(relationship, cb))
	}
	related(relationship, cb) {
		if (relationship.startsWith(SUBQ_PREFIX)) {
			throw new Error(
				`Relationship names may not start with "${SUBQ_PREFIX}". That is a reserved prefix.`
			)
		}
		cb = cb ?? ((q) => q)
		const related = this.#schema.relationships[this.#tableName][relationship]
		assert(related, 'Invalid relationship')
		if (isOneHop(related)) {
			const { destSchema, destField, sourceField, cardinality } = related[0]
			const sq = cb(
				this._newQuery(
					this.#schema,
					destSchema,
					{
						table: destSchema,
						alias: relationship,
					},
					this.#ttl,
					{
						relationships: {},
						singular: cardinality === 'one',
					}
				)
			)
			assert(
				isCompoundKey(sourceField),
				'The source of a relationship must specify at last 1 field'
			)
			assert(
				isCompoundKey(destField),
				'The destination of a relationship must specify at last 1 field'
			)
			assert(
				sourceField.length === destField.length,
				'The source and destination of a relationship must have the same number of fields'
			)
			return this._newQuery(
				this.#schema,
				this.#tableName,
				{
					...this.#ast,
					related: [
						...(this.#ast.related ?? []),
						{
							system: this._system,
							correlation: {
								parentField: sourceField,
								childField: destField,
							},
							subquery: addPrimaryKeysToAst(this.#schema.tables[destSchema], sq.#ast),
						},
					],
				},
				this.#ttl,
				{
					...this.#format,
					relationships: {
						...this.#format.relationships,
						[relationship]: sq.#format,
					},
				}
			)
		}
		if (isTwoHop(related)) {
			assert(related.length === 2, 'Invalid relationship')
			const [firstRelation, secondRelation] = related
			const { destSchema } = secondRelation
			const junctionSchema = firstRelation.destSchema
			const sq = cb(
				this._newQuery(
					this.#schema,
					destSchema,
					{
						table: destSchema,
						alias: relationship,
					},
					this.#ttl,
					{
						relationships: {},
						singular: secondRelation.cardinality === 'one',
					}
				)
			)
			assert(isCompoundKey(firstRelation.sourceField), 'Invalid relationship')
			assert(isCompoundKey(firstRelation.destField), 'Invalid relationship')
			assert(isCompoundKey(secondRelation.sourceField), 'Invalid relationship')
			assert(isCompoundKey(secondRelation.destField), 'Invalid relationship')
			return this._newQuery(
				this.#schema,
				this.#tableName,
				{
					...this.#ast,
					related: [
						...(this.#ast.related ?? []),
						{
							system: this._system,
							correlation: {
								parentField: firstRelation.sourceField,
								childField: firstRelation.destField,
							},
							hidden: true,
							subquery: {
								table: junctionSchema,
								alias: relationship,
								orderBy: addPrimaryKeys(this.#schema.tables[junctionSchema], void 0),
								related: [
									{
										system: this._system,
										correlation: {
											parentField: secondRelation.sourceField,
											childField: secondRelation.destField,
										},
										subquery: addPrimaryKeysToAst(this.#schema.tables[destSchema], sq.#ast),
									},
								],
							},
						},
					],
				},
				this.#ttl,
				{
					...this.#format,
					relationships: {
						...this.#format.relationships,
						[relationship]: sq.#format,
					},
				}
			)
		}
		throw new Error(`Invalid relationship ${relationship}`)
	}
	where(fieldOrExpressionFactory, opOrValue, value) {
		let cond
		if (typeof fieldOrExpressionFactory === 'function') {
			cond = fieldOrExpressionFactory(new ExpressionBuilder(this._exists))
		} else {
			assert(opOrValue !== void 0, 'Invalid condition')
			cond = cmp(fieldOrExpressionFactory, opOrValue, value)
		}
		const existingWhere = this.#ast.where
		if (existingWhere) {
			cond = and(existingWhere, cond)
		}
		return this._newQuery(
			this.#schema,
			this.#tableName,
			{
				...this.#ast,
				where: dnf(cond),
			},
			this.#ttl,
			this.#format
		)
	}
	start(row, opts) {
		return this._newQuery(
			this.#schema,
			this.#tableName,
			{
				...this.#ast,
				start: {
					row,
					exclusive: !opts?.inclusive,
				},
			},
			this.#ttl,
			this.#format
		)
	}
	limit(limit) {
		if (limit < 0) {
			throw new Error('Limit must be non-negative')
		}
		if ((limit | 0) !== limit) {
			throw new Error('Limit must be an integer')
		}
		return this._newQuery(
			this.#schema,
			this.#tableName,
			{
				...this.#ast,
				limit,
			},
			this.#ttl,
			this.#format
		)
	}
	orderBy(field, direction) {
		return this._newQuery(
			this.#schema,
			this.#tableName,
			{
				...this.#ast,
				orderBy: [...(this.#ast.orderBy ?? []), [field, direction]],
			},
			this.#ttl,
			this.#format
		)
	}
	_exists = (relationship, cb = (q) => q) => {
		const related = this.#schema.relationships[this.#tableName][relationship]
		assert(related, 'Invalid relationship')
		if (isOneHop(related)) {
			const { destSchema, sourceField, destField } = related[0]
			assert(isCompoundKey(sourceField), 'Invalid relationship')
			assert(isCompoundKey(destField), 'Invalid relationship')
			const sq = cb(
				this._newQuery(
					this.#schema,
					destSchema,
					{
						table: destSchema,
						alias: `${SUBQ_PREFIX}${relationship}`,
					},
					this.#ttl,
					void 0
				)
			)
			return {
				type: 'correlatedSubquery',
				related: {
					system: this._system,
					correlation: {
						parentField: sourceField,
						childField: destField,
					},
					subquery: addPrimaryKeysToAst(this.#schema.tables[destSchema], sq.#ast),
				},
				op: 'EXISTS',
			}
		}
		if (isTwoHop(related)) {
			assert(related.length === 2, 'Invalid relationship')
			const [firstRelation, secondRelation] = related
			assert(isCompoundKey(firstRelation.sourceField), 'Invalid relationship')
			assert(isCompoundKey(firstRelation.destField), 'Invalid relationship')
			assert(isCompoundKey(secondRelation.sourceField), 'Invalid relationship')
			assert(isCompoundKey(secondRelation.destField), 'Invalid relationship')
			const { destSchema } = secondRelation
			const junctionSchema = firstRelation.destSchema
			const queryToDest = cb(
				this._newQuery(
					this.#schema,
					destSchema,
					{
						table: destSchema,
						alias: `${SUBQ_PREFIX}${relationship}`,
					},
					this.#ttl,
					void 0
				)
			)
			return {
				type: 'correlatedSubquery',
				related: {
					system: this._system,
					correlation: {
						parentField: firstRelation.sourceField,
						childField: firstRelation.destField,
					},
					subquery: {
						table: junctionSchema,
						alias: `${SUBQ_PREFIX}${relationship}`,
						orderBy: addPrimaryKeys(this.#schema.tables[junctionSchema], void 0),
						where: {
							type: 'correlatedSubquery',
							related: {
								system: this._system,
								correlation: {
									parentField: secondRelation.sourceField,
									childField: secondRelation.destField,
								},
								subquery: addPrimaryKeysToAst(this.#schema.tables[destSchema], queryToDest.#ast),
							},
							op: 'EXISTS',
						},
					},
				},
				op: 'EXISTS',
			}
		}
		throw new Error(`Invalid relationship ${relationship}`)
	}
	#completedAST
	_completeAst() {
		if (!this.#completedAST) {
			const finalOrderBy = addPrimaryKeys(this.#schema.tables[this.#tableName], this.#ast.orderBy)
			if (this.#ast.start) {
				const { row } = this.#ast.start
				const narrowedRow = {}
				for (const [field] of finalOrderBy) {
					narrowedRow[field] = row[field]
				}
				this.#completedAST = {
					...this.#ast,
					start: {
						...this.#ast.start,
						row: narrowedRow,
					},
					orderBy: finalOrderBy,
				}
			} else {
				this.#completedAST = {
					...this.#ast,
					orderBy: addPrimaryKeys(this.#schema.tables[this.#tableName], this.#ast.orderBy),
				}
			}
		}
		return this.#completedAST
	}
}
var completedAstSymbol = Symbol()
var QueryImpl = class extends AbstractQuery {
	#delegate
	constructor(delegate, schema2, tableName, ast, ttl, format) {
		super(schema2, tableName, ast, ttl, format)
		this.#delegate = delegate
	}
	_system = 'client'
	get [completedAstSymbol]() {
		return this._completeAst()
	}
	_newQuery(schema2, tableName, ast, ttl, format) {
		return newQueryWithDetails(this.#delegate, schema2, tableName, ast, ttl, format)
	}
	materialize(factory) {
		const ast = this._completeAst()
		const queryCompleteResolver = resolver()
		let queryGot = false
		const ttl = void 0
		const removeServerQuery = this.#delegate.addServerQuery(ast, ttl, (got) => {
			if (got) {
				queryGot = true
				queryCompleteResolver.resolve(true)
			}
		})
		const input = buildPipeline(ast, this.#delegate)
		let removeCommitObserver
		const onDestroy = () => {
			input.destroy()
			removeCommitObserver?.()
			removeServerQuery()
		}
		const view = this.#delegate.batchViewUpdates(() =>
			(factory ?? arrayViewFactory)(
				this,
				input,
				this.format,
				onDestroy,
				(cb) => {
					removeCommitObserver = this.#delegate.onTransactionCommit(cb)
				},
				queryGot || queryCompleteResolver.promise
			)
		)
		return view
	}
	run() {
		const v2 = this.materialize()
		const ret = v2.data
		v2.destroy()
		return ret
	}
	preload() {
		const { resolve, promise: complete } = resolver()
		const ast = this._completeAst()
		const ttl = void 0
		const unsub = this.#delegate.addServerQuery(ast, ttl, (got) => {
			if (got) {
				resolve()
			}
		})
		return {
			cleanup: unsub,
			complete,
		}
	}
}
function addPrimaryKeys(schema2, orderBy) {
	orderBy = orderBy ?? []
	const { primaryKey } = schema2
	const primaryKeysToAdd = new Set(primaryKey)
	for (const [field] of orderBy) {
		primaryKeysToAdd.delete(field)
	}
	if (primaryKeysToAdd.size === 0) {
		return orderBy
	}
	return [...orderBy, ...[...primaryKeysToAdd].map((key) => [key, 'asc'])]
}
function addPrimaryKeysToAst(schema2, ast) {
	return {
		...ast,
		orderBy: addPrimaryKeys(schema2, ast.orderBy),
	}
}
function arrayViewFactory(_query, input, format, onDestroy, onTransactionCommit, queryComplete) {
	const v2 = new ArrayView(input, format, queryComplete)
	v2.onDestroy = onDestroy
	onTransactionCommit(() => {
		v2.flush()
	})
	return v2
}
function isCompoundKey(field) {
	return Array.isArray(field) && field.length >= 1
}
var StaticQuery = class _StaticQuery extends AbstractQuery {
	expressionBuilder() {
		return new ExpressionBuilder(this._exists)
	}
	_system = 'permissions'
	_newQuery(schema2, tableName, ast, ttl, format) {
		return new _StaticQuery(schema2, tableName, ast, ttl, format)
	}
	get ast() {
		return this._completeAst()
	}
	materialize() {
		throw new Error('AuthQuery cannot be materialized')
	}
	run() {
		throw new Error('AuthQuery cannot be run')
	}
	preload() {
		throw new Error('AuthQuery cannot be preloaded')
	}
}
function clientToServer(tables) {
	return createMapperFrom('client', tables)
}
function createMapperFrom(src, tables) {
	const mapping = new Map(
		Object.entries(tables).map(([tableName, { serverName: serverTableName, columns }]) => {
			let allColumnsSame = true
			const names = {}
			for (const [name, { serverName }] of Object.entries(columns)) {
				if (serverName && serverName !== name) {
					allColumnsSame = false
				}
				if (src === 'client') {
					names[name] = serverName ?? name
				} else {
					names[serverName ?? name] = name
				}
			}
			return [
				src === 'client' ? tableName : (serverTableName ?? tableName),
				{
					tableName: src === 'client' ? (serverTableName ?? tableName) : tableName,
					columns: names,
					allColumnsSame,
				},
			]
		})
	)
	return new NameMapper(mapping)
}
var NameMapper = class {
	#tables = /* @__PURE__ */ new Map()
	constructor(tables) {
		this.#tables = tables
	}
	#getTable(src, ctx) {
		const table2 = this.#tables.get(src)
		if (!table2) {
			throw new Error(`unknown table "${src}" ${!ctx ? '' : `in ${JSON.stringify(ctx)}`}`)
		}
		return table2
	}
	tableName(src, context) {
		return this.#getTable(src, context).tableName
	}
	columnName(table2, src, ctx) {
		const dst = this.#getTable(table2, ctx).columns[src]
		if (!dst) {
			throw new Error(
				`unknown column "${src}" of "${table2}" table ${!ctx ? '' : `in ${JSON.stringify(ctx)}`}`
			)
		}
		return dst
	}
	row(table2, row) {
		const dest = this.#getTable(table2)
		const { allColumnsSame, columns } = dest
		if (allColumnsSame) {
			return row
		}
		const clientRow = {}
		for (const col in row) {
			clientRow[columns[col] ?? col] = row[col]
		}
		return clientRow
	}
	columns(table2, cols) {
		const dest = this.#getTable(table2)
		const { allColumnsSame, columns } = dest
		return cols === void 0 || allColumnsSame ? cols : cols.map((col) => columns[col] ?? col)
	}
}
var NOBODY_CAN = []
async function definePermissions(schema2, definer) {
	const expressionBuilders = {}
	for (const name of Object.keys(schema2.tables)) {
		expressionBuilders[name] = new StaticQuery(schema2, name).expressionBuilder()
	}
	const config = await definer()
	return compilePermissions(schema2, config, expressionBuilders)
}
function compilePermissions(schema2, authz, expressionBuilders) {
	if (!authz) {
		return void 0
	}
	const nameMapper = clientToServer(schema2.tables)
	const ret = { tables: {} }
	for (const [tableName, tableConfig] of Object.entries(authz)) {
		const serverName = schema2.tables[tableName].serverName ?? tableName
		ret.tables[serverName] = {
			row: compileRowConfig(nameMapper, tableName, tableConfig.row, expressionBuilders[tableName]),
			cell: compileCellConfig(
				nameMapper,
				tableName,
				tableConfig.cell,
				expressionBuilders[tableName]
			),
		}
	}
	return ret
}
function compileRowConfig(clientToServer2, tableName, rowRules, expressionBuilder) {
	if (!rowRules) {
		return void 0
	}
	return {
		select: compileRules(clientToServer2, tableName, rowRules.select, expressionBuilder),
		insert: compileRules(clientToServer2, tableName, rowRules.insert, expressionBuilder),
		update: {
			preMutation: compileRules(
				clientToServer2,
				tableName,
				rowRules.update?.preMutation,
				expressionBuilder
			),
			postMutation: compileRules(
				clientToServer2,
				tableName,
				rowRules.update?.postMutation,
				expressionBuilder
			),
		},
		delete: compileRules(clientToServer2, tableName, rowRules.delete, expressionBuilder),
	}
}
function compileRules(clientToServer2, tableName, rules, expressionBuilder) {
	if (!rules) {
		return void 0
	}
	return rules.map((rule) => {
		const cond = rule(authDataRef, expressionBuilder)
		return ['allow', mapCondition(cond, tableName, clientToServer2)]
	})
}
function compileCellConfig(clientToServer2, tableName, cellRules, expressionBuilder) {
	if (!cellRules) {
		return void 0
	}
	const ret = {}
	for (const [columnName, rules] of Object.entries(cellRules)) {
		ret[columnName] = {
			select: compileRules(clientToServer2, tableName, rules.select, expressionBuilder),
			insert: compileRules(clientToServer2, tableName, rules.insert, expressionBuilder),
			update: {
				preMutation: compileRules(
					clientToServer2,
					tableName,
					rules.update?.preMutation,
					expressionBuilder
				),
				postMutation: compileRules(
					clientToServer2,
					tableName,
					rules.update?.postMutation,
					expressionBuilder
				),
			},
			delete: compileRules(clientToServer2, tableName, rules.delete, expressionBuilder),
		}
	}
	return ret
}
var CallTracker = class _CallTracker {
	#anchor
	#path
	constructor(anchor, path2) {
		this.#anchor = anchor
		this.#path = path2
	}
	get(target, prop) {
		if (prop === toStaticParam) {
			return target[toStaticParam]
		}
		assert(typeof prop === 'string')
		const path2 = [...this.#path, prop]
		return new Proxy(
			{
				[toStaticParam]: () => staticParam(this.#anchor, path2),
			},
			new _CallTracker(this.#anchor, path2)
		)
	}
}
function baseTracker(anchor) {
	return new Proxy(
		{
			[toStaticParam]: () => {
				throw new Error('no JWT field specified')
			},
		},
		new CallTracker(anchor, [])
	)
}
var authDataRef = baseTracker('authData')
var preMutationRowRef = baseTracker('preMutationRow')
var deleteClientsBodySchema = valita_exports.union(
	readonlyObject({
		clientIDs: readonlyArray(valita_exports.string()).optional(),
		clientGroupIDs: readonlyArray(valita_exports.string()).optional(),
	})
)
var deleteClientsMessageSchema = valita_exports.tuple([
	valita_exports.literal('deleteClients'),
	deleteClientsBodySchema,
])
var putOpSchema = valita_exports.object({
	op: valita_exports.literal('put'),
	hash: valita_exports.string(),
	ast: astSchema,
	ttl: valita_exports.number().optional(),
})
var delOpSchema = valita_exports.object({
	op: valita_exports.literal('del'),
	hash: valita_exports.string(),
})
var clearOpSchema = valita_exports.object({
	op: valita_exports.literal('clear'),
})
var patchOpSchema = valita_exports.union(putOpSchema, delOpSchema, clearOpSchema)
var queriesPatchSchema = valita_exports.array(patchOpSchema)
var connectedBodySchema = valita_exports.object({
	wsid: valita_exports.string(),
	timestamp: valita_exports.number().optional(),
})
var connectedMessageSchema = valita_exports.tuple([
	valita_exports.literal('connected'),
	connectedBodySchema,
])
var initConnectionBodySchema = valita_exports.object({
	desiredQueriesPatch: queriesPatchSchema,
	deleted: deleteClientsBodySchema.optional(),
})
var initConnectionMessageSchema = valita_exports.tuple([
	valita_exports.literal('initConnection'),
	initConnectionBodySchema,
])
var AuthInvalidated = 'AuthInvalidated'
var ClientNotFound = 'ClientNotFound'
var InvalidConnectionRequest = 'InvalidConnectionRequest'
var InvalidConnectionRequestBaseCookie = 'InvalidConnectionRequestBaseCookie'
var InvalidConnectionRequestLastMutationID = 'InvalidConnectionRequestLastMutationID'
var InvalidConnectionRequestClientDeleted = 'InvalidConnectionRequestClientDeleted'
var InvalidMessage = 'InvalidMessage'
var InvalidPush = 'InvalidPush'
var MutationFailed = 'MutationFailed'
var MutationRateLimited = 'MutationRateLimited'
var Rebalance = 'Rebalance'
var Rehome = 'Rehome'
var Unauthorized = 'Unauthorized'
var VersionNotSupported = 'VersionNotSupported'
var SchemaVersionNotSupported = 'SchemaVersionNotSupported'
var ServerOverloaded = 'ServerOverloaded'
var Internal = 'Internal'
var basicErrorKindSchema = valita_exports.union(
	valita_exports.literal(AuthInvalidated),
	valita_exports.literal(ClientNotFound),
	valita_exports.literal(InvalidConnectionRequest),
	valita_exports.literal(InvalidConnectionRequestBaseCookie),
	valita_exports.literal(InvalidConnectionRequestLastMutationID),
	valita_exports.literal(InvalidConnectionRequestClientDeleted),
	valita_exports.literal(InvalidMessage),
	valita_exports.literal(InvalidPush),
	valita_exports.literal(MutationRateLimited),
	valita_exports.literal(MutationFailed),
	valita_exports.literal(Unauthorized),
	valita_exports.literal(VersionNotSupported),
	valita_exports.literal(SchemaVersionNotSupported),
	valita_exports.literal(Internal)
)
var basicErrorBodySchema = valita_exports.object({
	kind: basicErrorKindSchema,
	message: valita_exports.string(),
})
var backoffErrorKindSchema = valita_exports.union(
	valita_exports.literal(Rebalance),
	valita_exports.literal(Rehome),
	valita_exports.literal(ServerOverloaded)
)
var backoffBodySchema = valita_exports.object({
	kind: backoffErrorKindSchema,
	message: valita_exports.string(),
	minBackoffMs: valita_exports.number().optional(),
	maxBackoffMs: valita_exports.number().optional(),
	// Query parameters to send in the next reconnect. In the event of
	// a conflict, these will be overridden by the parameters used by
	// the client; it is the responsibility of the server to avoid
	// parameter name conflicts.
	//
	// The parameters will only be added to the immediately following
	// reconnect, and not after that.
	reconnectParams: valita_exports.record(valita_exports.string()).optional(),
})
var errorBodySchema = valita_exports.union(basicErrorBodySchema, backoffBodySchema)
var errorMessageSchema = valita_exports.tuple([valita_exports.literal('error'), errorBodySchema])
var primaryKeySchema = readonly(
	valita_exports
		.tuple([valita_exports.string()])
		.concat(valita_exports.array(valita_exports.string()))
)
var primaryKeyValueSchema = valita_exports.union(
	valita_exports.string(),
	valita_exports.number(),
	valita_exports.boolean()
)
var primaryKeyValueRecordSchema = readonlyRecord(primaryKeyValueSchema)
var putOpSchema2 = valita_exports.object({
	op: valita_exports.literal('put'),
	tableName: valita_exports.string(),
	value: rowSchema,
})
var updateOpSchema = valita_exports.object({
	op: valita_exports.literal('update'),
	tableName: valita_exports.string(),
	id: primaryKeyValueRecordSchema,
	merge: jsonObjectSchema.optional(),
	constrain: valita_exports.array(valita_exports.string()).optional(),
})
var delOpSchema2 = valita_exports.object({
	op: valita_exports.literal('del'),
	tableName: valita_exports.string(),
	id: primaryKeyValueRecordSchema,
})
var clearOpSchema2 = valita_exports.object({
	op: valita_exports.literal('clear'),
})
var rowPatchOpSchema = valita_exports.union(
	putOpSchema2,
	updateOpSchema,
	delOpSchema2,
	clearOpSchema2
)
var rowsPatchSchema = valita_exports.array(rowPatchOpSchema)
var versionSchema = valita_exports.string()
var nullableVersionSchema = valita_exports.union(versionSchema, valita_exports.null())
var pokeStartBodySchema = valita_exports.object({
	pokeID: valita_exports.string(),
	// We always specify a Version as our cookie, but Replicache starts clients
	// with initial cookie `null`, before the first request. So we have to be
	// able to send a base cookie with value `null` to match that state.
	baseCookie: nullableVersionSchema,
	// Deprecated: Replaced by pokeEnd.cookie.
	cookie: versionSchema.optional(),
	/**
	 * This field is always set if the poke contains a `rowsPatch`.
	 * It may be absent for patches that only update clients and queries.
	 */
	schemaVersions: valita_exports
		.object({
			minSupportedVersion: valita_exports.number(),
			maxSupportedVersion: valita_exports.number(),
		})
		.optional(),
	timestamp: valita_exports.number().optional(),
})
var pokePartBodySchema = valita_exports.object({
	pokeID: valita_exports.string(),
	// Changes to last mutation id by client id.
	lastMutationIDChanges: valita_exports.record(valita_exports.number()).optional(),
	// Patches to the desired query sets by client id.
	desiredQueriesPatches: valita_exports.record(queriesPatchSchema).optional(),
	// Patches to the set of queries for which entities are sync'd in
	// rowsPatch.
	gotQueriesPatch: queriesPatchSchema.optional(),
	// Patches to the rows set.
	rowsPatch: rowsPatchSchema.optional(),
})
var pokeEndBodySchema = valita_exports.object({
	pokeID: valita_exports.string(),
	// Note: This should be ignored (and may be empty) if cancel === `true`.
	cookie: versionSchema,
	// If `true`, the poke with id `pokeID` should be discarded without
	// applying it.
	cancel: valita_exports.boolean().optional(),
})
var pokeStartMessageSchema = valita_exports.tuple([
	valita_exports.literal('pokeStart'),
	pokeStartBodySchema,
])
var pokePartMessageSchema = valita_exports.tuple([
	valita_exports.literal('pokePart'),
	pokePartBodySchema,
])
var pokeEndMessageSchema = valita_exports.tuple([
	valita_exports.literal('pokeEnd'),
	pokeEndBodySchema,
])
var pongBodySchema = valita_exports.object({})
var pongMessageSchema = valita_exports.tuple([valita_exports.literal('pong'), pongBodySchema])
var pullRequestBodySchema = valita_exports.object({
	clientGroupID: valita_exports.string(),
	cookie: nullableVersionSchema,
	requestID: valita_exports.string(),
})
var pullResponseBodySchema = valita_exports.object({
	cookie: versionSchema,
	// Matches pullRequestBodySchema requestID that initiated this response
	requestID: valita_exports.string(),
	lastMutationIDChanges: valita_exports.record(valita_exports.number()),
	// Pull is currently only used for mutation recovery which does not use
	// the patch so we save work by not computing the patch.
})
var pullRequestMessageSchema = valita_exports.tuple([
	valita_exports.literal('pull'),
	pullRequestBodySchema,
])
var pullResponseMessageSchema = valita_exports.tuple([
	valita_exports.literal('pull'),
	pullResponseBodySchema,
])
var warmBodySchema = valita_exports.object({
	payload: valita_exports.string(),
})
var warmMessageSchema = valita_exports.tuple([valita_exports.literal('warm'), warmBodySchema])
var downstreamSchema = valita_exports.union(
	connectedMessageSchema,
	warmMessageSchema,
	errorMessageSchema,
	pongMessageSchema,
	pokeStartMessageSchema,
	pokePartMessageSchema,
	pokeEndMessageSchema,
	pullResponseMessageSchema,
	deleteClientsMessageSchema
)
var CRUD = 'crud'
var Custom = 'custom'
var PROTOCOL_VERSION = 6
var MIN_SERVER_SUPPORTED_SYNC_PROTOCOL = 2
assert(MIN_SERVER_SUPPORTED_SYNC_PROTOCOL < PROTOCOL_VERSION)
var MIN_SERVER_SUPPORTED_PERMISSIONS_PROTOCOL = 4
assert(MIN_SERVER_SUPPORTED_PERMISSIONS_PROTOCOL < PROTOCOL_VERSION)
var CRUD_MUTATION_NAME = '_zero_crud'
var insertOpSchema = valita_exports.object({
	op: valita_exports.literal('insert'),
	tableName: valita_exports.string(),
	primaryKey: primaryKeySchema,
	value: rowSchema,
})
var upsertOpSchema = valita_exports.object({
	op: valita_exports.literal('upsert'),
	tableName: valita_exports.string(),
	primaryKey: primaryKeySchema,
	value: rowSchema,
})
var updateOpSchema2 = valita_exports.object({
	op: valita_exports.literal('update'),
	tableName: valita_exports.string(),
	primaryKey: primaryKeySchema,
	// Partial value with at least the primary key fields
	value: rowSchema,
})
var deleteOpSchema = valita_exports.object({
	op: valita_exports.literal('delete'),
	tableName: valita_exports.string(),
	primaryKey: primaryKeySchema,
	// Partial value representing the primary key
	value: primaryKeyValueRecordSchema,
})
var crudOpSchema = valita_exports.union(
	insertOpSchema,
	upsertOpSchema,
	updateOpSchema2,
	deleteOpSchema
)
var crudArgSchema = valita_exports.object({
	ops: valita_exports.array(crudOpSchema),
})
var crudArgsSchema = valita_exports.tuple([crudArgSchema])
var crudMutationSchema = valita_exports.object({
	type: valita_exports.literal(CRUD),
	id: valita_exports.number(),
	clientID: valita_exports.string(),
	name: valita_exports.literal(CRUD_MUTATION_NAME),
	args: crudArgsSchema,
	timestamp: valita_exports.number(),
})
var customMutationSchema = valita_exports.object({
	type: valita_exports.literal(Custom),
	id: valita_exports.number(),
	clientID: valita_exports.string(),
	name: valita_exports.string(),
	args: valita_exports.array(jsonSchema),
	timestamp: valita_exports.number(),
})
var mutationSchema = valita_exports.union(crudMutationSchema, customMutationSchema)
var pushBodySchema = valita_exports.object({
	clientGroupID: valita_exports.string(),
	mutations: valita_exports.array(mutationSchema),
	pushVersion: valita_exports.number(),
	schemaVersion: valita_exports.number(),
	timestamp: valita_exports.number(),
	requestID: valita_exports.string(),
})
var pushMessageSchema = valita_exports.tuple([valita_exports.literal('push'), pushBodySchema])
var mutationIDSchema = valita_exports.object({
	id: valita_exports.number(),
	clientID: valita_exports.string(),
})
var appErrorSchema = valita_exports.object({
	error: valita_exports.literal('app'),
	details: valita_exports.string(),
})
var zeroErrorSchema = valita_exports.object({
	error: valita_exports.literal('ooo-mutation'),
})
var mutationOkSchema = valita_exports.object({})
var mutationErrorSchema = valita_exports.union(appErrorSchema, zeroErrorSchema)
var mutationResultSchema = valita_exports.union(mutationOkSchema, mutationErrorSchema)
var mutationResponseSchema = valita_exports.object({
	id: mutationIDSchema,
	result: mutationResultSchema,
})
var pushOkSchema = valita_exports.object({
	mutations: valita_exports.array(mutationResponseSchema),
})
var unsupportedPushVersionSchema = valita_exports.object({
	error: valita_exports.literal('unsupported-push-version'),
})
var unsupportedSchemaVersionSchema = valita_exports.object({
	error: valita_exports.literal('unsupported-schema-version'),
})
var pushErrorSchema = valita_exports.union(
	unsupportedPushVersionSchema,
	unsupportedSchemaVersionSchema
)
var pushResponseSchema = valita_exports.union(pushOkSchema, pushErrorSchema)
var MAX_NODE_SIZE = 32
var BNode = class _BNode {
	// If this is an internal node, _keys[i] is the highest key in children[i].
	keys
	// True if this node might be within multiple `BTree`s (or have multiple parents).
	// If so, it must be cloned before being mutated to avoid changing an unrelated tree.
	// This is transitive: if it's true, children are also shared even if `isShared!=true`
	// in those children. (Certain operations will propagate isShared=true to children.)
	isShared
	constructor(keys) {
		this.keys = keys
		this.isShared = void 0
	}
	isInternal() {
		return false
	}
	maxKey() {
		return this.keys[this.keys.length - 1]
	}
	minKey() {
		return this.keys[0]
	}
	clone() {
		return new _BNode(this.keys.slice(0))
	}
	get(key, tree) {
		const i = indexOf(key, this.keys, -1, tree.comparator)
		return i < 0 ? void 0 : this.keys[i]
	}
	has(key, tree) {
		const i = indexOf(key, this.keys, -1, tree.comparator)
		return i >= 0 && i < this.keys.length
	}
	set(key, tree) {
		let i = indexOf(key, this.keys, -1, tree.comparator)
		if (i < 0) {
			i = ~i
			tree.size++
			if (this.keys.length < MAX_NODE_SIZE) {
				this.keys.splice(i, 0, key)
				return null
			}
			const newRightSibling = this.splitOffRightSide()
			let target = this
			if (i > this.keys.length) {
				i -= this.keys.length
				target = newRightSibling
			}
			target.keys.splice(i, 0, key)
			return newRightSibling
		}
		this.keys[i] = key
		return null
	}
	takeFromRight(rhs) {
		this.keys.push(rhs.keys.shift())
	}
	takeFromLeft(lhs) {
		this.keys.unshift(lhs.keys.pop())
	}
	splitOffRightSide() {
		const half = this.keys.length >> 1
		const keys = this.keys.splice(half)
		return new _BNode(keys)
	}
	delete(key, tree) {
		const cmp2 = tree.comparator
		const iLow = indexOf(key, this.keys, -1, cmp2)
		const iHigh = iLow + 1
		if (iLow < 0) {
			return false
		}
		const { keys } = this
		for (let i = iLow; i < iHigh; i++) {
			const key2 = keys[i]
			if (key2 !== keys[i] || this.isShared === true) {
				throw new Error('BTree illegally changed or cloned in delete')
			}
			this.keys.splice(i, 1)
			tree.size--
			return true
		}
		return false
	}
	mergeSibling(rhs, _) {
		this.keys.push(...rhs.keys)
	}
}
function indexOf(key, keys, failXor, comparator2) {
	let lo = 0
	let hi = keys.length
	let mid = hi >> 1
	while (lo < hi) {
		const c = comparator2(keys[mid], key)
		if (c < 0) {
			lo = mid + 1
		} else if (c > 0) {
			hi = mid
		} else if (c === 0) {
			return mid
		} else {
			if (key === key) {
				return keys.length
			}
			throw new Error('NaN was used as a key')
		}
		mid = (lo + hi) >> 1
	}
	return mid ^ failXor
}
var emptyLeaf = new BNode([])
emptyLeaf.isShared = true
var minValue = Symbol('min-value')
var maxValue = Symbol('max-value')
var IPV4_ADDRESS_REGEX =
	/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
var IPV6_ADDRESS_HOSTNAME_REGEX = /^\[[a-fA-F0-9:]*:[a-fA-F0-9:]*\]$/
var IP_ADDRESS_HOSTNAME_REGEX = new RegExp(
	`(${IPV4_ADDRESS_REGEX.source}|${IPV6_ADDRESS_HOSTNAME_REGEX.source})`
)
var DD_BASE_URL = new URL('https://http-intake.logs.datadoghq.com/api/v2/logs')
var MAX_ENTRY_BYTES = 5 * 1024 * 1024
var MAX_ENTRY_CHARS = MAX_ENTRY_BYTES / 4
var DID_NOT_CONNECT_VALUE = 100 * 1e3
var backoffStateSchema = valita_exports.object({
	lastReloadTime: valita_exports.number().default(0),
	nextIntervalMs: valita_exports.number().default(0),
})
var onSetConnectionStateSymbol = Symbol()
var exposedToTestingSymbol = Symbol()
var createLogOptionsSymbol = Symbol()

// ../../../packages/dotcom-shared/src/tlaSchema.ts
var user = table('user')
	.columns({
		id: string8(),
		name: string8(),
		email: string8(),
		avatar: string8(),
		color: string8(),
		exportFormat: string8(),
		exportTheme: string8(),
		exportBackground: boolean3(),
		exportPadding: boolean3(),
		createdAt: number4(),
		updatedAt: number4(),
		flags: string8(),
		locale: string8().optional(),
		animationSpeed: number4().optional(),
		edgeScrollSpeed: number4().optional(),
		colorScheme: string8().optional(),
		isSnapMode: boolean3().optional(),
		isWrapMode: boolean3().optional(),
		isDynamicSizeMode: boolean3().optional(),
		isPasteAtCursorMode: boolean3().optional(),
		allowAnalyticsCookie: boolean3().optional(),
	})
	.primaryKey('id')
var file_state = table('file_state')
	.columns({
		userId: string8(),
		fileId: string8(),
		firstVisitAt: number4().optional(),
		lastEditAt: number4().optional(),
		lastSessionState: string8().optional(),
		lastVisitAt: number4().optional(),
		isFileOwner: boolean3().optional(),
		isPinned: boolean3().optional(),
	})
	.primaryKey('userId', 'fileId')
var file = table('file')
	.columns({
		id: string8(),
		name: string8(),
		ownerId: string8(),
		ownerName: string8(),
		ownerAvatar: string8(),
		thumbnail: string8(),
		shared: boolean3(),
		sharedLinkType: string8(),
		published: boolean3(),
		lastPublished: number4(),
		publishedSlug: string8(),
		createdAt: number4(),
		updatedAt: number4(),
		isEmpty: boolean3(),
		isDeleted: boolean3(),
		createSource: string8().optional(),
	})
	.primaryKey('id', 'ownerId', 'publishedSlug')
var fileRelationships = relationships(file, ({ one: one2, many: many2 }) => ({
	owner: one2({
		sourceField: ['ownerId'],
		destField: ['id'],
		destSchema: user,
	}),
	states: many2({
		sourceField: ['id'],
		destField: ['fileId'],
		destSchema: file_state,
	}),
}))
var fileStateRelationships = relationships(file_state, ({ one: one2 }) => ({
	file: one2({
		sourceField: ['fileId'],
		destField: ['id'],
		destSchema: file,
	}),
	user: one2({
		sourceField: ['userId'],
		destField: ['id'],
		destSchema: user,
	}),
}))
var immutableColumns = {
	user: /* @__PURE__ */ new Set(['id', 'email', 'createdAt', 'avatar']),
	file: /* @__PURE__ */ new Set(['id', 'ownerId', 'createdAt']),
	file_state: /* @__PURE__ */ new Set(['userId', 'fileId', 'firstVisitAt', 'isFileOwner']),
}
function isColumnMutable(tableName, column) {
	return !immutableColumns[tableName].has(column)
}
var schema = createSchema(1, {
	tables: [user, file, file_state],
	relationships: [fileRelationships, fileStateRelationships],
})
var NO_UPDATE = {
	update: {
		preMutation: NOBODY_CAN,
		postMutation: NOBODY_CAN,
	},
}
var permissions = definePermissions(schema, () => {
	const allowIfIsUser = (authData, { cmp: cmp2 }) => cmp2('id', '=', authData.sub)
	const allowIfFileOwner = (authData, { cmp: cmp2 }) => cmp2('ownerId', '=', authData.sub)
	const allowIfIsUserId = (authData, { cmp: cmp2 }) => cmp2('userId', '=', authData.sub)
	const userHasGuestFileState = (authData, { exists, cmp: cmp2, and: and3 }) =>
		and3(
			cmp2('shared', '=', true),
			exists('states', (q) => q.where('userId', '=', authData.sub))
		)
	const disallowIfDeleted = (_authData, { cmp: cmp2 }) => cmp2('isDeleted', '=', false)
	function and2(...rules) {
		return (authData, eb) => eb.and(...rules.map((rule) => rule(authData, eb)))
	}
	return {
		user: {
			row: {
				select: [allowIfIsUser],
				insert: [allowIfIsUser],
				update: {
					preMutation: [allowIfIsUser],
					postMutation: [allowIfIsUser],
				},
			},
			cell: {
				email: NO_UPDATE,
				createdAt: NO_UPDATE,
				updatedAt: NO_UPDATE,
				avatar: NO_UPDATE,
			},
		},
		file: {
			row: {
				select: [allowIfFileOwner, userHasGuestFileState],
				insert: [allowIfFileOwner],
				update: {
					preMutation: [and2(allowIfFileOwner, disallowIfDeleted)],
					postMutation: [allowIfFileOwner],
				},
			},
			cell: {
				createdAt: NO_UPDATE,
				ownerName: NO_UPDATE,
				ownerAvatar: NO_UPDATE,
				createSource: NO_UPDATE,
				updatedAt: NO_UPDATE,
			},
		},
		file_state: {
			row: {
				select: [allowIfIsUserId],
				insert: [allowIfIsUserId],
				update: {
					preMutation: [allowIfIsUserId],
					postMutation: [allowIfIsUserId],
				},
				delete: [allowIfIsUserId],
			},
			cell: {
				isFileOwner: NO_UPDATE,
				firstVisitAt: NO_UPDATE,
			},
		},
	}
})
export { file, file_state, isColumnMutable, permissions, schema, user }
