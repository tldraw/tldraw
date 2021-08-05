const { sync: mkdirpSync } = require('mkdirp')
const fs = require('fs')
const { extname, basename, dirname} = require('path')
const { ArrayLikeIterable } = require('./util/ArrayLikeIterable')
const when  = require('./util/when')
const EventEmitter = require('events')
Object.assign(exports, require('node-gyp-build')(__dirname))
const { Env, Cursor, Compression, getBufferForAddress, getAddress, keyValueToBuffer, bufferToKeyValue } = exports
const { CachingStore, setGetLastVersion } = require('./caching')
const { writeKey, readKey } = require('ordered-binary')
const os = require('os')
setGetLastVersion(getLastVersion)
Uint8ArraySlice = Uint8Array.prototype.slice
const keyBuffer = Buffer.allocUnsafeSlow(2048)
const keyBufferView = new DataView(keyBuffer.buffer, 0, 2048) // max key size is actually 1978
const buffers = []

const DEFAULT_SYNC_BATCH_THRESHOLD = 200000000 // 200MB
const DEFAULT_IMMEDIATE_BATCH_THRESHOLD = 10000000 // 10MB
const DEFAULT_COMMIT_DELAY = 0
const READING_TNX = {
	readOnly: true
}
const ABORT = {}

const allDbs = exports.allDbs = new Map()
const SYNC_PROMISE_RESULT = Promise.resolve(true)
const SYNC_PROMISE_FAIL = Promise.resolve(false)
SYNC_PROMISE_RESULT.isSync = true
SYNC_PROMISE_FAIL.isSync = true
const LAST_KEY = String.fromCharCode(0xffff)
const LAST_BUFFER_KEY = Buffer.from([255, 255, 255, 255])
const FIRST_BUFFER_KEY = Buffer.from([0])
const ITERATOR_DONE = { done: true, value: undefined }
const writeUint32Key = (key, target, start) => {
	(target.dataView || (target.dataView = new DataView(target.buffer, 0, target.length))).setUint32(start, key, true)
	return start + 4
}
const readUint32Key = (target, start) => {
	return (target.dataView || (target.dataView = new DataView(target.buffer, 0, target.length))).getUint32(start, true)
}
const writeBufferKey = (key, target, start) => {
	if (key.length > 1978)
		throw new Error('Key buffer is too long')
	target.set(key, start)
	return key.length + start
}
const readBufferKey = (target, start, end) => {
	return Uint8ArraySlice.call(target, start, end)
}
let env
let defaultCompression
let lastSize, lastOffset, lastVersion
const MDB_SET_KEY = 0, MDB_SET_RANGE = 1, MDB_GET_BOTH_RANGE = 2, MDB_GET_CURRENT = 3, MDB_FIRST = 4, MDB_LAST = 5, MDB_NEXT = 6, MDB_NEXT_NODUP = 7, MDB_NEXT_DUP = 8, MDB_PREV = 9, MDB_PREV_NODUP = 10, MDB_PREV_DUP = 11
exports.open = open
exports.ABORT = ABORT
let abortedNonChildTransactionWarn
function open(path, options) {
	let env = new Env()
	let committingWrites
	let scheduledTransactions
	let scheduledOperations
	let asyncTransactionAfter = true, asyncTransactionStrictOrder
	let transactionWarned
	let readTxn, writeTxn, pendingBatch, currentCommit, runNextBatch, readTxnRenewed, cursorTxns = []
	let renewId = 1
	if (typeof path == 'object' && !options) {
		options = path
		path = options.path
	}
	let extension = extname(path)
	let name = basename(path, extension)
	let is32Bit = os.arch().endsWith('32')
	let remapChunks = (options && options.remapChunks) || ((options && options.mapSize) ?
		(is32Bit && options.mapSize > 0x100000000) : // larger than fits in address space, must use dynamic maps
		is32Bit) // without a known map size, we default to being able to handle large data correctly/well*/
	options = Object.assign({
		path,
		noSubdir: Boolean(extension),
		isRoot: true,
		maxDbs: 12,
		remapChunks,
		keyBuffer,
		// default map size limit of 4 exabytes when using remapChunks, since it is not preallocated and we can
		// make it super huge.
		mapSize: remapChunks ? 0x10000000000000 :
			0x20000, // Otherwise we start small with 128KB
	}, options)
	if (options.asyncTransactionOrder == 'before')
		asyncTransactionAfter = false
	else if (options.asyncTransactionOrder == 'strict') {
		asyncTransactionStrictOrder = true
		asyncTransactionAfter = false
	}
	if (!fs.existsSync(options.noSubdir ? dirname(path) : path))
		mkdirpSync(options.noSubdir ? dirname(path) : path)
	if (options.compression) {
		let setDefault
		if (options.compression == true) {
			if (defaultCompression)
				options.compression = defaultCompression
			else
				defaultCompression = options.compression = new Compression({
					threshold: 1000,
					dictionary: fs.readFileSync(require.resolve('./dict/dict.txt')),
				})	
		} else
			options.compression = new Compression(Object.assign({
				threshold: 1000,
				dictionary: fs.readFileSync(require.resolve('./dict/dict.txt')),
			}), options.compression)
	}

	if (options && options.clearOnStart) {
		console.info('Removing', path)
		fs.removeSync(path)
		console.info('Removed', path)
	}
	let useWritemap = options.useWritemap
	try {
		env.open(options)
	} catch(error) {
		if (error.message.startsWith('MDB_INVALID')) {
			require('./util/upgrade-lmdb').upgrade(path, options, open)
			env = new Env()
			env.open(options)
		} else
			throw error
	}
/*	let filePath = noSubdir ? path : (path + '/data.mdb')
	if (fs.statSync(filePath).size == env.info().mapSize && !options.remapChunks) {
		// if the file size is identical to the map size, that means the OS is taking full disk space for
		// mapping and we need to revert back to remapChunks
		env.close()
		options.remapChunks = true
		env.open(options)
	}*/
	env.readerCheck() // clear out any stale entries
	function renewReadTxn() {
		if (readTxn)
			readTxn.renew()
		else
			readTxn = env.beginTxn(READING_TNX)
		readTxnRenewed = setImmediate(resetReadTxn)
		return readTxn
	}
	function resetReadTxn() {
		if (readTxnRenewed) {
			renewId++
			readTxnRenewed = null
			if (readTxn.cursorCount - (readTxn.renewingCursorCount || 0) > 0) {
				readTxn.onlyCursor = true
				cursorTxns.push(readTxn)
				readTxn = null
			}
			else
				readTxn.reset()
		}
	}
	let stores = []
	class LMDBStore extends EventEmitter {
		constructor(dbName, dbOptions) {
			super()
			if (dbName === undefined)
				throw new Error('Database name must be supplied in name property (may be null for root database)')

			const openDB = () => {
				try {
					this.db = env.openDbi(Object.assign({
						name: dbName,
						create: true,
						txn: writeTxn,
					}, dbOptions))
					this.db.name = dbName || null
				} catch(error) {
					handleError(error, null, null, openDB)
				}
			}
			if (dbOptions.compression && !(dbOptions.compression instanceof Compression)) {
				if (dbOptions.compression == true && options.compression)
					dbOptions.compression = options.compression // use the parent compression if available
				else
					dbOptions.compression = new Compression(Object.assign({
						threshold: 1000,
						dictionary: fs.readFileSync(require.resolve('./dict/dict.txt')),
					}), dbOptions.compression)
			}

			if (dbOptions.dupSort && (dbOptions.useVersions || dbOptions.cache)) {
				throw new Error('The dupSort flag can not be combined with versions or caching')
			}
			openDB()
			resetReadTxn() // a read transaction becomes invalid after opening another db
			this.name = dbName
			this.env = env
			this.reads = 0
			this.writes = 0
			this.transactions = 0
			this.averageTransactionTime = 5
			if (dbOptions.syncBatchThreshold)
				console.warn('syncBatchThreshold is no longer supported')
			if (dbOptions.immediateBatchThreshold)
				console.warn('immediateBatchThreshold is no longer supported')
			this.commitDelay = DEFAULT_COMMIT_DELAY
			Object.assign(this, { // these are the options that are inherited
				path: options.path,
				encoding: options.encoding,
				strictAsyncOrder: options.strictAsyncOrder,
			}, dbOptions)
			if (!this.encoding || this.encoding == 'msgpack' || this.encoding == 'cbor') {
				this.encoder = this.decoder = new (this.encoding == 'cbor' ? require('cbor-x').Encoder : require('msgpackr').Encoder)
					(Object.assign(this.sharedStructuresKey ?
					this.setupSharedStructures() : {
						copyBuffers: true // need to copy any embedded buffers that are found since we use unsafe buffers
					}, options, dbOptions))
			} else if (this.encoding == 'json') {
				this.encoder = {
					encode: JSON.stringify,
				}
			} else if (this.encoding == 'ordered-binary') {
				this.encoder = this.decoder = {
					encode(value) {
						if (savePosition > 6200)
							allocateSaveBuffer()
						let start = savePosition
						savePosition = writeKey(value, saveBuffer, start)
						let buffer = saveBuffer.subarray(start, savePosition)
						savePosition = (savePosition + 7) & 0xfffff8
						return buffer
					},
					decode(buffer, end) { return readKey(buffer, 0, end) },
					writeKey,
					readKey,
				}
			}
			if (this.keyIsUint32) {
				this.writeKey = writeUint32Key
				this.readKey = readUint32Key
			} else if (this.keyIsBuffer) {
				this.writeKey = writeBufferKey
				this.readKey = readBufferKey
			}	else {
				this.writeKey = writeKey
				this.readKey = readKey
			}
			allDbs.set(dbName ? name + '-' + dbName : name, this)
			stores.push(this)
		}
		openDB(dbName, dbOptions) {
			if (typeof dbName == 'object' && !dbOptions) {
				dbOptions = dbName
				dbName = options.name
			} else
				dbOptions = dbOptions || {}
			try {
				return dbOptions.cache ?
					new (CachingStore(LMDBStore))(dbName, dbOptions) :
					new LMDBStore(dbName, dbOptions)
			} catch(error) {
				if (error.message.indexOf('MDB_DBS_FULL') > -1) {
					error.message += ' (increase your maxDbs option)'
				}
				throw error
			}
		}
		transactionAsync(callback, asChild) {
			if (writeTxn) {
				// already nested in a transaction, just execute and return
				return callback()
			}
			let lastOperation
			let after, strictOrder
			if (scheduledOperations) {
				lastOperation = asyncTransactionAfter ? scheduledOperations.appendAsyncTxn :
					scheduledOperations[asyncTransactionStrictOrder ? scheduledOperations.length - 1 : 0]
			} else {
				scheduledOperations = []
				scheduledOperations.bytes = 0
			}
			let transactionSet
			let transactionSetIndex
			if (lastOperation === true) { // continue last set of transactions
				transactionSetIndex = scheduledTransactions.length - 1
				transactionSet = scheduledTransactions[transactionSetIndex]
			} else {
				// for now we signify transactions as a true
				if (asyncTransactionAfter) // by default we add a flag to put transactions after other operations
					scheduledOperations.appendAsyncTxn = true
				else if (asyncTransactionStrictOrder)
					scheduledOperations.push(true)
				else // in before mode, we put all the async transaction at the beginning
					scheduledOperations.unshift(true)
				if (!scheduledTransactions) {
					scheduledTransactions = []
				}
				transactionSetIndex = scheduledTransactions.push(transactionSet = []) - 1
			}
			let index = (transactionSet.push(asChild ?
				{asChild, callback } : callback) - 1) << 1
			return this.scheduleCommit().results.then((results) => {
				let transactionResults = results.transactionResults[transactionSetIndex]
				let error = transactionResults[index]
				if (error)
					throw error
				return transactionResults[index + 1]
			})
		}
		childTransaction(callback) {
			if (useWritemap)
				throw new Error('Child transactions are not supported in writemap mode')
			if (writeTxn) {
				let parentTxn = writeTxn
				let childTxn = writeTxn = env.beginTxn(null, parentTxn)
				try {
					return when(callback(), (result) => {
						writeTxn = parentTxn
						if (result === ABORT)
							childTxn.abort()
						else
							childTxn.commit()
						return result
					}, (error) => {
						writeTxn = parentTxn
						childTxn.abort()
						throw error
					})
				} catch(error) {
					writeTxn = parentTxn
					childTxn.abort()
					throw error
				}
			}
			return this.transactionAsync(callback, true)
		}
		transaction(callback, abort) {
			if (!transactionWarned) {
				console.warn('transaction is deprecated, use transactionSync if you want a synchronous transaction or transactionAsync for asynchronous transaction. In this future this will always call transactionAsync.')
				transactionWarned = true
			}
			let result = this.transactionSync(callback, abort)
			return abort ? ABORT : result
		}
		transactionSync(callback, abort) {
			if (writeTxn) {
				if (!useWritemap && !this.cache)
					// already nested in a transaction, execute as child transaction (if possible) and return
					return this.childTransaction(callback)
				let result = callback() // else just run in current transaction
				if (result == ABORT && !abortedNonChildTransactionWarn) {
					console.warn('Can not abort a transaction inside another transaction with ' + (this.cache ? 'caching enabled' : 'useWritemap enabled'))
					abortedNonChildTransactionWarn = true
				}
				return result
			}
			let txn
			try {
				this.transactions++
				txn = writeTxn = env.beginTxn()
				/*if (scheduledOperations && runNextBatch) {
					runNextBatch((operations, callback) => {
						try {
							callback(null, this.commitBatchNow(operations))
						} catch (error) {
							callback(error)
						}
					})
				}
				TODO: To reenable forced sequential writes, we need to re-execute the operations if we get an env resize
				*/
				return when(callback(), (result) => {
					try {
						if (result === ABORT)
							txn.abort()
						else {
							txn.commit()
							resetReadTxn()
						}
						writeTxn = null
						return result
					} catch(error) {
						if (error.message == 'The transaction is already closed.') {
							return result
						}
						return handleError(error, this, txn, () => this.transaction(callback))
					}
				}, (error) => {
					return handleError(error, this, txn, () => this.transaction(callback))
				})
			} catch(error) {
				return handleError(error, this, txn, () => this.transaction(callback))
			}
		}
		getSharedBufferForGet(id) {
			let txn = (writeTxn || (readTxnRenewed ? readTxn : renewReadTxn()))
			lastSize = this.keyIsCompatibility ? txn.getBinaryShared(id) : this.db.get(this.writeKey(id, keyBuffer, 0))
			if (lastSize === 0xffffffff) { // not found code
				return //undefined
			}
			return lastSize
			lastSize = keyBufferView.getUint32(0, true)
			let bufferIndex = keyBufferView.getUint32(12, true)
			lastOffset = keyBufferView.getUint32(8, true)
			let buffer = buffers[bufferIndex]
			let startOffset
			if (!buffer || lastOffset < (startOffset = buffer.startOffset) || (lastOffset + lastSize > startOffset + 0x100000000)) {
				if (buffer)
					env.detachBuffer(buffer.buffer)
				startOffset = (lastOffset >>> 16) * 0x10000
				console.log('make buffer for address', bufferIndex * 0x100000000 + startOffset)
				buffer = buffers[bufferIndex] = Buffer.from(getBufferForAddress(bufferIndex * 0x100000000 + startOffset))
				buffer.startOffset = startOffset
			}
			lastOffset -= startOffset
			return buffer
			return buffer.slice(lastOffset, lastOffset + lastSize)/*Uint8ArraySlice.call(buffer, lastOffset, lastOffset + lastSize)*/
		}

		getSizeBinaryFast(id) {
			(writeTxn || (readTxnRenewed ? readTxn : renewReadTxn()))
			lastSize = this.keyIsCompatibility ? this.db.getByPrimitive(id) : this.db.getByBinary(this.writeKey(id, keyBuffer, 0))
		}
		getString(id) {
			let string = (writeTxn || (readTxnRenewed ? readTxn : renewReadTxn()))
				.getUtf8(this.db, id)
			if (string)
				lastSize = string.length
			return string
		}
		getBinaryFast(id) {
			this.getSizeBinaryFast(id)
			return lastSize === 0xffffffff ? undefined : this.db.unsafeBuffer.subarray(0, lastSize)
		}
		getBinary(id) {
			this.getSizeBinaryFast(id)
			return lastSize === 0xffffffff ? undefined : Uint8ArraySlice.call(this.db.unsafeBuffer, 0, lastSize)
		}
		get(id) {
			if (this.decoder) {
				this.getSizeBinaryFast(id)
				return lastSize === 0xffffffff ? undefined : this.decoder.decode(this.db.unsafeBuffer, lastSize)
			}
			if (this.encoding == 'binary')
				return this.getBinary(id)

			let result = this.getString(id)
			if (result) {
				if (this.encoding == 'json')
					return JSON.parse(result)
			}
			return result
		}
		getEntry(id) {
			let value = this.get(id)
			if (value !== undefined) {
				if (this.useVersions)
					return {
						value,
						version: getLastVersion(),
						//size: lastSize
					}
				else
					return {
						value,
						//size: lastSize
					}
			}
		}
		resetReadTxn() {
			resetReadTxn()
		}
		ifNoExists(key, callback) {
			return this.ifVersion(key, null, callback)
		}
		ifVersion(key, version, callback) {
			if (typeof version != 'number') {
				if (version == null) {
					if (version === null)
						version = -4.2434325325532E-199 // NO_EXIST_VERSION
					else {// if undefined, just do callback without any condition being added
						callback()
						// TODO: if we are inside another ifVersion, use that promise, or use ANY_VERSION
						return pendingBatch ? pendingBatch.unconditionalResults : Promise.resolve(true) // be consistent in returning a promise, indicate success
					}
				} else {
					throw new Error('Version must be a number or null')
				}
			}
			let scheduledOperations = this.getScheduledOperations()
			let index = scheduledOperations.push([key, version]) - 1
			try {
				callback()
				let commit = this.scheduleCommit()
				return commit.results.then((writeResults) => {
					if (writeResults[index] === 0)
						return true
					if (writeResults[index] === 3) {
						throw new Error('The key size was 0 or too large')
					}
					return false
				})
			} finally {
				scheduledOperations.push(false) // reset condition
			}
		}
		doesExist(key, versionOrValue) {
			let txn
			try {
				if (writeTxn) {
					txn = writeTxn
				} else {
					txn = readTxnRenewed ? readTxn : renewReadTxn()
				}
				if (versionOrValue === undefined) {
					this.getSizeBinaryFast(key)
					return lastSize !== 0xffffffff
				}
				else if (this.useVersions) {
					this.getSizeBinaryFast(key)
					return lastSize !== 0xffffffff && matches(getLastVersion(), versionOrValue)
				}
				else {
					let cursor = new Cursor(txn, this.db)
					if (this.encoder) {
						versionOrValue = this.encoder.encode(versionOrValue)
					}
					if (typeof versionOrValue == 'string')
						versionOrValue = Buffer.from(versionOrValue)
					let result = cursor.goToDup(key, versionOrValue) !== undefined
					cursor.close()
					return result
				}
			} catch(error) {
				return handleError(error, this, txn, () => this.doesExist(key, versionOrValue))
			}
		}
		getScheduledOperations() {
			if (!scheduledOperations) {
				scheduledOperations = []
				scheduledOperations.bytes = 0
			}
			if (scheduledOperations.store != this) {
				// issue action to switch dbs
				scheduledOperations.store = this
				scheduledOperations.push(this.db)
			}
			return scheduledOperations
		}
		putToBinary(id, value, version, ifVersion) {
			let operations = this.getScheduledOperations()
			let position = writeBuffer.position || 0
			writeUint32Array[(position++) << 1] = 0 // write the operation
			writeFloat64Array[position++] = version
			writeFloat64Array[position++] = ifVersion
			let keySize = this.writeKey(id, writeBuffer, (position + 2) << 3)
			writeUint32Array[(position << 1) - 3] = keySize
			if (this.encoder) {
				//if (!(value instanceof Uint8Array)) TODO: in a future version, directly store buffers that are provided
				value = this.encoder.encode(value)
			}
			writeUint32Array[(position++ << 1) - 2] = keySize
			writeUint32Array[(position++) << 1] = value.length
			writeFloat64Array[position] = 0
			position += ((keySize - 1) >> 3) + 1
			writeBuffer.position = position
		}
		put(id, value, version, ifVersion) {
			if (id.length > 1978) {
				throw new Error('Key is larger than maximum key size (1978)')
			}
			this.writes++
			if (writeTxn) {
				if (ifVersion !== undefined) {
					this.get(id)
					let previousVersion = this.get(id) ? getLastVersion() : null
					if (!matches(previousVersion, ifVersion)) {
						return SYNC_PROMISE_FAIL
					}
				}
				putSync.call(this, id, value, version)
				return SYNC_PROMISE_RESULT
			}
			if (this.encoder) {
				//if (!(value instanceof Uint8Array)) TODO: in a future version, directly store buffers that are provided
				value = this.encoder.encode(value)
			} else if (typeof value != 'string' && !(value instanceof Uint8Array))
				throw new Error('Invalid value to put in database ' + value + ' (' + (typeof value) +'), consider using encoder')
			let operations = this.getScheduledOperations()
			let index = operations.push(ifVersion == null ? version == null ? [id, value] : [id, value, version] : [id, value, version, ifVersion]) - 1
			// track the size of the scheduled operations (and include the approx size of the array structure too)
			operations.bytes += (id.length || 6) + (value && value.length || 0) + 100
			let commit = this.scheduleCommit()
			return ifVersion === undefined ? commit.unconditionalResults : // TODO: Technically you can get a bad key if an array is passed in there is no ifVersion and still fail
				commit.results.then((writeResults) => {
					if (writeResults[index] === 0)
						return true
					if (writeResults[index] === 3) {
						throw new Error('The key size was 0 or too large')
					}
					return false
				})
		}
		putSync(id, value, version) {
			if (id.length > 1978) {
				throw new Error('Key is larger than maximum key size (1978)')
			}
			let localTxn, hadWriteTxn = writeTxn
			try {
				this.writes++
				if (!writeTxn)
					localTxn = writeTxn = env.beginTxn()
				if (this.encoder)
					value = this.encoder.encode(value)
				if (typeof value == 'string') {
					writeTxn.putUtf8(this.db, id, value, version)
				} else {
					if (!(value instanceof Uint8Array)) {
						throw new Error('Invalid value type ' + typeof value + ' used ' + value)
					}
					writeTxn.putBinary(this.db, id, value, version)
				}
				if (localTxn) {
					writeTxn.commit()
					writeTxn = null
					resetReadTxn()
				}
			} catch(error) {
				if (hadWriteTxn)
					throw error // if we are in a transaction, the whole transaction probably needs to restart
				return handleError(error, this, localTxn, () => this.putSync(id, value, version))
			}
		}
		removeSync(id, ifVersionOrValue) {
			if (id.length > 1978) {
				throw new Error('Key is larger than maximum key size (1978)')
			}
			let localTxn, hadWriteTxn = writeTxn
			try {
				if (!writeTxn)
					localTxn = writeTxn = env.beginTxn()
				let deleteValue
				if (ifVersionOrValue !== undefined) {
					if (this.useVersions) {
						let previousVersion = this.get(id) ? getLastVersion() : null
						if (!matches(previousVersion, ifVersionOrValue))
							return false
					} else if (this.encoder)
						deleteValue = this.encoder.encode(ifVersionOrValue)
					else
						deleteValue = ifVersionOrValue
				}
				this.writes++
				let result
				if (deleteValue)
					result = writeTxn.del(this.db, id, deleteValue)
				else
					result = writeTxn.del(this.db, id)
				if (localTxn) {
					writeTxn.commit()
					writeTxn = null
					resetReadTxn()
				}
				return result // object found and deleted
			} catch(error) {
				if (hadWriteTxn)
					throw error // if we are in a transaction, the whole transaction probably needs to restart
				return handleError(error, this, localTxn, () => this.removeSync(id))
			}
		}
		remove(id, ifVersionOrValue) {
			if (id.length > 1978) {
				throw new Error('Key is larger than maximum key size (1978)')
			}
			this.writes++
			if (writeTxn) {
				if (removeSync.call(this, id, ifVersionOrValue) === false)
					return SYNC_PROMISE_FAIL
				return SYNC_PROMISE_RESULT
			}
			let scheduledOperations = this.getScheduledOperations()
			let operation
			if (ifVersionOrValue === undefined)
				operation = [id]
			else if (this.useVersions)
				operation = [id, undefined, undefined, ifVersionOrValue] // version condition
			else {
				if (this.encoder)
					operation = [id, this.encoder.encode(ifVersionOrValue), true]
				else
					operation = [id, ifVersionOrValue, true]
			}
			let index = scheduledOperations.push(operation) - 1 // remove specific values
			scheduledOperations.bytes += (id.length || 6) + 100
			let commit = this.scheduleCommit()
			return ifVersionOrValue === undefined ? commit.unconditionalResults :
				commit.results.then((writeResults) => {
					if (writeResults[index] === 0)
						return true
					if (writeResults[index] === 3) {
						throw new Error('The key size was 0 or too large')
					}
					return false
				})
		}
		getValues(key, options) {
			let defaultOptions = {
				key,
				valuesForKey: true
			}
			if (options && options.snapshot === false)
				throw new Error('Can not disable snapshots for getValues')
			return this.getRange(options ? Object.assign(defaultOptions, options) : defaultOptions)
		}
		getKeys(options) {
			if (!options)
				options = {}
			options.values = false
			return this.getRange(options)
		}
		getCount(options) {
			if (!options)
				options = {}
			options.onlyCount = true
			return this.getRange(options)[Symbol.iterator]()
		}
		getKeysCount(options) {
			if (!options)
				options = {}
			options.onlyCount = true
			options.values = false
			return this.getRange(options)[Symbol.iterator]()
		}
		getValuesCount(key, options) {
			if (!options)
				options = {}
			options.key = key
			options.valuesForKey = true
			options.onlyCount = true
			return this.getRange(options)[Symbol.iterator]()
		}
		getRange(options) {
			let iterable = new ArrayLikeIterable()
			if (!options)
				options = {}
			let includeValues = options.values !== false
			let includeVersions = options.versions
			let valuesForKey = options.valuesForKey
			let limit = options.limit
			let db = this.db
			let snapshot = options.snapshot
			iterable[Symbol.iterator] = () => {
				let currentKey = valuesForKey ? options.key : options.start
				const reverse = options.reverse
				let count = 0
				let cursor, cursorRenewId
				let txn
				let flags = (includeValues ? 0x100 : 0) | (reverse ? 0x400 : 0) | (valuesForKey ? 0x800 : 0)
				function resetCursor() {
					try {
						if (cursor)
							finishCursor()

						txn = writeTxn || (readTxnRenewed ? readTxn : renewReadTxn())
						cursor = !writeTxn && db.availableCursor
						if (cursor) {
							db.availableCursor = null
							if (db.cursorTxn != txn)
								cursor.renew(txn)
							else// if (db.currentRenewId != renewId)
								flags |= 0x2000
						} else {
							cursor = new Cursor(txn, db)
						}
						txn.cursorCount = (txn.cursorCount || 0) + 1 // track transaction so we always use the same one
						if (snapshot === false) {
							cursorRenewId = renewId // use shared read transaction
							txn.renewingCursorCount = (txn.renewingCursorCount || 0) + 1 // need to know how many are renewing cursors
						}
					} catch(error) {
						if (cursor) {
							try {
								cursor.close()
							} catch(error) { }
						}
						return handleError(error, this, txn, resetCursor)
					}
				}
				resetCursor()
				let store = this
				if (options.onlyCount) {
					flags |= 0x1000
					let count = position(options.offset)
					finishCursor()
					return count
				}
				function position(offset) {
					let keySize = store.writeKey(currentKey, keyBuffer, 0)
					let endAddress
					if (valuesForKey) {
						if (options.start === undefined && options.end === undefined)
							endAddress = 0
						else {
							let startAddress
							if (store.encoder.writeKey) {
								startAddress = BigInt(saveKey(options.start, store.encoder.writeKey, iterable))
								keyBufferView.setBigUint64(2000, startAddress, true)
								endAddress = saveKey(options.end, store.encoder.writeKey, iterable)
							} else {
								throw new Error('Only key-based encoding is supported for start/end values')
								let encoded = store.encoder.encode(options.start)
								let bufferAddress = encoded.buffer.address || (encoded.buffer.address = getAddress(encoded) - encoded.byteOffset)
								startAddress = bufferAddress + encoded.byteOffset
							}
						}
					} else
						endAddress = saveKey(options.end, store.writeKey, iterable)
					return cursor.position(flags, offset || 0, keySize, endAddress)
				}

				function finishCursor() {
					if (txn.isAborted)
						return
					if (cursorRenewId)
						txn.renewingCursorCount--
					if (--txn.cursorCount <= 0 && txn.onlyCursor) {
						cursor.close()
						let index = cursorTxns.indexOf(txn)
						if (index > -1)
							cursorTxns.splice(index, 1)
						txn.abort() // this is no longer main read txn, abort it now that we are done
						txn.isAborted = true
					} else {
						if (db.availableCursor || txn != readTxn)
							cursor.close()
						else {// try to reuse it
							db.availableCursor = cursor
							db.cursorTxn = txn
						}
					}
				}
				return {
					next() {
						let keySize
						if (cursorRenewId && cursorRenewId != renewId) {
							resetCursor()
							keySize = position(0)
						}
						if (count === 0) { // && includeValues) // on first entry, get current value if we need to
							keySize = position(options.offset)
						} else
							keySize = cursor.iterate()
						if (keySize === 0 ||
								(count++ >= limit)) {
							finishCursor()
							return ITERATOR_DONE
						}
						if (includeValues) // TODO: Can we do this after readKey, ran into issues with this before
							lastSize = keyBufferView.getUint32(0, true)
						if (!valuesForKey || snapshot === false)
							currentKey = store.readKey(keyBuffer, 32, keySize + 32)
						if (includeValues) {
							let value
							if (store.decoder) {
								value = store.decoder.decode(db.unsafeBuffer, lastSize)
							} else if (store.encoding == 'binary')
								value = Uint8ArraySlice.call(db.unsafeBuffer, 0, lastSize)
							else {
								value = store.db.unsafeBuffer.toString('utf8', 0, lastSize)
								if (store.encoding == 'json' && value)
									value = JSON.parse(value)
							}
							if (includeVersions)
								return {
									value: {
										key: currentKey,
										value,
										version: getLastVersion()
									}
								}
 							else if (valuesForKey)
								return {
									value
								}
							else
								return {
									value: {
										key: currentKey,
										value,
									}
								}
						} else if (includeVersions) {
							return {
								value: {
									key: currentKey,
									version: getLastVersion()
								}
							}
						} else {
							return {
								value: currentKey
							}
						}
					},
					return() {
						finishCursor()
						return ITERATOR_DONE
					},
					throw() {
						finishCursor()
						return ITERATOR_DONE
					}
				}
			}
			return iterable
		}
		scheduleCommit() {
			if (!pendingBatch) {
				// pendingBatch promise represents the completion of the transaction
				let whenCommitted = new Promise((resolve, reject) => {
					runNextBatch = (sync) => {
						if (!whenCommitted)
							return
						runNextBatch = null
						if (pendingBatch) {
							for (const store of stores) {
								store.emit('beforecommit', { scheduledOperations })
							}
						}
						clearTimeout(timeout)
						currentCommit = whenCommitted
						whenCommitted = null
						pendingBatch = null
						if (scheduledOperations || scheduledTransactions) {
							// operations to perform, collect them as an array and start doing them
							let operations = scheduledOperations || []
							let transactions = scheduledTransactions
							if (operations.appendAsyncTxn) {
								operations.push(true)
							}
							scheduledOperations = null
							scheduledTransactions = null
							const writeBatch = () => {
								let start = Date.now()
								let results = Buffer.alloc(operations.length)
								let continuedWriteTxn
								let transactionResults
								let transactionSetIndex = 0
								let callback = async (error) => {
									if (error === true) {
										// resume batch transaction
										if (!transactionResults) {
											// get the transaction we will use
											continuedWriteTxn = env.beginTxn(true)
											transactionResults = new Array(transactions.length)
											results.transactionResults = transactionResults
										}
										let transactionSet = transactions[transactionSetIndex]
										let transactionSetResults = transactionResults[transactionSetIndex++] = []
										let promises
										for (let i = 0, l = transactionSet.length; i < l; i++) {
											let userTxn = transactionSet[i]
											let asChild = userTxn.asChild
											if (asChild) {
												if (promises) {
													// must complete any outstanding transactions before proceeding
													await Promise.all(promises)
													promises = null
												}
												let childTxn = writeTxn = env.beginTxn(null, continuedWriteTxn)
												try {
													let result = userTxn.callback()
													if (result && result.then) {
														await result
													}
													if (result === ABORT)
														childTxn.abort()
													else
														childTxn.commit()
													transactionSetResults[(i << 1) + 1] = result
												} catch(error) {
													childTxn.abort()
													if (!txnError(error, i))
														return
												}
											} else {
												writeTxn = continuedWriteTxn
												try {
													let result = userTxn()
													if (result && result.then) {
														if (!promises)
															promises = []
														transactionSetResults[(i << 1) + 1] = result
														promises.push(result.catch(() => {
															 txnError(error, i)
														}))
													} else
														transactionSetResults[(i << 1) + 1] = result
												} catch(error) {
													if (!txnError(error, i))
														return
												}
											}
										}
										if (promises) { // finish any outstanding commit functions
											await Promise.all(promises)
										}
										writeTxn = null
										return env.continueBatch(0)
										function txnError(error, i) {
											if (error.message.startsWith('MDB_MAP_FULL')) {
												env.continueBatch(-30792)
												writeTxn = null
												return false
											}
											if (error.message.startsWith('MDB_MAP_RESIZED')) {
												env.continueBatch(-30785)
												writeTxn = null
												return false
											}
											// user exception
											transactionSetResults[i << 1] = error
											return true
										}
									}
									let duration = Date.now() - start
									this.averageTransactionTime = (this.averageTransactionTime * 3 + duration) / 4
									//console.log('did batch', (duration) + 'ms', name, operations.length/*map(o => o[1].toString('binary')).join(',')*/)
									resetReadTxn()
									if (error) {
										if (error.message == 'Interrupted batch')
											// if the batch was interrupted by a sync transaction request we just have to restart it
											return writeBatch()
										try {
											// see if we can recover from recoverable error (like full map with a resize)
											handleError(error, this, null, writeBatch)
										} catch(error) {
											currentCommit = null
											for (const store of stores) {
												store.emit('aftercommit', { operations })
											}
											reject(error)
										}
									} else {
										currentCommit = null
										for (const store of stores) {
											store.emit('aftercommit', { operations, results })
										}
										resolve(results)
									}
								}
								try {
									if (sync === true) {
										env.batchWrite(operations, results)
										callback()
									} else
										env.batchWrite(operations, results, callback)
								} catch (error) {
									callback(error)
								}
							}
							try {
								writeBatch()
							} catch(error) {
								reject(error)
							}
						} else {
							resolve([])
						}
					}
					let timeout
					if (this.commitDelay > 0) {
						timeout = setTimeout(() => {
							when(currentCommit, () => whenCommitted && runNextBatch(), () => whenCommitted && runNextBatch())
						}, this.commitDelay)
					} else {
						timeout = runNextBatch.immediate = setImmediate(() => {
							when(currentCommit, () => whenCommitted && runNextBatch(), () => whenCommitted && runNextBatch())
						})
					}
				})
				pendingBatch = {
					results: whenCommitted,
					unconditionalResults: whenCommitted.then(() => true) // for returning from non-conditional operations
				}
			}
			return pendingBatch
		}

		batch(operations) {
			/*if (writeTxn) {
				this.commitBatchNow(operations.map(operation => [this.db, operation.key, operation.value]))
				return Promise.resolve(true)
			}*/
			let scheduledOperations = this.getScheduledOperations()
			for (let operation of operations) {
				let value = operation.value
				scheduledOperations.push([operation.key, value])
				scheduledOperations.bytes += operation.key.length + (value && value.length || 0) + 200
			}
			return this.scheduleCommit().unconditionalResults
		}
		backup(path) {
			return new Promise((resolve, reject) => env.copy(path, false, (error) => {
				if (error) {
					reject(error)
				} else {
					resolve()
				}
			}))
		}
		close() {
			this.db.close()
			if (this.isRoot) {
				if (readTxn) {
					try {
						readTxn.abort()
					} catch(error) {}
				}
				readTxnRenewed = null
				env.close()
			}
		}
		getStats() {
			try {
				let stats = this.db.stat(readTxnRenewed ? readTxn : renewReadTxn())
				return stats
			}
			catch(error) {
				return handleError(error, this, readTxn, () => this.getStats())
			}
		}
		sync(callback) {
			return env.sync(callback || function(error) {
				if (error) {
					console.error(error)
				}
			})
		}
		deleteDB() {
			try {
				this.db.drop({
					justFreePages: false,
					txn: writeTxn,
				})
			} catch(error) {
				handleError(error, this, null, () => this.deleteDB())
			}
		}
		clear() {
			try {
				this.db.drop({
					justFreePages: true,
					txn: writeTxn,
				})
			} catch(error) {
				handleError(error, this, null, () => this.clear())
			}
			if (this.encoder && this.encoder.structures)
				this.encoder.structures = []

		}
		readerCheck() {
			return env.readerCheck()
		}
		readerList() {
			return env.readerList().join('')
		}
		setupSharedStructures() {
			const getStructures = () => {
				let lastVersion // because we are doing a read here, we may need to save and restore the lastVersion from the last read
				if (this.useVersions)
					lastVersion = getLastVersion()
				try {
					let buffer = this.getBinary(this.sharedStructuresKey)
					if (this.useVersions)
						setLastVersion(lastVersion)
					return buffer ? this.encoder.decode(buffer) : []
				} catch(error) {
					return handleError(error, this, null, getStructures)
				}
			}
			return {
				saveStructures: (structures, previousLength) => {
					return this.transactionSync(() => {
						let existingStructuresBuffer = this.getBinary(this.sharedStructuresKey)
						let existingStructures = existingStructuresBuffer ? this.encoder.decode(existingStructuresBuffer) : []
						if (existingStructures.length != previousLength)
							return false // it changed, we need to indicate that we couldn't update
						writeTxn.putBinary(this.db, this.sharedStructuresKey, this.encoder.encode(structures))
					})
				},
				getStructures,
				copyBuffers: true // need to copy any embedded buffers that are found since we use unsafe buffers
			}
		}
	}
	// if caching class overrides putSync, don't want to double call the caching code
	const putSync = LMDBStore.prototype.putSync
	const removeSync = LMDBStore.prototype.removeSync
	return options.cache ?
		new (CachingStore(LMDBStore))(options.name || null, options) :
		new LMDBStore(options.name || null, options)
	function handleError(error, store, txn, retry) {
		try {
			if (writeTxn)
				writeTxn.abort()
		} catch(error) {}
		if (writeTxn)
			writeTxn = null

		if (error.message.startsWith('MDB_') &&
				!(error.message.startsWith('MDB_KEYEXIST') || error.message.startsWith('MDB_NOTFOUND')) ||
				error.message == 'The transaction is already closed.') {
			resetReadTxn() // separate out cursor-based read txns
			try {
				if (readTxn) {
					readTxn.abort()
					readTxn.isAborted = true
				}
			} catch(error) {}
			readTxn = null
		}
		if (error.message.startsWith('MDB_PROBLEM'))
			console.error(error)
		//if (error.message == 'The transaction is already closed.')
		//	return handleError(error, store, null, retry)
		if (error.message.startsWith('MDB_MAP_FULL') || error.message.startsWith('MDB_MAP_RESIZED')) {
			const oldSize = env.info().mapSize
			const newSize = error.message.startsWith('MDB_MAP_FULL') ?
				Math.floor(((1.08 + 3000 / Math.sqrt(oldSize)) * oldSize) / 0x100000) * 0x100000 : // increase size, more rapidly at first, and round to nearest 1 MB
				oldSize + 0x2000//Math.pow(2, (Math.round(Math.log2(oldSize)) + 1)) // for resized notifications, we try to align to doubling each time
			for (const store of stores) {
				store.emit('remap')
			}
			try {
				env.resize(newSize)
			} catch(error) {
				throw new Error(error.message + ' trying to set map size to ' + newSize)
			}
			return retry()
		}
		error.message = 'In database ' + name + ': ' + error.message
		throw error
	}
}

