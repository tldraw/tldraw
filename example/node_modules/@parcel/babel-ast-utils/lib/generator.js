"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generator = exports.expressionsPrecedence = void 0;

function _astring() {
  const data = require("astring");

  _astring = function () {
    return data;
  };

  return data;
}

const expressionsPrecedence = { ..._astring().EXPRESSIONS_PRECEDENCE,
  // Babel extensions
  NumericLiteral: _astring().EXPRESSIONS_PRECEDENCE.Literal,
  StringLiteral: _astring().EXPRESSIONS_PRECEDENCE.Literal,
  BooleanLiteral: _astring().EXPRESSIONS_PRECEDENCE.Literal,
  NullLiteral: _astring().EXPRESSIONS_PRECEDENCE.Literal,
  RegExpLiteral: _astring().EXPRESSIONS_PRECEDENCE.Literal,
  BigIntLiteral: _astring().EXPRESSIONS_PRECEDENCE.Literal,
  OptionalMemberExpression: _astring().EXPRESSIONS_PRECEDENCE.MemberExpression,
  OptionalCallExpression: _astring().EXPRESSIONS_PRECEDENCE.CallExpression,
  Import: _astring().EXPRESSIONS_PRECEDENCE.Identifier,
  PrivateName: _astring().EXPRESSIONS_PRECEDENCE.Identifier
}; // Convert Babel's AST format to ESTree on the fly.
// See https://babeljs.io/docs/en/babel-parser#output

