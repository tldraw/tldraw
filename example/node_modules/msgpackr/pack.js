"use strict"
import { Unpackr, mult10, C1Type, typedArrays, addExtension as unpackAddExtension } from './unpack.js'
let textEncoder
try {
	textEncoder = new TextEncoder()
} catch (error) {}
let extensions, extensionClasses
const hasNodeBuffer = typeof Buffer !== 'undefined'
const ByteArrayAllocate = hasNodeBuffer ? Buffer.allocUnsafeSlow : Uint8Array
const ByteArray = hasNodeBuffer ? Buffer : Uint8Array
const MAX_BUFFER_SIZE = hasNodeBuffer ? 0x100000000 : 0x7fd00000
let target
let targetView
let position = 0
let safeEnd
const RECORD_SYMBOL = Symbol('record-id')
export class Packr extends Unpackr {
	constructor(options) {
		super(options)
		this.offset = 0
		let typeBuffer
		let start
		let sharedStructures
		let hasSharedUpdate
		let structures
		let referenceMap
		let lastSharedStructuresLength = 0
		let encodeUtf8 = ByteArray.prototype.utf8Write ? function(string, position, maxBytes) {
			return target.utf8Write(string, position, maxBytes)
		} : (textEncoder && textEncoder.encodeInto) ?
			function(string, position) {
				return textEncoder.encodeInto(string, target.subarray(position)).written
			} : false

		let packr = this
		let maxSharedStructures = 32
		let isSequential = options && options.sequential
		if (isSequential && !options.saveStructures) {
			maxSharedStructures = 0
			this.structures = []
		}
		let recordIdsToRemove = []
		let transitionsCount = 0
		let serializationsSinceTransitionRebuild = 0
		if (this.structures && this.structures.length > maxSharedStructures) {
			throw new Error('Too many shared structures')
		}

		this.pack = this.encode = function(value) {
			if (!target) {
				target = new ByteArrayAllocate(8192)
				targetView = new DataView(target.buffer, 0, 8192)
				position = 0
			}
			safeEnd = target.length - 10
			if (safeEnd - position < 0x800) {
				// don't start too close to the end, 
				target = new ByteArrayAllocate(target.length)
				targetView = new DataView(target.buffer, 0, target.length)
				safeEnd = target.length - 10
				position = 0
			} else
				position = (position + 7) & 0x7ffffff8 // Word align to make any future copying of this buffer faster
			start = position
			referenceMap = packr.structuredClone ? new Map() : null
			sharedStructures = packr.structures
			if (sharedStructures) {
				if (sharedStructures.uninitialized)
					packr.structures = sharedStructures = packr.getStructures() || []
				let sharedStructuresLength = sharedStructures.length
				if (sharedStructuresLength >  maxSharedStructures && !isSequential)
					sharedStructuresLength = maxSharedStructures
				if (!sharedStructures.transitions) {
					// rebuild our structure transitions
					sharedStructures.transitions = Object.create(null)
					for (let i = 0; i < sharedStructuresLength; i++) {
						let keys = sharedStructures[i]
						if (!keys)
							continue
						let nextTransition, transition = sharedStructures.transitions
						for (let i =0, l = keys.length; i < l; i++) {
							let key = keys[i]
							nextTransition = transition[key]
							if (!nextTransition) {
								nextTransition = transition[key] = Object.create(null)
							}
							transition = nextTransition
						}
						transition[RECORD_SYMBOL] = i + 0x40
					}
					lastSharedStructuresLength = sharedStructures.length
				}
				if (!isSequential)
					sharedStructures.nextId = sharedStructuresLength + 0x40
			}
			if (hasSharedUpdate)
				hasSharedUpdate = false
			structures = sharedStructures || []
			try {
				pack(value)
				packr.offset = position // update the offset so next serialization doesn't write over our buffer, but can continue writing to same buffer sequentially
				if (referenceMap && referenceMap.idsToInsert) {
					position += referenceMap.idsToInsert.length * 6
					if (position > safeEnd)
						makeRoom(position)
					packr.offset = position
					let serialized = insertIds(target.subarray(start, position), referenceMap.idsToInsert)
					referenceMap = null
					return serialized
				}
				return target.subarray(start, position) // position can change if we call pack again in saveStructures, so we get the buffer now
			} finally {
				if (sharedStructures) {
					if (serializationsSinceTransitionRebuild < 10)
						serializationsSinceTransitionRebuild++
					if (transitionsCount > 10000) {
						// force a rebuild occasionally after a lot of transitions so it can get cleaned up
						sharedStructures.transitions = null
						serializationsSinceTransitionRebuild = 0
						transitionsCount = 0
						if (recordIdsToRemove.length > 0)
							recordIdsToRemove = []
					} else if (recordIdsToRemove.length > 0 && !isSequential) {
						for (let i = 0, l = recordIdsToRemove.length; i < l; i++) {
							recordIdsToRemove[i][RECORD_SYMBOL] = 0
						}
						recordIdsToRemove = []
					}
					if (hasSharedUpdate && packr.saveStructures) {
						if (packr.structures.length > maxSharedStructures) {
							packr.structures = packr.structures.slice(0, maxSharedStructures)
						}

						if (packr.saveStructures(packr.structures, lastSharedStructuresLength) === false) {
							// get updated structures and try again if the update failed
							packr.structures = packr.getStructures() || []
							return packr.pack(value)
						}
						lastSharedStructuresLength = packr.structures.length
					}
				}
			}
		}
		const pack = (value) => {
			if (position > safeEnd)
				target = makeRoom(position)

			var type = typeof value
			var length
			if (type === 'string') {
				let strLength = value.length
				let headerSize
				// first we estimate the header size, so we can write to the correct location
				if (strLength < 0x20) {
					headerSize = 1
				} else if (strLength < 0x100) {
					headerSize = 2
				} else if (strLength < 0x10000) {
					headerSize = 3
				} else {
					headerSize = 5
				}
				let maxBytes = strLength * 3
				if (position + maxBytes > safeEnd)
					target = makeRoom(position + maxBytes)

				if (strLength < 0x40 || !encodeUtf8) {
					let i, c1, c2, strPosition = position + headerSize
					for (i = 0; i < strLength; i++) {
						c1 = value.charCodeAt(i)
						if (c1 < 0x80) {
							target[strPosition++] = c1
						} else if (c1 < 0x800) {
							target[strPosition++] = c1 >> 6 | 0xc0
							target[strPosition++] = c1 & 0x3f | 0x80
						} else if (
							(c1 & 0xfc00) === 0xd800 &&
							((c2 = value.charCodeAt(i + 1)) & 0xfc00) === 0xdc00
						) {
							c1 = 0x10000 + ((c1 & 0x03ff) << 10) + (c2 & 0x03ff)
							i++
							target[strPosition++] = c1 >> 18 | 0xf0
							target[strPosition++] = c1 >> 12 & 0x3f | 0x80
							target[strPosition++] = c1 >> 6 & 0x3f | 0x80
							target[strPosition++] = c1 & 0x3f | 0x80
						} else {
							target[strPosition++] = c1 >> 12 | 0xe0
							target[strPosition++] = c1 >> 6 & 0x3f | 0x80
							target[strPosition++] = c1 & 0x3f | 0x80
						}
					}
					length = strPosition - position - headerSize
				} else {
					length = encodeUtf8(value, position + headerSize, maxBytes)
				}

				if (length < 0x20) {
					target[position++] = 0xa0 | length
				} else if (length < 0x100) {
					if (headerSize < 2) {
						target.copyWithin(position + 2, position + 1, position + 1 + length)
					}
					target[position++] = 0xd9
					target[position++] = length
				} else if (length < 0x10000) {
					if (headerSize < 3) {
						target.copyWithin(position + 3, position + 2, position + 2 + length)
					}
					target[position++] = 0xda
					target[position++] = length >> 8
					target[position++] = length & 0xff
				} else {
					if (headerSize < 5) {
						target.copyWithin(position + 5, position + 3, position + 3 + length)
					}
					target[position++] = 0xdb
					targetView.setUint32(position, length)
					position += 4
				}
				position += length
			} else if (type === 'number') {
				if (value >>> 0 === value) {// positive integer, 32-bit or less
					// positive uint
					if (value < 0x40) {
						target[position++] = value
					} else if (value < 0x100) {
						target[position++] = 0xcc
						target[position++] = value
					} else if (value < 0x10000) {
						target[position++] = 0xcd
						target[position++] = value >> 8
						target[position++] = value & 0xff
					} else {
						target[position++] = 0xce
						targetView.setUint32(position, value)
						position += 4
					}
				} else if (value >> 0 === value) { // negative integer
					if (value >= -0x20) {
						target[position++] = 0x100 + value
					} else if (value >= -0x80) {
						target[position++] = 0xd0
						target[position++] = value + 0x100
					} else if (value >= -0x8000) {
						target[position++] = 0xd1
						targetView.setInt16(position, value)
						position += 2
					} else {
						target[position++] = 0xd2
						targetView.setInt32(position, value)
						position += 4
					}
				} else {
					let useFloat32
					if ((useFloat32 = this.useFloat32) > 0 && value < 0x100000000 && value >= -0x80000000) {
						target[position++] = 0xca
						targetView.setFloat32(position, value)
						let xShifted
						if (useFloat32 < 4 ||
							// this checks for  rounding of numbers that were encoded in 32-bit float to nearest significant decimal digit that could be preserved
								((xShifted = value * mult10[((target[position] & 0x7f) << 1) | (target[position + 1] >> 7)]) >> 0) === xShifted) {
							position += 4
							return
						} else
							position-- // move back into position for writing a double
					}
					target[position++] = 0xcb
					targetView.setFloat64(position, value)
					position += 8
				}
			} else if (type === 'object') {
				if (!value)
					target[position++] = 0xc0
				else {
					if (referenceMap) {
						let referee = referenceMap.get(value)
						if (referee) {
							if (!referee.id) {
								let idsToInsert = referenceMap.idsToInsert || (referenceMap.idsToInsert = [])
								referee.id = idsToInsert.push(referee)
							}
							target[position++] = 0xd6 // fixext 4
							target[position++] = 0x70 // "p" for pointer
							targetView.setUint32(position, referee.id)
							position += 4
							return
						} else 
							referenceMap.set(value, { offset: position - start })
					}
					let constructor = value.constructor
					if (constructor === Object) {
						writeObject(value, true)
					} else if (constructor === Array) {
						length = value.length
						if (length < 0x10) {
							target[position++] = 0x90 | length
						} else if (length < 0x10000) {
							target[position++] = 0xdc
							target[position++] = length >> 8
							target[position++] = length & 0xff
						} else {
							target[position++] = 0xdd
							targetView.setUint32(position, length)
							position += 4
						}
						for (let i = 0; i < length; i++) {
							pack(value[i])
						}
					} else if (constructor === Map) {
						length = value.size
						if (length < 0x10) {
							target[position++] = 0x80 | length
						} else if (length < 0x10000) {
							target[position++] = 0xde
							target[position++] = length >> 8
							target[position++] = length & 0xff
						} else {
							target[position++] = 0xdf
							targetView.setUint32(position, length)
							position += 4
						}
						for (let [ key, entryValue ] of value) {
							pack(key)
							pack(entryValue)
						}
					} else {	
						for (let i = 0, l = extensions.length; i < l; i++) {
							let extensionClass = extensionClasses[i]
							if (value instanceof extensionClass) {
								let extension = extensions[i]
								if (extension.write) {
									if (extension.type) {
										target[position++] = 0xd4 // one byte "tag" extension
										target[position++] = extension.type
										target[position++] = 0
									}
									pack(extension.write.call(this, value))
									return
								}
								let currentTarget = target
								let currentTargetView = targetView
								let currentPosition = position
								target = null
								let result
								try {
									result = extension.pack.call(this, value, (size) => {
										// restore target and use it
										target = currentTarget
										currentTarget = null
										position += size
										if (position > safeEnd)
											makeRoom(position)
										return {
											target, targetView, position: position - size
										}
									}, pack)
								} finally {
									// restore current target information (unless already restored)
									if (currentTarget) {
										target = currentTarget
										targetView = currentTargetView
										position = currentPosition
										safeEnd = target.length - 10
									}
								}
								if (result) {
									if (result.length + position > safeEnd)
										makeRoom(result.length + position)
									position = writeExtensionData(result, target, position, extension.type)
								}
								return
							}
						}
						// no extension found, write as object
						writeObject(value, !value.hasOwnProperty) // if it doesn't have hasOwnProperty, don't do hasOwnProperty checks
					}
				}
			} else if (type === 'boolean') {
				target[position++] = value ? 0xc3 : 0xc2
			} else if (type === 'bigint') {
				if (value < (BigInt(1)<<BigInt(63)) && value >= -(BigInt(1)<<BigInt(63))) {
					// use a signed int as long as it fits
					target[position++] = 0xd3
					targetView.setBigInt64(position, value)
				} else if (value < (BigInt(1)<<BigInt(64)) && value > 0) {
					// if we can fit an unsigned int, use that
					target[position++] = 0xcf
					targetView.setBigUint64(position, value)
				} else {
					// overflow
					if (this.largeBigIntToFloat) {
						target[position++] = 0xcb
						targetView.setFloat64(position, Number(value))
					} else {
						throw new RangeError(value + ' was too large to fit in MessagePack 64-bit integer format, set largeBigIntToFloat to convert to float-64')
					}
				}
				position += 8
			} else if (type === 'undefined') {
				if (this.encodeUndefinedAsNil)
					target[position++] = 0xc0
				else {
					target[position++] = 0xd4 // a number of implementations use fixext1 with type 0, data 0 to denote undefined, so we follow suite
					target[position++] = 0
					target[position++] = 0
				}
			} else if (type === 'function') {
				pack(this.writeFunction && this.writeFunction()) // if there is a writeFunction, use it, otherwise just encode as undefined
			} else {
				throw new Error('Unknown type: ' + type)
			}
		}

		const writeObject = this.useRecords === false ? this.variableMapSize ? (object) => {
			// this method is slightly slower, but generates "preferred serialization" (optimally small for smaller objects)
			let keys = Object.keys(object)
			let length = keys.length
			if (length < 0x10) {
				target[position++] = 0x80 | length
			} else if (length < 0x10000) {
				target[position++] = 0xde
				target[position++] = length >> 8
				target[position++] = length & 0xff
			} else {
				target[position++] = 0xdf
				targetView.setUint32(position, length)
				position += 4
			}
			let key
			for (let i = 0; i < length; i++) {
				pack(key = keys[i])
				pack(object[key])
			}
		} :
		(object, safePrototype) => {
			target[position++] = 0xde // always using map 16, so we can preallocate and set the length afterwards
			let objectOffset = position - start
			position += 2
			let size = 0
			for (let key in object) {
				if (safePrototype || object.hasOwnProperty(key)) {
					pack(key)
					pack(object[key])
					size++
				}
			}
			target[objectOffset++ + start] = size >> 8
			target[objectOffset + start] = size & 0xff
		} :

	/*	sharedStructures ?  // For highly stable structures, using for-in can a little bit faster
		(object, safePrototype) => {
			let nextTransition, transition = structures.transitions || (structures.transitions = Object.create(null))
			let objectOffset = position++ - start
			let wroteKeys
			for (let key in object) {
				if (safePrototype || object.hasOwnProperty(key)) {
					nextTransition = transition[key]
					if (!nextTransition) {
						nextTransition = transition[key] = Object.create(null)
						nextTransition.__keys__ = (transition.__keys__ || []).concat([key])
						/*let keys = Object.keys(object)
						if 
						let size = 0
						let startBranch = transition.__keys__ ? transition.__keys__.length : 0
						for (let i = 0, l = keys.length; i++) {
							let key = keys[i]
							size += key.length << 2
							if (i >= startBranch) {
								nextTransition = nextTransition[key] = Object.create(null)
								nextTransition.__keys__ = keys.slice(0, i + 1)
							}
						}
						makeRoom(position + size)
						nextTransition = transition[key]
						target.copy(target, )
						objectOffset
					}
					transition = nextTransition
					pack(object[key])
				}
			}
			let id = transition.id
			if (!id) {
				id = transition.id = structures.push(transition.__keys__) + 63
				if (sharedStructures.onUpdate)
					sharedStructures.onUpdate(id, transition.__keys__)
			}
			target[objectOffset + start] = id
		}*/
		(object) => {
			let keys = Object.keys(object)
			let nextTransition, transition = structures.transitions || (structures.transitions = Object.create(null))
			let newTransitions = 0
			for (let i =0, l = keys.length; i < l; i++) {
				let key = keys[i]
				nextTransition = transition[key]
				if (!nextTransition) {
					nextTransition = transition[key] = Object.create(null)
					newTransitions++
				}
				transition = nextTransition
			}
			let recordId = transition[RECORD_SYMBOL]
			if (recordId) {
				target[position++] = recordId
			} else {
				recordId = structures.nextId++
				if (!recordId) {
					recordId = 0x40
					structures.nextId = 0x41
				}
				if (recordId >= 0x80) {// cycle back around
					structures.nextId = (recordId = maxSharedStructures + 0x40) + 1
				}
				transition[RECORD_SYMBOL] = recordId
				structures[0x3f & recordId] = keys
				if (sharedStructures && sharedStructures.length <= maxSharedStructures) {
					target[position++] = recordId
					hasSharedUpdate = true
				} else {
					target[position++] = 0xd4 // fixext 1
					target[position++] = 0x72 // "r" record defintion extension type
					target[position++] = recordId
					if (newTransitions)
						transitionsCount += serializationsSinceTransitionRebuild * newTransitions
					// record the removal of the id, we can maintain our shared structure
					if (recordIdsToRemove.length >= 0x40 - maxSharedStructures)
						recordIdsToRemove.shift()[RECORD_SYMBOL] = 0 // we are cycling back through, and have to remove old ones
					recordIdsToRemove.push(transition)
					pack(keys)
				}
			}
			// now write the values
			for (let i =0, l = keys.length; i < l; i++)
				pack(object[keys[i]])
		}
		const makeRoom = (end) => {
			let newSize
			if (end > 0x1000000) {
				// special handling for really large buffers
				if ((end - start) > MAX_BUFFER_SIZE)
					throw new Error('Packed buffer would be larger than maximum buffer size')
				newSize = Math.min(MAX_BUFFER_SIZE,
					Math.round(Math.max((end - start) * (end > 0x4000000 ? 1.25 : 2), 0x1000000) / 0x1000) * 0x1000)
			} else // faster handling for smaller buffers
				newSize = ((Math.max((end - start) << 2, target.length - 1) >> 12) + 1) << 12
			let newBuffer = new ByteArrayAllocate(newSize)
			targetView = new DataView(newBuffer.buffer, 0, newSize)
			if (target.copy)
				target.copy(newBuffer, 0, start, end)
			else
				newBuffer.set(target.slice(start, end))
			position -= start
			start = 0
			safeEnd = newBuffer.length - 10
			return target = newBuffer
		}
	}
	useBuffer(buffer) {
		// this means we are finished using our own buffer and we can write over it safely
		target = buffer
		targetView = new DataView(target.buffer, target.byteOffset, target.byteLength)
		position = 0
	}
}

