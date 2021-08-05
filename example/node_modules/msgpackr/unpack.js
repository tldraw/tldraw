"use strict"
var decoder
try {
	decoder = new TextDecoder()
} catch(error) {}
var src
var srcEnd
var position = 0
var alreadySet
const EMPTY_ARRAY = []
var strings = EMPTY_ARRAY
var stringPosition = 0
var currentUnpackr = {}
var currentStructures
var srcString
var srcStringStart = 0
var srcStringEnd = 0
var referenceMap
var currentExtensions = []
var dataView
var defaultOptions = {
	useRecords: false,
	mapsAsObjects: true
}
export class C1Type {}
export const C1 = new C1Type()
C1.name = 'MessagePack 0xC1'
var sequentialMode = false

export class Unpackr {
	constructor(options) {
		if (options) {
			if (options.useRecords === false && options.mapsAsObjects === undefined)
				options.mapsAsObjects = true
			if (options.getStructures && !options.structures)
				(options.structures = []).uninitialized = true // this is what we use to denote an uninitialized structures
		}
		Object.assign(this, options)
	}
	unpack(source, end) {
		if (src) {
			// re-entrant execution, save the state and restore it after we do this unpack
			return saveState(() => {
				clearSource()
				return this ? this.unpack(source, end) : Unpackr.prototype.unpack.call(defaultOptions, source, end)
			})
		}
		srcEnd = end > -1 ? end : source.length
		position = 0
		stringPosition = 0
		srcStringEnd = 0
		srcString = null
		strings = EMPTY_ARRAY
		src = source
		// this provides cached access to the data view for a buffer if it is getting reused, which is a recommend
		// technique for getting data from a database where it can be copied into an existing buffer instead of creating
		// new ones
		dataView = source.dataView || (source.dataView = new DataView(source.buffer, source.byteOffset, source.byteLength))
		if (this) {
			currentUnpackr = this
			if (this.structures) {
				currentStructures = this.structures
				return checkedRead()
			} else if (!currentStructures || currentStructures.length > 0) {
				currentStructures = []
			}
		} else {
			currentUnpackr = defaultOptions
			if (!currentStructures || currentStructures.length > 0)
				currentStructures = []
		}
		return checkedRead()
	}
	unpackMultiple(source, forEach) {
		let values, lastPosition = 0
		try {
			sequentialMode = true
			let size = source.length
			let value = this ? this.unpack(source, size) : defaultUnpackr.unpack(source, size)
			if (forEach) {
				forEach(value)
				while(position < size) {
					lastPosition = position
					if (forEach(checkedRead()) === false) {
						return
					}
				}
			}
			else {
				values = [ value ]
				while(position < size) {
					lastPosition = position
					values.push(checkedRead())
				}
				return values
			}
		} catch(error) {
			error.lastPosition = lastPosition
			error.values = values
			throw error
		} finally {
			sequentialMode = false
			clearSource()
		}
	}
	decode(source, end) {
		return this.unpack(source, end)
	}
}
export function getPosition() {
	return position
}
export function checkedRead() {
	try {
		let result = read()
		if (position == srcEnd) {
			// finished reading this source, cleanup references
			currentStructures = null
			src = null
			if (referenceMap)
				referenceMap = null
		} else if (position > srcEnd) {
			// over read
			let error = new Error('Unexpected end of MessagePack data')
			error.incomplete = true
			throw error
		} else if (!sequentialMode) {
			throw new Error('Data read, but end of buffer not reached')
		}
		// else more to read, but we are reading sequentially, so don't clear source yet
		return result
	} catch(error) {
		clearSource()
		if (error instanceof RangeError || error.message.startsWith('Unexpected end of buffer')) {
			error.incomplete = true
		}
		throw error
	}
}

