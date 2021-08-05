'use strict';

exports.__esModule = true;

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _tokenize = require('./tokenize');

var _tokenize2 = _interopRequireDefault(_tokenize);

var _input = require('./input');

var _input2 = _interopRequireDefault(_input);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var colors = new _chalk2.default.constructor({ enabled: true });

var HIGHLIGHT_THEME = {
    'brackets': colors.cyan,
    'at-word': colors.cyan,
    'call': colors.cyan,
    'comment': colors.gray,
    'string': colors.green,
    'class': colors.yellow,
    'hash': colors.magenta,
    '(': colors.cyan,
    ')': colors.cyan,
    '{': colors.yellow,
    '}': colors.yellow,
    '[': colors.yellow,
    ']': colors.yellow,
    ':': colors.yellow,
    ';': colors.yellow
};

function getTokenType(_ref, processor) {
    var type = _ref[0],
        value = _ref[1];

    if (type === 'word') {
        if (value[0] === '.') {
            return 'class';
        }
        if (value[0] === '#') {
            return 'hash';
        }
    }

    if (!processor.endOfFile()) {
        var next = processor.nextToken();
        processor.back(next);
        if (next[0] === 'brackets' || next[0] === '(') return 'call';
    }

    return type;
}

function terminalHighlight(css) {
    var processor = (0, _tokenize2.default)(new _input2.default(css), { ignoreErrors: true });
    var result = '';

    var _loop = function _loop() {
        var token = processor.nextToken();
        var color = HIGHLIGHT_THEME[getTokenType(token, processor)];
        if (color) {
            result += token[1].split(/\r?\n/).map(function (i) {
                return color(i);
            }).join('\n');
        } else {
            result += token[1];
        }
    };

    while (!processor.endOfFile()) {
        _loop();
    }
    return result;
}

