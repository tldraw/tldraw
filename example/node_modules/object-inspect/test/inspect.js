var test = require('tape');
var hasSymbols = require('has-symbols/shams')();
var utilInspect = require('../util.inspect');
var repeat = require('string.prototype.repeat');

var inspect = require('..');

test('inspect', function (t) {
    t.plan(5);

    var obj = [{ inspect: function xyzInspect() { return '!XYZ¡'; } }, []];
    var stringResult = '[ !XYZ¡, [] ]';
    var falseResult = '[ { inspect: [Function: xyzInspect] }, [] ]';

    t.equal(inspect(obj), stringResult);
    t.equal(inspect(obj, { customInspect: true }), stringResult);
    t.equal(inspect(obj, { customInspect: 'symbol' }), falseResult);
    t.equal(inspect(obj, { customInspect: false }), falseResult);
    t['throws'](
        function () { inspect(obj, { customInspect: 'not a boolean or "symbol"' }); },
        TypeError,
        '`customInspect` must be a boolean or the string "symbol"'
    );
});

test('inspect custom symbol', { skip: !hasSymbols || !utilInspect || !utilInspect.custom }, function (t) {
    t.plan(4);

    var obj = { inspect: function stringInspect() { return 'string'; } };
    obj[utilInspect.custom] = function custom() { return 'symbol'; };

    var symbolResult = '[ symbol, [] ]';
    var stringResult = '[ string, [] ]';
    var falseResult = '[ { inspect: [Function: stringInspect]' + (utilInspect.custom ? ', [' + inspect(utilInspect.custom) + ']: [Function: custom]' : '') + ' }, [] ]';

    var symbolStringFallback = utilInspect.custom ? symbolResult : stringResult;
    var symbolFalseFallback = utilInspect.custom ? symbolResult : falseResult;

    t.equal(inspect([obj, []]), symbolStringFallback);
    t.equal(inspect([obj, []], { customInspect: true }), symbolStringFallback);
    t.equal(inspect([obj, []], { customInspect: 'symbol' }), symbolFalseFallback);
    t.equal(inspect([obj, []], { customInspect: false }), falseResult);
});

test('symbols', { skip: !hasSymbols }, function (t) {
    t.plan(2);

    var obj = { a: 1 };
    obj[Symbol('test')] = 2;
    obj[Symbol.iterator] = 3;
    Object.defineProperty(obj, Symbol('non-enum'), {
        enumerable: false,
        value: 4
    });

    if (typeof Symbol.iterator === 'symbol') {
        t.equal(inspect(obj), '{ a: 1, [Symbol(test)]: 2, [Symbol(Symbol.iterator)]: 3 }', 'object with symbols');
        t.equal(inspect([obj, []]), '[ { a: 1, [Symbol(test)]: 2, [Symbol(Symbol.iterator)]: 3 }, [] ]', 'object with symbols in array');
    } else {
        // symbol sham key ordering is unreliable
        t.match(
            inspect(obj),
            /^(?:{ a: 1, \[Symbol\(test\)\]: 2, \[Symbol\(Symbol.iterator\)\]: 3 }|{ a: 1, \[Symbol\(Symbol.iterator\)\]: 3, \[Symbol\(test\)\]: 2 })$/,
            'object with symbols (nondeterministic symbol sham key ordering)'
        );
        t.match(
            inspect([obj, []]),
            /^\[ (?:{ a: 1, \[Symbol\(test\)\]: 2, \[Symbol\(Symbol.iterator\)\]: 3 }|{ a: 1, \[Symbol\(Symbol.iterator\)\]: 3, \[Symbol\(test\)\]: 2 }), \[\] \]$/,
            'object with symbols in array (nondeterministic symbol sham key ordering)'
        );
    }
});

test('maxStringLength', function (t) {
    t['throws'](
        function () { inspect('', { maxStringLength: -1 }); },
        TypeError,
        'maxStringLength must be >= 0, or Infinity, not negative'
    );

    var str = repeat('a', 1e8);

    t.equal(
        inspect([str], { maxStringLength: 10 }),
        '[ \'aaaaaaaaaa\'... 99999990 more characters ]',
        'maxStringLength option limits output'
    );

    t.equal(
        inspect(['f'], { maxStringLength: null }),
        '[ \'\'... 1 more character ]',
        'maxStringLength option accepts `null`'
    );

    t.equal(
        inspect([str], { maxStringLength: Infinity }),
        '[ \'' + str + '\' ]',
        'maxStringLength option accepts ∞'
    );

    t.end();
});