function copyBinary(source, target, targetOffset, offset, endOffset) {
	while (offset < endOffset) {
		target[targetOffset++] = source[offset++]
	}
}

extensionClasses = [ Date, Set, Error, RegExp, ArrayBuffer, Object.getPrototypeOf(Uint8Array.prototype).constructor /*TypedArray*/, C1Type ]
extensions = [{
	pack(date, allocateForWrite) {
		let seconds = date.getTime() / 1000
		if ((this.useTimestamp32 || date.getMilliseconds() === 0) && seconds >= 0 && seconds < 0x100000000) {
			// Timestamp 32
			let { target, targetView, position} = allocateForWrite(6)
			target[position++] = 0xd6
			target[position++] = 0xff
			targetView.setUint32(position, seconds)
		} else if (seconds > 0 && seconds < 0x400000000) {
			// Timestamp 64
			let { target, targetView, position} = allocateForWrite(10)
			target[position++] = 0xd7
			target[position++] = 0xff
			targetView.setUint32(position, date.getMilliseconds() * 4000000 + ((seconds / 1000 / 0x100000000) >> 0))
			targetView.setUint32(position + 4, seconds)
		} else {
			// Timestamp 96
			let { target, targetView, position} = allocateForWrite(15)
			target[position++] = 0xc7
			target[position++] = 12
			target[position++] = 0xff
			targetView.setUint32(position, date.getMilliseconds() * 1000000)
			targetView.setBigInt64(position + 4, BigInt(Math.floor(seconds)))
		}
	}
}, {
	pack(set, allocateForWrite, pack) {
		let array = Array.from(set)
		let { target, position} = allocateForWrite(this.structuredClone ? 3 : 0)
		if (this.structuredClone) {
			target[position++] = 0xd4
			target[position++] = 0x73 // 's' for Set
			target[position++] = 0
		}
		pack(array)
	}
}, {
	pack(error, allocateForWrite, pack) {
		let { target, position} = allocateForWrite(this.structuredClone ? 3 : 0)
		if (this.structuredClone) {
			target[position++] = 0xd4
			target[position++] = 0x65 // 'e' for error
			target[position++] = 0
		}
		pack([ error.name, error.message ])
	}
}, {
	pack(regex, allocateForWrite, pack) {
		let { target, position} = allocateForWrite(this.structuredClone ? 3 : 0)
		if (this.structuredClone) {
			target[position++] = 0xd4
			target[position++] = 0x78 // 'x' for regeXp
			target[position++] = 0
		}
		pack([ regex.source, regex.flags ])
	}
}, {
	pack(arrayBuffer, allocateForWrite) {
		if (this.structuredClone)
			writeExtBuffer(arrayBuffer, 0x10, allocateForWrite)
		else
			writeBuffer(hasNodeBuffer ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer), allocateForWrite)
	}
}, {
	pack(typedArray, allocateForWrite) {
		let constructor = typedArray.constructor
		if (constructor !== ByteArray && this.structuredClone)
			writeExtBuffer(typedArray, typedArrays.indexOf(constructor.name), allocateForWrite)
		else
			writeBuffer(typedArray, allocateForWrite)
	}
}, {
	pack(c1, allocateForWrite) { // specific 0xC1 object
		let { target, position} = allocateForWrite(1)
		target[position] = 0xc1
	}
}]