exports.default = terminalHighlight;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlcm1pbmFsLWhpZ2hsaWdodC5lczYiXSwibmFtZXMiOlsiY29sb3JzIiwiY29uc3RydWN0b3IiLCJlbmFibGVkIiwiSElHSExJR0hUX1RIRU1FIiwiY3lhbiIsImdyYXkiLCJncmVlbiIsInllbGxvdyIsIm1hZ2VudGEiLCJnZXRUb2tlblR5cGUiLCJwcm9jZXNzb3IiLCJ0eXBlIiwidmFsdWUiLCJlbmRPZkZpbGUiLCJuZXh0IiwibmV4dFRva2VuIiwiYmFjayIsInRlcm1pbmFsSGlnaGxpZ2h0IiwiY3NzIiwiaWdub3JlRXJyb3JzIiwicmVzdWx0IiwidG9rZW4iLCJjb2xvciIsInNwbGl0IiwibWFwIiwiaSIsImpvaW4iXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7OztBQUVBOzs7O0FBQ0E7Ozs7OztBQUVBLElBQUlBLFNBQVMsSUFBSSxnQkFBTUMsV0FBVixDQUFzQixFQUFFQyxTQUFTLElBQVgsRUFBdEIsQ0FBYjs7QUFFQSxJQUFNQyxrQkFBa0I7QUFDcEIsZ0JBQVlILE9BQU9JLElBREM7QUFFcEIsZUFBWUosT0FBT0ksSUFGQztBQUdwQixZQUFZSixPQUFPSSxJQUhDO0FBSXBCLGVBQVlKLE9BQU9LLElBSkM7QUFLcEIsY0FBWUwsT0FBT00sS0FMQztBQU1wQixhQUFZTixPQUFPTyxNQU5DO0FBT3BCLFlBQVlQLE9BQU9RLE9BUEM7QUFRcEIsU0FBWVIsT0FBT0ksSUFSQztBQVNwQixTQUFZSixPQUFPSSxJQVRDO0FBVXBCLFNBQVlKLE9BQU9PLE1BVkM7QUFXcEIsU0FBWVAsT0FBT08sTUFYQztBQVlwQixTQUFZUCxPQUFPTyxNQVpDO0FBYXBCLFNBQVlQLE9BQU9PLE1BYkM7QUFjcEIsU0FBWVAsT0FBT08sTUFkQztBQWVwQixTQUFZUCxPQUFPTztBQWZDLENBQXhCOztBQWtCQSxTQUFTRSxZQUFULE9BQXFDQyxTQUFyQyxFQUFnRDtBQUFBLFFBQXpCQyxJQUF5QjtBQUFBLFFBQW5CQyxLQUFtQjs7QUFDNUMsUUFBS0QsU0FBUyxNQUFkLEVBQXVCO0FBQ25CLFlBQUtDLE1BQU0sQ0FBTixNQUFhLEdBQWxCLEVBQXdCO0FBQ3BCLG1CQUFPLE9BQVA7QUFDSDtBQUNELFlBQUtBLE1BQU0sQ0FBTixNQUFhLEdBQWxCLEVBQXdCO0FBQ3BCLG1CQUFPLE1BQVA7QUFDSDtBQUNKOztBQUVELFFBQUssQ0FBQ0YsVUFBVUcsU0FBVixFQUFOLEVBQThCO0FBQzFCLFlBQUlDLE9BQU9KLFVBQVVLLFNBQVYsRUFBWDtBQUNBTCxrQkFBVU0sSUFBVixDQUFlRixJQUFmO0FBQ0EsWUFBS0EsS0FBSyxDQUFMLE1BQVksVUFBWixJQUEwQkEsS0FBSyxDQUFMLE1BQVksR0FBM0MsRUFBaUQsT0FBTyxNQUFQO0FBQ3BEOztBQUVELFdBQU9ILElBQVA7QUFDSDs7QUFFRCxTQUFTTSxpQkFBVCxDQUEyQkMsR0FBM0IsRUFBZ0M7QUFDNUIsUUFBSVIsWUFBWSx3QkFBVSxvQkFBVVEsR0FBVixDQUFWLEVBQTBCLEVBQUVDLGNBQWMsSUFBaEIsRUFBMUIsQ0FBaEI7QUFDQSxRQUFJQyxTQUFTLEVBQWI7O0FBRjRCO0FBSXhCLFlBQUlDLFFBQVFYLFVBQVVLLFNBQVYsRUFBWjtBQUNBLFlBQUlPLFFBQVFuQixnQkFBZ0JNLGFBQWFZLEtBQWIsRUFBb0JYLFNBQXBCLENBQWhCLENBQVo7QUFDQSxZQUFLWSxLQUFMLEVBQWE7QUFDVEYsc0JBQVVDLE1BQU0sQ0FBTixFQUFTRSxLQUFULENBQWUsT0FBZixFQUNQQyxHQURPLENBQ0Y7QUFBQSx1QkFBS0YsTUFBTUcsQ0FBTixDQUFMO0FBQUEsYUFERSxFQUVQQyxJQUZPLENBRUYsSUFGRSxDQUFWO0FBR0gsU0FKRCxNQUlPO0FBQ0hOLHNCQUFVQyxNQUFNLENBQU4sQ0FBVjtBQUNIO0FBWnVCOztBQUc1QixXQUFRLENBQUNYLFVBQVVHLFNBQVYsRUFBVCxFQUFpQztBQUFBO0FBVWhDO0FBQ0QsV0FBT08sTUFBUDtBQUNIOztrQkFFY0gsaUIiLCJmaWxlIjoidGVybWluYWwtaGlnaGxpZ2h0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuaW1wb3J0IHRva2VuaXplciBmcm9tICcuL3Rva2VuaXplJztcbmltcG9ydCBJbnB1dCAgICBmcm9tICcuL2lucHV0JztcblxubGV0IGNvbG9ycyA9IG5ldyBjaGFsay5jb25zdHJ1Y3Rvcih7IGVuYWJsZWQ6IHRydWUgfSk7XG5cbmNvbnN0IEhJR0hMSUdIVF9USEVNRSA9IHtcbiAgICAnYnJhY2tldHMnOiBjb2xvcnMuY3lhbixcbiAgICAnYXQtd29yZCc6ICBjb2xvcnMuY3lhbixcbiAgICAnY2FsbCc6ICAgICBjb2xvcnMuY3lhbixcbiAgICAnY29tbWVudCc6ICBjb2xvcnMuZ3JheSxcbiAgICAnc3RyaW5nJzogICBjb2xvcnMuZ3JlZW4sXG4gICAgJ2NsYXNzJzogICAgY29sb3JzLnllbGxvdyxcbiAgICAnaGFzaCc6ICAgICBjb2xvcnMubWFnZW50YSxcbiAgICAnKCc6ICAgICAgICBjb2xvcnMuY3lhbixcbiAgICAnKSc6ICAgICAgICBjb2xvcnMuY3lhbixcbiAgICAneyc6ICAgICAgICBjb2xvcnMueWVsbG93LFxuICAgICd9JzogICAgICAgIGNvbG9ycy55ZWxsb3csXG4gICAgJ1snOiAgICAgICAgY29sb3JzLnllbGxvdyxcbiAgICAnXSc6ICAgICAgICBjb2xvcnMueWVsbG93LFxuICAgICc6JzogICAgICAgIGNvbG9ycy55ZWxsb3csXG4gICAgJzsnOiAgICAgICAgY29sb3JzLnllbGxvd1xufTtcblxuZnVuY3Rpb24gZ2V0VG9rZW5UeXBlKFt0eXBlLCB2YWx1ZV0sIHByb2Nlc3Nvcikge1xuICAgIGlmICggdHlwZSA9PT0gJ3dvcmQnICkge1xuICAgICAgICBpZiAoIHZhbHVlWzBdID09PSAnLicgKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2NsYXNzJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoIHZhbHVlWzBdID09PSAnIycgKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2hhc2gnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCAhcHJvY2Vzc29yLmVuZE9mRmlsZSgpICkge1xuICAgICAgICBsZXQgbmV4dCA9IHByb2Nlc3Nvci5uZXh0VG9rZW4oKTtcbiAgICAgICAgcHJvY2Vzc29yLmJhY2sobmV4dCk7XG4gICAgICAgIGlmICggbmV4dFswXSA9PT0gJ2JyYWNrZXRzJyB8fCBuZXh0WzBdID09PSAnKCcgKSByZXR1cm4gJ2NhbGwnO1xuICAgIH1cblxuICAgIHJldHVybiB0eXBlO1xufVxuXG5mdW5jdGlvbiB0ZXJtaW5hbEhpZ2hsaWdodChjc3MpIHtcbiAgICBsZXQgcHJvY2Vzc29yID0gdG9rZW5pemVyKG5ldyBJbnB1dChjc3MpLCB7IGlnbm9yZUVycm9yczogdHJ1ZSB9KTtcbiAgICBsZXQgcmVzdWx0ID0gJyc7XG4gICAgd2hpbGUgKCAhcHJvY2Vzc29yLmVuZE9mRmlsZSgpICkge1xuICAgICAgICBsZXQgdG9rZW4gPSBwcm9jZXNzb3IubmV4dFRva2VuKCk7XG4gICAgICAgIGxldCBjb2xvciA9IEhJR0hMSUdIVF9USEVNRVtnZXRUb2tlblR5cGUodG9rZW4sIHByb2Nlc3NvcildO1xuICAgICAgICBpZiAoIGNvbG9yICkge1xuICAgICAgICAgICAgcmVzdWx0ICs9IHRva2VuWzFdLnNwbGl0KC9cXHI/XFxuLylcbiAgICAgICAgICAgICAgLm1hcCggaSA9PiBjb2xvcihpKSApXG4gICAgICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSB0b2tlblsxXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZGVmYXVsdCB0ZXJtaW5hbEhpZ2hsaWdodDtcbiJdfQ==