function matches(previousVersion, ifVersion){
	let matches
	if (previousVersion) {
		if (ifVersion) {
			matches = previousVersion == ifVersion
		} else {
			matches = false
		}
	} else {
		matches = !ifVersion
	}
	return matches
}

function compareKey(a, b) {
	// compare with type consistency that matches ordered-binary
	if (typeof a == 'object') {
		if (!a) {
			return b == null ? 0 : -1
		}
		if (a.compare) {
			if (b == null) {
				return 1
			} else if (b.compare) {
				return a.compare(b)
			} else {
				return -1
			}
		}
		let arrayComparison
		if (b instanceof Array) {
			let i = 0
			while((arrayComparison = compareKey(a[i], b[i])) == 0 && i <= a.length)  {
				i++
			}
			return arrayComparison
		}
		arrayComparison = compareKey(a[0], b)
		if (arrayComparison == 0 && a.length > 1)
			return 1
		return arrayComparison
	} else if (typeof a == typeof b) {
		if (typeof a === 'symbol') {
			a = Symbol.keyFor(a)
			b = Symbol.keyFor(b)
		}
		return a < b ? -1 : a === b ? 0 : 1
	}
	else if (typeof b == 'object') {
		if (b instanceof Array)
			return -compareKey(b, a)
		return 1
	} else {
		return typeOrder[typeof a] < typeOrder[typeof b] ? -1 : 1
	}
}
class Entry {
	constructor(value, version, db) {
		this.value = value
		this.version = version
		this.db = db
	}
	ifSamePut() {

	}
	ifSameRemove() {

	}
}
exports.compareKey = compareKey
const typeOrder = {
	symbol: 0,
	undefined: 1,
	boolean: 2,
	number: 3,
	string: 4
}
exports.getLastEntrySize = function() {
	return lastSize
}
function getLastVersion() {
	return keyBufferView.getFloat64(16, true)
}

function setLastVersion(version) {
	return keyBufferView.setFloat64(16, version, true)
}
let saveBuffer, saveDataView, saveDataAddress
let savePosition = 8000
function allocateSaveBuffer() {
	saveBuffer = Buffer.alloc(8192)
	saveBuffer.dataView = saveDataView = new DataView(saveBuffer.buffer, saveBuffer.byteOffset, saveBuffer.byteLength)
	saveDataAddress = getAddress(saveBuffer)
	saveBuffer.buffer.address = saveDataAddress - saveBuffer.byteOffset
	savePosition = 0

}
function saveKey(key, writeKey, saveTo) {
	if (savePosition > 6200) {
		allocateSaveBuffer()
	}
	let start = savePosition
	savePosition = writeKey(key, saveBuffer, start + 4)
	saveDataView.setUint32(start, savePosition - start - 4, true)
	saveTo.saveBuffer = saveBuffer
	savePosition = (savePosition + 7) & 0xfffff8
	return start + saveDataAddress
}
exports.getLastVersion = getLastVersion
exports.setLastVersion = setLastVersion