function writeExtBuffer(typedArray, type, allocateForWrite, encode) {
	let length = typedArray.byteLength
	if (length + 1 < 0x100) {
		var { target, position } = allocateForWrite(4 + length)
		target[position++] = 0xc7
		target[position++] = length + 1
	} else if (length + 1 < 0x10000) {
		var { target, position } = allocateForWrite(5 + length)
		target[position++] = 0xc8
		target[position++] = (length + 1) >> 8
		target[position++] = (length + 1) & 0xff
	} else {
		var { target, position, targetView } = allocateForWrite(7 + length)
		target[position++] = 0xc9
		targetView.setUint32(position, length + 1) // plus one for the type byte
		position += 4
	}
	target[position++] = 0x74 // "t" for typed array
	target[position++] = type
	target.set(new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength), position)
}
function writeBuffer(buffer, allocateForWrite) {
	let length = buffer.byteLength
	var target, position
	if (length < 0x100) {
		var { target, position } = allocateForWrite(length + 2)
		target[position++] = 0xc4
		target[position++] = length
	} else if (length < 0x10000) {
		var { target, position } = allocateForWrite(length + 3)
		target[position++] = 0xc5
		target[position++] = length >> 8
		target[position++] = length & 0xff
	} else {
		var { target, position, targetView } = allocateForWrite(length + 5)
		target[position++] = 0xc6
		targetView.setUint32(position, length)
		position += 4
	}
	target.set(buffer, position)
}

