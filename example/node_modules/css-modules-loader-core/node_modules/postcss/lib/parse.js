'use strict';

exports.__esModule = true;
exports.default = parse;

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

var _input = require('./input');

var _input2 = _interopRequireDefault(_input);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function parse(css, opts) {
    if (opts && opts.safe) {
        throw new Error('Option safe was removed. ' + 'Use parser: require("postcss-safe-parser")');
    }

    var input = new _input2.default(css, opts);
    var parser = new _parser2.default(input);
    try {
        parser.parse();
    } catch (e) {
        if (e.name === 'CssSyntaxError' && opts && opts.from) {
            if (/\.scss$/i.test(opts.from)) {
                e.message += '\nYou tried to parse SCSS with ' + 'the standard CSS parser; ' + 'try again with the postcss-scss parser';
            } else if (/\.sass/i.test(opts.from)) {
                e.message += '\nYou tried to parse Sass with ' + 'the standard CSS parser; ' + 'try again with the postcss-sass parser';
            } else if (/\.less$/i.test(opts.from)) {
                e.message += '\nYou tried to parse Less with ' + 'the standard CSS parser; ' + 'try again with the postcss-less parser';
            }
        }
        throw e;
    }

    return parser.root;
}
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBhcnNlLmVzNiJdLCJuYW1lcyI6WyJwYXJzZSIsImNzcyIsIm9wdHMiLCJzYWZlIiwiRXJyb3IiLCJpbnB1dCIsInBhcnNlciIsImUiLCJuYW1lIiwiZnJvbSIsInRlc3QiLCJtZXNzYWdlIiwicm9vdCJdLCJtYXBwaW5ncyI6Ijs7O2tCQUd3QkEsSzs7QUFIeEI7Ozs7QUFDQTs7Ozs7O0FBRWUsU0FBU0EsS0FBVCxDQUFlQyxHQUFmLEVBQW9CQyxJQUFwQixFQUEwQjtBQUNyQyxRQUFLQSxRQUFRQSxLQUFLQyxJQUFsQixFQUF5QjtBQUNyQixjQUFNLElBQUlDLEtBQUosQ0FBVSw4QkFDQSw0Q0FEVixDQUFOO0FBRUg7O0FBRUQsUUFBSUMsUUFBUSxvQkFBVUosR0FBVixFQUFlQyxJQUFmLENBQVo7QUFDQSxRQUFJSSxTQUFTLHFCQUFXRCxLQUFYLENBQWI7QUFDQSxRQUFJO0FBQ0FDLGVBQU9OLEtBQVA7QUFDSCxLQUZELENBRUUsT0FBT08sQ0FBUCxFQUFVO0FBQ1IsWUFBS0EsRUFBRUMsSUFBRixLQUFXLGdCQUFYLElBQStCTixJQUEvQixJQUF1Q0EsS0FBS08sSUFBakQsRUFBd0Q7QUFDcEQsZ0JBQUssV0FBV0MsSUFBWCxDQUFnQlIsS0FBS08sSUFBckIsQ0FBTCxFQUFrQztBQUM5QkYsa0JBQUVJLE9BQUYsSUFBYSxvQ0FDQSwyQkFEQSxHQUVBLHdDQUZiO0FBR0gsYUFKRCxNQUlPLElBQUssVUFBVUQsSUFBVixDQUFlUixLQUFLTyxJQUFwQixDQUFMLEVBQWlDO0FBQ3BDRixrQkFBRUksT0FBRixJQUFhLG9DQUNBLDJCQURBLEdBRUEsd0NBRmI7QUFHSCxhQUpNLE1BSUEsSUFBSyxXQUFXRCxJQUFYLENBQWdCUixLQUFLTyxJQUFyQixDQUFMLEVBQWtDO0FBQ3JDRixrQkFBRUksT0FBRixJQUFhLG9DQUNBLDJCQURBLEdBRUEsd0NBRmI7QUFHSDtBQUNKO0FBQ0QsY0FBTUosQ0FBTjtBQUNIOztBQUVELFdBQU9ELE9BQU9NLElBQWQ7QUFDSCIsImZpbGUiOiJwYXJzZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXJzZXIgZnJvbSAnLi9wYXJzZXInO1xuaW1wb3J0IElucHV0ICBmcm9tICcuL2lucHV0JztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGFyc2UoY3NzLCBvcHRzKSB7XG4gICAgaWYgKCBvcHRzICYmIG9wdHMuc2FmZSApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPcHRpb24gc2FmZSB3YXMgcmVtb3ZlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnVXNlIHBhcnNlcjogcmVxdWlyZShcInBvc3Rjc3Mtc2FmZS1wYXJzZXJcIiknKTtcbiAgICB9XG5cbiAgICBsZXQgaW5wdXQgPSBuZXcgSW5wdXQoY3NzLCBvcHRzKTtcbiAgICBsZXQgcGFyc2VyID0gbmV3IFBhcnNlcihpbnB1dCk7XG4gICAgdHJ5IHtcbiAgICAgICAgcGFyc2VyLnBhcnNlKCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoIGUubmFtZSA9PT0gJ0Nzc1N5bnRheEVycm9yJyAmJiBvcHRzICYmIG9wdHMuZnJvbSApIHtcbiAgICAgICAgICAgIGlmICggL1xcLnNjc3MkL2kudGVzdChvcHRzLmZyb20pICkge1xuICAgICAgICAgICAgICAgIGUubWVzc2FnZSArPSAnXFxuWW91IHRyaWVkIHRvIHBhcnNlIFNDU1Mgd2l0aCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RoZSBzdGFuZGFyZCBDU1MgcGFyc2VyOyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RyeSBhZ2FpbiB3aXRoIHRoZSBwb3N0Y3NzLXNjc3MgcGFyc2VyJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIC9cXC5zYXNzL2kudGVzdChvcHRzLmZyb20pICkge1xuICAgICAgICAgICAgICAgIGUubWVzc2FnZSArPSAnXFxuWW91IHRyaWVkIHRvIHBhcnNlIFNhc3Mgd2l0aCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RoZSBzdGFuZGFyZCBDU1MgcGFyc2VyOyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RyeSBhZ2FpbiB3aXRoIHRoZSBwb3N0Y3NzLXNhc3MgcGFyc2VyJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIC9cXC5sZXNzJC9pLnRlc3Qob3B0cy5mcm9tKSApIHtcbiAgICAgICAgICAgICAgICBlLm1lc3NhZ2UgKz0gJ1xcbllvdSB0cmllZCB0byBwYXJzZSBMZXNzIHdpdGggJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0aGUgc3RhbmRhcmQgQ1NTIHBhcnNlcjsgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0cnkgYWdhaW4gd2l0aCB0aGUgcG9zdGNzcy1sZXNzIHBhcnNlcic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VyLnJvb3Q7XG59XG4iXX0=