exports.expressionsPrecedence = expressionsPrecedence;
const generator = { ..._astring().GENERATOR,

  Program(node, state) {
    // Monkeypatch state to fix sourcemap filenames.
    let map = state.map;

    state.map = (str, node) => {
      if (node != null && node.loc != null) {
        state.mapping.source = node.loc.filename;
      }

      map.call(state, str, node);
    };

    if (node.interpreter) {
      state.write(`#!${node.interpreter.value}\n`);
    }

    handleDirectives(node);

    _astring().GENERATOR.Program.call(this, node, state);
  },

  BlockStatement(node, state) {
    handleDirectives(node);

    _astring().GENERATOR.BlockStatement.call(this, node, state);
  },

  NumericLiteral(node, state) {
    node.type = 'Literal';
    node.raw = getRaw(node);
    this.Literal(node, state, true);
  },

  StringLiteral(node, state) {
    node.type = 'Literal';
    node.raw = getRaw(node);
    this.Literal(node, state, true);
  },

  BooleanLiteral(node, state) {
    node.type = 'Literal';
    this.Literal(node, state, true);
  },

  NullLiteral(node, state) {
    node.type = 'Literal';
    node.raw = 'null';
    node.value = null;
    this.Literal(node, state, true);
  },

  RegExpLiteral(node, state) {
    node.type = 'Literal';
    node.raw = getRaw(node);
    node.value = {};
    node.regex = {
      pattern: node.pattern,
      flags: node.flags
    };

    _astring().GENERATOR.Literal(node, state);
  },

  BigIntLiteral(node, state) {
    node.type = 'Literal';
    node.raw = getRaw(node);
    this.Literal(node, state, true);
  },

  ArrowFunctionExpression(node, state) {
    if (node.body.type === 'OptionalMemberExpression' || node.body.type === 'OptionalCallExpression') {
      // the ArrowFunctionExpression visitor in astring checks the type of the body
      // Make sure they don't start with "O"
      node.body.type = '_' + node.body.type;
    }

    _astring().GENERATOR.ArrowFunctionExpression.call(this, node, state);
  },

  ObjectProperty(node, state) {
    node.type = 'Property';
    node.kind = 'init';

    if (node.shorthand) {
      let id = node.value.type === 'Identifier' ? node.value : node.value.type === 'AssignmentPattern' && node.value.left.type === 'Identifier' ? node.value.left : null;

      if (!id || id.name !== node.key.name) {
        node.shorthand = false;
      }
    }

    this.Property(node, state, true);
  },

  ObjectMethod(node, state) {
    node.value = {
      type: 'FunctionExpression',
      id: node.id,
      params: node.params,
      body: node.body,
      async: node.async,
      generator: node.generator,
      expression: node.expression
    };
    node.type = 'Property';

    if (node.kind === 'method') {
      node.kind = 'init';
    }

    this.Property(node, state, true);
  },

  ClassMethod(node, state) {
    node.value = {
      type: 'FunctionExpression',
      id: node.id,
      params: node.params,
      body: node.body,
      async: node.async,
      generator: node.generator,
      expression: node.expression
    };
    node.type = 'MethodDefinition';
    this.MethodDefinition(node, state, true);
  },

  ClassPrivateMethod(node, state) {
    node.value = {
      type: 'FunctionExpression',
      id: node.id,
      params: node.params,
      body: node.body,
      async: node.async,
      generator: node.generator,
      expression: node.expression
    };
    node.type = 'MethodDefinition';
    this.MethodDefinition(node, state, true);
  },

  ClassProperty(node, state) {
    if (node.static) {
      state.write('static ');
    }

    if (node.computed) {
      state.write('[');
      this[node.key.type](node.key, state);
      state.write(']');
    } else {
      this[node.key.type](node.key, state);
    }

    if (node.value) {
      state.write(' = ');
      this[node.value.type](node.value, state, true);
    }

    state.write(';');
  },

  ClassPrivateProperty(node, state) {
    if (node.static) {
      state.write('static ');
    }

    this[node.key.type](node.key, state);

    if (node.value) {
      state.write(' = ');
      this[node.value.type](node.value, state);
    }

    state.write(';');
  },

  PrivateName(node, state) {
    state.write('#' + node.name, node);
  },

  Import(node, state) {
    // astring doesn't support ImportExpression yet
    state.write('import');
  },

  _OptionalMemberExpression(node, state) {
    this.OptionalMemberExpression(node, state, true);
  },

  OptionalMemberExpression(node, state) {
    node.optional = true;
    node.type = 'MemberExpression';

    _astring().GENERATOR.MemberExpression.call(this, node, state);
  },

  MemberExpression(node, state) {
    if (node.optional) node.optional = false;

    _astring().GENERATOR.MemberExpression.call(this, node, state);
  },

  _OptionalCallExpression(node, state) {
    this.OptionalCallExpression(node, state, true);
  },

  OptionalCallExpression(node, state) {
    node.optional = true;
    node.type = 'CallExpression';

    _astring().GENERATOR.CallExpression.call(this, node, state);
  },

  CallExpression(node, state) {
    if (node.optional) node.optional = false;

    _astring().GENERATOR.CallExpression.call(this, node, state);
  },

  ExportNamedDeclaration(node, state) {
    if (node.source) {
      let namespace = node.specifiers.find(specifier => specifier.type === 'ExportNamespaceSpecifier');

      if (namespace) {
        // Babel parser allows combining namespace specifiers and named specifiers
        // e.g. `export * as foo, {bar} from 'other'`, but this is not supported by the spec.
        if (node.specifiers.length > 1) {
          throw new Error('Namespace specifiers cannot be combined with named specifiers');
        }

        node.type = 'ExportAllDeclaration';
        node.exported = namespace.exported;
      }
    }

    _astring().GENERATOR[node.type].call(this, node, state);
  },

  ReturnStatement(node, state) {
    var _node$argument, _node$argument$leadin;

    // Add parentheses if there are leading comments
    if (((_node$argument = node.argument) === null || _node$argument === void 0 ? void 0 : (_node$argument$leadin = _node$argument.leadingComments) === null || _node$argument$leadin === void 0 ? void 0 : _node$argument$leadin.length) > 0) {
      let indent = state.indent.repeat(state.indentLevel);
      state.write('return (' + state.lineEnd);
      state.write(indent + state.indent);
      state.indentLevel++;
      this[node.argument.type](node.argument, state);
      state.indentLevel--;
      state.write(state.lineEnd);
      state.write(indent + ');');
    } else {
      _astring().GENERATOR.ReturnStatement.call(this, node, state);
    }
  },

  ThrowStatement(node, state) {
    var _node$argument2, _node$argument2$leadi;

    // Add parentheses if there are leading comments
    if (((_node$argument2 = node.argument) === null || _node$argument2 === void 0 ? void 0 : (_node$argument2$leadi = _node$argument2.leadingComments) === null || _node$argument2$leadi === void 0 ? void 0 : _node$argument2$leadi.length) > 0) {
      let indent = state.indent.repeat(state.indentLevel);
      state.write('throw (' + state.lineEnd);
      state.write(indent + state.indent);
      state.indentLevel++;
      this[node.argument.type](node.argument, state);
      state.indentLevel--;
      state.write(state.lineEnd);
      state.write(indent + ');');
    } else {
      _astring().GENERATOR.ThrowStatement.call(this, node, state);
    }
  }

}; // Make every node support comments. Important for preserving /*@__PURE__*/ comments for terser.
// TODO: contribute to astring.