export function read() {
	let token = src[position++]
	if (token < 0xa0) {
		if (token < 0x80) {
			if (token < 0x40)
				return token
			else {
				let structure = currentStructures[token & 0x3f]
				if (structure) {
					if (!structure.read)
						structure.read = createStructureReader(structure)
					return structure.read()
				} else if (currentUnpackr.getStructures) {
					let updatedStructures = saveState(() => {
						// save the state in case getStructures modifies our buffer
						src = null
						return currentUnpackr.getStructures()
					})
					if (currentStructures === true)
						currentUnpackr.structures = currentStructures = updatedStructures
					else
						currentStructures.splice.apply(currentStructures, [0, updatedStructures.length].concat(updatedStructures))
					structure = currentStructures[token & 0x3f]
					if (structure) {
						if (!structure.read)
							structure.read = createStructureReader(structure)
						return structure.read()
					} else
						return token
				} else
					return token
			}
		} else if (token < 0x90) {
			// map
			token -= 0x80
			if (currentUnpackr.mapsAsObjects) {
				let object = {}
				for (let i = 0; i < token; i++) {
					object[readKey()] = read()
				}
				return object
			} else {
				let map = new Map()
				for (let i = 0; i < token; i++) {
					map.set(read(), read())
				}
				return map
			}
		} else {
			token -= 0x90
			let array = new Array(token)
			for (let i = 0; i < token; i++) {
				array[i] = read()
			}
			return array
		}
	} else if (token < 0xc0) {
		// fixstr
		let length = token - 0xa0
		if (srcStringEnd >= position) {
			return srcString.slice(position - srcStringStart, (position += length) - srcStringStart)
		}
		if (srcStringEnd == 0 && srcEnd < 140) {
			// for small blocks, avoiding the overhead of the extract call is helpful
			let string = length < 16 ? shortStringInJS(length) : longStringInJS(length)
			if (string != null)
				return string
		}
		return readFixedString(length)
	} else {
		let value
		switch (token) {
			case 0xc0: return null
			case 0xc1: return C1; // "never-used", return special object to denote that
			case 0xc2: return false
			case 0xc3: return true
			case 0xc4:
				// bin 8
				return readBin(src[position++])
			case 0xc5:
				// bin 16
				value = dataView.getUint16(position)
				position += 2
				return readBin(value)
			case 0xc6:
				// bin 32
				value = dataView.getUint32(position)
				position += 4
				return readBin(value)
			case 0xc7:
				// ext 8
				return readExt(src[position++])
			case 0xc8:
				// ext 16
				value = dataView.getUint16(position)
				position += 2
				return readExt(value)
			case 0xc9:
				// ext 32
				value = dataView.getUint32(position)
				position += 4
				return readExt(value)
			case 0xca:
				value = dataView.getFloat32(position)
				if (currentUnpackr.useFloat32 > 2) {
					// this does rounding of numbers that were encoded in 32-bit float to nearest significant decimal digit that could be preserved
					let multiplier = mult10[((src[position] & 0x7f) << 1) | (src[position + 1] >> 7)]
					position += 4
					return ((multiplier * value + (value > 0 ? 0.5 : -0.5)) >> 0) / multiplier
				}
				position += 4
				return value
			case 0xcb:
				value = dataView.getFloat64(position)
				position += 8
				return value
			// uint handlers
			case 0xcc:
				return src[position++]
			case 0xcd:
				value = dataView.getUint16(position)
				position += 2
				return value
			case 0xce:
				value = dataView.getUint32(position)
				position += 4
				return value
			case 0xcf:
				if (currentUnpackr.uint64AsNumber)
					return src[position++] * 0x100000000000000 + src[position++] * 0x1000000000000 + src[position++] * 0x10000000000 + src[position++] * 0x100000000 +
						src[position++] * 0x1000000 + (src[position++] << 16) + (src[position++] << 8) + src[position++]
				value = dataView.getBigUint64(position)
				position += 8
				return value

			// int handlers
			case 0xd0:
				return dataView.getInt8(position++)
			case 0xd1:
				value = dataView.getInt16(position)
				position += 2
				return value
			case 0xd2:
				value = dataView.getInt32(position)
				position += 4
				return value
			case 0xd3:
				value = dataView.getBigInt64(position)
				position += 8
				return value

			case 0xd4:
				// fixext 1
				value = src[position++]
				if (value == 0x72) {
					return recordDefinition(src[position++])
				} else {
					let extension = currentExtensions[value]
					if (extension) {
						if (extension.read) {
							position++ // skip filler byte
							return extension.read(read())
						} else if (extension.noBuffer) {
							position++ // skip filler byte
							return extension()
						} else
							return extension(src.subarray(position, ++position))
					} else
						throw new Error('Unknown extension ' + value)
				}
			case 0xd5:
				// fixext 2
				return readExt(2)
			case 0xd6:
				// fixext 4
				return readExt(4)
			case 0xd7:
				// fixext 8
				return readExt(8)
			case 0xd8:
				// fixext 16
				return readExt(16)
			case 0xd9:
			// str 8
				value = src[position++]
				if (srcStringEnd >= position) {
					return srcString.slice(position - srcStringStart, (position += value) - srcStringStart)
				}
				return readString8(value)
			case 0xda:
			// str 16
				value = dataView.getUint16(position)
				position += 2
				if (srcStringEnd >= position) {
					return srcString.slice(position - srcStringStart, (position += value) - srcStringStart)
				}
				return readString16(value)
			case 0xdb:
			// str 32
				value = dataView.getUint32(position)
				position += 4
				if (srcStringEnd >= position) {
					return srcString.slice(position - srcStringStart, (position += value) - srcStringStart)
				}
				return readString32(value)
			case 0xdc:
			// array 16
				value = dataView.getUint16(position)
				position += 2
				return readArray(value)
			case 0xdd:
			// array 32
				value = dataView.getUint32(position)
				position += 4
				return readArray(value)
			case 0xde:
			// map 16
				value = dataView.getUint16(position)
				position += 2
				return readMap(value)
			case 0xdf:
			// map 32
				value = dataView.getUint32(position)
				position += 4
				return readMap(value)
			default: // negative int
				if (token >= 0xe0)
					return token - 0x100
				if (token === undefined) {
					let error = new Error('Unexpected end of MessagePack data')
					error.incomplete = true
					throw error
				}
				throw new Error('Unknown MessagePack token ' + token)

		}
	}
}
const validName = /^[a-zA-Z_$][a-zA-Z\d_$]*$/
function createStructureReader(structure) {
	function readObject() {
		// This initial function is quick to instantiate, but runs slower. After several iterations pay the cost to build the faster function
		if (readObject.count++ > 2) {
			this.read = (new Function('r', 'return function(){return {' + structure.map(key => validName.test(key) ? key + ':r()' : ('[' + JSON.stringify(key) + ']:r()')).join(',') + '}}'))(read)
			return this.read()
		}
		let object = {}
		for (let i = 0, l = structure.length; i < l; i++) {
			let key = structure[i]
			object[key] = read()
		}
		return object
	}
	readObject.count = 0
	return readObject
}

