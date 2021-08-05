'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultRaw = {
    colon: ': ',
    indent: '    ',
    beforeDecl: '\n',
    beforeRule: '\n',
    beforeOpen: ' ',
    beforeClose: '\n',
    beforeComment: '\n',
    after: '\n',
    emptyBody: '',
    commentLeft: ' ',
    commentRight: ' '
};

function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1);
}

var Stringifier = function () {
    function Stringifier(builder) {
        _classCallCheck(this, Stringifier);

        this.builder = builder;
    }

    Stringifier.prototype.stringify = function stringify(node, semicolon) {
        this[node.type](node, semicolon);
    };

    Stringifier.prototype.root = function root(node) {
        this.body(node);
        if (node.raws.after) this.builder(node.raws.after);
    };

    Stringifier.prototype.comment = function comment(node) {
        var left = this.raw(node, 'left', 'commentLeft');
        var right = this.raw(node, 'right', 'commentRight');
        this.builder('/*' + left + node.text + right + '*/', node);
    };

    Stringifier.prototype.decl = function decl(node, semicolon) {
        var between = this.raw(node, 'between', 'colon');
        var string = node.prop + between + this.rawValue(node, 'value');

        if (node.important) {
            string += node.raws.important || ' !important';
        }

        if (semicolon) string += ';';
        this.builder(string, node);
    };

    Stringifier.prototype.rule = function rule(node) {
        this.block(node, this.rawValue(node, 'selector'));
        if (node.raws.ownSemicolon) {
            this.builder(node.raws.ownSemicolon, node, 'end');
        }
    };

    Stringifier.prototype.atrule = function atrule(node, semicolon) {
        var name = '@' + node.name;
        var params = node.params ? this.rawValue(node, 'params') : '';

        if (typeof node.raws.afterName !== 'undefined') {
            name += node.raws.afterName;
        } else if (params) {
            name += ' ';
        }

        if (node.nodes) {
            this.block(node, name + params);
        } else {
            var end = (node.raws.between || '') + (semicolon ? ';' : '');
            this.builder(name + params + end, node);
        }
    };

    Stringifier.prototype.body = function body(node) {
        var last = node.nodes.length - 1;
        while (last > 0) {
            if (node.nodes[last].type !== 'comment') break;
            last -= 1;
        }

        var semicolon = this.raw(node, 'semicolon');
        for (var i = 0; i < node.nodes.length; i++) {
            var child = node.nodes[i];
            var before = this.raw(child, 'before');
            if (before) this.builder(before);
            this.stringify(child, last !== i || semicolon);
        }
    };

    Stringifier.prototype.block = function block(node, start) {
        var between = this.raw(node, 'between', 'beforeOpen');
        this.builder(start + between + '{', node, 'start');

        var after = void 0;
        if (node.nodes && node.nodes.length) {
            this.body(node);
            after = this.raw(node, 'after');
        } else {
            after = this.raw(node, 'after', 'emptyBody');
        }

        if (after) this.builder(after);
        this.builder('}', node, 'end');
    };

    Stringifier.prototype.raw = function raw(node, own, detect) {
        var value = void 0;
        if (!detect) detect = own;

        // Already had
        if (own) {
            value = node.raws[own];
            if (typeof value !== 'undefined') return value;
        }

        var parent = node.parent;

        // Hack for first rule in CSS
        if (detect === 'before') {
            if (!parent || parent.type === 'root' && parent.first === node) {
                return '';
            }
        }

        // Floating child without parent
        if (!parent) return defaultRaw[detect];

        // Detect style by other nodes
        var root = node.root();
        if (!root.rawCache) root.rawCache = {};
        if (typeof root.rawCache[detect] !== 'undefined') {
            return root.rawCache[detect];
        }

        if (detect === 'before' || detect === 'after') {
            return this.beforeAfter(node, detect);
        } else {
            var method = 'raw' + capitalize(detect);
            if (this[method]) {
                value = this[method](root, node);
            } else {
                root.walk(function (i) {
                    value = i.raws[own];
                    if (typeof value !== 'undefined') return false;
                });
            }
        }

        if (typeof value === 'undefined') value = defaultRaw[detect];

        root.rawCache[detect] = value;
        return value;
    };

    Stringifier.prototype.rawSemicolon = function rawSemicolon(root) {
        var value = void 0;
        root.walk(function (i) {
            if (i.nodes && i.nodes.length && i.last.type === 'decl') {
                value = i.raws.semicolon;
                if (typeof value !== 'undefined') return false;
            }
        });
        return value;
    };

    Stringifier.prototype.rawEmptyBody = function rawEmptyBody(root) {
        var value = void 0;
        root.walk(function (i) {
            if (i.nodes && i.nodes.length === 0) {
                value = i.raws.after;
                if (typeof value !== 'undefined') return false;
            }
        });
        return value;
    };

    Stringifier.prototype.rawIndent = function rawIndent(root) {
        if (root.raws.indent) return root.raws.indent;
        var value = void 0;
        root.walk(function (i) {
            var p = i.parent;
            if (p && p !== root && p.parent && p.parent === root) {
                if (typeof i.raws.before !== 'undefined') {
                    var parts = i.raws.before.split('\n');
                    value = parts[parts.length - 1];
                    value = value.replace(/[^\s]/g, '');
                    return false;
                }
            }
        });
        return value;
    };

    Stringifier.prototype.rawBeforeComment = function rawBeforeComment(root, node) {
        var value = void 0;
        root.walkComments(function (i) {
            if (typeof i.raws.before !== 'undefined') {
                value = i.raws.before;
                if (value.indexOf('\n') !== -1) {
                    value = value.replace(/[^\n]+$/, '');
                }
                return false;
            }
        });
        if (typeof value === 'undefined') {
            value = this.raw(node, null, 'beforeDecl');
        }
        return value;
    };

    Stringifier.prototype.rawBeforeDecl = function rawBeforeDecl(root, node) {
        var value = void 0;
        root.walkDecls(function (i) {
            if (typeof i.raws.before !== 'undefined') {
                value = i.raws.before;
                if (value.indexOf('\n') !== -1) {
                    value = value.replace(/[^\n]+$/, '');
                }
                return false;
            }
        });
        if (typeof value === 'undefined') {
            value = this.raw(node, null, 'beforeRule');
        }
        return value;
    };

    Stringifier.prototype.rawBeforeRule = function rawBeforeRule(root) {
        var value = void 0;
        root.walk(function (i) {
            if (i.nodes && (i.parent !== root || root.first !== i)) {
                if (typeof i.raws.before !== 'undefined') {
                    value = i.raws.before;
                    if (value.indexOf('\n') !== -1) {
                        value = value.replace(/[^\n]+$/, '');
                    }
                    return false;
                }
            }
        });
        return value;
    };

    Stringifier.prototype.rawBeforeClose = function rawBeforeClose(root) {
        var value = void 0;
        root.walk(function (i) {
            if (i.nodes && i.nodes.length > 0) {
                if (typeof i.raws.after !== 'undefined') {
                    value = i.raws.after;
                    if (value.indexOf('\n') !== -1) {
                        value = value.replace(/[^\n]+$/, '');
                    }
                    return false;
                }
            }
        });
        return value;
    };

    Stringifier.prototype.rawBeforeOpen = function rawBeforeOpen(root) {
        var value = void 0;
        root.walk(function (i) {
            if (i.type !== 'decl') {
                value = i.raws.between;
                if (typeof value !== 'undefined') return false;
            }
        });
        return value;
    };

    Stringifier.prototype.rawColon = function rawColon(root) {
        var value = void 0;
        root.walkDecls(function (i) {
            if (typeof i.raws.between !== 'undefined') {
                value = i.raws.between.replace(/[^\s:]/g, '');
                return false;
            }
        });
        return value;
    };

    Stringifier.prototype.beforeAfter = function beforeAfter(node, detect) {
        var value = void 0;
        if (node.type === 'decl') {
            value = this.raw(node, null, 'beforeDecl');
        } else if (node.type === 'comment') {
            value = this.raw(node, null, 'beforeComment');
        } else if (detect === 'before') {
            value = this.raw(node, null, 'beforeRule');
        } else {
            value = this.raw(node, null, 'beforeClose');
        }

        var buf = node.parent;
        var depth = 0;
        while (buf && buf.type !== 'root') {
            depth += 1;
            buf = buf.parent;
        }

        if (value.indexOf('\n') !== -1) {
            var indent = this.raw(node, null, 'indent');
            if (indent.length) {
                for (var step = 0; step < depth; step++) {
                    value += indent;
                }
            }
        }

        return value;
    };

    Stringifier.prototype.rawValue = function rawValue(node, prop) {
        var value = node[prop];
        var raw = node.raws[prop];
        if (raw && raw.value === value) {
            return raw.raw;
        } else {
            return value;
        }
    };

    return Stringifier;
}();