exports.generator = generator;

for (let key in generator) {
  let orig = generator[key];

  generator[key] = function (node, state, skipComments) {
    // These are printed by astring itself
    if (node.trailingComments) {
      for (let c of node.trailingComments) {
        if (c.type === 'CommentLine' || c.type === 'LineComment') {
          c.type = 'LineComment';
        } else {
          c.type = 'BlockComment';
        }
      }
    }

    if (!skipComments && node.leadingComments && node.leadingComments.length > 0) {
      formatComments(state, node.leadingComments);
    }

    orig.call(this, node, state);
  };
}

function handleDirectives(node) {
  if (node.directives) {
    for (var i = node.directives.length - 1; i >= 0; i--) {
      var directive = node.directives[i];
      directive.type = 'ExpressionStatement';
      directive.expression = directive.value;
      directive.expression.type = 'Literal';
      node.body.unshift(directive);
    }
  }
} // Copied from the astring source.


function formatComments(state, comments) {
  // Writes into `state` the provided list of `comments`, with the given `indent` and `lineEnd` strings.
  // Line comments will end with `"\n"` regardless of the value of `lineEnd`.
  // Expects to start on a new unindented line.
  const indent = state.indent.repeat(state.indentLevel);
  const {
    length
  } = comments;

  for (let i = 0; i < length; i++) {
    const comment = comments[i];

    if (comment.type === 'CommentLine' || comment.type === 'LineComment') {
      // Line comment
      state.write('// ' + comment.value.trim() + state.lineEnd, { ...comment,
        type: 'LineComment'
      });
      state.write(indent);
    } else {
      // Block comment
      state.write('/*');
      reindent(state, comment.value, indent, state.lineEnd);
      state.write('*/'); // Keep pure annotations on the same line

      let value = comment.value.trim();

      if (!((value === '#__PURE__' || value === '@__PURE__') && i === length - 1)) {
        state.write(state.lineEnd);
        state.write(indent);
      }
    }
  }
}

function reindent(state, text, indent, lineEnd) {
  // Writes into `state` the `text` string reindented with the provided `indent`.
  const lines = text.split('\n');
  const end = lines.length - 1;
  state.write(lines[0].trim());

  if (end > 0) {
    state.write(lineEnd);

    for (let i = 1; i < end; i++) {
      state.write(indent + lines[i].trim() + lineEnd);
    }

    state.write(indent + lines[end].trim());
  }
}

function getRaw(node) {
  let extra = node.extra;

  if (extra && extra.raw != null && extra.rawValue != null && node.value === extra.rawValue) {
    return extra.raw;
  }
}