var readFixedString = readStringJS
var readString8 = readStringJS
var readString16 = readStringJS
var readString32 = readStringJS

export function setExtractor(extractStrings) {
	readFixedString = readString(1)
	readString8 = readString(2)
	readString16 = readString(3)
	readString32 = readString(5)
	function readString(headerLength) {
		return function readString(length) {
			let string = strings[stringPosition++]
			if (string == null) {
				let extraction = extractStrings(position - headerLength, srcEnd, src)
				if (typeof extraction == 'string') {
					string = extraction
					strings = EMPTY_ARRAY
				} else {
					strings = extraction
					stringPosition = 1
					srcStringEnd = 1 // even if a utf-8 string was decoded, must indicate we are in the midst of extracted strings and can't skip strings
					string = strings[0]
					if (string === undefined)
						throw new Error('Unexpected end of buffer')
				}
			}
			let srcStringLength = string.length
			if (srcStringLength <= length) {
				position += length
				return string
			}
			srcString = string
			srcStringStart = position
			srcStringEnd = position + srcStringLength
			position += length
			return string.slice(0, length) // we know we just want the beginning
		}
	}
}
function readStringJS(length) {
	let result
	if (length < 16) {
		if (result = shortStringInJS(length))
			return result
	}
	if (length > 64 && decoder)
		return decoder.decode(src.subarray(position, position += length))
	const end = position + length
	const units = []
	result = ''
	while (position < end) {
		const byte1 = src[position++]
		if ((byte1 & 0x80) === 0) {
			// 1 byte
			units.push(byte1)
		} else if ((byte1 & 0xe0) === 0xc0) {
			// 2 bytes
			const byte2 = src[position++] & 0x3f
			units.push(((byte1 & 0x1f) << 6) | byte2)
		} else if ((byte1 & 0xf0) === 0xe0) {
			// 3 bytes
			const byte2 = src[position++] & 0x3f
			const byte3 = src[position++] & 0x3f
			units.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3)
		} else if ((byte1 & 0xf8) === 0xf0) {
			// 4 bytes
			const byte2 = src[position++] & 0x3f
			const byte3 = src[position++] & 0x3f
			const byte4 = src[position++] & 0x3f
			let unit = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4
			if (unit > 0xffff) {
				unit -= 0x10000
				units.push(((unit >>> 10) & 0x3ff) | 0xd800)
				unit = 0xdc00 | (unit & 0x3ff)
			}
			units.push(unit)
		} else {
			units.push(byte1)
		}

		if (units.length >= 0x1000) {
			result += fromCharCode.apply(String, units)
			units.length = 0
		}
	}

	if (units.length > 0) {
		result += fromCharCode.apply(String, units)
	}

	return result
}

