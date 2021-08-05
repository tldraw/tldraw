"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _postcss = _interopRequireDefault(require("postcss"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const createImports = imports => {
  return Object.keys(imports).map(path => {
    const aliases = imports[path];
    const declarations = Object.keys(aliases).map(key => _postcss.default.decl({
      prop: key,
      value: aliases[key],
      raws: {
        before: "\n  "
      }
    }));
    const hasDeclarations = declarations.length > 0;

    const rule = _postcss.default.rule({
      selector: `:import('${path}')`,
      raws: {
        after: hasDeclarations ? "\n" : ""
      }
    });

    if (hasDeclarations) {
      rule.append(declarations);
    }

    return rule;
  });
};

const createExports = exports => {
  const declarations = Object.keys(exports).map(key => _postcss.default.decl({
    prop: key,
    value: exports[key],
    raws: {
      before: "\n  "
    }
  }));

  if (declarations.length === 0) {
    return [];
  }

  const rule = _postcss.default.rule({
    selector: `:export`,
    raws: {
      after: "\n"
    }
  }).append(declarations);

  return [rule];
};

const createICSSRules = (imports, exports) => [...createImports(imports), ...createExports(exports)];

var _default = createICSSRules;
exports.default = _default;