exports.default = Stringifier;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0cmluZ2lmaWVyLmVzNiJdLCJuYW1lcyI6WyJkZWZhdWx0UmF3IiwiY29sb24iLCJpbmRlbnQiLCJiZWZvcmVEZWNsIiwiYmVmb3JlUnVsZSIsImJlZm9yZU9wZW4iLCJiZWZvcmVDbG9zZSIsImJlZm9yZUNvbW1lbnQiLCJhZnRlciIsImVtcHR5Qm9keSIsImNvbW1lbnRMZWZ0IiwiY29tbWVudFJpZ2h0IiwiY2FwaXRhbGl6ZSIsInN0ciIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJTdHJpbmdpZmllciIsImJ1aWxkZXIiLCJzdHJpbmdpZnkiLCJub2RlIiwic2VtaWNvbG9uIiwidHlwZSIsInJvb3QiLCJib2R5IiwicmF3cyIsImNvbW1lbnQiLCJsZWZ0IiwicmF3IiwicmlnaHQiLCJ0ZXh0IiwiZGVjbCIsImJldHdlZW4iLCJzdHJpbmciLCJwcm9wIiwicmF3VmFsdWUiLCJpbXBvcnRhbnQiLCJydWxlIiwiYmxvY2siLCJvd25TZW1pY29sb24iLCJhdHJ1bGUiLCJuYW1lIiwicGFyYW1zIiwiYWZ0ZXJOYW1lIiwibm9kZXMiLCJlbmQiLCJsYXN0IiwibGVuZ3RoIiwiaSIsImNoaWxkIiwiYmVmb3JlIiwic3RhcnQiLCJvd24iLCJkZXRlY3QiLCJ2YWx1ZSIsInBhcmVudCIsImZpcnN0IiwicmF3Q2FjaGUiLCJiZWZvcmVBZnRlciIsIm1ldGhvZCIsIndhbGsiLCJyYXdTZW1pY29sb24iLCJyYXdFbXB0eUJvZHkiLCJyYXdJbmRlbnQiLCJwIiwicGFydHMiLCJzcGxpdCIsInJlcGxhY2UiLCJyYXdCZWZvcmVDb21tZW50Iiwid2Fsa0NvbW1lbnRzIiwiaW5kZXhPZiIsInJhd0JlZm9yZURlY2wiLCJ3YWxrRGVjbHMiLCJyYXdCZWZvcmVSdWxlIiwicmF3QmVmb3JlQ2xvc2UiLCJyYXdCZWZvcmVPcGVuIiwicmF3Q29sb24iLCJidWYiLCJkZXB0aCIsInN0ZXAiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLElBQU1BLGFBQWE7QUFDZkMsV0FBZSxJQURBO0FBRWZDLFlBQWUsTUFGQTtBQUdmQyxnQkFBZSxJQUhBO0FBSWZDLGdCQUFlLElBSkE7QUFLZkMsZ0JBQWUsR0FMQTtBQU1mQyxpQkFBZSxJQU5BO0FBT2ZDLG1CQUFlLElBUEE7QUFRZkMsV0FBZSxJQVJBO0FBU2ZDLGVBQWUsRUFUQTtBQVVmQyxpQkFBZSxHQVZBO0FBV2ZDLGtCQUFlO0FBWEEsQ0FBbkI7O0FBY0EsU0FBU0MsVUFBVCxDQUFvQkMsR0FBcEIsRUFBeUI7QUFDckIsV0FBT0EsSUFBSSxDQUFKLEVBQU9DLFdBQVAsS0FBdUJELElBQUlFLEtBQUosQ0FBVSxDQUFWLENBQTlCO0FBQ0g7O0lBRUtDLFc7QUFFRix5QkFBWUMsT0FBWixFQUFxQjtBQUFBOztBQUNqQixhQUFLQSxPQUFMLEdBQWVBLE9BQWY7QUFDSDs7MEJBRURDLFMsc0JBQVVDLEksRUFBTUMsUyxFQUFXO0FBQ3ZCLGFBQUtELEtBQUtFLElBQVYsRUFBZ0JGLElBQWhCLEVBQXNCQyxTQUF0QjtBQUNILEs7OzBCQUVERSxJLGlCQUFLSCxJLEVBQU07QUFDUCxhQUFLSSxJQUFMLENBQVVKLElBQVY7QUFDQSxZQUFLQSxLQUFLSyxJQUFMLENBQVVoQixLQUFmLEVBQXVCLEtBQUtTLE9BQUwsQ0FBYUUsS0FBS0ssSUFBTCxDQUFVaEIsS0FBdkI7QUFDMUIsSzs7MEJBRURpQixPLG9CQUFRTixJLEVBQU07QUFDVixZQUFJTyxPQUFRLEtBQUtDLEdBQUwsQ0FBU1IsSUFBVCxFQUFlLE1BQWYsRUFBd0IsYUFBeEIsQ0FBWjtBQUNBLFlBQUlTLFFBQVEsS0FBS0QsR0FBTCxDQUFTUixJQUFULEVBQWUsT0FBZixFQUF3QixjQUF4QixDQUFaO0FBQ0EsYUFBS0YsT0FBTCxDQUFhLE9BQU9TLElBQVAsR0FBY1AsS0FBS1UsSUFBbkIsR0FBMEJELEtBQTFCLEdBQWtDLElBQS9DLEVBQXFEVCxJQUFyRDtBQUNILEs7OzBCQUVEVyxJLGlCQUFLWCxJLEVBQU1DLFMsRUFBVztBQUNsQixZQUFJVyxVQUFVLEtBQUtKLEdBQUwsQ0FBU1IsSUFBVCxFQUFlLFNBQWYsRUFBMEIsT0FBMUIsQ0FBZDtBQUNBLFlBQUlhLFNBQVViLEtBQUtjLElBQUwsR0FBWUYsT0FBWixHQUFzQixLQUFLRyxRQUFMLENBQWNmLElBQWQsRUFBb0IsT0FBcEIsQ0FBcEM7O0FBRUEsWUFBS0EsS0FBS2dCLFNBQVYsRUFBc0I7QUFDbEJILHNCQUFVYixLQUFLSyxJQUFMLENBQVVXLFNBQVYsSUFBdUIsYUFBakM7QUFDSDs7QUFFRCxZQUFLZixTQUFMLEVBQWlCWSxVQUFVLEdBQVY7QUFDakIsYUFBS2YsT0FBTCxDQUFhZSxNQUFiLEVBQXFCYixJQUFyQjtBQUNILEs7OzBCQUVEaUIsSSxpQkFBS2pCLEksRUFBTTtBQUNQLGFBQUtrQixLQUFMLENBQVdsQixJQUFYLEVBQWlCLEtBQUtlLFFBQUwsQ0FBY2YsSUFBZCxFQUFvQixVQUFwQixDQUFqQjtBQUNBLFlBQUtBLEtBQUtLLElBQUwsQ0FBVWMsWUFBZixFQUE4QjtBQUMxQixpQkFBS3JCLE9BQUwsQ0FBYUUsS0FBS0ssSUFBTCxDQUFVYyxZQUF2QixFQUFxQ25CLElBQXJDLEVBQTJDLEtBQTNDO0FBQ0g7QUFDSixLOzswQkFFRG9CLE0sbUJBQU9wQixJLEVBQU1DLFMsRUFBVztBQUNwQixZQUFJb0IsT0FBUyxNQUFNckIsS0FBS3FCLElBQXhCO0FBQ0EsWUFBSUMsU0FBU3RCLEtBQUtzQixNQUFMLEdBQWMsS0FBS1AsUUFBTCxDQUFjZixJQUFkLEVBQW9CLFFBQXBCLENBQWQsR0FBOEMsRUFBM0Q7O0FBRUEsWUFBSyxPQUFPQSxLQUFLSyxJQUFMLENBQVVrQixTQUFqQixLQUErQixXQUFwQyxFQUFrRDtBQUM5Q0Ysb0JBQVFyQixLQUFLSyxJQUFMLENBQVVrQixTQUFsQjtBQUNILFNBRkQsTUFFTyxJQUFLRCxNQUFMLEVBQWM7QUFDakJELG9CQUFRLEdBQVI7QUFDSDs7QUFFRCxZQUFLckIsS0FBS3dCLEtBQVYsRUFBa0I7QUFDZCxpQkFBS04sS0FBTCxDQUFXbEIsSUFBWCxFQUFpQnFCLE9BQU9DLE1BQXhCO0FBQ0gsU0FGRCxNQUVPO0FBQ0gsZ0JBQUlHLE1BQU0sQ0FBQ3pCLEtBQUtLLElBQUwsQ0FBVU8sT0FBVixJQUFxQixFQUF0QixLQUE2QlgsWUFBWSxHQUFaLEdBQWtCLEVBQS9DLENBQVY7QUFDQSxpQkFBS0gsT0FBTCxDQUFhdUIsT0FBT0MsTUFBUCxHQUFnQkcsR0FBN0IsRUFBa0N6QixJQUFsQztBQUNIO0FBQ0osSzs7MEJBRURJLEksaUJBQUtKLEksRUFBTTtBQUNQLFlBQUkwQixPQUFPMUIsS0FBS3dCLEtBQUwsQ0FBV0csTUFBWCxHQUFvQixDQUEvQjtBQUNBLGVBQVFELE9BQU8sQ0FBZixFQUFtQjtBQUNmLGdCQUFLMUIsS0FBS3dCLEtBQUwsQ0FBV0UsSUFBWCxFQUFpQnhCLElBQWpCLEtBQTBCLFNBQS9CLEVBQTJDO0FBQzNDd0Isb0JBQVEsQ0FBUjtBQUNIOztBQUVELFlBQUl6QixZQUFZLEtBQUtPLEdBQUwsQ0FBU1IsSUFBVCxFQUFlLFdBQWYsQ0FBaEI7QUFDQSxhQUFNLElBQUk0QixJQUFJLENBQWQsRUFBaUJBLElBQUk1QixLQUFLd0IsS0FBTCxDQUFXRyxNQUFoQyxFQUF3Q0MsR0FBeEMsRUFBOEM7QUFDMUMsZ0JBQUlDLFFBQVM3QixLQUFLd0IsS0FBTCxDQUFXSSxDQUFYLENBQWI7QUFDQSxnQkFBSUUsU0FBUyxLQUFLdEIsR0FBTCxDQUFTcUIsS0FBVCxFQUFnQixRQUFoQixDQUFiO0FBQ0EsZ0JBQUtDLE1BQUwsRUFBYyxLQUFLaEMsT0FBTCxDQUFhZ0MsTUFBYjtBQUNkLGlCQUFLL0IsU0FBTCxDQUFlOEIsS0FBZixFQUFzQkgsU0FBU0UsQ0FBVCxJQUFjM0IsU0FBcEM7QUFDSDtBQUNKLEs7OzBCQUVEaUIsSyxrQkFBTWxCLEksRUFBTStCLEssRUFBTztBQUNmLFlBQUluQixVQUFVLEtBQUtKLEdBQUwsQ0FBU1IsSUFBVCxFQUFlLFNBQWYsRUFBMEIsWUFBMUIsQ0FBZDtBQUNBLGFBQUtGLE9BQUwsQ0FBYWlDLFFBQVFuQixPQUFSLEdBQWtCLEdBQS9CLEVBQW9DWixJQUFwQyxFQUEwQyxPQUExQzs7QUFFQSxZQUFJWCxjQUFKO0FBQ0EsWUFBS1csS0FBS3dCLEtBQUwsSUFBY3hCLEtBQUt3QixLQUFMLENBQVdHLE1BQTlCLEVBQXVDO0FBQ25DLGlCQUFLdkIsSUFBTCxDQUFVSixJQUFWO0FBQ0FYLG9CQUFRLEtBQUttQixHQUFMLENBQVNSLElBQVQsRUFBZSxPQUFmLENBQVI7QUFDSCxTQUhELE1BR087QUFDSFgsb0JBQVEsS0FBS21CLEdBQUwsQ0FBU1IsSUFBVCxFQUFlLE9BQWYsRUFBd0IsV0FBeEIsQ0FBUjtBQUNIOztBQUVELFlBQUtYLEtBQUwsRUFBYSxLQUFLUyxPQUFMLENBQWFULEtBQWI7QUFDYixhQUFLUyxPQUFMLENBQWEsR0FBYixFQUFrQkUsSUFBbEIsRUFBd0IsS0FBeEI7QUFDSCxLOzswQkFFRFEsRyxnQkFBSVIsSSxFQUFNZ0MsRyxFQUFLQyxNLEVBQVE7QUFDbkIsWUFBSUMsY0FBSjtBQUNBLFlBQUssQ0FBQ0QsTUFBTixFQUFlQSxTQUFTRCxHQUFUOztBQUVmO0FBQ0EsWUFBS0EsR0FBTCxFQUFXO0FBQ1BFLG9CQUFRbEMsS0FBS0ssSUFBTCxDQUFVMkIsR0FBVixDQUFSO0FBQ0EsZ0JBQUssT0FBT0UsS0FBUCxLQUFpQixXQUF0QixFQUFvQyxPQUFPQSxLQUFQO0FBQ3ZDOztBQUVELFlBQUlDLFNBQVNuQyxLQUFLbUMsTUFBbEI7O0FBRUE7QUFDQSxZQUFLRixXQUFXLFFBQWhCLEVBQTJCO0FBQ3ZCLGdCQUFLLENBQUNFLE1BQUQsSUFBV0EsT0FBT2pDLElBQVAsS0FBZ0IsTUFBaEIsSUFBMEJpQyxPQUFPQyxLQUFQLEtBQWlCcEMsSUFBM0QsRUFBa0U7QUFDOUQsdUJBQU8sRUFBUDtBQUNIO0FBQ0o7O0FBRUQ7QUFDQSxZQUFLLENBQUNtQyxNQUFOLEVBQWUsT0FBT3RELFdBQVdvRCxNQUFYLENBQVA7O0FBRWY7QUFDQSxZQUFJOUIsT0FBT0gsS0FBS0csSUFBTCxFQUFYO0FBQ0EsWUFBSyxDQUFDQSxLQUFLa0MsUUFBWCxFQUFzQmxDLEtBQUtrQyxRQUFMLEdBQWdCLEVBQWhCO0FBQ3RCLFlBQUssT0FBT2xDLEtBQUtrQyxRQUFMLENBQWNKLE1BQWQsQ0FBUCxLQUFpQyxXQUF0QyxFQUFvRDtBQUNoRCxtQkFBTzlCLEtBQUtrQyxRQUFMLENBQWNKLE1BQWQsQ0FBUDtBQUNIOztBQUVELFlBQUtBLFdBQVcsUUFBWCxJQUF1QkEsV0FBVyxPQUF2QyxFQUFpRDtBQUM3QyxtQkFBTyxLQUFLSyxXQUFMLENBQWlCdEMsSUFBakIsRUFBdUJpQyxNQUF2QixDQUFQO0FBQ0gsU0FGRCxNQUVPO0FBQ0gsZ0JBQUlNLFNBQVMsUUFBUTlDLFdBQVd3QyxNQUFYLENBQXJCO0FBQ0EsZ0JBQUssS0FBS00sTUFBTCxDQUFMLEVBQW9CO0FBQ2hCTCx3QkFBUSxLQUFLSyxNQUFMLEVBQWFwQyxJQUFiLEVBQW1CSCxJQUFuQixDQUFSO0FBQ0gsYUFGRCxNQUVPO0FBQ0hHLHFCQUFLcUMsSUFBTCxDQUFXLGFBQUs7QUFDWk4sNEJBQVFOLEVBQUV2QixJQUFGLENBQU8yQixHQUFQLENBQVI7QUFDQSx3QkFBSyxPQUFPRSxLQUFQLEtBQWlCLFdBQXRCLEVBQW9DLE9BQU8sS0FBUDtBQUN2QyxpQkFIRDtBQUlIO0FBQ0o7O0FBRUQsWUFBSyxPQUFPQSxLQUFQLEtBQWlCLFdBQXRCLEVBQW9DQSxRQUFRckQsV0FBV29ELE1BQVgsQ0FBUjs7QUFFcEM5QixhQUFLa0MsUUFBTCxDQUFjSixNQUFkLElBQXdCQyxLQUF4QjtBQUNBLGVBQU9BLEtBQVA7QUFDSCxLOzswQkFFRE8sWSx5QkFBYXRDLEksRUFBTTtBQUNmLFlBQUkrQixjQUFKO0FBQ0EvQixhQUFLcUMsSUFBTCxDQUFXLGFBQUs7QUFDWixnQkFBS1osRUFBRUosS0FBRixJQUFXSSxFQUFFSixLQUFGLENBQVFHLE1BQW5CLElBQTZCQyxFQUFFRixJQUFGLENBQU94QixJQUFQLEtBQWdCLE1BQWxELEVBQTJEO0FBQ3ZEZ0Msd0JBQVFOLEVBQUV2QixJQUFGLENBQU9KLFNBQWY7QUFDQSxvQkFBSyxPQUFPaUMsS0FBUCxLQUFpQixXQUF0QixFQUFvQyxPQUFPLEtBQVA7QUFDdkM7QUFDSixTQUxEO0FBTUEsZUFBT0EsS0FBUDtBQUNILEs7OzBCQUVEUSxZLHlCQUFhdkMsSSxFQUFNO0FBQ2YsWUFBSStCLGNBQUo7QUFDQS9CLGFBQUtxQyxJQUFMLENBQVcsYUFBSztBQUNaLGdCQUFLWixFQUFFSixLQUFGLElBQVdJLEVBQUVKLEtBQUYsQ0FBUUcsTUFBUixLQUFtQixDQUFuQyxFQUF1QztBQUNuQ08sd0JBQVFOLEVBQUV2QixJQUFGLENBQU9oQixLQUFmO0FBQ0Esb0JBQUssT0FBTzZDLEtBQVAsS0FBaUIsV0FBdEIsRUFBb0MsT0FBTyxLQUFQO0FBQ3ZDO0FBQ0osU0FMRDtBQU1BLGVBQU9BLEtBQVA7QUFDSCxLOzswQkFFRFMsUyxzQkFBVXhDLEksRUFBTTtBQUNaLFlBQUtBLEtBQUtFLElBQUwsQ0FBVXRCLE1BQWYsRUFBd0IsT0FBT29CLEtBQUtFLElBQUwsQ0FBVXRCLE1BQWpCO0FBQ3hCLFlBQUltRCxjQUFKO0FBQ0EvQixhQUFLcUMsSUFBTCxDQUFXLGFBQUs7QUFDWixnQkFBSUksSUFBSWhCLEVBQUVPLE1BQVY7QUFDQSxnQkFBS1MsS0FBS0EsTUFBTXpDLElBQVgsSUFBbUJ5QyxFQUFFVCxNQUFyQixJQUErQlMsRUFBRVQsTUFBRixLQUFhaEMsSUFBakQsRUFBd0Q7QUFDcEQsb0JBQUssT0FBT3lCLEVBQUV2QixJQUFGLENBQU95QixNQUFkLEtBQXlCLFdBQTlCLEVBQTRDO0FBQ3hDLHdCQUFJZSxRQUFRakIsRUFBRXZCLElBQUYsQ0FBT3lCLE1BQVAsQ0FBY2dCLEtBQWQsQ0FBb0IsSUFBcEIsQ0FBWjtBQUNBWiw0QkFBUVcsTUFBTUEsTUFBTWxCLE1BQU4sR0FBZSxDQUFyQixDQUFSO0FBQ0FPLDRCQUFRQSxNQUFNYSxPQUFOLENBQWMsUUFBZCxFQUF3QixFQUF4QixDQUFSO0FBQ0EsMkJBQU8sS0FBUDtBQUNIO0FBQ0o7QUFDSixTQVZEO0FBV0EsZUFBT2IsS0FBUDtBQUNILEs7OzBCQUVEYyxnQiw2QkFBaUI3QyxJLEVBQU1ILEksRUFBTTtBQUN6QixZQUFJa0MsY0FBSjtBQUNBL0IsYUFBSzhDLFlBQUwsQ0FBbUIsYUFBSztBQUNwQixnQkFBSyxPQUFPckIsRUFBRXZCLElBQUYsQ0FBT3lCLE1BQWQsS0FBeUIsV0FBOUIsRUFBNEM7QUFDeENJLHdCQUFRTixFQUFFdkIsSUFBRixDQUFPeUIsTUFBZjtBQUNBLG9CQUFLSSxNQUFNZ0IsT0FBTixDQUFjLElBQWQsTUFBd0IsQ0FBQyxDQUE5QixFQUFrQztBQUM5QmhCLDRCQUFRQSxNQUFNYSxPQUFOLENBQWMsU0FBZCxFQUF5QixFQUF6QixDQUFSO0FBQ0g7QUFDRCx1QkFBTyxLQUFQO0FBQ0g7QUFDSixTQVJEO0FBU0EsWUFBSyxPQUFPYixLQUFQLEtBQWlCLFdBQXRCLEVBQW9DO0FBQ2hDQSxvQkFBUSxLQUFLMUIsR0FBTCxDQUFTUixJQUFULEVBQWUsSUFBZixFQUFxQixZQUFyQixDQUFSO0FBQ0g7QUFDRCxlQUFPa0MsS0FBUDtBQUNILEs7OzBCQUVEaUIsYSwwQkFBY2hELEksRUFBTUgsSSxFQUFNO0FBQ3RCLFlBQUlrQyxjQUFKO0FBQ0EvQixhQUFLaUQsU0FBTCxDQUFnQixhQUFLO0FBQ2pCLGdCQUFLLE9BQU94QixFQUFFdkIsSUFBRixDQUFPeUIsTUFBZCxLQUF5QixXQUE5QixFQUE0QztBQUN4Q0ksd0JBQVFOLEVBQUV2QixJQUFGLENBQU95QixNQUFmO0FBQ0Esb0JBQUtJLE1BQU1nQixPQUFOLENBQWMsSUFBZCxNQUF3QixDQUFDLENBQTlCLEVBQWtDO0FBQzlCaEIsNEJBQVFBLE1BQU1hLE9BQU4sQ0FBYyxTQUFkLEVBQXlCLEVBQXpCLENBQVI7QUFDSDtBQUNELHVCQUFPLEtBQVA7QUFDSDtBQUNKLFNBUkQ7QUFTQSxZQUFLLE9BQU9iLEtBQVAsS0FBaUIsV0FBdEIsRUFBb0M7QUFDaENBLG9CQUFRLEtBQUsxQixHQUFMLENBQVNSLElBQVQsRUFBZSxJQUFmLEVBQXFCLFlBQXJCLENBQVI7QUFDSDtBQUNELGVBQU9rQyxLQUFQO0FBQ0gsSzs7MEJBRURtQixhLDBCQUFjbEQsSSxFQUFNO0FBQ2hCLFlBQUkrQixjQUFKO0FBQ0EvQixhQUFLcUMsSUFBTCxDQUFXLGFBQUs7QUFDWixnQkFBS1osRUFBRUosS0FBRixLQUFZSSxFQUFFTyxNQUFGLEtBQWFoQyxJQUFiLElBQXFCQSxLQUFLaUMsS0FBTCxLQUFlUixDQUFoRCxDQUFMLEVBQTBEO0FBQ3RELG9CQUFLLE9BQU9BLEVBQUV2QixJQUFGLENBQU95QixNQUFkLEtBQXlCLFdBQTlCLEVBQTRDO0FBQ3hDSSw0QkFBUU4sRUFBRXZCLElBQUYsQ0FBT3lCLE1BQWY7QUFDQSx3QkFBS0ksTUFBTWdCLE9BQU4sQ0FBYyxJQUFkLE1BQXdCLENBQUMsQ0FBOUIsRUFBa0M7QUFDOUJoQixnQ0FBUUEsTUFBTWEsT0FBTixDQUFjLFNBQWQsRUFBeUIsRUFBekIsQ0FBUjtBQUNIO0FBQ0QsMkJBQU8sS0FBUDtBQUNIO0FBQ0o7QUFDSixTQVZEO0FBV0EsZUFBT2IsS0FBUDtBQUNILEs7OzBCQUVEb0IsYywyQkFBZW5ELEksRUFBTTtBQUNqQixZQUFJK0IsY0FBSjtBQUNBL0IsYUFBS3FDLElBQUwsQ0FBVyxhQUFLO0FBQ1osZ0JBQUtaLEVBQUVKLEtBQUYsSUFBV0ksRUFBRUosS0FBRixDQUFRRyxNQUFSLEdBQWlCLENBQWpDLEVBQXFDO0FBQ2pDLG9CQUFLLE9BQU9DLEVBQUV2QixJQUFGLENBQU9oQixLQUFkLEtBQXdCLFdBQTdCLEVBQTJDO0FBQ3ZDNkMsNEJBQVFOLEVBQUV2QixJQUFGLENBQU9oQixLQUFmO0FBQ0Esd0JBQUs2QyxNQUFNZ0IsT0FBTixDQUFjLElBQWQsTUFBd0IsQ0FBQyxDQUE5QixFQUFrQztBQUM5QmhCLGdDQUFRQSxNQUFNYSxPQUFOLENBQWMsU0FBZCxFQUF5QixFQUF6QixDQUFSO0FBQ0g7QUFDRCwyQkFBTyxLQUFQO0FBQ0g7QUFDSjtBQUNKLFNBVkQ7QUFXQSxlQUFPYixLQUFQO0FBQ0gsSzs7MEJBRURxQixhLDBCQUFjcEQsSSxFQUFNO0FBQ2hCLFlBQUkrQixjQUFKO0FBQ0EvQixhQUFLcUMsSUFBTCxDQUFXLGFBQUs7QUFDWixnQkFBS1osRUFBRTFCLElBQUYsS0FBVyxNQUFoQixFQUF5QjtBQUNyQmdDLHdCQUFRTixFQUFFdkIsSUFBRixDQUFPTyxPQUFmO0FBQ0Esb0JBQUssT0FBT3NCLEtBQVAsS0FBaUIsV0FBdEIsRUFBb0MsT0FBTyxLQUFQO0FBQ3ZDO0FBQ0osU0FMRDtBQU1BLGVBQU9BLEtBQVA7QUFDSCxLOzswQkFFRHNCLFEscUJBQVNyRCxJLEVBQU07QUFDWCxZQUFJK0IsY0FBSjtBQUNBL0IsYUFBS2lELFNBQUwsQ0FBZ0IsYUFBSztBQUNqQixnQkFBSyxPQUFPeEIsRUFBRXZCLElBQUYsQ0FBT08sT0FBZCxLQUEwQixXQUEvQixFQUE2QztBQUN6Q3NCLHdCQUFRTixFQUFFdkIsSUFBRixDQUFPTyxPQUFQLENBQWVtQyxPQUFmLENBQXVCLFNBQXZCLEVBQWtDLEVBQWxDLENBQVI7QUFDQSx1QkFBTyxLQUFQO0FBQ0g7QUFDSixTQUxEO0FBTUEsZUFBT2IsS0FBUDtBQUNILEs7OzBCQUVESSxXLHdCQUFZdEMsSSxFQUFNaUMsTSxFQUFRO0FBQ3RCLFlBQUlDLGNBQUo7QUFDQSxZQUFLbEMsS0FBS0UsSUFBTCxLQUFjLE1BQW5CLEVBQTRCO0FBQ3hCZ0Msb0JBQVEsS0FBSzFCLEdBQUwsQ0FBU1IsSUFBVCxFQUFlLElBQWYsRUFBcUIsWUFBckIsQ0FBUjtBQUNILFNBRkQsTUFFTyxJQUFLQSxLQUFLRSxJQUFMLEtBQWMsU0FBbkIsRUFBK0I7QUFDbENnQyxvQkFBUSxLQUFLMUIsR0FBTCxDQUFTUixJQUFULEVBQWUsSUFBZixFQUFxQixlQUFyQixDQUFSO0FBQ0gsU0FGTSxNQUVBLElBQUtpQyxXQUFXLFFBQWhCLEVBQTJCO0FBQzlCQyxvQkFBUSxLQUFLMUIsR0FBTCxDQUFTUixJQUFULEVBQWUsSUFBZixFQUFxQixZQUFyQixDQUFSO0FBQ0gsU0FGTSxNQUVBO0FBQ0hrQyxvQkFBUSxLQUFLMUIsR0FBTCxDQUFTUixJQUFULEVBQWUsSUFBZixFQUFxQixhQUFyQixDQUFSO0FBQ0g7O0FBRUQsWUFBSXlELE1BQVF6RCxLQUFLbUMsTUFBakI7QUFDQSxZQUFJdUIsUUFBUSxDQUFaO0FBQ0EsZUFBUUQsT0FBT0EsSUFBSXZELElBQUosS0FBYSxNQUE1QixFQUFxQztBQUNqQ3dELHFCQUFTLENBQVQ7QUFDQUQsa0JBQU1BLElBQUl0QixNQUFWO0FBQ0g7O0FBRUQsWUFBS0QsTUFBTWdCLE9BQU4sQ0FBYyxJQUFkLE1BQXdCLENBQUMsQ0FBOUIsRUFBa0M7QUFDOUIsZ0JBQUluRSxTQUFTLEtBQUt5QixHQUFMLENBQVNSLElBQVQsRUFBZSxJQUFmLEVBQXFCLFFBQXJCLENBQWI7QUFDQSxnQkFBS2pCLE9BQU80QyxNQUFaLEVBQXFCO0FBQ2pCLHFCQUFNLElBQUlnQyxPQUFPLENBQWpCLEVBQW9CQSxPQUFPRCxLQUEzQixFQUFrQ0MsTUFBbEM7QUFBMkN6Qiw2QkFBU25ELE1BQVQ7QUFBM0M7QUFDSDtBQUNKOztBQUVELGVBQU9tRCxLQUFQO0FBQ0gsSzs7MEJBRURuQixRLHFCQUFTZixJLEVBQU1jLEksRUFBTTtBQUNqQixZQUFJb0IsUUFBUWxDLEtBQUtjLElBQUwsQ0FBWjtBQUNBLFlBQUlOLE1BQVFSLEtBQUtLLElBQUwsQ0FBVVMsSUFBVixDQUFaO0FBQ0EsWUFBS04sT0FBT0EsSUFBSTBCLEtBQUosS0FBY0EsS0FBMUIsRUFBa0M7QUFDOUIsbUJBQU8xQixJQUFJQSxHQUFYO0FBQ0gsU0FGRCxNQUVPO0FBQ0gsbUJBQU8wQixLQUFQO0FBQ0g7QUFDSixLOzs7OztrQkFJVXJDLFciLCJmaWxlIjoic3RyaW5naWZpZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBkZWZhdWx0UmF3ID0ge1xuICAgIGNvbG9uOiAgICAgICAgICc6ICcsXG4gICAgaW5kZW50OiAgICAgICAgJyAgICAnLFxuICAgIGJlZm9yZURlY2w6ICAgICdcXG4nLFxuICAgIGJlZm9yZVJ1bGU6ICAgICdcXG4nLFxuICAgIGJlZm9yZU9wZW46ICAgICcgJyxcbiAgICBiZWZvcmVDbG9zZTogICAnXFxuJyxcbiAgICBiZWZvcmVDb21tZW50OiAnXFxuJyxcbiAgICBhZnRlcjogICAgICAgICAnXFxuJyxcbiAgICBlbXB0eUJvZHk6ICAgICAnJyxcbiAgICBjb21tZW50TGVmdDogICAnICcsXG4gICAgY29tbWVudFJpZ2h0OiAgJyAnXG59O1xuXG5mdW5jdGlvbiBjYXBpdGFsaXplKHN0cikge1xuICAgIHJldHVybiBzdHJbMF0udG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbn1cblxuY2xhc3MgU3RyaW5naWZpZXIge1xuXG4gICAgY29uc3RydWN0b3IoYnVpbGRlcikge1xuICAgICAgICB0aGlzLmJ1aWxkZXIgPSBidWlsZGVyO1xuICAgIH1cblxuICAgIHN0cmluZ2lmeShub2RlLCBzZW1pY29sb24pIHtcbiAgICAgICAgdGhpc1tub2RlLnR5cGVdKG5vZGUsIHNlbWljb2xvbik7XG4gICAgfVxuXG4gICAgcm9vdChub2RlKSB7XG4gICAgICAgIHRoaXMuYm9keShub2RlKTtcbiAgICAgICAgaWYgKCBub2RlLnJhd3MuYWZ0ZXIgKSB0aGlzLmJ1aWxkZXIobm9kZS5yYXdzLmFmdGVyKTtcbiAgICB9XG5cbiAgICBjb21tZW50KG5vZGUpIHtcbiAgICAgICAgbGV0IGxlZnQgID0gdGhpcy5yYXcobm9kZSwgJ2xlZnQnLCAgJ2NvbW1lbnRMZWZ0Jyk7XG4gICAgICAgIGxldCByaWdodCA9IHRoaXMucmF3KG5vZGUsICdyaWdodCcsICdjb21tZW50UmlnaHQnKTtcbiAgICAgICAgdGhpcy5idWlsZGVyKCcvKicgKyBsZWZ0ICsgbm9kZS50ZXh0ICsgcmlnaHQgKyAnKi8nLCBub2RlKTtcbiAgICB9XG5cbiAgICBkZWNsKG5vZGUsIHNlbWljb2xvbikge1xuICAgICAgICBsZXQgYmV0d2VlbiA9IHRoaXMucmF3KG5vZGUsICdiZXR3ZWVuJywgJ2NvbG9uJyk7XG4gICAgICAgIGxldCBzdHJpbmcgID0gbm9kZS5wcm9wICsgYmV0d2VlbiArIHRoaXMucmF3VmFsdWUobm9kZSwgJ3ZhbHVlJyk7XG5cbiAgICAgICAgaWYgKCBub2RlLmltcG9ydGFudCApIHtcbiAgICAgICAgICAgIHN0cmluZyArPSBub2RlLnJhd3MuaW1wb3J0YW50IHx8ICcgIWltcG9ydGFudCc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIHNlbWljb2xvbiApIHN0cmluZyArPSAnOyc7XG4gICAgICAgIHRoaXMuYnVpbGRlcihzdHJpbmcsIG5vZGUpO1xuICAgIH1cblxuICAgIHJ1bGUobm9kZSkge1xuICAgICAgICB0aGlzLmJsb2NrKG5vZGUsIHRoaXMucmF3VmFsdWUobm9kZSwgJ3NlbGVjdG9yJykpO1xuICAgICAgICBpZiAoIG5vZGUucmF3cy5vd25TZW1pY29sb24gKSB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIobm9kZS5yYXdzLm93blNlbWljb2xvbiwgbm9kZSwgJ2VuZCcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXRydWxlKG5vZGUsIHNlbWljb2xvbikge1xuICAgICAgICBsZXQgbmFtZSAgID0gJ0AnICsgbm9kZS5uYW1lO1xuICAgICAgICBsZXQgcGFyYW1zID0gbm9kZS5wYXJhbXMgPyB0aGlzLnJhd1ZhbHVlKG5vZGUsICdwYXJhbXMnKSA6ICcnO1xuXG4gICAgICAgIGlmICggdHlwZW9mIG5vZGUucmF3cy5hZnRlck5hbWUgIT09ICd1bmRlZmluZWQnICkge1xuICAgICAgICAgICAgbmFtZSArPSBub2RlLnJhd3MuYWZ0ZXJOYW1lO1xuICAgICAgICB9IGVsc2UgaWYgKCBwYXJhbXMgKSB7XG4gICAgICAgICAgICBuYW1lICs9ICcgJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICggbm9kZS5ub2RlcyApIHtcbiAgICAgICAgICAgIHRoaXMuYmxvY2sobm9kZSwgbmFtZSArIHBhcmFtcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgZW5kID0gKG5vZGUucmF3cy5iZXR3ZWVuIHx8ICcnKSArIChzZW1pY29sb24gPyAnOycgOiAnJyk7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkZXIobmFtZSArIHBhcmFtcyArIGVuZCwgbm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBib2R5KG5vZGUpIHtcbiAgICAgICAgbGV0IGxhc3QgPSBub2RlLm5vZGVzLmxlbmd0aCAtIDE7XG4gICAgICAgIHdoaWxlICggbGFzdCA+IDAgKSB7XG4gICAgICAgICAgICBpZiAoIG5vZGUubm9kZXNbbGFzdF0udHlwZSAhPT0gJ2NvbW1lbnQnICkgYnJlYWs7XG4gICAgICAgICAgICBsYXN0IC09IDE7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgc2VtaWNvbG9uID0gdGhpcy5yYXcobm9kZSwgJ3NlbWljb2xvbicpO1xuICAgICAgICBmb3IgKCBsZXQgaSA9IDA7IGkgPCBub2RlLm5vZGVzLmxlbmd0aDsgaSsrICkge1xuICAgICAgICAgICAgbGV0IGNoaWxkICA9IG5vZGUubm9kZXNbaV07XG4gICAgICAgICAgICBsZXQgYmVmb3JlID0gdGhpcy5yYXcoY2hpbGQsICdiZWZvcmUnKTtcbiAgICAgICAgICAgIGlmICggYmVmb3JlICkgdGhpcy5idWlsZGVyKGJlZm9yZSk7XG4gICAgICAgICAgICB0aGlzLnN0cmluZ2lmeShjaGlsZCwgbGFzdCAhPT0gaSB8fCBzZW1pY29sb24pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYmxvY2sobm9kZSwgc3RhcnQpIHtcbiAgICAgICAgbGV0IGJldHdlZW4gPSB0aGlzLnJhdyhub2RlLCAnYmV0d2VlbicsICdiZWZvcmVPcGVuJyk7XG4gICAgICAgIHRoaXMuYnVpbGRlcihzdGFydCArIGJldHdlZW4gKyAneycsIG5vZGUsICdzdGFydCcpO1xuXG4gICAgICAgIGxldCBhZnRlcjtcbiAgICAgICAgaWYgKCBub2RlLm5vZGVzICYmIG5vZGUubm9kZXMubGVuZ3RoICkge1xuICAgICAgICAgICAgdGhpcy5ib2R5KG5vZGUpO1xuICAgICAgICAgICAgYWZ0ZXIgPSB0aGlzLnJhdyhub2RlLCAnYWZ0ZXInKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFmdGVyID0gdGhpcy5yYXcobm9kZSwgJ2FmdGVyJywgJ2VtcHR5Qm9keScpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBhZnRlciApIHRoaXMuYnVpbGRlcihhZnRlcik7XG4gICAgICAgIHRoaXMuYnVpbGRlcignfScsIG5vZGUsICdlbmQnKTtcbiAgICB9XG5cbiAgICByYXcobm9kZSwgb3duLCBkZXRlY3QpIHtcbiAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICBpZiAoICFkZXRlY3QgKSBkZXRlY3QgPSBvd247XG5cbiAgICAgICAgLy8gQWxyZWFkeSBoYWRcbiAgICAgICAgaWYgKCBvd24gKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5vZGUucmF3c1tvd25dO1xuICAgICAgICAgICAgaWYgKCB0eXBlb2YgdmFsdWUgIT09ICd1bmRlZmluZWQnICkgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHBhcmVudCA9IG5vZGUucGFyZW50O1xuXG4gICAgICAgIC8vIEhhY2sgZm9yIGZpcnN0IHJ1bGUgaW4gQ1NTXG4gICAgICAgIGlmICggZGV0ZWN0ID09PSAnYmVmb3JlJyApIHtcbiAgICAgICAgICAgIGlmICggIXBhcmVudCB8fCBwYXJlbnQudHlwZSA9PT0gJ3Jvb3QnICYmIHBhcmVudC5maXJzdCA9PT0gbm9kZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGbG9hdGluZyBjaGlsZCB3aXRob3V0IHBhcmVudFxuICAgICAgICBpZiAoICFwYXJlbnQgKSByZXR1cm4gZGVmYXVsdFJhd1tkZXRlY3RdO1xuXG4gICAgICAgIC8vIERldGVjdCBzdHlsZSBieSBvdGhlciBub2Rlc1xuICAgICAgICBsZXQgcm9vdCA9IG5vZGUucm9vdCgpO1xuICAgICAgICBpZiAoICFyb290LnJhd0NhY2hlICkgcm9vdC5yYXdDYWNoZSA9IHsgfTtcbiAgICAgICAgaWYgKCB0eXBlb2Ygcm9vdC5yYXdDYWNoZVtkZXRlY3RdICE9PSAndW5kZWZpbmVkJyApIHtcbiAgICAgICAgICAgIHJldHVybiByb290LnJhd0NhY2hlW2RldGVjdF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIGRldGVjdCA9PT0gJ2JlZm9yZScgfHwgZGV0ZWN0ID09PSAnYWZ0ZXInICkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYmVmb3JlQWZ0ZXIobm9kZSwgZGV0ZWN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBtZXRob2QgPSAncmF3JyArIGNhcGl0YWxpemUoZGV0ZWN0KTtcbiAgICAgICAgICAgIGlmICggdGhpc1ttZXRob2RdICkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdGhpc1ttZXRob2RdKHJvb3QsIG5vZGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByb290LndhbGsoIGkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGkucmF3c1tvd25dO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIHR5cGVvZiB2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcgKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB2YWx1ZSA9IGRlZmF1bHRSYXdbZGV0ZWN0XTtcblxuICAgICAgICByb290LnJhd0NhY2hlW2RldGVjdF0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHJhd1NlbWljb2xvbihyb290KSB7XG4gICAgICAgIGxldCB2YWx1ZTtcbiAgICAgICAgcm9vdC53YWxrKCBpID0+IHtcbiAgICAgICAgICAgIGlmICggaS5ub2RlcyAmJiBpLm5vZGVzLmxlbmd0aCAmJiBpLmxhc3QudHlwZSA9PT0gJ2RlY2wnICkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gaS5yYXdzLnNlbWljb2xvbjtcbiAgICAgICAgICAgICAgICBpZiAoIHR5cGVvZiB2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcgKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgcmF3RW1wdHlCb2R5KHJvb3QpIHtcbiAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICByb290LndhbGsoIGkgPT4ge1xuICAgICAgICAgICAgaWYgKCBpLm5vZGVzICYmIGkubm9kZXMubGVuZ3RoID09PSAwICkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gaS5yYXdzLmFmdGVyO1xuICAgICAgICAgICAgICAgIGlmICggdHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJyApIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICByYXdJbmRlbnQocm9vdCkge1xuICAgICAgICBpZiAoIHJvb3QucmF3cy5pbmRlbnQgKSByZXR1cm4gcm9vdC5yYXdzLmluZGVudDtcbiAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICByb290LndhbGsoIGkgPT4ge1xuICAgICAgICAgICAgbGV0IHAgPSBpLnBhcmVudDtcbiAgICAgICAgICAgIGlmICggcCAmJiBwICE9PSByb290ICYmIHAucGFyZW50ICYmIHAucGFyZW50ID09PSByb290ICkge1xuICAgICAgICAgICAgICAgIGlmICggdHlwZW9mIGkucmF3cy5iZWZvcmUgIT09ICd1bmRlZmluZWQnICkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGFydHMgPSBpLnJhd3MuYmVmb3JlLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXlxcc10vZywgJycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHJhd0JlZm9yZUNvbW1lbnQocm9vdCwgbm9kZSkge1xuICAgICAgICBsZXQgdmFsdWU7XG4gICAgICAgIHJvb3Qud2Fsa0NvbW1lbnRzKCBpID0+IHtcbiAgICAgICAgICAgIGlmICggdHlwZW9mIGkucmF3cy5iZWZvcmUgIT09ICd1bmRlZmluZWQnICkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gaS5yYXdzLmJlZm9yZTtcbiAgICAgICAgICAgICAgICBpZiAoIHZhbHVlLmluZGV4T2YoJ1xcbicpICE9PSAtMSApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXlxcbl0rJC8sICcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICkge1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJhdyhub2RlLCBudWxsLCAnYmVmb3JlRGVjbCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICByYXdCZWZvcmVEZWNsKHJvb3QsIG5vZGUpIHtcbiAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICByb290LndhbGtEZWNscyggaSA9PiB7XG4gICAgICAgICAgICBpZiAoIHR5cGVvZiBpLnJhd3MuYmVmb3JlICE9PSAndW5kZWZpbmVkJyApIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGkucmF3cy5iZWZvcmU7XG4gICAgICAgICAgICAgICAgaWYgKCB2YWx1ZS5pbmRleE9mKCdcXG4nKSAhPT0gLTEgKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvW15cXG5dKyQvLCAnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5yYXcobm9kZSwgbnVsbCwgJ2JlZm9yZVJ1bGUnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgcmF3QmVmb3JlUnVsZShyb290KSB7XG4gICAgICAgIGxldCB2YWx1ZTtcbiAgICAgICAgcm9vdC53YWxrKCBpID0+IHtcbiAgICAgICAgICAgIGlmICggaS5ub2RlcyAmJiAoaS5wYXJlbnQgIT09IHJvb3QgfHwgcm9vdC5maXJzdCAhPT0gaSkgKSB7XG4gICAgICAgICAgICAgICAgaWYgKCB0eXBlb2YgaS5yYXdzLmJlZm9yZSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gaS5yYXdzLmJlZm9yZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCB2YWx1ZS5pbmRleE9mKCdcXG4nKSAhPT0gLTEgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1teXFxuXSskLywgJycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgcmF3QmVmb3JlQ2xvc2Uocm9vdCkge1xuICAgICAgICBsZXQgdmFsdWU7XG4gICAgICAgIHJvb3Qud2FsayggaSA9PiB7XG4gICAgICAgICAgICBpZiAoIGkubm9kZXMgJiYgaS5ub2Rlcy5sZW5ndGggPiAwICkge1xuICAgICAgICAgICAgICAgIGlmICggdHlwZW9mIGkucmF3cy5hZnRlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gaS5yYXdzLmFmdGVyO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIHZhbHVlLmluZGV4T2YoJ1xcbicpICE9PSAtMSApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvW15cXG5dKyQvLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICByYXdCZWZvcmVPcGVuKHJvb3QpIHtcbiAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICByb290LndhbGsoIGkgPT4ge1xuICAgICAgICAgICAgaWYgKCBpLnR5cGUgIT09ICdkZWNsJyApIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGkucmF3cy5iZXR3ZWVuO1xuICAgICAgICAgICAgICAgIGlmICggdHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJyApIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICByYXdDb2xvbihyb290KSB7XG4gICAgICAgIGxldCB2YWx1ZTtcbiAgICAgICAgcm9vdC53YWxrRGVjbHMoIGkgPT4ge1xuICAgICAgICAgICAgaWYgKCB0eXBlb2YgaS5yYXdzLmJldHdlZW4gIT09ICd1bmRlZmluZWQnICkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gaS5yYXdzLmJldHdlZW4ucmVwbGFjZSgvW15cXHM6XS9nLCAnJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIGJlZm9yZUFmdGVyKG5vZGUsIGRldGVjdCkge1xuICAgICAgICBsZXQgdmFsdWU7XG4gICAgICAgIGlmICggbm9kZS50eXBlID09PSAnZGVjbCcgKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMucmF3KG5vZGUsIG51bGwsICdiZWZvcmVEZWNsJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoIG5vZGUudHlwZSA9PT0gJ2NvbW1lbnQnICkge1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJhdyhub2RlLCBudWxsLCAnYmVmb3JlQ29tbWVudCcpO1xuICAgICAgICB9IGVsc2UgaWYgKCBkZXRlY3QgPT09ICdiZWZvcmUnICkge1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJhdyhub2RlLCBudWxsLCAnYmVmb3JlUnVsZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLnJhdyhub2RlLCBudWxsLCAnYmVmb3JlQ2xvc2UnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBidWYgICA9IG5vZGUucGFyZW50O1xuICAgICAgICBsZXQgZGVwdGggPSAwO1xuICAgICAgICB3aGlsZSAoIGJ1ZiAmJiBidWYudHlwZSAhPT0gJ3Jvb3QnICkge1xuICAgICAgICAgICAgZGVwdGggKz0gMTtcbiAgICAgICAgICAgIGJ1ZiA9IGJ1Zi5wYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIHZhbHVlLmluZGV4T2YoJ1xcbicpICE9PSAtMSApIHtcbiAgICAgICAgICAgIGxldCBpbmRlbnQgPSB0aGlzLnJhdyhub2RlLCBudWxsLCAnaW5kZW50Jyk7XG4gICAgICAgICAgICBpZiAoIGluZGVudC5sZW5ndGggKSB7XG4gICAgICAgICAgICAgICAgZm9yICggbGV0IHN0ZXAgPSAwOyBzdGVwIDwgZGVwdGg7IHN0ZXArKyApIHZhbHVlICs9IGluZGVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICByYXdWYWx1ZShub2RlLCBwcm9wKSB7XG4gICAgICAgIGxldCB2YWx1ZSA9IG5vZGVbcHJvcF07XG4gICAgICAgIGxldCByYXcgICA9IG5vZGUucmF3c1twcm9wXTtcbiAgICAgICAgaWYgKCByYXcgJiYgcmF3LnZhbHVlID09PSB2YWx1ZSApIHtcbiAgICAgICAgICAgIHJldHVybiByYXcucmF3O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IFN0cmluZ2lmaWVyO1xuIl19