function readArray(length) {
	let array = new Array(length)
	for (let i = 0; i < length; i++) {
		array[i] = read()
	}
	return array
}

function readMap(length) {
	if (currentUnpackr.mapsAsObjects) {
		let object = {}
		for (let i = 0; i < length; i++) {
			object[readKey()] = read()
		}
		return object
	} else {
		let map = new Map()
		for (let i = 0; i < length; i++) {
			map.set(read(), read())
		}
		return map
	}
}

var fromCharCode = String.fromCharCode
function longStringInJS(length) {
	let start = position
	let bytes = new Array(length)
	for (let i = 0; i < length; i++) {
		const byte = src[position++];
		if ((byte & 0x80) > 0) {
			position = start
    			return
    		}
    		bytes[i] = byte
    	}
    	return fromCharCode.apply(String, bytes)
}
function shortStringInJS(length) {
	if (length < 4) {
		if (length < 2) {
			if (length === 0)
				return ''
			else {
				let a = src[position++]
				if ((a & 0x80) > 1) {
					position -= 1
					return
				}
				return fromCharCode(a)
			}
		} else {
			let a = src[position++]
			let b = src[position++]
			if ((a & 0x80) > 0 || (b & 0x80) > 0) {
				position -= 2
				return
			}
			if (length < 3)
				return fromCharCode(a, b)
			let c = src[position++]
			if ((c & 0x80) > 0) {
				position -= 3
				return
			}
			return fromCharCode(a, b, c)
		}
	} else {
		let a = src[position++]
		let b = src[position++]
		let c = src[position++]
		let d = src[position++]
		if ((a & 0x80) > 0 || (b & 0x80) > 0 || (c & 0x80) > 0 || (d & 0x80) > 0) {
			position -= 4
			return
		}
		if (length < 6) {
			if (length === 4)
				return fromCharCode(a, b, c, d)
			else {
				let e = src[position++]
				if ((e & 0x80) > 0) {
					position -= 5
					return
				}
				return fromCharCode(a, b, c, d, e)
			}
		} else if (length < 8) {
			let e = src[position++]
			let f = src[position++]
			if ((e & 0x80) > 0 || (f & 0x80) > 0) {
				position -= 6
				return
			}
			if (length < 7)
				return fromCharCode(a, b, c, d, e, f)
			let g = src[position++]
			if ((g & 0x80) > 0) {
				position -= 7
				return
			}
			return fromCharCode(a, b, c, d, e, f, g)
		} else {
			let e = src[position++]
			let f = src[position++]
			let g = src[position++]
			let h = src[position++]
			if ((e & 0x80) > 0 || (f & 0x80) > 0 || (g & 0x80) > 0 || (h & 0x80) > 0) {
				position -= 8
				return
			}
			if (length < 10) {
				if (length === 8)
					return fromCharCode(a, b, c, d, e, f, g, h)
				else {
					let i = src[position++]
					if ((i & 0x80) > 0) {
						position -= 9
						return
					}
					return fromCharCode(a, b, c, d, e, f, g, h, i)
				}
			} else if (length < 12) {
				let i = src[position++]
				let j = src[position++]
				if ((i & 0x80) > 0 || (j & 0x80) > 0) {
					position -= 10
					return
				}
				if (length < 11)
					return fromCharCode(a, b, c, d, e, f, g, h, i, j)
				let k = src[position++]
				if ((k & 0x80) > 0) {
					position -= 11
					return
				}
				return fromCharCode(a, b, c, d, e, f, g, h, i, j, k)
			} else {
				let i = src[position++]
				let j = src[position++]
				let k = src[position++]
				let l = src[position++]
				if ((i & 0x80) > 0 || (j & 0x80) > 0 || (k & 0x80) > 0 || (l & 0x80) > 0) {
					position -= 12
					return
				}
				if (length < 14) {
					if (length === 12)
						return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l)
					else {
						let m = src[position++]
						if ((m & 0x80) > 0) {
							position -= 13
							return
						}
						return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m)
					}
				} else {
					let m = src[position++]
					let n = src[position++]
					if ((m & 0x80) > 0 || (n & 0x80) > 0) {
						position -= 14
						return
					}
					if (length < 15)
						return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n)
					let o = src[position++]
					if ((o & 0x80) > 0) {
						position -= 15
						return
					}
					return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
				}
			}
		}
	}
}

