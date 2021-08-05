"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fuzzySearch = fuzzySearch;
exports.default = void 0;

function _diagnostic() {
  const data = _interopRequireWildcard(require("@parcel/diagnostic"));

  _diagnostic = function () {
    return data;
  };

  return data;
}

function _nullthrows() {
  const data = _interopRequireDefault(require("nullthrows"));

  _nullthrows = function () {
    return data;
  };

  return data;
}

function _fastestLevenshtein() {
  const data = _interopRequireDefault(require("fastest-levenshtein"));

  _fastestLevenshtein = function () {
    return data;
  };

  return data;
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

// flowlint-next-line untyped-import:off
function validateSchema(schema, data) {
  function walk(schemaAncestors, dataNode, dataPath) {
    let [schemaNode] = schemaAncestors;

    if (schemaNode.type) {
      let type = Array.isArray(dataNode) ? 'array' : typeof dataNode;

      if (schemaNode.type !== type) {
        return {
          type: 'type',
          dataType: 'value',
          dataPath,
          expectedTypes: [schemaNode.type],
          ancestors: schemaAncestors,
          prettyType: schemaNode.__type
        };
      } else {
        switch (schemaNode.type) {
          case 'array':
            {
              if (schemaNode.items) {
                let results = []; // $FlowFixMe type was already checked

                for (let i = 0; i < dataNode.length; i++) {
                  let result = walk([schemaNode.items].concat(schemaAncestors), // $FlowFixMe type was already checked
                  dataNode[i], dataPath + '/' + i);
                  if (result) results.push(result);
                }

                if (results.length) return results.reduce((acc, v) => acc.concat(v), []);
              }

              break;
            }

          case 'string':
            {
              // $FlowFixMe type was already checked
              let value = dataNode;

              if (schemaNode.enum) {
                if (!schemaNode.enum.includes(value)) {
                  return {
                    type: 'enum',
                    dataType: 'value',
                    dataPath,
                    expectedValues: schemaNode.enum,
                    actualValue: value,
                    ancestors: schemaAncestors
                  };
                }
              } else if (schemaNode.__validate) {
                let validationError = schemaNode.__validate(value);

                if (typeof validationError == 'string') {
                  return {
                    type: 'other',
                    dataType: 'value',
                    dataPath,
                    message: validationError,
                    actualValue: value,
                    ancestors: schemaAncestors
                  };
                }
              }

              break;
            }

          case 'number':
            {
              // $FlowFixMe type was already checked
              let value = dataNode;

              if (schemaNode.enum) {
                if (!schemaNode.enum.includes(value)) {
                  return {
                    type: 'enum',
                    dataType: 'value',
                    dataPath,
                    expectedValues: schemaNode.enum,
                    actualValue: value,
                    ancestors: schemaAncestors
                  };
                }
              }

              break;
            }

          case 'object':
            {
              let results = [];
              let invalidProps;

              if (schemaNode.__forbiddenProperties) {
                // $FlowFixMe type was already checked
                let keys = Object.keys(dataNode);
                invalidProps = schemaNode.__forbiddenProperties.filter(val => keys.includes(val));
                results.push(...invalidProps.map(k => ({
                  type: 'forbidden-prop',
                  dataPath: dataPath + '/' + (0, _diagnostic().encodeJSONKeyComponent)(k),
                  dataType: 'key',
                  prop: k,
                  expectedProps: Object.keys(schemaNode.properties),
                  actualProps: keys,
                  ancestors: schemaAncestors
                })));
              }

              if (schemaNode.required) {
                // $FlowFixMe type was already checked
                let keys = Object.keys(dataNode);
                let missingKeys = schemaNode.required.filter(val => !keys.includes(val));
                results.push(...missingKeys.map(k => ({
                  type: 'missing-prop',
                  dataPath,
                  dataType: 'value',
                  prop: k,
                  expectedProps: schemaNode.required,
                  actualProps: keys,
                  ancestors: schemaAncestors
                })));
              }

              if (schemaNode.properties) {
                let {
                  additionalProperties = true
                } = schemaNode; // $FlowFixMe type was already checked

                for (let k in dataNode) {
                  if (invalidProps && invalidProps.includes(k)) {
                    // Don't check type on forbidden props
                    continue;
                  } else if (k in schemaNode.properties) {
                    let result = walk([schemaNode.properties[k]].concat(schemaAncestors), // $FlowFixMe type was already checked
                    dataNode[k], dataPath + '/' + (0, _diagnostic().encodeJSONKeyComponent)(k));
                    if (result) results.push(result);
                  } else {
                    if (typeof additionalProperties === 'boolean') {
                      if (!additionalProperties) {
                        results.push({
                          type: 'enum',
                          dataType: 'key',
                          dataPath: dataPath + '/' + (0, _diagnostic().encodeJSONKeyComponent)(k),
                          expectedValues: Object.keys(schemaNode.properties).filter( // $FlowFixMe type was already checked
                          p => !(p in dataNode)),
                          actualValue: k,
                          ancestors: schemaAncestors,
                          prettyType: schemaNode.__type
                        });
                      }
                    } else {
                      let result = walk([additionalProperties].concat(schemaAncestors), // $FlowFixMe type was already checked
                      dataNode[k], dataPath + '/' + (0, _diagnostic().encodeJSONKeyComponent)(k));
                      if (result) results.push(result);
                    }
                  }
                }
              }

              if (results.length) return results.reduce((acc, v) => acc.concat(v), []);
              break;
            }

          case 'boolean':
            // NOOP, type was checked already
            break;

          default:
            throw new Error(`Unimplemented schema type ${type}?`);
        }
      }
    } else {
      if (schemaNode.enum && !schemaNode.enum.includes(dataNode)) {
        return {
          type: 'enum',
          dataType: 'value',
          dataPath: dataPath,
          expectedValues: schemaNode.enum,
          actualValue: schemaNode,
          ancestors: schemaAncestors
        };
      }

      if (schemaNode.oneOf || schemaNode.allOf) {
        let list = schemaNode.oneOf || schemaNode.allOf;
        let results = [];

        for (let f of list) {
          let result = walk([f].concat(schemaAncestors), dataNode, dataPath);
          if (result) results.push(result);
        }

        if (schemaNode.oneOf ? results.length == schemaNode.oneOf.length : results.length > 0) {
          // return the result with more values / longer key
          results.sort((a, b) => Array.isArray(a) || Array.isArray(b) ? Array.isArray(a) && !Array.isArray(b) ? -1 : !Array.isArray(a) && Array.isArray(b) ? 1 : Array.isArray(a) && Array.isArray(b) ? b.length - a.length : 0 : b.dataPath.length - a.dataPath.length);
          return results[0];
        }
      } else if (schemaNode.not) {
        let result = walk([schemaNode.not].concat(schemaAncestors), dataNode, dataPath);

        if (!result || result.length == 0) {
          return {
            type: 'other',
            dataPath,
            dataType: null,
            message: schemaNode.__message,
            actualValue: dataNode,
            ancestors: schemaAncestors
          };
        }
      }
    }

    return undefined;
  }

  let result = walk([schema], data, '');
  return Array.isArray(result) ? result : result ? [result] : [];
}

var _default = validateSchema;
exports.default = _default;

function fuzzySearch(expectedValues, actualValue) {
  let result = expectedValues.map(exp => [exp, _fastestLevenshtein().default.distance(exp, actualValue)]).filter( // Remove if more than half of the string would need to be changed
  ([, d]) => d * 2 < actualValue.length);
  result.sort(([, a], [, b]) => a - b);
  return result.map(([v]) => v);
}

validateSchema.diagnostic = function (schema, data, origin, message) {
  var _data$data;

  if ('source' in data && 'data' in data && typeof data.source !== 'string' && !data) {
    throw new Error('At least one of data.source and data.source must be defined!');
  }

  let object = data.map ? data.map.data : // $FlowFixMe we can assume it's a JSON object
  (_data$data = data.data) !== null && _data$data !== void 0 ? _data$data : JSON.parse(data.source);
  let errors = validateSchema(schema, object);

  if (errors.length) {
    var _data$filePath;

    let keys = errors.map(e => {
      let message;

      if (e.type === 'enum') {
        let {
          actualValue
        } = e;
        let expectedValues = e.expectedValues.map(String);
        let likely = actualValue != null ? fuzzySearch(expectedValues, String(actualValue)) : [];

        if (likely.length > 0) {
          message = `Did you mean ${likely.map(v => JSON.stringify(v)).join(', ')}?`;
        } else if (expectedValues.length > 0) {
          message = `Possible values: ${expectedValues.map(v => JSON.stringify(v)).join(', ')}`;
        } else {
          message = 'Unexpected value';
        }
      } else if (e.type === 'forbidden-prop') {
        let {
          prop,
          expectedProps,
          actualProps
        } = e;
        let likely = fuzzySearch(expectedProps, prop).filter(v => !actualProps.includes(v));

        if (likely.length > 0) {
          message = `Did you mean ${likely.map(v => JSON.stringify(v)).join(', ')}?`;
        } else {
          message = 'Unexpected property';
        }
      } else if (e.type === 'missing-prop') {
        let {
          prop,
          actualProps
        } = e;
        let likely = fuzzySearch(actualProps, prop);

        if (likely.length > 0) {
          message = `Did you mean ${JSON.stringify(prop)}?`;
          e.dataPath += '/' + likely[0];
          e.dataType = 'key';
        } else {
          message = `Missing property ${prop}`;
        }
      } else if (e.type === 'type') {
        if (e.prettyType != null) {
          message = `Expected ${e.prettyType}`;
        } else {
          message = `Expected type ${e.expectedTypes.join(', ')}`;
        }
      } else {
        message = e.message;
      }

      return {
        key: e.dataPath,
        type: e.dataType,
        message
      };
    });
    let map, code;

    if (data.map) {
      map = data.map;
      code = data.source;
    } else {
      var _data$source;

      // $FlowFixMe we can assume that data is valid JSON
      map = (_data$source = data.source) !== null && _data$source !== void 0 ? _data$source : JSON.stringify((0, _nullthrows().default)(data.data), 0, '\t');
      code = map;
    }

    let codeFrames = [{
      filePath: (_data$filePath = data.filePath) !== null && _data$filePath !== void 0 ? _data$filePath : undefined,
      language: 'json',
      code,
      codeHighlights: (0, _diagnostic().generateJSONCodeHighlights)(map, keys.map(({
        key,
        type,
        message
      }) => {
        var _data$prependKey;

        return {
          key: ((_data$prependKey = data.prependKey) !== null && _data$prependKey !== void 0 ? _data$prependKey : '') + key,
          type: type,
          message: message != null ? (0, _diagnostic().escapeMarkdown)(message) : message
        };
      }))
    }];
    throw new (_diagnostic().default)({
      diagnostic: {
        message: message,
        origin,
        codeFrames
      }
    });
  }
};