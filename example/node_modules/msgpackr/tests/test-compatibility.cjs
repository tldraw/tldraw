const data = require('./example4.json');
const { pack, unpack } = require('msgpackr/pack');
const chai = require('chai');

function tryRequire(module) {
	try {
		return require(module)
	} catch(error) {
	}
}
//if (typeof chai === 'undefined') { chai = require('chai') }
const assert = chai.assert
//if (typeof msgpackr === 'undefined') { msgpackr = require('..') }
var msgpack_msgpack = tryRequire('@msgpack/msgpack');
var msgpack_lite = tryRequire('msgpack-lite');

const addCompatibilitySuite = (data) => () => {
	if (msgpack_msgpack) {
		test('from @msgpack/msgpack', function(){
			var serialized = msgpack_msgpack.encode(data)
			var deserialized = unpack(serialized)
			assert.deepEqual(deserialized, data)
		})

		test('to @msgpack/msgpack', function(){
			var serialized = pack(data)
			var deserialized = msgpack_msgpack.decode(serialized)
			assert.deepEqual(deserialized, data)
		})
	}
	if (msgpack_lite) {
		test('from msgpack-lite', function(){
			var serialized = msgpack_lite.encode(data)
			var deserialized = unpack(serialized)
			assert.deepEqual(deserialized, data)
		})

		test('to msgpack-lite', function(){
			var serialized = pack(data)
			var deserialized = msgpack_lite.decode(serialized)
			assert.deepEqual(deserialized, data)
		})
	}
}

suite('msgpackr compatibility tests (example)', addCompatibilitySuite(require('./example.json')))
suite('msgpackr compatibility tests (example4)', addCompatibilitySuite(require('./example4.json')))
suite('msgpackr compatibility tests (example5)', addCompatibilitySuite(require('./example5.json')))