function readBin(length) {
	return currentUnpackr.copyBuffers ?
		// specifically use the copying slice (not the node one)
		Uint8Array.prototype.slice.call(src, position, position += length) :
		src.subarray(position, position += length)
}
function readExt(length) {
	let type = src[position++]
	if (currentExtensions[type]) {
		return currentExtensions[type](src.subarray(position, position += length))
	}
	else
		throw new Error('Unknown extension type ' + type)
}

var keyCache = new Array(4096)
function readKey() {
	let length = src[position++]
	if (length >= 0xa0 && length < 0xc0) {
		// fixstr, potentially use key cache
		length = length - 0xa0
		if (srcStringEnd >= position) // if it has been extracted, must use it (and faster anyway)
			return srcString.slice(position - srcStringStart, (position += length) - srcStringStart)
		else if (!(srcStringEnd == 0 && srcEnd < 180))
			return readFixedString(length)
	} else { // not cacheable, go back and do a standard read
		position--
		return read()
	}
	let key = ((length << 5) ^ (length > 1 ? dataView.getUint16(position) : length > 0 ? src[position] : 0)) & 0xfff
	let entry = keyCache[key]
	let checkPosition = position
	let end = position + length - 3
	let chunk
	let i = 0
	if (entry && entry.bytes == length) {
		while (checkPosition < end) {
			chunk = dataView.getUint32(checkPosition)
			if (chunk != entry[i++]) {
				checkPosition = 0x70000000
				break
			}
			checkPosition += 4
		}
		end += 3
		while (checkPosition < end) {
			chunk = src[checkPosition++]
			if (chunk != entry[i++]) {
				checkPosition = 0x70000000
				break
			}
		}
		if (checkPosition === end) {
			position = checkPosition
			return entry.string
		}
		end -= 3
		checkPosition = position
	}
	entry = []
	keyCache[key] = entry
	entry.bytes = length
	while (checkPosition < end) {
		chunk = dataView.getUint32(checkPosition)
		entry.push(chunk)
		checkPosition += 4
	}
	end += 3
	while (checkPosition < end) {
		chunk = src[checkPosition++]
		entry.push(chunk)
	}
	// for small blocks, avoiding the overhead of the extract call is helpful
	let string = length < 16 ? shortStringInJS(length) : longStringInJS(length)
	if (string != null)
		return entry.string = string
	return entry.string = readFixedString(length)
}

// the registration of the record definition extension (as "r")
const recordDefinition = (id) => {
	let structure = currentStructures[id & 0x3f] = read()
	structure.read = createStructureReader(structure)
	return structure.read()
}
var glbl = typeof window == 'object' ? window : global
currentExtensions[0] = () => {} // notepack defines extension 0 to mean undefined, so use that as the default here
currentExtensions[0].noBuffer = true

currentExtensions[0x65] = () => {
	let data = read()
	return (glbl[data[0]] || Error)(data[1])
}

currentExtensions[0x69] = (data) => {
	// id extension (for structured clones)
	let id = dataView.getUint32(position - 4)
	if (!referenceMap)
		referenceMap = new Map()
	let token = src[position]
	let target
	// TODO: handle Maps, Sets, and other types that can cycle; this is complicated, because you potentially need to read
	// ahead past references to record structure definitions
	if (token >= 0x90 && token < 0xa0 || token == 0xdc || token == 0xdd)
		target = []
	else
		target = {}

	let refEntry = { target } // a placeholder object
	referenceMap.set(id, refEntry)
	let targetProperties = read() // read the next value as the target object to id
	if (refEntry.used) // there is a cycle, so we have to assign properties to original target
		return Object.assign(target, targetProperties)
	refEntry.target = targetProperties // the placeholder wasn't used, replace with the deserialized one
	return targetProperties // no cycle, can just use the returned read object
}

