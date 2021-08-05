const { assert } = require('chai')

const { toBufferKey, fromBufferKey, readKey, writeKey } = require('../index')

function assertBufferComparison(lesser, greater) {
  for (let i = 0; i < lesser.length; i++) {
    if (lesser[i] < greater[i]) {
      return
    }
    if (lesser[i] > (greater[i] || 0)) {
      assert.fail('Byte ' + i + 'should not be ' + lesser[i]  + '>' + greater[i])
    }
  }
}
//var inspector = require('inspector'); inspector.open(9330, null, true); debugger

suite('key buffers', () => {

  test('numbers equivalence', () => {
    assert.strictEqual(fromBufferKey(toBufferKey(4)), 4)
    assert.strictEqual(fromBufferKey(toBufferKey(-4)), -4)
    assert.strictEqual(fromBufferKey(toBufferKey(3.4)), 3.4)
    assert.strictEqual(fromBufferKey(toBufferKey(Math.PI)), Math.PI)
    assert.strictEqual(fromBufferKey(toBufferKey(9377288)), 9377288)
    assert.strictEqual(fromBufferKey(toBufferKey(1503579323825)), 1503579323825)
    assert.strictEqual(fromBufferKey(toBufferKey(1503579323825.3523532)), 1503579323825.3523532)
    assert.strictEqual(fromBufferKey(toBufferKey(-1503579323825)), -1503579323825)
    assert.strictEqual(fromBufferKey(toBufferKey(0.00005032)), 0.00005032)
    assert.strictEqual(fromBufferKey(toBufferKey(-0.00005032)), -0.00005032)
    assert.strictEqual(fromBufferKey(toBufferKey(0.00000000000000000000000005431)), 0.00000000000000000000000005431)
  })
  test('number comparison', () => {
    assertBufferComparison(toBufferKey(4), toBufferKey(5))
    assertBufferComparison(toBufferKey(1503579323824), toBufferKey(1503579323825))
    assertBufferComparison(toBufferKey(1.4), toBufferKey(2))
    assertBufferComparison(toBufferKey(0.000000001), toBufferKey(0.00000001))
    assertBufferComparison(toBufferKey(-4), toBufferKey(3))
    assertBufferComparison(toBufferKey(0), toBufferKey(1))
    assertBufferComparison(toBufferKey(-0.001), toBufferKey(0))
    assertBufferComparison(toBufferKey(-0.001), toBufferKey(-0.000001))
    assertBufferComparison(toBufferKey(-5236532532532), toBufferKey(-5236532532531))
  })
  test('string equivalence', () => {
    assert.strictEqual(fromBufferKey(toBufferKey('4')), '4')
    assert.strictEqual(fromBufferKey(toBufferKey('hello')), 'hello')
  })
  test('string comparison', () => {
    assertBufferComparison(toBufferKey('4'), toBufferKey('5'))
    assertBufferComparison(toBufferKey('and'), toBufferKey('bad'))
    assertBufferComparison(toBufferKey('hello'), toBufferKey('hello2'))
    let buffer = Buffer.alloc(1024)
    let end = writeKey(['this is a test', 5.25], buffer, 0)
  })
  test('boolean equivalence', () => {
    assert.strictEqual(fromBufferKey(toBufferKey(true)), true)
    assert.strictEqual(fromBufferKey(toBufferKey(false)), false)
  })

  test('multipart equivalence', () => {
    assert.deepEqual(fromBufferKey(toBufferKey([4, 5])),
      [4, 5])
    assert.deepEqual(fromBufferKey(toBufferKey(['hello', 5.25])),
      ['hello', 5.25])
    assert.deepEqual(fromBufferKey(toBufferKey([true, 1503579323825])),
      [true, 1503579323825])
    assert.deepEqual(fromBufferKey(toBufferKey([-0.2525, 'second'])),
      [-0.2525, 'second'])
    assert.deepEqual(fromBufferKey(toBufferKey([-0.2525, '2nd', '3rd'])),
      [-0.2525, '2nd', '3rd'])
  })

  test('multipart comparison', () => {
    assertBufferComparison(
      Buffer.concat([toBufferKey(4), Buffer.from([30]), toBufferKey(5)]),
      Buffer.concat([toBufferKey(5), Buffer.from([30]), toBufferKey(5)]))
    assertBufferComparison(
      Buffer.concat([toBufferKey(4), Buffer.from([30]), toBufferKey(5)]),
      Buffer.concat([toBufferKey(4), Buffer.from([30]), toBufferKey(6)]))
    assertBufferComparison(
      Buffer.concat([toBufferKey('and'), Buffer.from([30]), toBufferKey(5)]),
      Buffer.concat([toBufferKey('and2'), Buffer.from([30]), toBufferKey(5)]))
    assertBufferComparison(
      Buffer.concat([toBufferKey(4), Buffer.from([30]), toBufferKey('and')]),
      Buffer.concat([toBufferKey(4), Buffer.from([30]), toBufferKey('cat')]))
  })
  test('performance', () => {
    let buffer = Buffer.alloc(1024)
    let start = process.hrtime.bigint()
    let end, value
    for (let i = 0; i < 1000000; i++) {
      end = writeKey('this is a test of a longer string to read and write', buffer, 0)
    }
    console.log('writeKey string time', nextTime(), end)
    for (let i = 0; i < 1000000; i++) {
      value = readKey(buffer, 0, end)
    }
    console.log('readKey string time', nextTime(), value)

    for (let i = 0; i < 1000000; i++) {
      end = writeKey(33456, buffer, 0)
    }
    console.log('writeKey number time', nextTime(), end)

    for (let i = 0; i < 1000000; i++) {
      value = readKey(buffer, 2, end)
    }
    console.log('readKey number time', nextTime(), value)

    for (let i = 0; i < 1000000; i++) {
      end = writeKey(['hello', 33456], buffer, 0)
    }
    console.log('writeKey array time', nextTime(), end, buffer.slice(0, end))

    for (let i = 0; i < 1000000; i++) {
      value = readKey(buffer, 0, end)
    }
    console.log('readKey array time', nextTime(), value)

    function nextTime() {
      let ns = process.hrtime.bigint()
      let elapsed = ns - start
      start = ns
      return Number(elapsed) / 1000000 + 'ns'
    }
  })

})
