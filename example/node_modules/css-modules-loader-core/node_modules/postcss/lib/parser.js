'use strict';

exports.__esModule = true;

var _declaration = require('./declaration');

var _declaration2 = _interopRequireDefault(_declaration);

var _tokenize = require('./tokenize');

var _tokenize2 = _interopRequireDefault(_tokenize);

var _comment = require('./comment');

var _comment2 = _interopRequireDefault(_comment);

var _atRule = require('./at-rule');

var _atRule2 = _interopRequireDefault(_atRule);

var _root = require('./root');

var _root2 = _interopRequireDefault(_root);

var _rule = require('./rule');

var _rule2 = _interopRequireDefault(_rule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Parser = function () {
    function Parser(input) {
        _classCallCheck(this, Parser);

        this.input = input;

        this.root = new _root2.default();
        this.current = this.root;
        this.spaces = '';
        this.semicolon = false;

        this.createTokenizer();
        this.root.source = { input: input, start: { line: 1, column: 1 } };
    }

    Parser.prototype.createTokenizer = function createTokenizer() {
        this.tokenizer = (0, _tokenize2.default)(this.input);
    };

    Parser.prototype.parse = function parse() {
        var token = void 0;
        while (!this.tokenizer.endOfFile()) {
            token = this.tokenizer.nextToken();

            switch (token[0]) {

                case 'space':
                    this.spaces += token[1];
                    break;

                case ';':
                    this.freeSemicolon(token);
                    break;

                case '}':
                    this.end(token);
                    break;

                case 'comment':
                    this.comment(token);
                    break;

                case 'at-word':
                    this.atrule(token);
                    break;

                case '{':
                    this.emptyRule(token);
                    break;

                default:
                    this.other(token);
                    break;
            }
        }
        this.endFile();
    };

    Parser.prototype.comment = function comment(token) {
        var node = new _comment2.default();
        this.init(node, token[2], token[3]);
        node.source.end = { line: token[4], column: token[5] };

        var text = token[1].slice(2, -2);
        if (/^\s*$/.test(text)) {
            node.text = '';
            node.raws.left = text;
            node.raws.right = '';
        } else {
            var match = text.match(/^(\s*)([^]*[^\s])(\s*)$/);
            node.text = match[2];
            node.raws.left = match[1];
            node.raws.right = match[3];
        }
    };

    Parser.prototype.emptyRule = function emptyRule(token) {
        var node = new _rule2.default();
        this.init(node, token[2], token[3]);
        node.selector = '';
        node.raws.between = '';
        this.current = node;
    };

    Parser.prototype.other = function other(start) {
        var end = false;
        var type = null;
        var colon = false;
        var bracket = null;
        var brackets = [];

        var tokens = [];
        var token = start;
        while (token) {
            type = token[0];
            tokens.push(token);

            if (type === '(' || type === '[') {
                if (!bracket) bracket = token;
                brackets.push(type === '(' ? ')' : ']');
            } else if (brackets.length === 0) {
                if (type === ';') {
                    if (colon) {
                        this.decl(tokens);
                        return;
                    } else {
                        break;
                    }
                } else if (type === '{') {
                    this.rule(tokens);
                    return;
                } else if (type === '}') {
                    this.tokenizer.back(tokens.pop());
                    end = true;
                    break;
                } else if (type === ':') {
                    colon = true;
                }
            } else if (type === brackets[brackets.length - 1]) {
                brackets.pop();
                if (brackets.length === 0) bracket = null;
            }

            token = this.tokenizer.nextToken();
        }

        if (this.tokenizer.endOfFile()) end = true;
        if (brackets.length > 0) this.unclosedBracket(bracket);

        if (end && colon) {
            while (tokens.length) {
                token = tokens[tokens.length - 1][0];
                if (token !== 'space' && token !== 'comment') break;
                this.tokenizer.back(tokens.pop());
            }
            this.decl(tokens);
            return;
        } else {
            this.unknownWord(tokens);
        }
    };

    Parser.prototype.rule = function rule(tokens) {
        tokens.pop();

        var node = new _rule2.default();
        this.init(node, tokens[0][2], tokens[0][3]);

        node.raws.between = this.spacesAndCommentsFromEnd(tokens);
        this.raw(node, 'selector', tokens);
        this.current = node;
    };

    Parser.prototype.decl = function decl(tokens) {
        var node = new _declaration2.default();
        this.init(node);

        var last = tokens[tokens.length - 1];
        if (last[0] === ';') {
            this.semicolon = true;
            tokens.pop();
        }
        if (last[4]) {
            node.source.end = { line: last[4], column: last[5] };
        } else {
            node.source.end = { line: last[2], column: last[3] };
        }

        while (tokens[0][0] !== 'word') {
            if (tokens.length === 1) this.unknownWord(tokens);
            node.raws.before += tokens.shift()[1];
        }
        node.source.start = { line: tokens[0][2], column: tokens[0][3] };

        node.prop = '';
        while (tokens.length) {
            var type = tokens[0][0];
            if (type === ':' || type === 'space' || type === 'comment') {
                break;
            }
            node.prop += tokens.shift()[1];
        }

        node.raws.between = '';

        var token = void 0;
        while (tokens.length) {
            token = tokens.shift();

            if (token[0] === ':') {
                node.raws.between += token[1];
                break;
            } else {
                node.raws.between += token[1];
            }
        }

        if (node.prop[0] === '_' || node.prop[0] === '*') {
            node.raws.before += node.prop[0];
            node.prop = node.prop.slice(1);
        }
        node.raws.between += this.spacesAndCommentsFromStart(tokens);
        this.precheckMissedSemicolon(tokens);

        for (var i = tokens.length - 1; i > 0; i--) {
            token = tokens[i];
            if (token[1] === '!important') {
                node.important = true;
                var string = this.stringFrom(tokens, i);
                string = this.spacesFromEnd(tokens) + string;
                if (string !== ' !important') node.raws.important = string;
                break;
            } else if (token[1] === 'important') {
                var cache = tokens.slice(0);
                var str = '';
                for (var j = i; j > 0; j--) {
                    var _type = cache[j][0];
                    if (str.trim().indexOf('!') === 0 && _type !== 'space') {
                        break;
                    }
                    str = cache.pop()[1] + str;
                }
                if (str.trim().indexOf('!') === 0) {
                    node.important = true;
                    node.raws.important = str;
                    tokens = cache;
                }
            }

            if (token[0] !== 'space' && token[0] !== 'comment') {
                break;
            }
        }

        this.raw(node, 'value', tokens);

        if (node.value.indexOf(':') !== -1) this.checkMissedSemicolon(tokens);
    };

    Parser.prototype.atrule = function atrule(token) {
        var node = new _atRule2.default();
        node.name = token[1].slice(1);
        if (node.name === '') {
            this.unnamedAtrule(node, token);
        }
        this.init(node, token[2], token[3]);

        var last = false;
        var open = false;
        var params = [];

        while (!this.tokenizer.endOfFile()) {
            token = this.tokenizer.nextToken();

            if (token[0] === ';') {
                node.source.end = { line: token[2], column: token[3] };
                this.semicolon = true;
                break;
            } else if (token[0] === '{') {
                open = true;
                break;
            } else if (token[0] === '}') {
                this.end(token);
                break;
            } else {
                params.push(token);
            }

            if (this.tokenizer.endOfFile()) {
                last = true;
                break;
            }
        }

        node.raws.between = this.spacesAndCommentsFromEnd(params);
        if (params.length) {
            node.raws.afterName = this.spacesAndCommentsFromStart(params);
            this.raw(node, 'params', params);
            if (last) {
                token = params[params.length - 1];
                node.source.end = { line: token[4], column: token[5] };
                this.spaces = node.raws.between;
                node.raws.between = '';
            }
        } else {
            node.raws.afterName = '';
            node.params = '';
        }

        if (open) {
            node.nodes = [];
            this.current = node;
        }
    };

    Parser.prototype.end = function end(token) {
        if (this.current.nodes && this.current.nodes.length) {
            this.current.raws.semicolon = this.semicolon;
        }
        this.semicolon = false;

        this.current.raws.after = (this.current.raws.after || '') + this.spaces;
        this.spaces = '';

        if (this.current.parent) {
            this.current.source.end = { line: token[2], column: token[3] };
            this.current = this.current.parent;
        } else {
            this.unexpectedClose(token);
        }
    };

    Parser.prototype.endFile = function endFile() {
        if (this.current.parent) this.unclosedBlock();
        if (this.current.nodes && this.current.nodes.length) {
            this.current.raws.semicolon = this.semicolon;
        }
        this.current.raws.after = (this.current.raws.after || '') + this.spaces;
    };

    Parser.prototype.freeSemicolon = function freeSemicolon(token) {
        this.spaces += token[1];
        if (this.current.nodes) {
            var prev = this.current.nodes[this.current.nodes.length - 1];
            if (prev && prev.type === 'rule') {
                prev.raws.ownSemicolon = this.spaces;
                this.spaces = '';
            }
        }
    };

    // Helpers

    Parser.prototype.init = function init(node, line, column) {
        this.current.push(node);

        node.source = { start: { line: line, column: column }, input: this.input };
        node.raws.before = this.spaces;
        this.spaces = '';
        if (node.type !== 'comment') this.semicolon = false;
    };

    Parser.prototype.raw = function raw(node, prop, tokens) {
        var token = void 0,
            type = void 0;
        var length = tokens.length;
        var value = '';
        var clean = true;
        for (var i = 0; i < length; i += 1) {
            token = tokens[i];
            type = token[0];
            if (type === 'comment' || type === 'space' && i === length - 1) {
                clean = false;
            } else {
                value += token[1];
            }
        }
        if (!clean) {
            var raw = tokens.reduce(function (all, i) {
                return all + i[1];
            }, '');
            node.raws[prop] = { value: value, raw: raw };
        }
        node[prop] = value;
    };

    Parser.prototype.spacesAndCommentsFromEnd = function spacesAndCommentsFromEnd(tokens) {
        var lastTokenType = void 0;
        var spaces = '';
        while (tokens.length) {
            lastTokenType = tokens[tokens.length - 1][0];
            if (lastTokenType !== 'space' && lastTokenType !== 'comment') break;
            spaces = tokens.pop()[1] + spaces;
        }
        return spaces;
    };

    Parser.prototype.spacesAndCommentsFromStart = function spacesAndCommentsFromStart(tokens) {
        var next = void 0;
        var spaces = '';
        while (tokens.length) {
            next = tokens[0][0];
            if (next !== 'space' && next !== 'comment') break;
            spaces += tokens.shift()[1];
        }
        return spaces;
    };

    Parser.prototype.spacesFromEnd = function spacesFromEnd(tokens) {
        var lastTokenType = void 0;
        var spaces = '';
        while (tokens.length) {
            lastTokenType = tokens[tokens.length - 1][0];
            if (lastTokenType !== 'space') break;
            spaces = tokens.pop()[1] + spaces;
        }
        return spaces;
    };

    Parser.prototype.stringFrom = function stringFrom(tokens, from) {
        var result = '';
        for (var i = from; i < tokens.length; i++) {
            result += tokens[i][1];
        }
        tokens.splice(from, tokens.length - from);
        return result;
    };

    Parser.prototype.colon = function colon(tokens) {
        var brackets = 0;
        var token = void 0,
            type = void 0,
            prev = void 0;
        for (var i = 0; i < tokens.length; i++) {
            token = tokens[i];
            type = token[0];

            if (type === '(') {
                brackets += 1;
            } else if (type === ')') {
                brackets -= 1;
            } else if (brackets === 0 && type === ':') {
                if (!prev) {
                    this.doubleColon(token);
                } else if (prev[0] === 'word' && prev[1] === 'progid') {
                    continue;
                } else {
                    return i;
                }
            }

            prev = token;
        }
        return false;
    };

    // Errors

    Parser.prototype.unclosedBracket = function unclosedBracket(bracket) {
        throw this.input.error('Unclosed bracket', bracket[2], bracket[3]);
    };

    Parser.prototype.unknownWord = function unknownWord(tokens) {
        throw this.input.error('Unknown word', tokens[0][2], tokens[0][3]);
    };

    Parser.prototype.unexpectedClose = function unexpectedClose(token) {
        throw this.input.error('Unexpected }', token[2], token[3]);
    };

    Parser.prototype.unclosedBlock = function unclosedBlock() {
        var pos = this.current.source.start;
        throw this.input.error('Unclosed block', pos.line, pos.column);
    };

    Parser.prototype.doubleColon = function doubleColon(token) {
        throw this.input.error('Double colon', token[2], token[3]);
    };

    Parser.prototype.unnamedAtrule = function unnamedAtrule(node, token) {
        throw this.input.error('At-rule without name', token[2], token[3]);
    };

    Parser.prototype.precheckMissedSemicolon = function precheckMissedSemicolon(tokens) {
        // Hook for Safe Parser
        tokens;
    };

    Parser.prototype.checkMissedSemicolon = function checkMissedSemicolon(tokens) {
        var colon = this.colon(tokens);
        if (colon === false) return;

        var founded = 0;
        var token = void 0;
        for (var j = colon - 1; j >= 0; j--) {
            token = tokens[j];
            if (token[0] !== 'space') {
                founded += 1;
                if (founded === 2) break;
            }
        }
        throw this.input.error('Missed semicolon', token[2], token[3]);
    };

    return Parser;
}();

exports.default = Parser;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBhcnNlci5lczYiXSwibmFtZXMiOlsiUGFyc2VyIiwiaW5wdXQiLCJyb290IiwiY3VycmVudCIsInNwYWNlcyIsInNlbWljb2xvbiIsImNyZWF0ZVRva2VuaXplciIsInNvdXJjZSIsInN0YXJ0IiwibGluZSIsImNvbHVtbiIsInRva2VuaXplciIsInBhcnNlIiwidG9rZW4iLCJlbmRPZkZpbGUiLCJuZXh0VG9rZW4iLCJmcmVlU2VtaWNvbG9uIiwiZW5kIiwiY29tbWVudCIsImF0cnVsZSIsImVtcHR5UnVsZSIsIm90aGVyIiwiZW5kRmlsZSIsIm5vZGUiLCJpbml0IiwidGV4dCIsInNsaWNlIiwidGVzdCIsInJhd3MiLCJsZWZ0IiwicmlnaHQiLCJtYXRjaCIsInNlbGVjdG9yIiwiYmV0d2VlbiIsInR5cGUiLCJjb2xvbiIsImJyYWNrZXQiLCJicmFja2V0cyIsInRva2VucyIsInB1c2giLCJsZW5ndGgiLCJkZWNsIiwicnVsZSIsImJhY2siLCJwb3AiLCJ1bmNsb3NlZEJyYWNrZXQiLCJ1bmtub3duV29yZCIsInNwYWNlc0FuZENvbW1lbnRzRnJvbUVuZCIsInJhdyIsImxhc3QiLCJiZWZvcmUiLCJzaGlmdCIsInByb3AiLCJzcGFjZXNBbmRDb21tZW50c0Zyb21TdGFydCIsInByZWNoZWNrTWlzc2VkU2VtaWNvbG9uIiwiaSIsImltcG9ydGFudCIsInN0cmluZyIsInN0cmluZ0Zyb20iLCJzcGFjZXNGcm9tRW5kIiwiY2FjaGUiLCJzdHIiLCJqIiwidHJpbSIsImluZGV4T2YiLCJ2YWx1ZSIsImNoZWNrTWlzc2VkU2VtaWNvbG9uIiwibmFtZSIsInVubmFtZWRBdHJ1bGUiLCJvcGVuIiwicGFyYW1zIiwiYWZ0ZXJOYW1lIiwibm9kZXMiLCJhZnRlciIsInBhcmVudCIsInVuZXhwZWN0ZWRDbG9zZSIsInVuY2xvc2VkQmxvY2siLCJwcmV2Iiwib3duU2VtaWNvbG9uIiwiY2xlYW4iLCJyZWR1Y2UiLCJhbGwiLCJsYXN0VG9rZW5UeXBlIiwibmV4dCIs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dCI6WyJpbXBvcnQgRGVjbGFyYXRpb24gZnJvbSAnLi9kZWNsYXJhdGlvbic7XG5pbXBvcnQgdG9rZW5pemVyICAgZnJvbSAnLi90b2tlbml6ZSc7XG5pbXBvcnQgQ29tbWVudCAgICAgZnJvbSAnLi9jb21tZW50JztcbmltcG9ydCBBdFJ1bGUgICAgICBmcm9tICcuL2F0LXJ1bGUnO1xuaW1wb3J0IFJvb3QgICAgICAgIGZyb20gJy4vcm9vdCc7XG5pbXBvcnQgUnVsZSAgICAgICAgZnJvbSAnLi9ydWxlJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFyc2VyIHtcblxuICAgIGNvbnN0cnVjdG9yKGlucHV0KSB7XG4gICAgICAgIHRoaXMuaW5wdXQgPSBpbnB1dDtcblxuICAgICAgICB0aGlzLnJvb3QgICAgICA9IG5ldyBSb290KCk7XG4gICAgICAgIHRoaXMuY3VycmVudCAgID0gdGhpcy5yb290O1xuICAgICAgICB0aGlzLnNwYWNlcyAgICA9ICcnO1xuICAgICAgICB0aGlzLnNlbWljb2xvbiA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlVG9rZW5pemVyKCk7XG4gICAgICAgIHRoaXMucm9vdC5zb3VyY2UgPSB7IGlucHV0LCBzdGFydDogeyBsaW5lOiAxLCBjb2x1bW46IDEgfSB9O1xuICAgIH1cblxuICAgIGNyZWF0ZVRva2VuaXplcigpIHtcbiAgICAgICAgdGhpcy50b2tlbml6ZXIgPSB0b2tlbml6ZXIodGhpcy5pbnB1dCk7XG4gICAgfVxuXG4gICAgcGFyc2UoKSB7XG4gICAgICAgIGxldCB0b2tlbjtcbiAgICAgICAgd2hpbGUgKCAhdGhpcy50b2tlbml6ZXIuZW5kT2ZGaWxlKCkgKSB7XG4gICAgICAgICAgICB0b2tlbiA9IHRoaXMudG9rZW5pemVyLm5leHRUb2tlbigpO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKCB0b2tlblswXSApIHtcblxuICAgICAgICAgICAgY2FzZSAnc3BhY2UnOlxuICAgICAgICAgICAgICAgIHRoaXMuc3BhY2VzICs9IHRva2VuWzFdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICc7JzpcbiAgICAgICAgICAgICAgICB0aGlzLmZyZWVTZW1pY29sb24odG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICd9JzpcbiAgICAgICAgICAgICAgICB0aGlzLmVuZCh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2NvbW1lbnQnOlxuICAgICAgICAgICAgICAgIHRoaXMuY29tbWVudCh0b2tlbik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2F0LXdvcmQnOlxuICAgICAgICAgICAgICAgIHRoaXMuYXRydWxlKHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAneyc6XG4gICAgICAgICAgICAgICAgdGhpcy5lbXB0eVJ1bGUodG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRoaXMub3RoZXIodG9rZW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZW5kRmlsZSgpO1xuICAgIH1cblxuICAgIGNvbW1lbnQodG9rZW4pIHtcbiAgICAgICAgbGV0IG5vZGUgPSBuZXcgQ29tbWVudCgpO1xuICAgICAgICB0aGlzLmluaXQobm9kZSwgdG9rZW5bMl0sIHRva2VuWzNdKTtcbiAgICAgICAgbm9kZS5zb3VyY2UuZW5kID0geyBsaW5lOiB0b2tlbls0XSwgY29sdW1uOiB0b2tlbls1XSB9O1xuXG4gICAgICAgIGxldCB0ZXh0ID0gdG9rZW5bMV0uc2xpY2UoMiwgLTIpO1xuICAgICAgICBpZiAoIC9eXFxzKiQvLnRlc3QodGV4dCkgKSB7XG4gICAgICAgICAgICBub2RlLnRleHQgICAgICAgPSAnJztcbiAgICAgICAgICAgIG5vZGUucmF3cy5sZWZ0ICA9IHRleHQ7XG4gICAgICAgICAgICBub2RlLnJhd3MucmlnaHQgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBtYXRjaCA9IHRleHQubWF0Y2goL14oXFxzKikoW15dKlteXFxzXSkoXFxzKikkLyk7XG4gICAgICAgICAgICBub2RlLnRleHQgICAgICAgPSBtYXRjaFsyXTtcbiAgICAgICAgICAgIG5vZGUucmF3cy5sZWZ0ICA9IG1hdGNoWzFdO1xuICAgICAgICAgICAgbm9kZS5yYXdzLnJpZ2h0ID0gbWF0Y2hbM107XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBlbXB0eVJ1bGUodG9rZW4pIHtcbiAgICAgICAgbGV0IG5vZGUgPSBuZXcgUnVsZSgpO1xuICAgICAgICB0aGlzLmluaXQobm9kZSwgdG9rZW5bMl0sIHRva2VuWzNdKTtcbiAgICAgICAgbm9kZS5zZWxlY3RvciA9ICcnO1xuICAgICAgICBub2RlLnJhd3MuYmV0d2VlbiA9ICcnO1xuICAgICAgICB0aGlzLmN1cnJlbnQgPSBub2RlO1xuICAgIH1cblxuICAgIG90aGVyKHN0YXJ0KSB7XG4gICAgICAgIGxldCBlbmQgICAgICA9IGZhbHNlO1xuICAgICAgICBsZXQgdHlwZSAgICAgPSBudWxsO1xuICAgICAgICBsZXQgY29sb24gICAgPSBmYWxzZTtcbiAgICAgICAgbGV0IGJyYWNrZXQgID0gbnVsbDtcbiAgICAgICAgbGV0IGJyYWNrZXRzID0gW107XG5cbiAgICAgICAgbGV0IHRva2VucyA9IFtdO1xuICAgICAgICBsZXQgdG9rZW4gPSBzdGFydDtcbiAgICAgICAgd2hpbGUgKCB0b2tlbiApIHtcbiAgICAgICAgICAgIHR5cGUgPSB0b2tlblswXTtcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKHRva2VuKTtcblxuICAgICAgICAgICAgaWYgKCB0eXBlID09PSAnKCcgfHwgdHlwZSA9PT0gJ1snICkge1xuICAgICAgICAgICAgICAgIGlmICggIWJyYWNrZXQgKSBicmFja2V0ID0gdG9rZW47XG4gICAgICAgICAgICAgICAgYnJhY2tldHMucHVzaCh0eXBlID09PSAnKCcgPyAnKScgOiAnXScpO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCBicmFja2V0cy5sZW5ndGggPT09IDAgKSB7XG4gICAgICAgICAgICAgICAgaWYgKCB0eXBlID09PSAnOycgKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICggY29sb24gKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlY2wodG9rZW5zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCB0eXBlID09PSAneycgKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucnVsZSh0b2tlbnMpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCB0eXBlID09PSAnfScgKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9rZW5pemVyLmJhY2sodG9rZW5zLnBvcCgpKTtcbiAgICAgICAgICAgICAgICAgICAgZW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCB0eXBlID09PSAnOicgKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIHR5cGUgPT09IGJyYWNrZXRzW2JyYWNrZXRzLmxlbmd0aCAtIDFdICkge1xuICAgICAgICAgICAgICAgIGJyYWNrZXRzLnBvcCgpO1xuICAgICAgICAgICAgICAgIGlmICggYnJhY2tldHMubGVuZ3RoID09PSAwICkgYnJhY2tldCA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRva2VuID0gdGhpcy50b2tlbml6ZXIubmV4dFRva2VuKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIHRoaXMudG9rZW5pemVyLmVuZE9mRmlsZSgpICkgZW5kID0gdHJ1ZTtcbiAgICAgICAgaWYgKCBicmFja2V0cy5sZW5ndGggPiAwICkgdGhpcy51bmNsb3NlZEJyYWNrZXQoYnJhY2tldCk7XG5cbiAgICAgICAgaWYgKCBlbmQgJiYgY29sb24gKSB7XG4gICAgICAgICAgICB3aGlsZSAoIHRva2Vucy5sZW5ndGggKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSB0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdWzBdO1xuICAgICAgICAgICAgICAgIGlmICggdG9rZW4gIT09ICdzcGFjZScgJiYgdG9rZW4gIT09ICdjb21tZW50JyApIGJyZWFrO1xuICAgICAgICAgICAgICAgIHRoaXMudG9rZW5pemVyLmJhY2sodG9rZW5zLnBvcCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGVjbCh0b2tlbnMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy51bmtub3duV29yZCh0b2tlbnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcnVsZSh0b2tlbnMpIHtcbiAgICAgICAgdG9rZW5zLnBvcCgpO1xuXG4gICAgICAgIGxldCBub2RlID0gbmV3IFJ1bGUoKTtcbiAgICAgICAgdGhpcy5pbml0KG5vZGUsIHRva2Vuc1swXVsyXSwgdG9rZW5zWzBdWzNdKTtcblxuICAgICAgICBub2RlLnJhd3MuYmV0d2VlbiA9IHRoaXMuc3BhY2VzQW5kQ29tbWVudHNGcm9tRW5kKHRva2Vucyk7XG4gICAgICAgIHRoaXMucmF3KG5vZGUsICdzZWxlY3RvcicsIHRva2Vucyk7XG4gICAgICAgIHRoaXMuY3VycmVudCA9IG5vZGU7XG4gICAgfVxuXG4gICAgZGVjbCh0b2tlbnMpIHtcbiAgICAgICAgbGV0IG5vZGUgPSBuZXcgRGVjbGFyYXRpb24oKTtcbiAgICAgICAgdGhpcy5pbml0KG5vZGUpO1xuXG4gICAgICAgIGxldCBsYXN0ID0gdG9rZW5zW3Rva2Vucy5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKCBsYXN0WzBdID09PSAnOycgKSB7XG4gICAgICAgICAgICB0aGlzLnNlbWljb2xvbiA9IHRydWU7XG4gICAgICAgICAgICB0b2tlbnMucG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCBsYXN0WzRdICkge1xuICAgICAgICAgICAgbm9kZS5zb3VyY2UuZW5kID0geyBsaW5lOiBsYXN0WzRdLCBjb2x1bW46IGxhc3RbNV0gfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5vZGUuc291cmNlLmVuZCA9IHsgbGluZTogbGFzdFsyXSwgY29sdW1uOiBsYXN0WzNdIH07XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAoIHRva2Vuc1swXVswXSAhPT0gJ3dvcmQnICkge1xuICAgICAgICAgICAgaWYgKCB0b2tlbnMubGVuZ3RoID09PSAxICkgdGhpcy51bmtub3duV29yZCh0b2tlbnMpO1xuICAgICAgICAgICAgbm9kZS5yYXdzLmJlZm9yZSArPSB0b2tlbnMuc2hpZnQoKVsxXTtcbiAgICAgICAgfVxuICAgICAgICBub2RlLnNvdXJjZS5zdGFydCA9IHsgbGluZTogdG9rZW5zWzBdWzJdLCBjb2x1bW46IHRva2Vuc1swXVszXSB9O1xuXG4gICAgICAgIG5vZGUucHJvcCA9ICcnO1xuICAgICAgICB3aGlsZSAoIHRva2Vucy5sZW5ndGggKSB7XG4gICAgICAgICAgICBsZXQgdHlwZSA9IHRva2Vuc1swXVswXTtcbiAgICAgICAgICAgIGlmICggdHlwZSA9PT0gJzonIHx8IHR5cGUgPT09ICdzcGFjZScgfHwgdHlwZSA9PT0gJ2NvbW1lbnQnICkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZS5wcm9wICs9IHRva2Vucy5zaGlmdCgpWzFdO1xuICAgICAgICB9XG5cbiAgICAgICAgbm9kZS5yYXdzLmJldHdlZW4gPSAnJztcblxuICAgICAgICBsZXQgdG9rZW47XG4gICAgICAgIHdoaWxlICggdG9rZW5zLmxlbmd0aCApIHtcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW5zLnNoaWZ0KCk7XG5cbiAgICAgICAgICAgIGlmICggdG9rZW5bMF0gPT09ICc6JyApIHtcbiAgICAgICAgICAgICAgICBub2RlLnJhd3MuYmV0d2VlbiArPSB0b2tlblsxXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yYXdzLmJldHdlZW4gKz0gdG9rZW5bMV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIG5vZGUucHJvcFswXSA9PT0gJ18nIHx8IG5vZGUucHJvcFswXSA9PT0gJyonICkge1xuICAgICAgICAgICAgbm9kZS5yYXdzLmJlZm9yZSArPSBub2RlLnByb3BbMF07XG4gICAgICAgICAgICBub2RlLnByb3AgPSBub2RlLnByb3Auc2xpY2UoMSk7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZS5yYXdzLmJldHdlZW4gKz0gdGhpcy5zcGFjZXNBbmRDb21tZW50c0Zyb21TdGFydCh0b2tlbnMpO1xuICAgICAgICB0aGlzLnByZWNoZWNrTWlzc2VkU2VtaWNvbG9uKHRva2Vucyk7XG5cbiAgICAgICAgZm9yICggbGV0IGkgPSB0b2tlbnMubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSApIHtcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW5zW2ldO1xuICAgICAgICAgICAgaWYgKCB0b2tlblsxXSA9PT0gJyFpbXBvcnRhbnQnICkge1xuICAgICAgICAgICAgICAgIG5vZGUuaW1wb3J0YW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBsZXQgc3RyaW5nID0gdGhpcy5zdHJpbmdGcm9tKHRva2VucywgaSk7XG4gICAgICAgICAgICAgICAgc3RyaW5nID0gdGhpcy5zcGFjZXNGcm9tRW5kKHRva2VucykgKyBzdHJpbmc7XG4gICAgICAgICAgICAgICAgaWYgKCBzdHJpbmcgIT09ICcgIWltcG9ydGFudCcgKSBub2RlLnJhd3MuaW1wb3J0YW50ID0gc3RyaW5nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRva2VuWzFdID09PSAnaW1wb3J0YW50Jykge1xuICAgICAgICAgICAgICAgIGxldCBjYWNoZSA9IHRva2Vucy5zbGljZSgwKTtcbiAgICAgICAgICAgICAgICBsZXQgc3RyICAgPSAnJztcbiAgICAgICAgICAgICAgICBmb3IgKCBsZXQgaiA9IGk7IGogPiAwOyBqLS0gKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0eXBlID0gY2FjaGVbal1bMF07XG4gICAgICAgICAgICAgICAgICAgIGlmICggc3RyLnRyaW0oKS5pbmRleE9mKCchJykgPT09IDAgJiYgdHlwZSAhPT0gJ3NwYWNlJyApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0ciA9IGNhY2hlLnBvcCgpWzFdICsgc3RyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIHN0ci50cmltKCkuaW5kZXhPZignIScpID09PSAwICkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLmltcG9ydGFudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmF3cy5pbXBvcnRhbnQgPSBzdHI7XG4gICAgICAgICAgICAgICAgICAgIHRva2VucyA9IGNhY2hlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCB0b2tlblswXSAhPT0gJ3NwYWNlJyAmJiB0b2tlblswXSAhPT0gJ2NvbW1lbnQnICkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yYXcobm9kZSwgJ3ZhbHVlJywgdG9rZW5zKTtcblxuICAgICAgICBpZiAoIG5vZGUudmFsdWUuaW5kZXhPZignOicpICE9PSAtMSApIHRoaXMuY2hlY2tNaXNzZWRTZW1pY29sb24odG9rZW5zKTtcbiAgICB9XG5cbiAgICBhdHJ1bGUodG9rZW4pIHtcbiAgICAgICAgbGV0IG5vZGUgID0gbmV3IEF0UnVsZSgpO1xuICAgICAgICBub2RlLm5hbWUgPSB0b2tlblsxXS5zbGljZSgxKTtcbiAgICAgICAgaWYgKCBub2RlLm5hbWUgPT09ICcnICkge1xuICAgICAgICAgICAgdGhpcy51bm5hbWVkQXRydWxlKG5vZGUsIHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmluaXQobm9kZSwgdG9rZW5bMl0sIHRva2VuWzNdKTtcblxuICAgICAgICBsZXQgbGFzdCAgID0gZmFsc2U7XG4gICAgICAgIGxldCBvcGVuICAgPSBmYWxzZTtcbiAgICAgICAgbGV0IHBhcmFtcyA9IFtdO1xuXG4gICAgICAgIHdoaWxlICggIXRoaXMudG9rZW5pemVyLmVuZE9mRmlsZSgpICkge1xuICAgICAgICAgICAgdG9rZW4gPSB0aGlzLnRva2VuaXplci5uZXh0VG9rZW4oKTtcblxuICAgICAgICAgICAgaWYgKCB0b2tlblswXSA9PT0gJzsnICkge1xuICAgICAgICAgICAgICAgIG5vZGUuc291cmNlLmVuZCA9IHsgbGluZTogdG9rZW5bMl0sIGNvbHVtbjogdG9rZW5bM10gfTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbWljb2xvbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCB0b2tlblswXSA9PT0gJ3snICkge1xuICAgICAgICAgICAgICAgIG9wZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIGlmICggdG9rZW5bMF0gPT09ICd9Jykge1xuICAgICAgICAgICAgICAgIHRoaXMuZW5kKHRva2VuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2godG9rZW4pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIHRoaXMudG9rZW5pemVyLmVuZE9mRmlsZSgpICkge1xuICAgICAgICAgICAgICAgIGxhc3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbm9kZS5yYXdzLmJldHdlZW4gPSB0aGlzLnNwYWNlc0FuZENvbW1lbnRzRnJvbUVuZChwYXJhbXMpO1xuICAgICAgICBpZiAoIHBhcmFtcy5sZW5ndGggKSB7XG4gICAgICAgICAgICBub2RlLnJhd3MuYWZ0ZXJOYW1lID0gdGhpcy5zcGFjZXNBbmRDb21tZW50c0Zyb21TdGFydChwYXJhbXMpO1xuICAgICAgICAgICAgdGhpcy5yYXcobm9kZSwgJ3BhcmFtcycsIHBhcmFtcyk7XG4gICAgICAgICAgICBpZiAoIGxhc3QgKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBwYXJhbXNbcGFyYW1zLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIG5vZGUuc291cmNlLmVuZCAgID0geyBsaW5lOiB0b2tlbls0XSwgY29sdW1uOiB0b2tlbls1XSB9O1xuICAgICAgICAgICAgICAgIHRoaXMuc3BhY2VzICAgICAgID0gbm9kZS5yYXdzLmJldHdlZW47XG4gICAgICAgICAgICAgICAgbm9kZS5yYXdzLmJldHdlZW4gPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5vZGUucmF3cy5hZnRlck5hbWUgPSAnJztcbiAgICAgICAgICAgIG5vZGUucGFyYW1zICAgICAgICAgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggb3BlbiApIHtcbiAgICAgICAgICAgIG5vZGUubm9kZXMgICA9IFtdO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50ID0gbm9kZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGVuZCh0b2tlbikge1xuICAgICAgICBpZiAoIHRoaXMuY3VycmVudC5ub2RlcyAmJiB0aGlzLmN1cnJlbnQubm9kZXMubGVuZ3RoICkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50LnJhd3Muc2VtaWNvbG9uID0gdGhpcy5zZW1pY29sb247XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZW1pY29sb24gPSBmYWxzZTtcblxuICAgICAgICB0aGlzLmN1cnJlbnQucmF3cy5hZnRlciA9ICh0aGlzLmN1cnJlbnQucmF3cy5hZnRlciB8fCAnJykgKyB0aGlzLnNwYWNlcztcbiAgICAgICAgdGhpcy5zcGFjZXMgPSAnJztcblxuICAgICAgICBpZiAoIHRoaXMuY3VycmVudC5wYXJlbnQgKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQuc291cmNlLmVuZCA9IHsgbGluZTogdG9rZW5bMl0sIGNvbHVtbjogdG9rZW5bM10gfTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IHRoaXMuY3VycmVudC5wYXJlbnQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnVuZXhwZWN0ZWRDbG9zZSh0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBlbmRGaWxlKCkge1xuICAgICAgICBpZiAoIHRoaXMuY3VycmVudC5wYXJlbnQgKSB0aGlzLnVuY2xvc2VkQmxvY2soKTtcbiAgICAgICAgaWYgKCB0aGlzLmN1cnJlbnQubm9kZXMgJiYgdGhpcy5jdXJyZW50Lm5vZGVzLmxlbmd0aCApIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudC5yYXdzLnNlbWljb2xvbiA9IHRoaXMuc2VtaWNvbG9uO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3VycmVudC5yYXdzLmFmdGVyID0gKHRoaXMuY3VycmVudC5yYXdzLmFmdGVyIHx8ICcnKSArIHRoaXMuc3BhY2VzO1xuICAgIH1cblxuICAgIGZyZWVTZW1pY29sb24odG9rZW4pIHtcbiAgICAgICAgdGhpcy5zcGFjZXMgKz0gdG9rZW5bMV07XG4gICAgICAgIGlmICggdGhpcy5jdXJyZW50Lm5vZGVzICkge1xuICAgICAgICAgICAgbGV0IHByZXYgPSB0aGlzLmN1cnJlbnQubm9kZXNbdGhpcy5jdXJyZW50Lm5vZGVzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKCBwcmV2ICYmIHByZXYudHlwZSA9PT0gJ3J1bGUnICkge1xuICAgICAgICAgICAgICAgIHByZXYucmF3cy5vd25TZW1pY29sb24gPSB0aGlzLnNwYWNlcztcbiAgICAgICAgICAgICAgICB0aGlzLnNwYWNlcyA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gSGVscGVyc1xuXG4gICAgaW5pdChub2RlLCBsaW5lLCBjb2x1bW4pIHtcbiAgICAgICAgdGhpcy5jdXJyZW50LnB1c2gobm9kZSk7XG5cbiAgICAgICAgbm9kZS5zb3VyY2UgPSB7IHN0YXJ0OiB7IGxpbmUsIGNvbHVtbiB9LCBpbnB1dDogdGhpcy5pbnB1dCB9O1xuICAgICAgICBub2RlLnJhd3MuYmVmb3JlID0gdGhpcy5zcGFjZXM7XG4gICAgICAgIHRoaXMuc3BhY2VzID0gJyc7XG4gICAgICAgIGlmICggbm9kZS50eXBlICE9PSAnY29tbWVudCcgKSB0aGlzLnNlbWljb2xvbiA9IGZhbHNlO1xuICAgIH1cblxuICAgIHJhdyhub2RlLCBwcm9wLCB0b2tlbnMpIHtcbiAgICAgICAgbGV0IHRva2VuLCB0eXBlO1xuICAgICAgICBsZXQgbGVuZ3RoID0gdG9rZW5zLmxlbmd0aDtcbiAgICAgICAgbGV0IHZhbHVlICA9ICcnO1xuICAgICAgICBsZXQgY2xlYW4gID0gdHJ1ZTtcbiAgICAgICAgZm9yICggbGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEgKSB7XG4gICAgICAgICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgICAgICAgIHR5cGUgID0gdG9rZW5bMF07XG4gICAgICAgICAgICBpZiAoIHR5cGUgPT09ICdjb21tZW50JyB8fCB0eXBlID09PSAnc3BhY2UnICYmIGkgPT09IGxlbmd0aCAtIDEgKSB7XG4gICAgICAgICAgICAgICAgY2xlYW4gPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgKz0gdG9rZW5bMV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCAhY2xlYW4gKSB7XG4gICAgICAgICAgICBsZXQgcmF3ID0gdG9rZW5zLnJlZHVjZSggKGFsbCwgaSkgPT4gYWxsICsgaVsxXSwgJycpO1xuICAgICAgICAgICAgbm9kZS5yYXdzW3Byb3BdID0geyB2YWx1ZSwgcmF3IH07XG4gICAgICAgIH1cbiAgICAgICAgbm9kZVtwcm9wXSA9IHZhbHVlO1xuICAgIH1cblxuICAgIHNwYWNlc0FuZENvbW1lbnRzRnJvbUVuZCh0b2tlbnMpIHtcbiAgICAgICAgbGV0IGxhc3RUb2tlblR5cGU7XG4gICAgICAgIGxldCBzcGFjZXMgPSAnJztcbiAgICAgICAgd2hpbGUgKCB0b2tlbnMubGVuZ3RoICkge1xuICAgICAgICAgICAgbGFzdFRva2VuVHlwZSA9IHRva2Vuc1t0b2tlbnMubGVuZ3RoIC0gMV1bMF07XG4gICAgICAgICAgICBpZiAoIGxhc3RUb2tlblR5cGUgIT09ICdzcGFjZScgJiZcbiAgICAgICAgICAgICAgICBsYXN0VG9rZW5UeXBlICE9PSAnY29tbWVudCcgKSBicmVhaztcbiAgICAgICAgICAgIHNwYWNlcyA9IHRva2Vucy5wb3AoKVsxXSArIHNwYWNlcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3BhY2VzO1xuICAgIH1cblxuICAgIHNwYWNlc0FuZENvbW1lbnRzRnJvbVN0YXJ0KHRva2Vucykge1xuICAgICAgICBsZXQgbmV4dDtcbiAgICAgICAgbGV0IHNwYWNlcyA9ICcnO1xuICAgICAgICB3aGlsZSAoIHRva2Vucy5sZW5ndGggKSB7XG4gICAgICAgICAgICBuZXh0ID0gdG9rZW5zWzBdWzBdO1xuICAgICAgICAgICAgaWYgKCBuZXh0ICE9PSAnc3BhY2UnICYmIG5leHQgIT09ICdjb21tZW50JyApIGJyZWFrO1xuICAgICAgICAgICAgc3BhY2VzICs9IHRva2Vucy5zaGlmdCgpWzFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzcGFjZXM7XG4gICAgfVxuXG4gICAgc3BhY2VzRnJvbUVuZCh0b2tlbnMpIHtcbiAgICAgICAgbGV0IGxhc3RUb2tlblR5cGU7XG4gICAgICAgIGxldCBzcGFjZXMgPSAnJztcbiAgICAgICAgd2hpbGUgKCB0b2tlbnMubGVuZ3RoICkge1xuICAgICAgICAgICAgbGFzdFRva2VuVHlwZSA9IHRva2Vuc1t0b2tlbnMubGVuZ3RoIC0gMV1bMF07XG4gICAgICAgICAgICBpZiAoIGxhc3RUb2tlblR5cGUgIT09ICdzcGFjZScgKSBicmVhaztcbiAgICAgICAgICAgIHNwYWNlcyA9IHRva2Vucy5wb3AoKVsxXSArIHNwYWNlcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3BhY2VzO1xuICAgIH1cblxuICAgIHN0cmluZ0Zyb20odG9rZW5zLCBmcm9tKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSAnJztcbiAgICAgICAgZm9yICggbGV0IGkgPSBmcm9tOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrICkge1xuICAgICAgICAgICAgcmVzdWx0ICs9IHRva2Vuc1tpXVsxXTtcbiAgICAgICAgfVxuICAgICAgICB0b2tlbnMuc3BsaWNlKGZyb20sIHRva2Vucy5sZW5ndGggLSBmcm9tKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBjb2xvbih0b2tlbnMpIHtcbiAgICAgICAgbGV0IGJyYWNrZXRzID0gMDtcbiAgICAgICAgbGV0IHRva2VuLCB0eXBlLCBwcmV2O1xuICAgICAgICBmb3IgKCBsZXQgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKysgKSB7XG4gICAgICAgICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgICAgICAgIHR5cGUgID0gdG9rZW5bMF07XG5cbiAgICAgICAgICAgIGlmICggdHlwZSA9PT0gJygnICkge1xuICAgICAgICAgICAgICAgIGJyYWNrZXRzICs9IDE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCB0eXBlID09PSAnKScgKSB7XG4gICAgICAgICAgICAgICAgYnJhY2tldHMgLT0gMTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIGJyYWNrZXRzID09PSAwICYmIHR5cGUgPT09ICc6JyApIHtcbiAgICAgICAgICAgICAgICBpZiAoICFwcmV2ICkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvdWJsZUNvbG9uKHRva2VuKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCBwcmV2WzBdID09PSAnd29yZCcgJiYgcHJldlsxXSA9PT0gJ3Byb2dpZCcgKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJldiA9IHRva2VuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBFcnJvcnNcblxuICAgIHVuY2xvc2VkQnJhY2tldChicmFja2V0KSB7XG4gICAgICAgIHRocm93IHRoaXMuaW5wdXQuZXJyb3IoJ1VuY2xvc2VkIGJyYWNrZXQnLCBicmFja2V0WzJdLCBicmFja2V0WzNdKTtcbiAgICB9XG5cbiAgICB1bmtub3duV29yZCh0b2tlbnMpIHtcbiAgICAgICAgdGhyb3cgdGhpcy5pbnB1dC5lcnJvcignVW5rbm93biB3b3JkJywgdG9rZW5zWzBdWzJdLCB0b2tlbnNbMF1bM10pO1xuICAgIH1cblxuICAgIHVuZXhwZWN0ZWRDbG9zZSh0b2tlbikge1xuICAgICAgICB0aHJvdyB0aGlzLmlucHV0LmVycm9yKCdVbmV4cGVjdGVkIH0nLCB0b2tlblsyXSwgdG9rZW5bM10pO1xuICAgIH1cblxuICAgIHVuY2xvc2VkQmxvY2soKSB7XG4gICAgICAgIGxldCBwb3MgPSB0aGlzLmN1cnJlbnQuc291cmNlLnN0YXJ0O1xuICAgICAgICB0aHJvdyB0aGlzLmlucHV0LmVycm9yKCdVbmNsb3NlZCBibG9jaycsIHBvcy5saW5lLCBwb3MuY29sdW1uKTtcbiAgICB9XG5cbiAgICBkb3VibGVDb2xvbih0b2tlbikge1xuICAgICAgICB0aHJvdyB0aGlzLmlucHV0LmVycm9yKCdEb3VibGUgY29sb24nLCB0b2tlblsyXSwgdG9rZW5bM10pO1xuICAgIH1cblxuICAgIHVubmFtZWRBdHJ1bGUobm9kZSwgdG9rZW4pIHtcbiAgICAgICAgdGhyb3cgdGhpcy5pbnB1dC5lcnJvcignQXQtcnVsZSB3aXRob3V0IG5hbWUnLCB0b2tlblsyXSwgdG9rZW5bM10pO1xuICAgIH1cblxuICAgIHByZWNoZWNrTWlzc2VkU2VtaWNvbG9uKHRva2Vucykge1xuICAgICAgICAvLyBIb29rIGZvciBTYWZlIFBhcnNlclxuICAgICAgICB0b2tlbnM7XG4gICAgfVxuXG4gICAgY2hlY2tNaXNzZWRTZW1pY29sb24odG9rZW5zKSB7XG4gICAgICAgIGxldCBjb2xvbiA9IHRoaXMuY29sb24odG9rZW5zKTtcbiAgICAgICAgaWYgKCBjb2xvbiA9PT0gZmFsc2UgKSByZXR1cm47XG5cbiAgICAgICAgbGV0IGZvdW5kZWQgPSAwO1xuICAgICAgICBsZXQgdG9rZW47XG4gICAgICAgIGZvciAoIGxldCBqID0gY29sb24gLSAxOyBqID49IDA7IGotLSApIHtcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW5zW2pdO1xuICAgICAgICAgICAgaWYgKCB0b2tlblswXSAhPT0gJ3NwYWNlJyApIHtcbiAgICAgICAgICAgICAgICBmb3VuZGVkICs9IDE7XG4gICAgICAgICAgICAgICAgaWYgKCBmb3VuZGVkID09PSAyICkgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgdGhpcy5pbnB1dC5lcnJvcignTWlzc2VkIHNlbWljb2xvbicsIHRva2VuWzJdLCB0b2tlblszXSk7XG4gICAgfVxuXG59XG4iXX0=
