'use strict';

let path = require('path');
let mkdirp = require('mkdirp');
let rimraf = require('rimraf');
let chai = require('chai');
let should = chai.should();
let expect = chai.expect;
let spawn = require('child_process').spawn;

let { open, getLastVersion, bufferToKeyValue, keyValueToBuffer, ABORT } = require('..');
const { ArrayLikeIterable } = require('../util/ArrayLikeIterable')
//var inspector = require('inspector'); inspector.open(9330, null, true); debugger

describe('lmdb-store', function() {
  let testDirPath = path.resolve(__dirname, './testdata-ls');

  // just to make a reasonable sized chunk of data...
  function expand(str) {
    str = '(' + str + ')';
    str = str + str;
    str = str + str;
    str = str + str;
    str = str + str;
    str = str + str;
    return str;
  }
  before(function(done) {
    // cleanup previous test directory
    rimraf(testDirPath, function(err) {
      if (err) {
        return done(err);
      }
      done();
    });
  });
  let testIteration = 1
  describe('Basic use', basicTests({ compression: false }));
  describe('Basic use with encryption', basicTests({ compression: false, encryptionKey: 'Use this key to encrypt the data' }));
  //describe('Check encrypted data', basicTests({ compression: false, checkLast: true }));
  describe('Basic use with JSON', basicTests({ encoding: 'json' }));
  describe('Basic use with ordered-binary', basicTests({ encoding: 'ordered-binary' }));
  describe('Basic use with caching', basicTests({ cache: true }));
  function basicTests(options) { return function() {
    this.timeout(1000000);
    let db, db2, db3;
    before(function() {
      db = open(testDirPath + '/test-' + testIteration + '.mdb', Object.assign({
        name: 'mydb3',
        create: true,
        useVersions: true,
        //asyncTransactionOrder: 'strict',
        //useWritemap: true,
        //noSync: true,
        compression: {
          threshold: 256,
        },
      }, options));
      testIteration++;
      if (!options.checkLast)
        db.clear();
      db2 = db.openDB(Object.assign({
        name: 'mydb4',
        create: true,
        dupSort: true,
      }));
      if (!options.checkLast)
        db2.clear();
      db3 = db.openDB({
        name: 'mydb5',
        create: true,
        dupSort: true,
        encoding: 'ordered-binary',
      });
      if (!options.checkLast)
        db3.clear();
    });
    if (options.checkLast) {
      it('encrypted data can not be accessed', function() {
        let data  = db.get('key1');
        console.log({data})
        data.should.deep.equal({foo: 1, bar: true})
      })
      return
    }
    it('query of keys', async function() {
      let keys = [
        Symbol.for('test'),
        false,
        true,
        -33,
        -1.1,
        3.3,
        5,
        [5,4],
        [5,55],
        [5, 'words after number'],
        [6, 'abc'],
        [ 'Test', null, 1 ],
        [ 'Test', Symbol.for('test'), 2 ],
        [ 'Test', 'not null', 3 ],
        'hello',
        ['hello', 3],
        ['hello', 'world'],
        [ 'uid', 'I-7l9ySkD-wAOULIjOEnb', 'Rwsu6gqOw8cqdCZG5_YNF' ],
        'z'
      ]
      for (let key of keys)
        await db.put(key, 3);
      let returnedKeys = []
      for (let { key, value } of db.getRange({
        start: Symbol.for('A')
      })) {
        returnedKeys.push(key)
        value.should.equal(db.get(key))
      }
      keys.should.deep.equal(returnedKeys)

      returnedKeys = []
      for (let { key, value } of db.getRange({
        reverse: true,
      })) {
        returnedKeys.unshift(key)
        value.should.equal(db.get(key))
      }
      keys.should.deep.equal(returnedKeys)
    });
    it('reverse query range', async function() {
      const keys = [
        [ 'Test', 100, 1 ],
        [ 'Test', 10010, 2 ],
        [ 'Test', 10010, 3 ]
      ]
      for (let key of keys)
        await db.put(key, 3);
      for (let { key, value } of db.getRange({
        start: ['Test', null],
        end: ['Test', null],
        reverse: true
      })) {
        throw new Error('Should not return any results')
      }
    })
    it('more reverse query range', async function() {
      db.putSync('0Sdts8FwTqt2Hv5j9KE7ebjsQcFbYDdL/0Sdtsud6g8YGhPwUK04fRVKhuTywhnx8', 1, 1, null);
      db.putSync('0Sdts8FwTqt2Hv5j9KE7ebjsQcFbYDdL/0Sdu0mnkm8lS38yIZa4Xte3Q3JUoD84V', 1, 1, null);
      const options =
      {
        start: '0Sdts8FwTqt2Hv5j9KE7ebjsQcFbYDdL/0SdvKaMkMNPoydWV6HxZbFtKeQm5sqz3',
        end: '0Sdts8FwTqt2Hv5j9KE7ebjsQcFbYDdL/00000000dKZzSn03pte5dWbaYfrZl4hG',
        reverse: true
      };
      let returnedKeys = Array.from(db.getKeys(options))
      returnedKeys.should.deep.equal(['0Sdts8FwTqt2Hv5j9KE7ebjsQcFbYDdL/0Sdu0mnkm8lS38yIZa4Xte3Q3JUoD84V', '0Sdts8FwTqt2Hv5j9KE7ebjsQcFbYDdL/0Sdtsud6g8YGhPwUK04fRVKhuTywhnx8'])
    });
    it('string', async function() {
      await db.put('key1', 'Hello world!');
      let data = db.get('key1');
      data.should.equal('Hello world!');
      await db.remove('key1')
      let data2 = db.get('key1');
      should.equal(data2, undefined);
    });
    it('string with version', async function() {
      await db.put('key1', 'Hello world!', 53252);
      let entry = db.getEntry('key1');
      entry.value.should.equal('Hello world!');
      entry.version.should.equal(53252);
      (await db.remove('key1', 33)).should.equal(false);
      entry = db.getEntry('key1');
      entry.value.should.equal('Hello world!');
      entry.version.should.equal(53252);
      (await db.remove('key1', 53252)).should.equal(true);
      entry = db.getEntry('key1');
      should.equal(entry, undefined);
    });
    it('string with version branching', async function() {
      await db.put('key1', 'Hello world!', 53252);
      let entry = db.getEntry('key1');
      entry.value.should.equal('Hello world!');
      entry.version.should.equal(53252);
      (await db.ifVersion('key1', 777, () => {
        db.put('newKey', 'test', 6);
        db2.put('keyB', 'test', 6);
      })).should.equal(false);
      should.equal(db.get('newKey'), undefined);
      should.equal(db2.get('keyB'), undefined);
      let result = (await db.ifVersion('key1', 53252, () => {
        db.put('newKey', 'test', 6);
        db2.put('keyB', 'test', 6);
      }))
      should.equal(db.get('newKey'), 'test')
      should.equal(db2.get('keyB'), 'test')
      should.equal(result, true);
      result = await db.ifNoExists('key1', () => {
        db.put('newKey', 'changed', 7);
      })
      should.equal(db.get('newKey'), 'test');
      should.equal(result, false);
      result = await db.ifNoExists('key-no-exist', () => {
        db.put('newKey', 'changed', 7);
      })
      should.equal(db.get('newKey'), 'changed')
      should.equal(result, true);
    });
    it('string with compression and versions', async function() {
      let str = expand('Hello world!')
      await db.put('key1', str, 53252);
      let entry = db.getEntry('key1');
      entry.value.should.equal(str);
      entry.version.should.equal(53252);
      (await db.remove('key1', 33)).should.equal(false);
      let data = db.get('key1');
      data.should.equal(str);
      (await db.remove('key1', 53252)).should.equal(true);
      data = db.get('key1');
      should.equal(data, undefined);
    });
    if (options.encoding == 'ordered-binary')
      return // no more tests need to be applied for this
    it('store objects', async function() {
      let dataIn = {foo: 3, bar: true}
      await db.put('key1',  dataIn);
      let dataOut = db.get('key1');
      dataOut.should.deep.equal(dataIn);
      db.removeSync('not-there').should.equal(false);
    });
    it.skip('trigger sync commit', async function() {
      let dataIn = {foo: 4, bar: false}
      db.immediateBatchThreshold = 1
      db.syncBatchThreshold = 1
      await db.put('key1',  dataIn);
      await db.put('key2',  dataIn);
      db.immediateBatchThreshold = 100000
      db.syncBatchThreshold = 1000000
      let dataOut = db.get('key1');
      dataOut.should.deep.equal(dataIn);
    });
    function iterateQuery(acrossTransactions) { return async () => {
      let data1 = {foo: 1, bar: true}
      let data2 = {foo: 2, bar: false}
      db.put('key1',  data1);
      await db.put('key2',  data2);
      let count = 0
      for (let { key, value } of db.getRange({start:'key', end:'keyz', snapshot: !acrossTransactions})) {
        if (acrossTransactions)
          await delay(10)
        count++
        switch(key) {
          case 'key1': data1.should.deep.equal(value); break;
          case 'key2': data2.should.deep.equal(value); break;
        }
      }
      should.equal(count >= 2, true);
      should.equal(db.getCount({start:'key', end:'keyz'}) >= 2, true);
    }}
    it('should iterate over query', iterateQuery(false));
    it('should iterate over query, across transactions', iterateQuery(true));
    it('should break out of query', async function() {
      let data1 = {foo: 1, bar: true}
      let data2 = {foo: 2, bar: false}
      db.put('key1',  data1);
      await db.put('key2',  data2);
      let count = 0;
      for (let { key, value } of db.getRange({start:'key', end:'keyz'})) {
        if (count > 0)
          break;
        count++;
        data1.should.deep.equal(value);
        'key1'.should.equal(key);
      }
      count.should.equal(1);
    });
    it('getRange with arrays', async function() {
      const keys = [
        [ 'foo', 0 ],
        [ 'foo', 1 ],
        [ 'foo', 2 ],
      ]
      let promise
      keys.forEach((key, i) => {
        promise = db.put(key, i)
      })
      await promise

      let result = Array.from(db.getRange({
        start: [ 'foo'],
        end: [ 'foo', 1 ],
      }))
      result.should.deep.equal([ { key: [ 'foo', 0 ], value: 0 } ])

      result = Array.from(db.getRange({
        start: [ 'foo', 0 ],
        end: [ 'foo', 1 ],
      }))
      result.should.deep.equal([ { key: [ 'foo', 0 ], value: 0 } ])

      result = Array.from(db.getRange({
        start: [ 'foo', 2 ],
        end: [ 'foo', [2, null] ],
      }))
      result.should.deep.equal([ { key: [ 'foo', 2 ], value: 2 } ])
    })
    it('should iterate over query with offset/limit', async function() {
      let data1 = {foo: 1, bar: true}
      let data2 = {foo: 2, bar: false}
      let data3 = {foo: 3, bar: false}
      db.put('key1',  data1);
      db.put('key2',  data2);
      await db.put('key3',  data3);
      let count = 0
      for (let { key, value } of db.getRange({start:'key', end:'keyz', offset: 1, limit: 1})) {
        count++
        switch(key) {
          case 'key2': data2.should.deep.equal(value); break;
        }
      }
      count.should.equal(1)
      count = 0
      for (let { key, value } of db.getRange({start:'key', end:'keyz', offset: 3, limit: 3})) {
        count++
      }
      count.should.equal(0)
      for (let { key, value } of db.getRange({start:'key', end:'keyz', offset: 10, limit: 3})) {
        count++
      }
      count.should.equal(0)
      for (let { key, value } of db.getRange({start:'key', end:'keyz', offset: 2, limit: 3})) {
        count++
        switch(key) {
          case 'key3': data3.should.deep.equal(value); break;
        }
      }
      count.should.equal(1)
    });
    it('should handle open iterators and cursor renewal', async function() {
      let data1 = {foo: 1, bar: true};
      let data2 = {foo: 2, bar: false};
      let data3 = {foo: 3, bar: false};
      db2.put('key1',  data1);
      db.put('key1',  data1);
      db.put('key2',  data2);
      await db.put('key3',  data3);
      let it1 = db.getRange({start:'key', end:'keyz'})[Symbol.iterator]();
      let it2 = db2.getRange({start:'key', end:'keyz'})[Symbol.iterator]();
      let it3 = db.getRange({start:'key', end:'keyz'})[Symbol.iterator]();
      it1.return();
      it2.return();
      await new Promise(resolve => setTimeout(resolve, 10));
      it1 = db.getRange({start:'key', end:'keyz'})[Symbol.iterator]();
      it2 = db2.getRange({start:'key', end:'keyz'})[Symbol.iterator]();
      let it4 = db.getRange({start:'key', end:'keyz'})[Symbol.iterator]();
      let it5 = db2.getRange({start:'key', end:'keyz'})[Symbol.iterator]();
      await new Promise(resolve => setTimeout(resolve, 20));
      it4.return()
      it5.return()
      it1.return()
      it2.return()
      it3.return()
    });
    it('should iterate over dupsort query, with removal', async function() {
      let data1 = {foo: 1, bar: true}
      let data2 = {foo: 2, bar: false}
      let data3 = {foo: 3, bar: true}
      db2.put('key1',  data1);
      db2.put('key1',  data2);
      db2.put('key1',  data3);
      await db2.put('key2',  data3);
      let count = 0;
      for (let value of db2.getValues('key1')) {
        count++
        switch(count) {
          case 1: data1.should.deep.equal(value); break;
          case 2: data2.should.deep.equal(value); break;
          case 3: data3.should.deep.equal(value); break;
        }
      }
      count.should.equal(3);
      db2.getValuesCount('key1').should.equal(3);
      await db2.remove('key1',  data2);
      count = 0;
      for (let value of db2.getValues('key1')) {
        count++;
        switch(count) {
          case 1: data1.should.deep.equal(value); break;
          case 2: data3.should.deep.equal(value); break;
        }
      }
      count.should.equal(2)
      db2.getValuesCount('key1').should.equal(2);
      count = 0;
      for (let value of db2.getValues('key1', { reverse: true })) {
        count++;
        switch(count) {
          case 1: data3.should.deep.equal(value); break;
          case 2: data1.should.deep.equal(value); break;
        }
      }
      count.should.equal(2);
      db2.getValuesCount('key1').should.equal(2);

      count = 0;
      for (let value of db2.getValues('key0')) {
        count++;
      }
      count.should.equal(0);
      db2.getValuesCount('key0').should.equal(0);
      db2.getCount({start: 'key1', end: 'key3'}).should.equal(3);
    });
    it('should iterate over ordered-binary dupsort query with start/end', async function() {
      db3.put('key1',  1);
      db3.put('key1',  2);
      db3.put('key1',  3);
      await db3.put('key2',  3);
      let count = 0;
      for (let value of db3.getValues('key1', { start: 1 })) {
        count++
        value.should.equal(count)
      }
      count.should.equal(3);
      count = 0;
      for (let value of db3.getValues('key1', { end: 3 })) {
        count++
        value.should.equal(count)
      }
      count.should.equal(2);
      db3.getValuesCount('key1').should.equal(3);
      db3.getValuesCount('key1', { start: 1, end: 3 }).should.equal(2);
      db3.getValuesCount('key1', { start: 2, end: 3 }).should.equal(1);
      db3.getValuesCount('key1', { start: 2 }).should.equal(2);
      db3.getValuesCount('key1', { end: 2 }).should.equal(1);
      db3.getValuesCount('key1', { start: 1, end: 2 }).should.equal(1);
      db3.getValuesCount('key1', { start: 2, end: 2 }).should.equal(0);
      db3.getValuesCount('key1').should.equal(3);
    });
    it('doesExist', async function() {
      let data1 = {foo: 1, bar: true}
      let data2 = {foo: 2, bar: false}
      let data3 = {foo: 3, bar: true}
      db2.put('key1',  data1);
      db2.put('key1',  data3);
      db2.put(false,  3);
      await db2.put('key2',  data3);
      should.equal(db2.doesExist('key1'), true);
      should.equal(db2.doesExist('key1', data1), true);
      should.equal(db2.doesExist('key1', data2), false);
      should.equal(db2.doesExist('key1', data3), true);
      should.equal(db2.doesExist(false), true);
      should.equal(db2.doesExist(false, 3), true);
      should.equal(db2.doesExist(false, 4), false);
    })
    it('should iterate over keys without duplicates', async function() {
      let lastKey
      for (let key of db2.getKeys({ start: 'k' })) {
        if (key == lastKey)
          throw new Error('duplicate key returned')
        lastKey = key
      }
    })
    it('invalid key', async function() {
      expect(() => db.get({ foo: 'bar' })).to.throw();
      //expect(() => db.put({ foo: 'bar' }, 'hello')).to.throw();
    });
    it('put options (sync)', function() {
      db.putSync('zkey6', 'test', { append: true, version: 33 });
      let entry = db.getEntry('zkey6');
      entry.value.should.equal('test');
      entry.version.should.equal(33);
      db.putSync('zkey7', 'test', { append: true, noOverwrite: true });
      db2.putSync('zkey6', 'test1', { appendDup: true });
      db2.putSync('zkey6', 'test2', { appendDup: true });
      expect(() => db.putSync('zkey5', 'test', { append: true, version: 44 })).to.throw();
      expect(() => db.putSync('zkey7', 'test', { noOverwrite: true })).to.throw();
      expect(() => db2.putSync('zkey6', 'test1', { noDupData: true })).to.throw();
    });
    it('async transactions', async function() {
      let ranTransaction
      db.put('key1',  'async initial value'); // should be queued for async write, but should put before queued transaction
      let errorHandled
      if (!db.cache) {
        db.childTransaction(() => {
          db.put('key1',  'should be rolled back');
          throw new Error('Make sure this is properly propagated without interfering with next transaction')
        }).catch(error => {
          if (error)
            errorHandled = true
        })
        await db.childTransaction(() => {
          should.equal(db.get('key1'), 'async initial value');
          db.put('key-a',  'async test a');
          should.equal(db.get('key-a'), 'async test a');
        })
        should.equal(errorHandled, true);
      }
      await db.transactionAsync(() => {
        ranTransaction = true;
        should.equal(db.get('key1'), 'async initial value');
        db.put('key1',  'async test 1');
        should.equal(db.get('key1'), 'async test 1');
        for (let { key, value } of db.getRange({start: 'key1', end: 'key1z' })) {
          should.equal(value, 'async test 1');
        }
        db2.put('key2-async',  'async test 2');
        should.equal(db2.get('key2-async'), 'async test 2');
      });
      should.equal(db.get('key1'), 'async test 1');
      should.equal(db2.get('key2-async'), 'async test 2');
      should.equal(ranTransaction, true);
    });
    it('child transaction in sync transaction', async function() {
      if (db.cache)
        return
      await db.transactionSync(async () => {
        db.put('key3', 'test-sync-txn');
        db.childTransaction(() => {
          db.put('key3', 'test-child-txn');
          return ABORT;
        })
        should.equal(db.get('key3'), 'test-sync-txn');
        db.childTransaction(() => {
          db.put('key3', 'test-child-txn');
        })
        should.equal(db.get('key3'), 'test-child-txn');
        await db.childTransaction(async () => {
          await new Promise(resolve => setTimeout(resolve, 1))
          db.put('key3', 'test-async-child-txn');
        })
        should.equal(db.get('key3'), 'test-async-child-txn');
      })
    });
    it('async transaction with interrupting sync transaction default order', async function() {
      db.strictAsyncOrder = false
      let order = []
      let ranSyncTxn
      db.transactionAsync(() => {
        order.push('a1');
        db.put('async1', 'test');
        if (!ranSyncTxn) {
          ranSyncTxn = true;
          setImmediate(() => db.transactionSync(() => {
            order.push('s1');
            db.put('inside-sync', 'test');
          }));
        }
      });
      db.put('outside-txn', 'test');
      await db.transactionAsync(() => {
        order.push('a2');
        db.put('async2', 'test');
      });
      order.should.deep.equal(['a1', 'a2', 's1']);
      should.equal(db.get('async1'), 'test');
      should.equal(db.get('outside-txn'), 'test');
      should.equal(db.get('inside-sync'), 'test');
      should.equal(db.get('async2'), 'test');
    });
    it.skip('big child transactions', async function() {
      let ranTransaction
      db.put('key1',  'async initial value'); // should be queued for async write, but should put before queued transaction
      let errorHandled
      if (!db.cache) {
        db.childTransaction(() => {
          let value
          for (let i = 0; i < 4; i++) {
            value += ' test string ' + value
          }
          for (let i = 0; i < 4000; i++) {
            db.put('key' + i, value)
          }
        })
        await db.put('key1',  'test');
        should.equal(db.get('key1'), 'test');
      }
    });
    it('read and write with binary encoding', async function() {
      let dbBinary = db.openDB(Object.assign({
        name: 'mydb5',
        create: true,
        encoding: 'binary'
      }));
      dbBinary.put('buffer', Buffer.from('hello'));
      dbBinary.put('empty', Buffer.from([]));
      await dbBinary.put('Uint8Array', new Uint8Array([1,2,3]));
      dbBinary.get('buffer').toString().should.equal('hello');
      dbBinary.get('Uint8Array')[1].should.equal(2);
      dbBinary.get('empty').length.should.equal(0);
    });
    it.skip('read and write with binary methods', async function() {
      let dbBinary = db.openDB(Object.assign({
        name: 'mydb6',
        keyIsUint32: true,
        create: true,
      }));
      dbBinary.put(3, Buffer.from('hello'));
      await dbBinary.put(4, new Uint8Array([1,2,3]));
      console.log(dbBinary.getBinaryLocation(3))
      console.log(dbBinary.getBinaryLocation(4))
    });
    after(function(done) {
      db.get('key1');
      let iterator = db.getRange({})[Symbol.iterator]()
      setTimeout(() => {
        db.get('key1');
        // should have open read and cursor transactions
        db2.close();
        db.close();
        done();
      },10);
    });
  }}
  describe('direct key', function() {
    it('should serialize and deserialize keys', function() {
      let keys = [
        Symbol.for('test'),
        false,
        true,
        -33,
        -1.1,
        3.3,
        5,
        [5,4],
        [5,55],
        'hello',
        ['hello', 3],
        ['hello', 'world'],
        [ 'uid', 'I-7l9ySkD-wAOULIjOEnb', 'Rwsu6gqOw8cqdCZG5_YNF' ],
        'x'.repeat(1978),
        'z'
      ]
      let serializedKeys = []
      for (let key of keys) {
        let buffer = keyValueToBuffer(key)
        serializedKeys.push(bufferToKeyValue(buffer))
      }
      serializedKeys.should.deep.equal(keys)
    })
  });
  describe('uint32 keys', function() {
    this.timeout(10000);
    let db, db2;
    before(function() {
      db = open(testDirPath, {
        name: 'uint32',
        keyIsUint32: true,
        compression: true,
      });
    });
    it('write and read range', async function() {
      let lastPromise
      for (let i = 0; i < 10; i++) {
        lastPromise = db.put(i, 'value' + i);
      }
      await lastPromise
      let i = 0
      for (let { key, value } of db.getRange()) {
        key.should.equal(i);
        value.should.equal('value' + i);
        i++;
      }
      i = 0
      for (let { key, value } of db.getRange({ start: 0 })) {
        key.should.equal(i);
        value.should.equal('value' + i);
        i++;
      }
    });
    after(function() {
      db.close();
    });
  });
  describe('ArrayLikeIterable', function() {
    it('concat and iterate', async function() {
      let a = new ArrayLikeIterable([1, 2, 3])
      let b = new ArrayLikeIterable([4, 5, 6])
      let all = []
      for (let v of a.concat(b)) {
        all.push(v)
      }
      all.should.deep.equal([1, 2, 3, 4, 5, 6])
    });
  });
  describe('mixed keys', function() {
    this.timeout(10000);
    let intKeys, strKeys;
    before(function() {
      const rootDb = open({
        name: `root`,
        path: testDirPath + '/test-mixedkeys.mdb',
        keyIsUint32: false,
      })

      intKeys = rootDb.openDB({
        name: `intKeys`,
        keyIsUint32: true,
      })

      strKeys = rootDb.openDB({
        name: `strKeys`,
        keyIsUint32: false,
      })

    })
    it('create with keys', async function() {
      let lastPromise
      for (let intKey = 0; intKey < 100; intKey++) {
        const strKey = `k${intKey}`
        intKeys.put(intKey, `${intKey}-value`)
        lastPromise = strKeys.put(strKey, `${strKey}-value`)
      }
      await lastPromise
    });
  });
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