function writeExtensionData(result, target, position, type) {
	let length = result.length
	switch (length) {
		case 1:
			target[position++] = 0xd4
			break
		case 2:
			target[position++] = 0xd5
			break
		case 4:
			target[position++] = 0xd6
			break
		case 8:
			target[position++] = 0xd7
			break
		case 16:
			target[position++] = 0xd8
			break
		default:
			if (length < 0x100) {
				target[position++] = 0xc7
				target[position++] = length
			} else if (length < 0x10000) {
				target[position++] = 0xc8
				target[position++] = length >> 8
				target[position++] = length & 0xff
			} else {
				target[position++] = 0xc9
				target[position++] = length >> 24
				target[position++] = (length >> 16) & 0xff
				target[position++] = (length >> 8) & 0xff
				target[position++] = length & 0xff
			}
	}
	target[position++] = type
	target.set(result, position)
	position += length
	return position
}

function insertIds(serialized, idsToInsert) {
	// insert the ids that need to be referenced for structured clones
	let nextId
	let distanceToMove = idsToInsert.length * 6
	let lastEnd = serialized.length - distanceToMove
	idsToInsert.sort((a, b) => a.offset > b.offset ? 1 : -1)
	while (nextId = idsToInsert.pop()) {
		let offset = nextId.offset
		let id = nextId.id
		serialized.copyWithin(offset + distanceToMove, offset, lastEnd)
		distanceToMove -= 6
		let position = offset + distanceToMove
		serialized[position++] = 0xd6
		serialized[position++] = 0x69 // 'i'
		serialized[position++] = id >> 24
		serialized[position++] = (id >> 16) & 0xff
		serialized[position++] = (id >> 8) & 0xff
		serialized[position++] = id & 0xff
		lastEnd = offset
	}
	return serialized
}

export function addExtension(extension) {
	if (extension.Class) {
		if (!extension.pack && !extension.write)
			throw new Error('Extension has no pack or write function')
		if (extension.pack && !extension.type)
			throw new Error('Extension has no type (numeric code to identify the extension)')
		extensionClasses.unshift(extension.Class)
		extensions.unshift(extension)
	}
	unpackAddExtension(extension)
}

let defaultPackr = new Packr({ useRecords: false })
export const pack = defaultPackr.pack
export const encode = defaultPackr.pack
export const Encoder = Packr
export { FLOAT32_OPTIONS } from './unpack.js'
import { FLOAT32_OPTIONS } from './unpack.js'
export const { NEVER, ALWAYS, DECIMAL_ROUND, DECIMAL_FIT } = FLOAT32_OPTIONS