currentExtensions[0x70] = (data) => {
	// pointer extension (for structured clones)
	let id = dataView.getUint32(position - 4)
	let refEntry = referenceMap.get(id)
	refEntry.used = true
	return refEntry.target
}

currentExtensions[0x73] = () => new Set(read())

export const typedArrays = ['Int8','Uint8','Uint8Clamped','Int16','Uint16','Int32','Uint32','Float32','Float64','BigInt64','BigUint64'].map(type => type + 'Array')

currentExtensions[0x74] = (data) => {
	let typeCode = data[0]
	let typedArrayName = typedArrays[typeCode]
	if (!typedArrayName)
		throw new Error('Could not find typed array for code ' + typeCode)
	// we have to always slice/copy here to get a new ArrayBuffer that is word/byte aligned
	return new glbl[typedArrayName](Uint8Array.prototype.slice.call(data, 1).buffer)
}
currentExtensions[0x78] = () => {
	let data = read()
	return new RegExp(data[0], data[1])
}

currentExtensions[0xff] = (data) => {
	// 32-bit date extension
	if (data.length == 4)
		return new Date((data[0] * 0x1000000 + (data[1] << 16) + (data[2] << 8) + data[3]) * 1000)
	else if (data.length == 8)
		return new Date(
			((data[0] << 22) + (data[1] << 14) + (data[2] << 6) + (data[3] >> 2)) / 1000000 +
			((data[3] & 0x3) * 0x100000000 + data[4] * 0x1000000 + (data[5] << 16) + (data[6] << 8) + data[7]) * 1000)
	else if (data.length == 12)// TODO: Implement support for negative
		return new Date(
			((data[0] << 24) + (data[1] << 16) + (data[2] << 8) + data[3]) / 1000000 +
			(((data[4] & 0x80) ? -0x1000000000000 : 0) + data[6] * 0x10000000000 + data[7] * 0x100000000 + data[8] * 0x1000000 + (data[9] << 16) + (data[10] << 8) + data[11]) * 1000)
	else
		throw new Error('Invalid timestamp length')
} // notepack defines extension 0 to mean undefined, so use that as the default here
// registration of bulk record definition?
// currentExtensions[0x52] = () =>

function saveState(callback) {
	let savedSrcEnd = srcEnd
	let savedPosition = position
	let savedStringPosition = stringPosition
	let savedSrcStringStart = srcStringStart
	let savedSrcStringEnd = srcStringEnd
	let savedSrcString = srcString
	let savedStrings = strings
	let savedReferenceMap = referenceMap
	// TODO: We may need to revisit this if we do more external calls to user code (since it could be slow)
	let savedSrc = new Uint8Array(src.slice(0, srcEnd)) // we copy the data in case it changes while external data is processed
	let savedStructures = currentStructures
	let savedPackr = currentUnpackr
	let savedSequentialMode = sequentialMode
	let value = callback()
	srcEnd = savedSrcEnd
	position = savedPosition
	stringPosition = savedStringPosition
	srcStringStart = savedSrcStringStart
	srcStringEnd = savedSrcStringEnd
	srcString = savedSrcString
	strings = savedStrings
	referenceMap = savedReferenceMap
	src = savedSrc
	sequentialMode = savedSequentialMode
	currentStructures = savedStructures
	currentUnpackr = savedPackr
	dataView = new DataView(src.buffer, src.byteOffset, src.byteLength)
	return value
}
export function clearSource() {
	src = null
	referenceMap = null
	currentStructures = null
}

export function addExtension(extension) {
	if (extension.unpack)
		currentExtensions[extension.type] = extension.unpack
	else
		currentExtensions[extension.type] = extension
}

export const mult10 = new Array(147) // this is a table matching binary exponents to the multiplier to determine significant digit rounding
for (let i = 0; i < 256; i++) {
	mult10[i] = +('1e' + Math.floor(45.15 - i * 0.30103))
}
export const useRecords = false
export const mapsAsObjects = true
export const Decoder = Unpackr
var defaultUnpackr = new Unpackr({ useRecords: false })
export const unpack = defaultUnpackr.unpack
export const unpackMultiple = defaultUnpackr.unpackMultiple
export const decode = defaultUnpackr.unpack
export const FLOAT32_OPTIONS = {
	NEVER: 0,
	ALWAYS: 1,
	DECIMAL_ROUND: 3,
	DECIMAL_FIT: 4
}
