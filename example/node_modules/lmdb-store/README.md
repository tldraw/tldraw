[![license](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![npm version](https://img.shields.io/npm/v/lmdb.svg?style=flat-square)](https://www.npmjs.org/package/lmdb)
[![get](https://img.shields.io/badge/get-8.5%20MOPS-yellow)](README.md)
[![put](https://img.shields.io/badge/put-1.7%20MOPS-yellow)](README.md)

This is an ultra-fast NodeJS interface to LMDB; probably the fastest and most efficient NodeJS key-value/database interface that exists for full storage and retrieval of structured JS data (objects, arrays, etc.) in a true persisted, scalable, [ACID compliant](https://en.wikipedia.org/wiki/ACID) database. It provides a simple interface for interacting with LMDB, as a key-value store, that makes it easy to fully leverage the power, crash-proof design, and efficiency of LMDB using intuitive JavaScript, and is designed to scale across multiple processes or threads. Several key features that make it idiomatic, highly performant, and easy to use LMDB efficiently:
* High-performance translation of JS values and data structures to/from binary key/value data
* Queueing asynchronous off-thread write operations with promise-based API
* Simple transaction management
* Iterable queries/cursors
* Automated database growth
* Record versioning and optimistic locking for scalability/concurrency
* Optional native off-main-thread compression with high-performance LZ4 compression
* And ridiculously fast and efficient:

Benchmarking on Node 14.9, with 3.4Ghz i7-4770 Windows, a get operation, using JS numbers as a key, retrieving data from the database (random access), and decoding the data into a structured object with 10 properties (using default [MessagePack encoding](https://github.com/kriszyp/msgpackr)), can be done in about half a microsecond, or about 1,900,000/sec on a single thread. This is almost three times as fast as a single native `JSON.parse` call with the same object without any DB interaction! LMDB scales effortlessly across multiple processes or threads; over 6,000,000 operations/sec on the same 4/8 core computer by running across multiple threads (or 18,000,000 operations/sec with raw binary data). By running writes on a separate transactional thread, writing is extremely fast as well. With encoding the same objects, full encoding and writes can be performed at about 500,000 puts/second or 1,700,000 puts/second on multiple threads.

This library, `lmdb-store` is published to the NPM package `lmdb-store` and `lmdb`, and can be installed with:
```npm install lmdb```

This has replaced the previously deprecated (LevelDOWN) `lmdb` package in the NPM package registry, but existing versions of that library are [still available](https://www.npmjs.com/package/lmdb/v/0.2.0).

## Design

This library handles translation of JavaScript values, primitives, arrays, and objects, to and from the binary storage of LMDB keys and values with highly optimized native C++ code for breakneck performance. It supports multiple types of JS values for keys and values, making it easy to use idiomatic JS for storing and retrieving data.

`lmdb-store` is designed for synchronous reads, and asynchronous writes. In idiomatic NodeJS code, I/O operations are performed asynchronously. LMDB is a memory-mapped database, reading and writing within a transaction does not use any I/O (other than the slight possibility of a page fault), and can usually be performed faster than Node's event queue callbacks can even execute, and it is easier to write code for instant synchronous values from reads. On the otherhand, commiting transactions does involve I/O, and vastly higher throughput can be achieved by batching operations and executing on a separate thread. Consequently, `lmdb-store` is designed for transactions to go through this asynchronous batching process and return a simple promise that resolves once data is written and flushed to disk.

With the default sync'ing configuration, LMDB has a crash-proof design; a machine can be turned off at any point, and data can not be corrupted unless the written data is actually changed or tampered. Writing data and waiting for confirmation that has been writted to the physical medium is critical for data integrity, but is well known to have latency (although not necessarily less efficient). However, by batching writes, when a database is under load, slower transactions enable more writes per transaction, and this library is able to drive LMDB to achieve the maximum levels of throughput with fully sync'ed operations,  preserving both the durability/safety of the transactions and legendary performance.

This library supports and encourages the use of conditional writes; this allows for atomic operations that are dependendent on previously read data, and most transactional types of operations can be written with an optimistic-locking based, atomic-conditional-write pattern. This allows this library to delegate writes to off-thread execution, and scale to handle concurrent execution across many processes or threads while maintaining data integrity.

This library automatically handles automatically database growth, expanding file size with a smart heuristic that minimizes file fragmentation (as you would expect from a database).

This library provides optional compression using LZ4 that works in conjunction with the asynchronous writes by performing the compression in the same thread (off the main thread) that performs the writes in a transaction. LZ4 is extremely fast, and decompression can be performed at roughly 5GB/s, so excellent storage efficiency can be achieved with almost negligible performance impact.

## Usage
An lmdb store instance is created with by using `open` export from the main module:
```
const { open } = require('lmdb');
// or
// import { open } from 'lmdb';
let myStore = open({
	path: 'my-db',
	// any options go here, we can turn on compression like this:
	compression: true,
});
await myStore.put('greeting', { someText: 'Hello, World!' });
myStore.get('greeting').someText // 'Hello, World!'
// or
myStore.transactionAsync(() => {
	myStore.put('greeting', { someText: 'Hello, World!' });
	myStore.get('greeting').someText // 'Hello, World!'
});
```
(see database options below for more options)

Once you have opened a database, you can store and retrieve values using keys:

### Values
You can store a wide variety of JavaScript values and data structures in this library, including objects (with arbitrary complexity), arrays, buffers, strings, numbers, etc. in your database. Even full structural cloning (with cycles) is an optionally supported. Values are stored and retrieved according the database encoding, which can be set using the `encoding` property on the database options. By default, data is stored using MessagePack, but there are several supported encodings:

* `msgpack` (default) - All values are stored by serializing the value as MessagePack (using the [msgpackr](https://github.com/kriszyp/msgpackr) package). Values are decoded and parsed on retrieval, so `get` and `getRange` will return the object, array, or other value that you have stored. The msgpackr package is extremely fast (usually faster than native JSON), and provides the most flexibility in storing different value types. See the Shared Structures section for how to achieve maximum efficiency with this.
* `cbor` - This specifies all values use the CBOR format, which requires that the [cbor-x](https://github.com/kriszyp/cbor-x) package be installed. This package is based on [msgpackr](https://github.com/kriszyp/msgpackr) and supports all the same options.
* `json` - All values are stored by serializing the value as JSON (using JSON.stringify) and encoded with UTF-8. Values are decoded and parsed on retrieval using JSON.parse. Generally this does not perform as all as msgpack, nor support as many value types.
* `string` - All values should be strings and stored by encoding with UTF-8. Values are returned as strings from `get`.
* `binary` - Values are returned as (Node) buffer objects, representing the raw binary data. Note that creating buffer objects in NodeJS has some overhead and while this is fast and valuable direct storage of binary data, the data encodings provides faster and more optimized process for serializing and deserializing structured data.
* `ordered-binary` - Use the same encoding as the default encoding for keys, which serializes any JS primitive value with consistent ordering. This is primarily useful in `dupSort` stores where data values are ordered, and having consistent key and value ordering is helpful.

### Keys
When using the various APIs, keys can be any JS primitive (string, number, boolean, symbol), an array of primitives, or a Buffer. Using the default `ordered-binary` conversion, primitives are translated to binary keys used by LMDB in such a way that consistent ordering is preserved. Numbers are ordered naturally, which come before strings, which are ordered lexically. The keys are stored with type information preserved. The `getRange`operations that return a set of entries will return entries with the original JS primitive values for the keys. If arrays are used as keys, they are ordering by first value in the array, with each subsequent element being a tie-breaker. Numbers are stored as doubles, with reversal of sign bit for proper ordering plus type information, so any JS number can be used as a key. For example, here are the order of some different keys:
```
Symbol.for('even symbols')
-10 // negative supported
-1.1 // decimals supported
400
3E10
'Hello'
['Hello', 'World']
'World'
'hello'
['hello', 1, 'world']
['hello', 'world']
```
You can override the default encoding of keys, and cause keys to be returned as node buffers using the `keyIsBuffer` database option (generally slower), or use `keyIsUint32` for keys that are strictly 32-bit unsigned integers.

Once you created have a store, the following methods are available:

### `store.get(key): any`
This will retrieve the value at the specified key. The `key` must be a JS value/primitive as described above, and the return value will be the stored data (dependent on the encoding), or `undefined` if the entry does not exist.

### `store.getEntry(key): any`
This will retrieve the the entry at the specified key. The `key` must be a JS value/primitive as described above, and the return value will be the stored data (dependent on the encoding), or `undefined` if the entry does not exist. An entry is object with a `value` property for the value in the database, and a `version` property for the version number of the entry in the database (if `useVersions` is enabled for the database).

### `store.put(key, value, version?: number, ifVersion?: number): Promise<boolean>`
This will store the provided value/data at the specified key. If the database is using versioning (see options below), the `version` parameter will be used to set the version number of the entry. If the `ifVersion` parameter is set, the put will only occur if the existing entry at the provided key has the version specified by `ifVersion` at the instance the commit occurs (LMDB commits are atomic by default). If the `ifVersion` parameter is not set, the put will occur regardless of the previous value.

This operation will be enqueued to be written in a batch transaction. Any other operations that occur within the current event turn (until next event after I/O by default) will also occur in the same transaction. This will return a promise for the completion of the put. The promise will resolve once the transaction has finished committing. The resolved value of the promise will be `true` if the `put` was successful, and `false` if the put did not occur due to the `ifVersion` not matching at the time of the commit. Once the promise resolves, the transaction will have been fully written to the physical storage medium (durable commit, guaranteed available in the future as far as the OS/physical storage can permit and confirm, even if there is power loss or system crash).

If `put` is called inside a transaction, the put will be executed immediately in the current transaction.

### `store.remove(key, valueOrIfVersion?: number): Promise<boolean>`
This will delete the entry at the specified key. This functions like `put`, with the same optional conditional version. This is batched along with put operations, and returns a promise indicating the success of the operation. If you are using a database with duplicate entries per key (with `dupSort` flag), you can specify the value to remove as the second parameter (instead of a version).

Again, if this is performed inside a transation, the removal will be performed in the current transaction.

### `store.transactionAsync(callback: Function): Promise`
This will run the provided callback in a transaction, asynchronously starting the transaction, then running the callback, then later committing the transaction. By running within a transaction, the code in the callback can perform multiple database operations atomically and isolated (fully [ACID compliant](https://en.wikipedia.org/wiki/ACID)). Any `put` or `remove` operations are immediately written to the transaction and can be immediately read afterwards (you can call `get()` or `getRange()` without awaiting for a returned promise) in the transaction.

The callback function will be queued along with other `put` and `remove` operations, and run in the same transaction as other operations that have been queued in the current event turn, and will be executed in the order they were called. `transactionAsync` will return a promise that will resolve once its transaction has been committed. The promise will resolve to the value returned by the callback function.

For example:
```
let products = open(...);
// decrement count if above zero
function buyShoe() {
	return products.transactionAsync(() => {
		let shoe = products.get('shoe')
		// this is performed atomically, so we can guarantee no other processes
		// modify this entry before we write the new value
		if (shoe.count > 0) {
			shoe.count--
			products.put('shoe', shoe)
			return true // succeeded
		}
		return false // count is zero, no shoes to buy
	})
}
```

Note that `store.transactionAsync(() => store.put(...))` is functionally the same as calling `store.put(...)`, queuing the put for asynchronously being committed in transaction, except that `put` executes the db write operation entirely in separate worker thread, whereas `transactionAsync` must also synchronize the callback function in the main JS thread to execute (so it is a little bit less efficient, although still quite fast).

 Also, the callback function can be an async function (or return a promise), but this is not recommended. If the function returns a promise, this will delay/defer the commit until the callback's promise is resolved. However, while waiting for the callback to finish, other code may execute operations that would end up in the current transaction and may result in a surprising order of operations, and long running transactions are generally discouraged since they extend the single write lock.

### `store.childTransaction(callback: Function): Promise`
This will run the provided callback in a transaction much like `transactionAsync` except an explicit child transaction will be used specifically for this callback. This makes it possible for the operations to be aborted and rolled back. The callback may return the exported `ABORT` constant to abort the child transaction for this callback. Also, if the callback function throws an error (or returns a reject promise), this will also abort the child transaction. This childTransaction function is not available if caching or `useWritemap` is enabled.

The `childTransaction` function can be executed on its own (to run the child transaction inside the next queued transaction), or it can be executed inside another transaction callback, executing the child transaction within the current transaction.

### `store.putSync(key, value, versionOrOptions?: number | PutOptions): boolean`
This will set the provided value at the specified key, but will do so synchronously. If this is called inside of a transaction, the put will be performed in the current transaction. If not, a transaction will be started, the put will be executed, the transaction will be committed, and then the function will return. We do not recommend this be used for any high-frequency operations as it can be vastly slower (often blocking the main JS thread for multiple milliseconds) than the `put` operation (typically consumes a few _microseconds_ on a worker thread). The third argument may be a version number or an options object that supports `append`, `appendDup`, `noOverwrite`, `noDupData`, and `version` for corresponding LMDB put flags.

### `store.removeSync(key, valueOrIfVersion?: number): boolean`
This will delete the entry at the specified key. This functions like `putSync`, providing synchronous entry deletion, and uses the same arguments as `remove`. This returns `true` if there was an existing entry deleted, `false` if there was no matching entry.

### `store.ifVersion(key, ifVersion: number, callback): Promise<boolean>`
This executes a block of conditional writes, and conditionally execute any puts or removes that are called in the callback, using the provided condition that requires the provided key's entry to have the provided version.

### `store.ifNoExists(key, callback): Promise<boolean>`
This executes a block of conditional writes, and conditionally execute any puts or removes that are called in the callback, using the provided condition that requires the provided key's entry does not exist yet.

### `store.transactionSync(callback: Function)`
This will begin a synchronous transaction, executing the provided callback function, and then commit the transaction. The provided function can perform `get`s, `put`s, and `remove`s within the transaction, and the result will be committed. The `callback` function can return a promise to indicate an ongoing asynchronous transaction, but generally you want to minimize how long a transaction is open on the main thread, at least if you are potentially operating with multiple processes.

The callback may return the exported `ABORT` constant, or throw an error from the callback, to abort the transaction for this callback.

If this is called inside an existing transaction and child transactions are supported (no write maps or caching), this will execute as a child transaction (and can be aborted), otherwise it will simply execute as part of the existing transaction (in which case it can't be aborted).

### `store.getRange(options: RangeOptions): Iterable<{ key, value: Buffer }>`
This starts a cursor-based query of a range of data in the database, returning an iterable that also has `map`, `filter`, and `forEach` methods. The `start` and `end` indicate the starting and ending key for the range. The `reverse` flag can be used to indicate reverse traversal. The `limit` can limit the number of entries returned. The returned cursor/query is lazy, and retrieves data _as_ iteration takes place, so a large range could specified without forcing all the entries to be read and loaded in memory upfront, and one can exit out of the loop without traversing the whole range in the database. The query is iterable, we can use it directly in a for-of:
```
for (let { key, value } of db.getRange({ start, end })) {
	// for each key-value pair in the given range
}
```
Or we can use the provided iterative methods on the returned results:
```
db.getRange({ start, end })
	.filter(({ key, value }) => test(key))
	.forEach(({ key, value }) => {
		// for each key-value pair in the given range that matched the filter
	})
```
Note that `map` and `filter` are also lazy, they will only be executed once their returned iterable is iterated or `forEach` is called on it. The `map` and `filter` functions also support async/promise-based functions, and you can create an async iterable if the callback functions execute asynchronously (return a promise).

We can also query with offset to skip a certain number of entries, and limit the number of entries to iterate through:
```
db.getRange({ start, end, offset: 10, limit: 10 }) // skip first 10 and get next 10
```

If you want to get a true array from the range results, the `asArray` property will return the results as an array.

#### Snapshots
By default a range iterator will use a database snapshot, using a single read transaction that remains open and gives a consistent view of the database at the time it was started, for the duration of iterating through the range. However, if the iteration will take place over a long period of time, keeping a read transaction open for a long time can interfere with LMDB's free space collection and reuse and increase the database size. If you will be using a long duration iterator, you can specify `snapshot: false` flag in the range options to indicate that it snapshotting is not necessary, and it can reset and renew read transactions while iterating, to allow LMDB to collect any space that was freed during iteration.

### `store.getValues(key, options?: RangeOptions): Iterable<any>`
When using a store with duplicate entries per key (with `dupSort` flag), you can use this to retrieve all the values for a given key. This will return an iterator just like `getRange`, except each entry will be the value from the database:
```
let db = store.openDB('my-index', {
	dupSort: true,
	encoding: 'ordered-binary',
});
await db.put('key1', 'value1');
await db.put('key1', 'value2');
for (let value of db.getValues('key1')) {
	// iterate values 'value1', 'value2'
}
await db.remove('key', 'value1'); // only remove the second value under key1
for (let value of db.getValues('key1')) {
	// just iterate value 'value1'
}
```
You can optionally provide a second argument with the same `options` that `getRange` handles. You can provide a `start` and/or `end` values, which will be define the starting value and ending value for the range of values to return for the key:
```
for (let value of db.getValues('key1', { start: 'value1', end: 'value3'})) ...
```
Using `start`/`end` is only supported if using the `ordered-binary` encoding.

### `store.getKeys(options: RangeOptions): Iterable<any>`
This behaves like `getRange`, but only returns the keys. If this is duplicate key database, each key is only returned once (even if it has multiple values/entries).

### `RangeOptions`
Here are the options that can be provided to the range methods (all are optional):
* `start`: Starting key (will start at beginning of db, if not provided), can be any valid key type (primitive or array of primitives).
* `end`: Ending key (will finish at end of db, if not provided), can be any valid key type (primitive or array of primitives).
* `reverse`: Boolean key indicating reverse traversal through keys (does not do reverse by default).
* `limit`: Number indicating maximum number of entries to read (no limit by default).
* `offset`: Number indicating number of entries to skip before starting iteration (starts at 0 by default).
* `versions`: Boolean indicating if versions should be included in returned entries (not by default).
* `snapshot`: Boolean indicating if a database snapshot is used for iteration (true by default).

### `store.openDB(database: string|{name:string,...})`
LMDB supports multiple databases per environment (an environment is a single memory-mapped file). When you initialize an LMDB store with `open`, the store uses the default root database. However, you can use multiple databases per environment/file and instantiate a store for each one. If you are going to be opening many databases, make sure you set the `maxDbs` (it defaults to 12). For example, we can open multiple stores for a single environment:
```
const { open } = require('lmdb');
let rootStore = open('all-my-data');
let usersStore = myStore.openDB('users');
let groupsStore = myStore.openDB('groups');
let productsStore = myStore.openDB('products');
```
Each of the opened/returned stores has the same API as the default store for the environment. Each of the stores for one environment also share the same batch queue and automated transactions with each other, so immediately writing data from two stores with the same environment will be batched together in the same commit. For example:
```
usersStore.put('some-user', { data: userInfo });
groupsStore.put('some-group', { groupData: moreData });
```
Both these puts will be batched and committed in the same transaction in the next event turn.
Also, you can start a transaction from one store and make writes from any of the stores in that same environment (and they will be a part of the same transaction:
```
rootStore.transactionAsync(() => {
	usersStore.put('some-user', { data: userInfo });
	groupsStore.put('some-group', { groupData: moreData });
});
```

### `getLastVersion(): number`
This returns the version number of the last entry that was retrieved with `get` (assuming it was a versioned database). If you are using a database with `cache` enabled, use `getEntry` instead.

### `close(): void`
This will close the current store. This closes the underlying LMDB database, and if this is the root database (opened with `open` as opposed to `store.openDB`), it will close the environment (and child stores will no longer be able to interact with the database).

### `store.doesExist(key, valueOrVersion): boolean`
This checks if an entry exists for the given key, and optionally verifies that the version or value exists. If this is a `dupSort` enabled database, you can provide the key and value to check if that key/value entry exists. If you are using a versioned database, you can provide a version number to verify if the entry for the provided key has the specific version number. This returns true if the entry does exist.

### `resetReadTxn(): void`
Normally, this library will automatically start a reader transaction for get and range operations, periodically reseting the read transaction on new event turns and after any write transactions are committed, to ensure it is using an up-to-date snapshot of the database. However, you can call `resetReadTxn` if you need to manually force the read transaction to reset to the latest snapshot/version of the database. In particular, this may be useful running with multiple processes where you need to immediately reset the read transaction based on a known update in another process (rather than waiting for the next event turn).

## Concurrency and Versioning
LMDB and this library are designed for high concurrency, and we recommend using multiple processes to achieve concurrency (processes are more robust than threads, and thread's advantage of shared memory is minimal with separate NodeJS isolates, and you still get shared memory access with processes when using LMDB). Versioning or asynchronous transactions are the preferred method for achieving atomicity with data updates with concurrency. A version can be stored with an entry, and later the data can be updated, conditional on the version being the expected version. This provides a robust mechanism for concurrent data updates even with multiple processes are accessing the same database. To enable versioning, make sure to set the `useVersions` option when opening the database:
```
let myStore = open('my-store', { useVersions: true });
```
You can set a version by using the `version` argument in `put` calls. You can later update data and ensure that the data will only be updated if the version matches the expected version by using the `ifVersion` argument. When retrieving entries, you can access the version number by calling `getLastVersion()`.

You can then make conditional writes, examples:

```
myStore.put('key1', 'value1', 4, 3); // new version of 4, only if previous version was 3
```
```
myStore.ifVersion('key1', 4, () => {
	myStore.put('key1', 'value2', 5); // equivalent to myStore.put('key1', 'value2', 5, 4);
	myStore.put('anotherKey', 'value', 3); // we can do other puts based on the same condition above
	// we can make puts in other stores (from the same db environment) based on same condition too
	myStore2.put('keyInOtherDb', 'value'); 
});
```
Asynchronous transactions are also a robust way to handle concurrency with multiple processes and provides a more traditional and flexible mechanism for making atomic ACID-compliant transactional data changes.

## Shared Structures
Shared structures are mechanism for storing the structural information about objects stored in database in dedicated entry, outside of individual entries, for reuse across all of the data in database, for much more efficient storage and faster retrieval of data when storing objects that have the same or similar structures (note that this is only available using the default MessagePack or CBOR encoding, using the msgpackr or cbor-x package). This is highly recommended when storing structured objects with similiar object structures (including inside of array). When enabled, when data is stored, any structural information (the set of property names) is automatically generated and stored in separate entry to be reused for storing and retrieving all data for the database. To enable this feature, simply specify the key where shared structures can be stored. You can use a symbol as a metadata key, as symbols are outside of the range of the standard JS primitive values:
```
let myStore = open('my-store', {
	sharedStructuresKey: Symbol.for('structures')
})
```
Once shared structures has been enabled, you can store JavaScript objects just as you would normally would, and this library will automatically generate, increment, and save the structural information in the provided key to improve storage efficiency and performance. You never need to directly access this key, just be aware that that entry is being used by this library.

## Compression
This library can optionally use off-thread LZ4 compression as part of the asynchronous writes to enable efficient compression with virtually no overhead to the main thread. LZ4 decompression (in `get` and `getRange` calls) is extremely fast and generally has a low impact on performance. Compression is turned off by default, but can be turned on by setting the `compression` property when opening a database. The value of compression can be `true` or an object with compression settings, including properties:
* `threshold` - Only entries that are larger than this value (in bytes) will be compressed. This defaults to 1000 (if compression is enabled)
* `dictionary` - This can be buffer to use as a shared dictionary. This is defaults to a shared dictionary that helps with compressing JSON and English words in small entries. [Zstandard](https://facebook.github.io/zstd/#small-data) provides utilities for [creating your own optimized shared dictionary](https://github.com/lz4/lz4/releases/tag/v1.8.1.2).
For example:
```
let myStore = open('my-store', {
	compression: {
		threshold: 500, // compress any entry larger than 500 bytes
		dictionary: fs.readFileSync('dict.txt') // use your own shared dictionary
	}
})
```
Compression is recommended for large databases that may be close to or larger than available RAM, to improve caching and reduce page faults. If you use enable compression for a database, you must ensure that the data is always opened with the same compression setting, so that the data will be properly decompressed.

## Caching
This library supports caching of entries from stores, and uses a [LRU/LFU (LRFU) and weak-referencing caching mechanism](https://github.com/kriszyp/weak-lru-cache) for highly optimized caching and object tracking. There are several key potential benefits to using caching, including performance, key correlation with object identity, and immediate/synchronous access to saved data. Enabling caching will cache `get`s and `put`s, which can make frequent `get`s much faster. Caching is enabled by providing a truthy value for the `cache` property on the store `options`.

The weak-referencing mechanism works in harmony with JS garbage collection to allow objects to be cached without preventing GC, and retrieved from the cache until they have actually been collected from memory, making more efficient use of memory. This also can provide a guarantee of object identity correlation with keys: as long as retrieved object is in memory, a `get` will always return the existing object, and `get` never will return two copies of the same object (for the same key). The LRFU caching mechanism is scan-resistant, tracking frequency of usage as well as recency.

Because asynchronous `put` operations immediately go in the cache (and are pinned in the cache until committed), the caching enabled, `put` values can be retrieved via `get`, immediately and synchronously after the `put` call. Without caching enabled, you need wait for the `put` promise to resolve (or use asynchronous transactions) before you can access the stored value, but the cache enables the value to be immediately without waiting for the commit to finish:
```
store.put('hi', 'there');
store.get('hi'); // can immediately access value without having to await the promise
```

While caching can improve performance, LMDB itself is extremely fast, and for small objects with sporadic access, caching may not improve performance. Caching tends to provide the most performance benefits for larger objects that may have more significant deserialization costs. Caching does not apply to `getRange` queries. Also note that this requires Node 14.10 or higher (or Node v13.0 with `--harmony-weak-ref` flag).

If you are using caching with a database that has versions enabled, you should use the `getEntry` method to get the `value` and `version`, as `getLastVersion` will not be reliable (only returns the version when the data is accessed from the database).

### Asynchronous Transaction Ordering
Asynchronous single operations (`put` and `remove`) are executed in the order they were called, relative to each other. Likewise, asynchronous transaction callbacks (`transactionAsync` and `childTransaction`) are also executed in order relative to other asynchronous transaction callbacks. However, by default all queued asynchronous transaction callbacks are executed _after_ all queued asynchronous single operations. But, you can enable strict ordering so that asynchronous transactions executed in order _with_ the asynchronous single operations, by setting the `asyncTransactionOrder` property to 'strict'.

However, strict ordering comes with a couple of caveats. First, because asynchronous single operations are executed on separate transaction threads, but asynchronous transaction callbacks must execute on the main JS thread, if there is a lot of frequent switching back and forth between single operations and callbacks, this can significantly reduce performance since it requires substantial thread switching and event queuing.

Second, if there are asynchronous operations that have been performed, and asynchronous transaction callbacks that are waiting to be called, and a synchronous transaction is executed (`transactionSync`), this must interrupt and split the current asynchronous transaction batch, so the synchronous transaction can be executed (the synchronous transaction can not block to wait for the asynchronous if there are outstanding callbacks to execute as part of that async transaction, as that would result in a deadlock). This can potentially create an exception to the general rule that all asynchronous operations that are performed in one event turn will be part of the same transaction. Of course, each single asynchronous transaction callback is still guaranteed to execute in a single atomic transaction (and calls to `transactionSync` _during_ a asynchronous transaction callback are simply executed as part of the current transaction). With the default ordering of 'after', it is possible for the async transactions to be performed in a separate transaction than the single operations if executed. Setting the ordering to 'before' ensures they are always in the same transaction.

### Store Options
The open method can be used to create the main database/environment with the following signature:
`open(path, options)` or `open(options)`
Additional databases can be opened within the main database environment with:
`store.openDB(name, options)` or `store.openDB(options)`
If the `path` has an `.` in it, it is treated as a file name, otherwise it is treated as a directory name, where the data will be stored. The `options` argument to either of the functions should be an object, and supports the following properties, all of which are optional (except `name` if not otherwise specified):
* `name` - This is the name of the database. This defaults to null (which is the root database) when opening the database environment (`open`). When an opening a database within an environment (`openDB`), this is required, if not specified in first parameter.
* `encoding` - Sets the encoding for the database, which can be `'msgpack'`, `'json'`, `'cbor'`, `'string'`, `'ordered-binary'`or `'binary'`.
* `sharedStructuresKey` - Enables shared structures and sets the key where the shared structures will be stored.
* `compression` - This enables compression. This can be set a truthy value to enable compression with default settings, or it can be an object with compression settings.
* `cache` - Setting this to true enables caching. This can also be set to an object specifying the settings/options for the cache (see [settings for weak-lru-cache](https://github.com/kriszyp/weak-lru-cache#weaklrucacheoptions-constructor)).
* `useVersions` - Set this to true if you will be setting version numbers on the entries in the database. Note that you can not change this flag once a database has entries in it (or they won't be read correctly).
* `encryptionKey` - This enables encryption, and the provided value is the key that is used for encryption. This may be a buffer or string, but must be 32 bytes/characters long. This uses the Chacha8 cipher for fast and secure on-disk encryption of data.
* `keyIsBuffer` - This will cause the database to expect and return keys as node buffers.
* `keyIsUint32` - This will cause the database to expect and return keys as unsigned 32-bit integers.
* `dupSort` - Enables duplicate entries for keys. You will usually want to retrieve the values for a key with `getValues`.
* `strictAsyncOrder` - Maintain strict ordering of execution of asynchronous transaction callbacks relative to asynchronous single operations.
The following additional option properties are only available when creating the main database environment (`open`):
* `path` - This is the file path to the database environment file you will use.
* `maxDbs` - The maximum number of databases to be able to open ([there is some extra overhead if this is set very high](http://www.lmdb.tech/doc/group__mdb.html#gaa2fc2f1f37cb1115e733b62cab2fcdbc)).
* `maxReaders` - The maximum number of concurrent read transactions (readers) to be able to open ([more information](http://www.lmdb.tech/doc/group__mdb.html#gae687966c24b790630be2a41573fe40e2)).
* `commitDelay` - This is the amount of time to wait (in milliseconds) for batching write operations before committing the writes (in a transaction). This defaults to 0. A delay of 0 means more immediate commits with less latency (uses `setImmediate`), but a longer delay (which uses `setTimeout`) can be more efficient at collecting more writes into a single transaction and reducing I/O load. Note that NodeJS timers only have an effective resolution of about 10ms, so a `commitDelay` of 1ms will generally wait about 10ms.

#### LMDB Flags
In addition, the following options map to LMDB's env flags, <a href="http://www.lmdb.tech/doc/group__mdb.html">described here</a>. None of these need to be set, the defaults can always be used and are generally recommended, but these are available for various needs and performance optimizations:
* `noSync` - Doesn't sync the data to disk. This can be useful for temporary databases where durability/integrity is not necessary, and can significantly improve write performance that is I/O bound. We discourage this flag for data that needs integrity and durability in storage, since it can result in data loss/corruption if the computer crashes.
* `noMemInit` - This provides a small performance boost for writes, by skipping zero'ing out malloc'ed data, but can leave application data in unused portions of the database. If you do not need to worry about unauthorized access to the db files themselves, this is recommended.
* `remapChunks` - This a flag to specify if dynamic memory mapping should be used. Enabling this generally makes read operations a little bit slower, but frees up more mapped memory, making it friendlier to other applications. This is enabled by default on 32-bit operating systems (which require this to go beyond 4GB database size) if `mapSize` is not specified, otherwise it is disabled by default.
* `mapSize` - This can be used to specify the initial amount of how much virtual memory address space (in bytes) to allocate for mapping to the database files. Setting a map size will typically disable `remapChunks` by default unless the size is larger than appropriate for the OS. Different OSes have different allocation limits.
* `useWritemap` - Use writemaps, this can improve performance by reducing malloc calls and file writes, but can increase risk of a stray pointer corrupting data, and may be slower on Windows. Combined with `noSync`, normal reads/writes/transactions involve virtually zero explicit I/O calls, only modifications to memory maps that the OS persists when convenient, which may be beneficial.
* `noMetaSync` - This isn't as dangerous as `noSync`, but doesn't improve performance much either.
* `pageSize` - This changes the page size of the database. This is 4096 by default, and the default generally has the best performance since it aligns with normal OS page size.
* `noReadAhead` - This disables read-ahead caching. Turning it off may help random read performance when the DB is larger than RAM and system RAM is full. However, this is not supported by all OSes, including Windows.
* `noSubdir` - Treat `path` as a filename instead of directory (this is the default if the path appears to end with an extension and has '.' in it)
* `readOnly` - Self-descriptive.
* `mapAsync` - Not recommended, commits are already performed in a separate thread (asyncronous to JS), and this prevents accurate notification of when flushes finish.

#### Serialization options
If you are using the default encoding of `'msgpack'`, the [msgpackr](https://github.com/kriszyp/msgpackr) package is used for serialization and deserialization. You can provide store options that are passed to msgpackr, as well. For example, these options can be potentially useful:
* `structuredClone` -  This enables the structured cloning extensions that will encode object/cyclic references and additional built-in types/classes.
* `useFloat32: 4` -  Encode floating point numbers in 32-bit format when possible.

You can also use the CBOR format by specifying the encoding of `'cbor'` and installing the [cbor-x](https://github.com/kriszyp/cbor-x) package, which supports the same options.

## Events

The database instance is an <a href="https://nodejs.org/dist/latest-v11.x/docs/api/events.html#events_class_eventemitter">EventEmitter</a>, allowing application to listen to database events. There is just one event right now:

`beforecommit` - This event is fired before a batched operation begins to start a transaction to write all queued writes to the database. The callback function can perform additional (asynchronous) writes (`put` and `remove`) and they will be included in the transaction about to be performed (this can be useful for updating a global version stamp based on all previous writes, for example).

##### Build Options
A few LMDB options are available at build time, and can be specified with options with `npm install` (which can be specified in your package.json install script):
`npm install --use_robust=true`: This will enable LMDB's MDB_USE_ROBUST option, which uses robust semaphores/mutexes so that if you are using multiple processes, and one process dies in the middle of transaction, the OS will cleanup the semaphore/mutex, aborting the transaction and allowing other processes to run without hanging. There is a slight performance overhead, but this is recommended if you will be using multiple processes.

On MacOS, there is a default limit of 10 robust locked semaphores, which imposes a limit on the number of open write transactions (if you have over 10 db environments with a write transaction). If you need more concurrent write transactions, you can increase your maximum undoable semaphore count by setting kern.sysv.semmnu on your local computer. Otherwise don't use the robust mutex option. You can also try to minimize overlapping transactions and/or reduce the number of db environments (and use more databases within each environment).

`npm install --use_data_v1=true`: This will build from an older version of LMDB that uses the legacy data format version 1 (the latest LMDB uses data format version 2). For portability of the data format, this may be preferable since many libraries still use older versions of LMDB. Since this is an older version of LMDB, some features may not be available, including encryption and remapping.

`npm install --enable_fast_api_calls=true`: This will build `lmdb-store` with V8's new API for fast calls. `lmdb-store` supports the new fast API for several functions, and this can provide significant performance benefits for `get`s and range retrieval. This should be used in conjunction with starting node with the `--turbo-fast-api-calls` option. This is only supported in Node v16.4.0 and higher.

## Credits

This library is built on [LMDB](https://symas.com/lmdb/) and is built from and derived from  the excellent [node-lmdb](https://github.com/Venemo/node-lmdb) package.

Many thanks to [Rod Vagg](https://www.npmjs.com/~rvagg) for donating the `lmdb` package name in the NPM registry.

## License

This library is licensed under the terms of the MIT license.

Also note that LMDB: Symas (the authors of LMDB) [offers commercial support of LMDB](https://symas.com/lightning-memory-mapped-database/).

This project has no funding needs. If you feel inclined to donate, donate to one of Kris's favorite charities like [Innovations in Poverty Action](https://www.poverty-action.org/) or any of [GiveWell](https://givewell.org)'s recommended charities.

## Related Projects

* This library is built on top of [node-lmdb](https://github.com/Venemo/node-lmdb)
* This library uses msgpackr for the default serialization of data [msgpackr](https://github.com/kriszyp/msgpackr)
* cobase is built on top of this library: [cobase](https://github.com/DoctorEvidence/cobase)

<a href="https://dev.doctorevidence.com/"><img src="./assets/powers-dre.png" width="203"/></a>
