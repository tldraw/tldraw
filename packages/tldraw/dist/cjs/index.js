var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", {value: true});
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = {exports: {}}).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {get: all[name], enumerable: true});
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, {get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable});
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? {get: () => module2.default, enumerable: true} : {value: module2, enumerable: true})), module2);
};

// ../core/dist/cjs/index.js
var require_cjs = __commonJS({
  "../core/dist/cjs/index.js"(exports) {
    var __create2 = Object.create;
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf2 = Object.getPrototypeOf;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __markAsModule2 = (target) => __defProp2(target, "__esModule", {value: true});
    var __commonJS2 = (cb, mod) => function __require() {
      return mod || (0, cb[Object.keys(cb)[0]])((mod = {exports: {}}).exports, mod), mod.exports;
    };
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, {get: all[name], enumerable: true});
    };
    var __reExport2 = (target, module22, desc) => {
      if (module22 && typeof module22 === "object" || typeof module22 === "function") {
        for (let key of __getOwnPropNames2(module22))
          if (!__hasOwnProp2.call(target, key) && key !== "default")
            __defProp2(target, key, {get: () => module22[key], enumerable: !(desc = __getOwnPropDesc2(module22, key)) || desc.enumerable});
      }
      return target;
    };
    var __toModule2 = (module22) => {
      return __reExport2(__markAsModule2(__defProp2(module22 != null ? __create2(__getProtoOf2(module22)) : {}, "default", module22 && module22.__esModule && "default" in module22 ? {get: () => module22.default, enumerable: true} : {value: module22, enumerable: true})), module22);
    };
    var require_react_error_boundary_umd = __commonJS2({
      "../../node_modules/react-error-boundary/dist/react-error-boundary.umd.js"(exports2, module22) {
        (function(global2, factory) {
          typeof exports2 === "object" && typeof module22 !== "undefined" ? factory(exports2, require("react")) : typeof define === "function" && define.amd ? define(["exports", "react"], factory) : (global2 = typeof globalThis !== "undefined" ? globalThis : global2 || self, factory(global2.ReactErrorBoundary = {}, global2.React));
        })(exports2, function(exports22, React312) {
          "use strict";
          function _interopNamespace(e14) {
            if (e14 && e14.__esModule)
              return e14;
            var n5 = Object.create(null);
            if (e14) {
              Object.keys(e14).forEach(function(k4) {
                if (k4 !== "default") {
                  var d8 = Object.getOwnPropertyDescriptor(e14, k4);
                  Object.defineProperty(n5, k4, d8.get ? d8 : {
                    enumerable: true,
                    get: function() {
                      return e14[k4];
                    }
                  });
                }
              });
            }
            n5["default"] = e14;
            return Object.freeze(n5);
          }
          var React__namespace = /* @__PURE__ */ _interopNamespace(React312);
          function _setPrototypeOf(o13, p8) {
            _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf2(o22, p22) {
              o22.__proto__ = p22;
              return o22;
            };
            return _setPrototypeOf(o13, p8);
          }
          function _inheritsLoose2(subClass, superClass) {
            subClass.prototype = Object.create(superClass.prototype);
            subClass.prototype.constructor = subClass;
            _setPrototypeOf(subClass, superClass);
          }
          var changedArray = function changedArray2(a6, b5) {
            if (a6 === void 0) {
              a6 = [];
            }
            if (b5 === void 0) {
              b5 = [];
            }
            return a6.length !== b5.length || a6.some(function(item, index) {
              return !Object.is(item, b5[index]);
            });
          };
          var initialState = {
            error: null
          };
          var ErrorBoundary2 = /* @__PURE__ */ function(_React$Component) {
            _inheritsLoose2(ErrorBoundary3, _React$Component);
            function ErrorBoundary3() {
              var _this;
              for (var _len = arguments.length, _args = new Array(_len), _key = 0; _key < _len; _key++) {
                _args[_key] = arguments[_key];
              }
              _this = _React$Component.call.apply(_React$Component, [this].concat(_args)) || this;
              _this.state = initialState;
              _this.updatedWithError = false;
              _this.resetErrorBoundary = function() {
                var _this$props;
                for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                  args[_key2] = arguments[_key2];
                }
                _this.props.onReset == null ? void 0 : (_this$props = _this.props).onReset.apply(_this$props, args);
                _this.reset();
              };
              return _this;
            }
            ErrorBoundary3.getDerivedStateFromError = function getDerivedStateFromError(error) {
              return {
                error
              };
            };
            var _proto = ErrorBoundary3.prototype;
            _proto.reset = function reset() {
              this.updatedWithError = false;
              this.setState(initialState);
            };
            _proto.componentDidCatch = function componentDidCatch(error, info) {
              var _this$props$onError, _this$props2;
              (_this$props$onError = (_this$props2 = this.props).onError) == null ? void 0 : _this$props$onError.call(_this$props2, error, info);
            };
            _proto.componentDidMount = function componentDidMount() {
              var error = this.state.error;
              if (error !== null) {
                this.updatedWithError = true;
              }
            };
            _proto.componentDidUpdate = function componentDidUpdate(prevProps) {
              var error = this.state.error;
              var resetKeys = this.props.resetKeys;
              if (error !== null && !this.updatedWithError) {
                this.updatedWithError = true;
                return;
              }
              if (error !== null && changedArray(prevProps.resetKeys, resetKeys)) {
                var _this$props$onResetKe, _this$props3;
                (_this$props$onResetKe = (_this$props3 = this.props).onResetKeysChange) == null ? void 0 : _this$props$onResetKe.call(_this$props3, prevProps.resetKeys, resetKeys);
                this.reset();
              }
            };
            _proto.render = function render() {
              var error = this.state.error;
              var _this$props4 = this.props, fallbackRender = _this$props4.fallbackRender, FallbackComponent = _this$props4.FallbackComponent, fallback = _this$props4.fallback;
              if (error !== null) {
                var _props = {
                  error,
                  resetErrorBoundary: this.resetErrorBoundary
                };
                if (/* @__PURE__ */ React__namespace.isValidElement(fallback)) {
                  return fallback;
                } else if (typeof fallbackRender === "function") {
                  return fallbackRender(_props);
                } else if (FallbackComponent) {
                  return /* @__PURE__ */ React__namespace.createElement(FallbackComponent, _props);
                } else {
                  throw new Error("react-error-boundary requires either a fallback, fallbackRender, or FallbackComponent prop");
                }
              }
              return this.props.children;
            };
            return ErrorBoundary3;
          }(React__namespace.Component);
          function withErrorBoundary(Component, errorBoundaryProps) {
            var Wrapped = function Wrapped2(props) {
              return /* @__PURE__ */ React__namespace.createElement(ErrorBoundary2, errorBoundaryProps, /* @__PURE__ */ React__namespace.createElement(Component, props));
            };
            var name = Component.displayName || Component.name || "Unknown";
            Wrapped.displayName = "withErrorBoundary(" + name + ")";
            return Wrapped;
          }
          function useErrorHandler(givenError) {
            var _React$useState = React__namespace.useState(null), error = _React$useState[0], setError = _React$useState[1];
            if (givenError != null)
              throw givenError;
            if (error != null)
              throw error;
            return setError;
          }
          exports22.ErrorBoundary = ErrorBoundary2;
          exports22.useErrorHandler = useErrorHandler;
          exports22.withErrorBoundary = withErrorBoundary;
          Object.defineProperty(exports22, "__esModule", {value: true});
        });
      }
    });
    var require_cjs2 = __commonJS2({
      "../../node_modules/deepmerge/dist/cjs.js"(exports2, module22) {
        "use strict";
        var isMergeableObject = function isMergeableObject2(value) {
          return isNonNullObject(value) && !isSpecial(value);
        };
        function isNonNullObject(value) {
          return !!value && typeof value === "object";
        }
        function isSpecial(value) {
          var stringValue = Object.prototype.toString.call(value);
          return stringValue === "[object RegExp]" || stringValue === "[object Date]" || isReactElement(value);
        }
        var canUseSymbol = typeof Symbol === "function" && Symbol.for;
        var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for("react.element") : 60103;
        function isReactElement(value) {
          return value.$$typeof === REACT_ELEMENT_TYPE;
        }
        function emptyTarget(val) {
          return Array.isArray(val) ? [] : {};
        }
        function cloneUnlessOtherwiseSpecified(value, options) {
          return options.clone !== false && options.isMergeableObject(value) ? deepmerge2(emptyTarget(value), value, options) : value;
        }
        function defaultArrayMerge(target, source, options) {
          return target.concat(source).map(function(element) {
            return cloneUnlessOtherwiseSpecified(element, options);
          });
        }
        function getMergeFunction(key, options) {
          if (!options.customMerge) {
            return deepmerge2;
          }
          var customMerge = options.customMerge(key);
          return typeof customMerge === "function" ? customMerge : deepmerge2;
        }
        function getEnumerableOwnPropertySymbols(target) {
          return Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(target).filter(function(symbol) {
            return target.propertyIsEnumerable(symbol);
          }) : [];
        }
        function getKeys2(target) {
          return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
        }
        function propertyIsOnObject(object, property) {
          try {
            return property in object;
          } catch (_) {
            return false;
          }
        }
        function propertyIsUnsafe(target, key) {
          return propertyIsOnObject(target, key) && !(Object.hasOwnProperty.call(target, key) && Object.propertyIsEnumerable.call(target, key));
        }
        function mergeObject(target, source, options) {
          var destination = {};
          if (options.isMergeableObject(target)) {
            getKeys2(target).forEach(function(key) {
              destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
            });
          }
          getKeys2(source).forEach(function(key) {
            if (propertyIsUnsafe(target, key)) {
              return;
            }
            if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
              destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
            } else {
              destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
            }
          });
          return destination;
        }
        function deepmerge2(target, source, options) {
          options = options || {};
          options.arrayMerge = options.arrayMerge || defaultArrayMerge;
          options.isMergeableObject = options.isMergeableObject || isMergeableObject;
          options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;
          var sourceIsArray = Array.isArray(source);
          var targetIsArray = Array.isArray(target);
          var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
          if (!sourceAndTargetTypesMatch) {
            return cloneUnlessOtherwiseSpecified(source, options);
          } else if (sourceIsArray) {
            return options.arrayMerge(target, source, options);
          } else {
            return mergeObject(target, source, options);
          }
        }
        deepmerge2.all = function deepmergeAll(array, options) {
          if (!Array.isArray(array)) {
            throw new Error("first argument should be an array");
          }
          return array.reduce(function(prev, next) {
            return deepmerge2(prev, next, options);
          }, {});
        };
        var deepmerge_1 = deepmerge2;
        module22.exports = deepmerge_1;
      }
    });
    __markAsModule2(exports);
    __export2(exports, {
      Intersect: () => Intersect6,
      Renderer: () => Renderer2,
      Svg: () => Svg,
      TLBoundsCorner: () => TLBoundsCorner6,
      TLBoundsEdge: () => TLBoundsEdge4,
      TLShapeUtil: () => TLShapeUtil2,
      Utils: () => Utils24,
      Vec: () => Vec18,
      brushUpdater: () => brushUpdater3,
      inputs: () => inputs2
    });
    var React302 = __toModule2(require("react"));
    var React292 = __toModule2(require("react"));
    var import_react_error_boundary = __toModule2(require_react_error_boundary_umd());
    var React37 = __toModule2(require("react"));
    var TLContext = React37.createContext({});
    function useTLContext() {
      const context = React37.useContext(TLContext);
      return context;
    }
    var import_react22 = __toModule2(require("react"));
    var import_deepmerge = __toModule2(require_cjs2());
    var appleIphone = /iPhone/i;
    var appleIpod = /iPod/i;
    var appleTablet = /iPad/i;
    var appleUniversal = /\biOS-universal(?:.+)Mac\b/i;
    var androidPhone = /\bAndroid(?:.+)Mobile\b/i;
    var androidTablet = /Android/i;
    var amazonPhone = /(?:SD4930UR|\bSilk(?:.+)Mobile\b)/i;
    var amazonTablet = /Silk/i;
    var windowsPhone = /Windows Phone/i;
    var windowsTablet = /\bWindows(?:.+)ARM\b/i;
    var otherBlackBerry = /BlackBerry/i;
    var otherBlackBerry10 = /BB10/i;
    var otherOpera = /Opera Mini/i;
    var otherChrome = /\b(CriOS|Chrome)(?:.+)Mobile/i;
    var otherFirefox = /Mobile(?:.+)Firefox\b/i;
    var isAppleTabletOnIos13 = function(navigator2) {
      return typeof navigator2 !== "undefined" && navigator2.platform === "MacIntel" && typeof navigator2.maxTouchPoints === "number" && navigator2.maxTouchPoints > 1 && typeof MSStream === "undefined";
    };
    function createMatch(userAgent) {
      return function(regex) {
        return regex.test(userAgent);
      };
    }
    function isMobile(param) {
      var nav = {
        userAgent: "",
        platform: "",
        maxTouchPoints: 0
      };
      if (!param && typeof navigator !== "undefined") {
        nav = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints || 0
        };
      } else if (typeof param === "string") {
        nav.userAgent = param;
      } else if (param && param.userAgent) {
        nav = {
          userAgent: param.userAgent,
          platform: param.platform,
          maxTouchPoints: param.maxTouchPoints || 0
        };
      }
      var userAgent = nav.userAgent;
      var tmp = userAgent.split("[FBAN");
      if (typeof tmp[1] !== "undefined") {
        userAgent = tmp[0];
      }
      tmp = userAgent.split("Twitter");
      if (typeof tmp[1] !== "undefined") {
        userAgent = tmp[0];
      }
      var match = createMatch(userAgent);
      var result = {
        apple: {
          phone: match(appleIphone) && !match(windowsPhone),
          ipod: match(appleIpod),
          tablet: !match(appleIphone) && (match(appleTablet) || isAppleTabletOnIos13(nav)) && !match(windowsPhone),
          universal: match(appleUniversal),
          device: (match(appleIphone) || match(appleIpod) || match(appleTablet) || match(appleUniversal) || isAppleTabletOnIos13(nav)) && !match(windowsPhone)
        },
        amazon: {
          phone: match(amazonPhone),
          tablet: !match(amazonPhone) && match(amazonTablet),
          device: match(amazonPhone) || match(amazonTablet)
        },
        android: {
          phone: !match(windowsPhone) && match(amazonPhone) || !match(windowsPhone) && match(androidPhone),
          tablet: !match(windowsPhone) && !match(amazonPhone) && !match(androidPhone) && (match(amazonTablet) || match(androidTablet)),
          device: !match(windowsPhone) && (match(amazonPhone) || match(amazonTablet) || match(androidPhone) || match(androidTablet)) || match(/\bokhttp\b/i)
        },
        windows: {
          phone: match(windowsPhone),
          tablet: match(windowsTablet),
          device: match(windowsPhone) || match(windowsTablet)
        },
        other: {
          blackberry: match(otherBlackBerry),
          blackberry10: match(otherBlackBerry10),
          opera: match(otherOpera),
          firefox: match(otherFirefox),
          chrome: match(otherChrome),
          device: match(otherBlackBerry) || match(otherBlackBerry10) || match(otherOpera) || match(otherFirefox) || match(otherChrome)
        },
        any: false,
        phone: false,
        tablet: false
      };
      result.any = result.apple.device || result.android.device || result.windows.device || result.other.device;
      result.phone = result.apple.phone || result.android.phone || result.windows.phone;
      result.tablet = result.apple.tablet || result.android.tablet || result.windows.tablet;
      return result;
    }
    var TLBoundsEdge4;
    (function(TLBoundsEdge22) {
      TLBoundsEdge22["Top"] = "top_edge";
      TLBoundsEdge22["Right"] = "right_edge";
      TLBoundsEdge22["Bottom"] = "bottom_edge";
      TLBoundsEdge22["Left"] = "left_edge";
    })(TLBoundsEdge4 || (TLBoundsEdge4 = {}));
    var TLBoundsCorner6;
    (function(TLBoundsCorner22) {
      TLBoundsCorner22["TopLeft"] = "top_left_corner";
      TLBoundsCorner22["TopRight"] = "top_right_corner";
      TLBoundsCorner22["BottomRight"] = "bottom_right_corner";
      TLBoundsCorner22["BottomLeft"] = "bottom_left_corner";
    })(TLBoundsCorner6 || (TLBoundsCorner6 = {}));
    var TLShapeUtil2 = class {
      constructor() {
        this.boundsCache = new WeakMap();
        this.isEditableText = false;
        this.isAspectRatioLocked = false;
        this.canEdit = false;
      }
      transformSingle(shape, bounds3, info) {
        return this.transform(shape, bounds3, info);
      }
      shouldRender(_prev, _next) {
        return true;
      }
      shouldDelete(_shape) {
        return false;
      }
      getCenter(shape) {
        const bounds3 = this.getBounds(shape);
        return [bounds3.width / 2, bounds3.height / 2];
      }
      create(props) {
        return {...this.defaultProps, ...props};
      }
      mutate(shape, props) {
        return {...shape, ...props};
      }
      updateChildren(_shape, _children) {
        return;
      }
      onChildrenChange(_shape, _children) {
        return;
      }
      onBindingChange(_shape, _binding, _target, _targetBounds) {
        return;
      }
      onHandleChange(_shape, _handle, _info) {
        return;
      }
      onRightPointHandle(_shape, _handle, _info) {
        return;
      }
      onDoubleClickHandle(_shape, _handle, _info) {
        return;
      }
      onSessionComplete(_shape) {
        return;
      }
      onBoundsReset(_shape) {
        return;
      }
      onStyleChange(_shape) {
        return;
      }
    };
    var _Vec = class {
      static clamp(n5, min2, max) {
        return Math.max(min2, typeof max !== "undefined" ? Math.min(n5, max) : n5);
      }
    };
    var Vec18 = _Vec;
    Vec18.neg = (A3) => {
      return [-A3[0], -A3[1]];
    };
    Vec18.add = (A3, B3) => {
      return [A3[0] + B3[0], A3[1] + B3[1]];
    };
    Vec18.addScalar = (A3, n5) => {
      return [A3[0] + n5, A3[1] + n5];
    };
    Vec18.sub = (A3, B3) => {
      return [A3[0] - B3[0], A3[1] - B3[1]];
    };
    Vec18.subScalar = (A3, n5) => {
      return [A3[0] - n5, A3[1] - n5];
    };
    Vec18.vec = (A3, B3) => {
      return [B3[0] - A3[0], B3[1] - A3[1]];
    };
    Vec18.mul = (A3, n5) => {
      return [A3[0] * n5, A3[1] * n5];
    };
    Vec18.mulV = (A3, B3) => {
      return [A3[0] * B3[0], A3[1] * B3[1]];
    };
    Vec18.div = (A3, n5) => {
      return [A3[0] / n5, A3[1] / n5];
    };
    Vec18.divV = (A3, B3) => {
      return [A3[0] / B3[0], A3[1] / B3[1]];
    };
    Vec18.per = (A3) => {
      return [A3[1], -A3[0]];
    };
    Vec18.dpr = (A3, B3) => {
      return A3[0] * B3[0] + A3[1] * B3[1];
    };
    Vec18.cpr = (A3, B3) => {
      return A3[0] * B3[1] - B3[0] * A3[1];
    };
    Vec18.len2 = (A3) => {
      return A3[0] * A3[0] + A3[1] * A3[1];
    };
    Vec18.len = (A3) => {
      return Math.hypot(A3[0], A3[1]);
    };
    Vec18.pry = (A3, B3) => {
      return _Vec.dpr(A3, B3) / _Vec.len(B3);
    };
    Vec18.uni = (A3) => {
      return _Vec.div(A3, _Vec.len(A3));
    };
    Vec18.normalize = (A3) => {
      return _Vec.uni(A3);
    };
    Vec18.tangent = (A3, B3) => {
      return _Vec.normalize(_Vec.sub(A3, B3));
    };
    Vec18.dist2 = (A3, B3) => {
      return _Vec.len2(_Vec.sub(A3, B3));
    };
    Vec18.dist = (A3, B3) => {
      return Math.hypot(A3[1] - B3[1], A3[0] - B3[0]);
    };
    Vec18.fastDist = (A3, B3) => {
      const V3 = [B3[0] - A3[0], B3[1] - A3[1]];
      const aV = [Math.abs(V3[0]), Math.abs(V3[1])];
      let r11 = 1 / Math.max(aV[0], aV[1]);
      r11 = r11 * (1.29289 - (aV[0] + aV[1]) * r11 * 0.29289);
      return [V3[0] * r11, V3[1] * r11];
    };
    Vec18.ang = (A3, B3) => {
      return Math.atan2(_Vec.cpr(A3, B3), _Vec.dpr(A3, B3));
    };
    Vec18.angle = (A3, B3) => {
      return Math.atan2(B3[1] - A3[1], B3[0] - A3[0]);
    };
    Vec18.med = (A3, B3) => {
      return _Vec.mul(_Vec.add(A3, B3), 0.5);
    };
    Vec18.rot = (A3, r11) => {
      return [A3[0] * Math.cos(r11) - A3[1] * Math.sin(r11), A3[0] * Math.sin(r11) + A3[1] * Math.cos(r11)];
    };
    Vec18.rotWith = (A3, C6, r11) => {
      if (r11 === 0)
        return A3;
      const s9 = Math.sin(r11);
      const c7 = Math.cos(r11);
      const px = A3[0] - C6[0];
      const py = A3[1] - C6[1];
      const nx = px * c7 - py * s9;
      const ny = px * s9 + py * c7;
      return [nx + C6[0], ny + C6[1]];
    };
    Vec18.isEqual = (A3, B3) => {
      return A3[0] === B3[0] && A3[1] === B3[1];
    };
    Vec18.lrp = (A3, B3, t14) => {
      return _Vec.add(A3, _Vec.mul(_Vec.vec(A3, B3), t14));
    };
    Vec18.int = (A3, B3, from, to, s9 = 1) => {
      const t14 = (_Vec.clamp(from, to) - from) / (to - from);
      return _Vec.add(_Vec.mul(A3, 1 - t14), _Vec.mul(B3, s9));
    };
    Vec18.ang3 = (p1, pc, p22) => {
      const v1 = _Vec.vec(pc, p1);
      const v22 = _Vec.vec(pc, p22);
      return _Vec.ang(v1, v22);
    };
    Vec18.abs = (A3) => {
      return [Math.abs(A3[0]), Math.abs(A3[1])];
    };
    Vec18.rescale = (a6, n5) => {
      const l7 = _Vec.len(a6);
      return [n5 * a6[0] / l7, n5 * a6[1] / l7];
    };
    Vec18.isLeft = (p1, pc, p22) => {
      return (pc[0] - p1[0]) * (p22[1] - p1[1]) - (p22[0] - p1[0]) * (pc[1] - p1[1]);
    };
    Vec18.clockwise = (p1, pc, p22) => {
      return _Vec.isLeft(p1, pc, p22) > 0;
    };
    Vec18.round = (a6, d8 = 5) => {
      return a6.map((v6) => +v6.toPrecision(d8));
    };
    Vec18.nearestPointOnLineThroughPoint = (A3, u6, P3) => {
      return _Vec.add(A3, _Vec.mul(u6, _Vec.pry(_Vec.sub(P3, A3), u6)));
    };
    Vec18.distanceToLineThroughPoint = (A3, u6, P3) => {
      return _Vec.dist(P3, _Vec.nearestPointOnLineThroughPoint(A3, u6, P3));
    };
    Vec18.nearestPointOnLineSegment = (A3, B3, P3, clamp2 = true) => {
      const delta = _Vec.sub(B3, A3);
      const length = _Vec.len(delta);
      const u6 = _Vec.div(delta, length);
      const pt = _Vec.add(A3, _Vec.mul(u6, _Vec.pry(_Vec.sub(P3, A3), u6)));
      if (clamp2) {
        const da = _Vec.dist(A3, pt);
        const db = _Vec.dist(B3, pt);
        if (db < da && da > length)
          return B3;
        if (da < db && db > length)
          return A3;
      }
      return pt;
    };
    Vec18.distanceToLineSegment = (A3, B3, P3, clamp2 = true) => {
      return _Vec.dist(P3, _Vec.nearestPointOnLineSegment(A3, B3, P3, clamp2));
    };
    Vec18.nudge = (A3, B3, d8) => {
      return _Vec.add(A3, _Vec.mul(_Vec.uni(_Vec.vec(A3, B3)), d8));
    };
    Vec18.nudgeAtAngle = (A3, a6, d8) => {
      return [Math.cos(a6) * d8 + A3[0], Math.sin(a6) * d8 + A3[1]];
    };
    Vec18.toPrecision = (a6, n5 = 4) => {
      return [+a6[0].toPrecision(n5), +a6[1].toPrecision(n5)];
    };
    Vec18.pointsBetween = (a6, b5, steps = 6) => {
      return Array.from(Array(steps)).map((_, i6) => {
        const t14 = i6 / steps;
        return t14 * t14 * t14;
      }).map((t14) => _Vec.round([..._Vec.lrp(a6, b5, t14), (1 - t14) / 2]));
    };
    var vec_default = Vec18;
    if (!String.prototype.replaceAll) {
      String.prototype.replaceAll = function(str, newStr) {
        if (Object.prototype.toString.call(str).toLowerCase() === "[object regexp]") {
          return this.replace(str, newStr);
        }
        return this.replace(new RegExp(str, "g"), newStr);
      };
    }
    var Utils24 = class {
      static filterObject(obj, fn) {
        return Object.fromEntries(Object.entries(obj).filter(fn));
      }
      static deepMerge(a6, b5) {
        return (0, import_deepmerge.default)(a6, b5, {arrayMerge: (_a, b22) => b22});
      }
      static lerp(y1, y22, mu) {
        mu = Utils24.clamp(mu, 0, 1);
        return y1 * (1 - mu) + y22 * mu;
      }
      static lerpColor(color1, color2, factor = 0.5) {
        function h2r(hex) {
          const result2 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result2 ? [
            parseInt(result2[1], 16),
            parseInt(result2[2], 16),
            parseInt(result2[3], 16)
          ] : null;
        }
        function r2h(rgb) {
          return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
        }
        const c1 = h2r(color1) || [0, 0, 0];
        const c22 = h2r(color2) || [0, 0, 0];
        const result = c1.slice();
        for (let i6 = 0; i6 < 3; i6++) {
          result[i6] = Math.round(result[i6] + factor * (c22[i6] - c1[i6]));
        }
        return r2h(result);
      }
      static modulate(value, rangeA, rangeB, clamp2 = false) {
        const [fromLow, fromHigh] = rangeA;
        const [v0, v1] = rangeB;
        const result = v0 + (value - fromLow) / (fromHigh - fromLow) * (v1 - v0);
        return clamp2 ? v0 < v1 ? Math.max(Math.min(result, v1), v0) : Math.max(Math.min(result, v0), v1) : result;
      }
      static clamp(n5, min2, max) {
        return Math.max(min2, typeof max !== "undefined" ? Math.min(n5, max) : n5);
      }
      static compress(s9) {
        return s9;
      }
      static decompress(s9) {
        return s9;
      }
      static deepClone(obj) {
        if (obj === null)
          return obj;
        if (Array.isArray(obj)) {
          return [...obj];
        }
        if (typeof obj === "object") {
          const clone = {...obj};
          Object.keys(clone).forEach((key) => clone[key] = typeof obj[key] === "object" ? Utils24.deepClone(obj[key]) : obj[key]);
          return clone;
        }
        return obj;
      }
      static rng(seed = "") {
        let x6 = 0;
        let y5 = 0;
        let z3 = 0;
        let w5 = 0;
        function next() {
          const t14 = x6 ^ x6 << 11;
          x6 = y5;
          y5 = z3;
          z3 = w5;
          w5 ^= (w5 >>> 19 ^ t14 ^ t14 >>> 8) >>> 0;
          return w5 / 4294967296;
        }
        for (let k4 = 0; k4 < seed.length + 64; k4++) {
          x6 ^= seed.charCodeAt(k4) | 0;
          next();
        }
        return next;
      }
      static getRectangleSides(point, size) {
        const tl = point;
        const tr = vec_default.add(point, [size[0], 0]);
        const br = vec_default.add(point, size);
        const bl = vec_default.add(point, [0, size[1]]);
        return [
          ["top", [tl, tr]],
          ["right", [tr, br]],
          ["bottom", [br, bl]],
          ["left", [bl, tl]]
        ];
      }
      static getBoundsSides(bounds3) {
        return this.getRectangleSides([bounds3.minX, bounds3.minY], [bounds3.width, bounds3.height]);
      }
      static shallowEqual(objA, objB) {
        if (objA === objB)
          return true;
        if (!objA || !objB)
          return false;
        const aKeys = Object.keys(objA);
        const bKeys = Object.keys(objB);
        const len3 = aKeys.length;
        if (bKeys.length !== len3)
          return false;
        for (let i6 = 0; i6 < len3; i6++) {
          const key = aKeys[i6];
          if (objA[key] !== objB[key] || !Object.prototype.hasOwnProperty.call(objB, key)) {
            return false;
          }
        }
        return true;
      }
      static getCircleTangentToPoint(C6, r11, P3, side) {
        const B3 = vec_default.lrp(C6, P3, 0.5);
        const r1 = vec_default.dist(C6, B3);
        const delta = vec_default.sub(B3, C6);
        const d8 = vec_default.len(delta);
        if (!(d8 <= r11 + r1 && d8 >= Math.abs(r11 - r1))) {
          return null;
        }
        const a6 = (r11 * r11 - r1 * r1 + d8 * d8) / (2 * d8);
        const n5 = 1 / d8;
        const p8 = vec_default.add(C6, vec_default.mul(delta, a6 * n5));
        const h5 = Math.sqrt(r11 * r11 - a6 * a6);
        const k4 = vec_default.mul(vec_default.per(delta), h5 * n5);
        return side === 0 ? vec_default.add(p8, k4) : vec_default.sub(p8, k4);
      }
      static getOuterTangentsOfCircles(C0, r0, C1, r1) {
        const a0 = vec_default.angle(C0, C1);
        const d8 = vec_default.dist(C0, C1);
        if (d8 < Math.abs(r1 - r0)) {
          return null;
        }
        const a1 = Math.acos((r0 - r1) / d8);
        const t0 = a0 + a1;
        const t1 = a0 - a1;
        return [
          [C0[0] + r0 * Math.cos(t1), C0[1] + r0 * Math.sin(t1)],
          [C1[0] + r1 * Math.cos(t1), C1[1] + r1 * Math.sin(t1)],
          [C0[0] + r0 * Math.cos(t0), C0[1] + r0 * Math.sin(t0)],
          [C1[0] + r1 * Math.cos(t0), C1[1] + r1 * Math.sin(t0)]
        ];
      }
      static getClosestPointOnCircle(C6, r11, P3) {
        const v6 = vec_default.sub(C6, P3);
        return vec_default.sub(C6, vec_default.mul(vec_default.div(v6, vec_default.len(v6)), r11));
      }
      static circleFromThreePoints(A3, B3, C6) {
        const [x1, y1] = A3;
        const [x22, y22] = B3;
        const [x32, y32] = C6;
        const a6 = x1 * (y22 - y32) - y1 * (x22 - x32) + x22 * y32 - x32 * y22;
        const b5 = (x1 * x1 + y1 * y1) * (y32 - y22) + (x22 * x22 + y22 * y22) * (y1 - y32) + (x32 * x32 + y32 * y32) * (y22 - y1);
        const c7 = (x1 * x1 + y1 * y1) * (x22 - x32) + (x22 * x22 + y22 * y22) * (x32 - x1) + (x32 * x32 + y32 * y32) * (x1 - x22);
        const x6 = -b5 / (2 * a6);
        const y5 = -c7 / (2 * a6);
        return [x6, y5, Math.hypot(x6 - x1, y5 - y1)];
      }
      static perimeterOfEllipse(rx, ry) {
        const h5 = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2);
        const p8 = Math.PI * (rx + ry) * (1 + 3 * h5 / (10 + Math.sqrt(4 - 3 * h5)));
        return p8;
      }
      static shortAngleDist(a0, a1) {
        const max = Math.PI * 2;
        const da = (a1 - a0) % max;
        return 2 * da % max - da;
      }
      static longAngleDist(a0, a1) {
        return Math.PI * 2 - Utils24.shortAngleDist(a0, a1);
      }
      static lerpAngles(a0, a1, t14) {
        return a0 + Utils24.shortAngleDist(a0, a1) * t14;
      }
      static angleDelta(a0, a1) {
        return Utils24.shortAngleDist(a0, a1);
      }
      static getSweep(C6, A3, B3) {
        return Utils24.angleDelta(vec_default.angle(C6, A3), vec_default.angle(C6, B3));
      }
      static rotatePoint(A3, B3, angle) {
        const s9 = Math.sin(angle);
        const c7 = Math.cos(angle);
        const px = A3[0] - B3[0];
        const py = A3[1] - B3[1];
        const nx = px * c7 - py * s9;
        const ny = px * s9 + py * c7;
        return [nx + B3[0], ny + B3[1]];
      }
      static clampRadians(r11) {
        return (Math.PI * 2 + r11) % (Math.PI * 2);
      }
      static clampToRotationToSegments(r11, segments) {
        const seg = Math.PI * 2 / segments;
        return Math.floor((Utils24.clampRadians(r11) + seg / 2) / seg) * seg;
      }
      static isAngleBetween(a6, b5, c7) {
        if (c7 === a6 || c7 === b5)
          return true;
        const PI23 = Math.PI * 2;
        const AB = (b5 - a6 + PI23) % PI23;
        const AC = (c7 - a6 + PI23) % PI23;
        return AB <= Math.PI !== AC > AB;
      }
      static degreesToRadians(d8) {
        return d8 * Math.PI / 180;
      }
      static radiansToDegrees(r11) {
        return r11 * 180 / Math.PI;
      }
      static getArcLength(C6, r11, A3, B3) {
        const sweep = Utils24.getSweep(C6, A3, B3);
        return r11 * (2 * Math.PI) * (sweep / (2 * Math.PI));
      }
      static getArcDashOffset(C6, r11, A3, B3, step) {
        const del0 = Utils24.getSweep(C6, A3, B3);
        const len0 = Utils24.getArcLength(C6, r11, A3, B3);
        const off0 = del0 < 0 ? len0 : 2 * Math.PI * C6[2] - len0;
        return -off0 / 2 + step;
      }
      static getEllipseDashOffset(A3, step) {
        const c7 = 2 * Math.PI * A3[2];
        return -c7 / 2 + -step;
      }
      static getTLBezierCurveSegments(points, tension = 0.4) {
        const len3 = points.length;
        const cpoints = [...points];
        if (len3 < 2) {
          throw Error("Curve must have at least two points.");
        }
        for (let i6 = 1; i6 < len3 - 1; i6++) {
          const p0 = points[i6 - 1];
          const p1 = points[i6];
          const p22 = points[i6 + 1];
          const pdx = p22[0] - p0[0];
          const pdy = p22[1] - p0[1];
          const pd = Math.hypot(pdx, pdy);
          const nx = pdx / pd;
          const ny = pdy / pd;
          const dp = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
          const dn = Math.hypot(p1[0] - p22[0], p1[1] - p22[1]);
          cpoints[i6] = [
            p1[0] - nx * dp * tension,
            p1[1] - ny * dp * tension,
            p1[0] + nx * dn * tension,
            p1[1] + ny * dn * tension,
            nx,
            ny
          ];
        }
        const d0 = Math.hypot(points[0][0] + cpoints[1][0]);
        cpoints[0][2] = (points[0][0] + cpoints[1][0]) / 2;
        cpoints[0][3] = (points[0][1] + cpoints[1][1]) / 2;
        cpoints[0][4] = (cpoints[1][0] - points[0][0]) / d0;
        cpoints[0][5] = (cpoints[1][1] - points[0][1]) / d0;
        const d1 = Math.hypot(points[len3 - 1][1] + cpoints[len3 - 1][1]);
        cpoints[len3 - 1][0] = (points[len3 - 1][0] + cpoints[len3 - 2][2]) / 2;
        cpoints[len3 - 1][1] = (points[len3 - 1][1] + cpoints[len3 - 2][3]) / 2;
        cpoints[len3 - 1][4] = (cpoints[len3 - 2][2] - points[len3 - 1][0]) / -d1;
        cpoints[len3 - 1][5] = (cpoints[len3 - 2][3] - points[len3 - 1][1]) / -d1;
        const results = [];
        for (let i6 = 1; i6 < cpoints.length; i6++) {
          results.push({
            start: points[i6 - 1].slice(0, 2),
            tangentStart: cpoints[i6 - 1].slice(2, 4),
            normalStart: cpoints[i6 - 1].slice(4, 6),
            pressureStart: 2 + ((i6 - 1) % 2 === 0 ? 1.5 : 0),
            end: points[i6].slice(0, 2),
            tangentEnd: cpoints[i6].slice(0, 2),
            normalEnd: cpoints[i6].slice(4, 6),
            pressureEnd: 2 + (i6 % 2 === 0 ? 1.5 : 0)
          });
        }
        return results;
      }
      static computePointOnCurve(t14, points) {
        if (t14 === 0) {
          return points[0];
        }
        const order = points.length - 1;
        if (t14 === 1) {
          return points[order];
        }
        const mt = 1 - t14;
        let p8 = points;
        if (order === 0) {
          return points[0];
        }
        if (order === 1) {
          return [mt * p8[0][0] + t14 * p8[1][0], mt * p8[0][1] + t14 * p8[1][1]];
        }
        const mt2 = mt * mt;
        const t22 = t14 * t14;
        let a6;
        let b5;
        let c7;
        let d8 = 0;
        if (order === 2) {
          p8 = [p8[0], p8[1], p8[2], [0, 0]];
          a6 = mt2;
          b5 = mt * t14 * 2;
          c7 = t22;
        } else {
          a6 = mt2 * mt;
          b5 = mt2 * t14 * 3;
          c7 = mt * t22 * 3;
          d8 = t14 * t22;
        }
        return [
          a6 * p8[0][0] + b5 * p8[1][0] + c7 * p8[2][0] + d8 * p8[3][0],
          a6 * p8[0][1] + b5 * p8[1][1] + c7 * p8[2][1] + d8 * p8[3][1]
        ];
      }
      static cubicBezier(tx, x1, y1, x22, y22) {
        const x0 = 0;
        const y0 = 0;
        const x32 = 1;
        const y32 = 1;
        const A3 = x32 - 3 * x22 + 3 * x1 - x0;
        const B3 = 3 * x22 - 6 * x1 + 3 * x0;
        const C6 = 3 * x1 - 3 * x0;
        const D4 = x0;
        const E4 = y32 - 3 * y22 + 3 * y1 - y0;
        const F4 = 3 * y22 - 6 * y1 + 3 * y0;
        const G3 = 3 * y1 - 3 * y0;
        const H3 = y0;
        const iterations = 5;
        let i6;
        let slope;
        let x6;
        let t14 = tx;
        for (i6 = 0; i6 < iterations; i6++) {
          x6 = A3 * t14 * t14 * t14 + B3 * t14 * t14 + C6 * t14 + D4;
          slope = 1 / (3 * A3 * t14 * t14 + 2 * B3 * t14 + C6);
          t14 -= (x6 - tx) * slope;
          t14 = t14 > 1 ? 1 : t14 < 0 ? 0 : t14;
        }
        return Math.abs(E4 * t14 * t14 * t14 + F4 * t14 * t14 + G3 * t14 * H3);
      }
      static getSpline(pts, k4 = 0.5) {
        let p0;
        let [p1, p22, p32] = pts;
        const results = [];
        for (let i6 = 1, len3 = pts.length; i6 < len3; i6++) {
          p0 = p1;
          p1 = p22;
          p22 = p32;
          p32 = pts[i6 + 2] ? pts[i6 + 2] : p22;
          results.push({
            cp1x: p1[0] + (p22[0] - p0[0]) / 6 * k4,
            cp1y: p1[1] + (p22[1] - p0[1]) / 6 * k4,
            cp2x: p22[0] - (p32[0] - p1[0]) / 6 * k4,
            cp2y: p22[1] - (p32[1] - p1[1]) / 6 * k4,
            px: pts[i6][0],
            py: pts[i6][1]
          });
        }
        return results;
      }
      static getCurvePoints(pts, tension = 0.5, isClosed = false, numOfSegments = 3) {
        const _pts = [...pts];
        const len3 = pts.length;
        const res = [];
        let t1x, t2x, t1y, t2y, c1, c22, c32, c42, st, st2, st3;
        if (isClosed) {
          _pts.unshift(_pts[len3 - 1]);
          _pts.push(_pts[0]);
        } else {
          _pts.unshift(_pts[0]);
          _pts.push(_pts[len3 - 1]);
        }
        for (let i6 = 1; i6 < _pts.length - 2; i6++) {
          for (let t14 = 0; t14 <= numOfSegments; t14++) {
            st = t14 / numOfSegments;
            st2 = Math.pow(st, 2);
            st3 = Math.pow(st, 3);
            c1 = 2 * st3 - 3 * st2 + 1;
            c22 = -(2 * st3) + 3 * st2;
            c32 = st3 - 2 * st2 + st;
            c42 = st3 - st2;
            t1x = (_pts[i6 + 1][0] - _pts[i6 - 1][0]) * tension;
            t2x = (_pts[i6 + 2][0] - _pts[i6][0]) * tension;
            t1y = (_pts[i6 + 1][1] - _pts[i6 - 1][1]) * tension;
            t2y = (_pts[i6 + 2][1] - _pts[i6][1]) * tension;
            res.push([
              c1 * _pts[i6][0] + c22 * _pts[i6 + 1][0] + c32 * t1x + c42 * t2x,
              c1 * _pts[i6][1] + c22 * _pts[i6 + 1][1] + c32 * t1y + c42 * t2y
            ]);
          }
        }
        res.push(pts[pts.length - 1]);
        return res;
      }
      static simplify(points, tolerance = 1) {
        const len3 = points.length;
        const a6 = points[0];
        const b5 = points[len3 - 1];
        const [x1, y1] = a6;
        const [x22, y22] = b5;
        if (len3 > 2) {
          let distance = 0;
          let index = 0;
          const max = Math.hypot(y22 - y1, x22 - x1);
          for (let i6 = 1; i6 < len3 - 1; i6++) {
            const [x0, y0] = points[i6];
            const d8 = Math.abs((y22 - y1) * x0 - (x22 - x1) * y0 + x22 * y1 - y22 * x1) / max;
            if (distance > d8)
              continue;
            distance = d8;
            index = i6;
          }
          if (distance > tolerance) {
            const l0 = Utils24.simplify(points.slice(0, index + 1), tolerance);
            const l1 = Utils24.simplify(points.slice(index + 1), tolerance);
            return l0.concat(l1.slice(1));
          }
        }
        return [a6, b5];
      }
      static pointInCircle(A3, C6, r11) {
        return vec_default.dist(A3, C6) <= r11;
      }
      static pointInEllipse(A3, C6, rx, ry, rotation = 0) {
        rotation = rotation || 0;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const delta = vec_default.sub(A3, C6);
        const tdx = cos * delta[0] + sin * delta[1];
        const tdy = sin * delta[0] - cos * delta[1];
        return tdx * tdx / (rx * rx) + tdy * tdy / (ry * ry) <= 1;
      }
      static pointInRect(point, size) {
        return !(point[0] < size[0] || point[0] > point[0] + size[0] || point[1] < size[1] || point[1] > point[1] + size[1]);
      }
      static expandBounds(bounds3, delta) {
        return {
          minX: bounds3.minX - delta,
          minY: bounds3.minY - delta,
          maxX: bounds3.maxX + delta,
          maxY: bounds3.maxY + delta,
          width: bounds3.width + delta * 2,
          height: bounds3.height + delta * 2
        };
      }
      static pointInBounds(A3, b5) {
        return !(A3[0] < b5.minX || A3[0] > b5.maxX || A3[1] < b5.minY || A3[1] > b5.maxY);
      }
      static boundsCollide(a6, b5) {
        return !(a6.maxX < b5.minX || a6.minX > b5.maxX || a6.maxY < b5.minY || a6.minY > b5.maxY);
      }
      static boundsContain(a6, b5) {
        return a6.minX < b5.minX && a6.minY < b5.minY && a6.maxY > b5.maxY && a6.maxX > b5.maxX;
      }
      static boundsContained(a6, b5) {
        return Utils24.boundsContain(b5, a6);
      }
      static boundsAreEqual(a6, b5) {
        return !(b5.maxX !== a6.maxX || b5.minX !== a6.minX || b5.maxY !== a6.maxY || b5.minY !== a6.minY);
      }
      static getBoundsFromPoints(points, rotation = 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        if (points.length < 2) {
          minX = 0;
          minY = 0;
          maxX = 1;
          maxY = 1;
        } else {
          for (const [x6, y5] of points) {
            minX = Math.min(x6, minX);
            minY = Math.min(y5, minY);
            maxX = Math.max(x6, maxX);
            maxY = Math.max(y5, maxY);
          }
        }
        if (rotation !== 0) {
          return Utils24.getBoundsFromPoints(points.map((pt) => vec_default.rotWith(pt, [(minX + maxX) / 2, (minY + maxY) / 2], rotation)));
        }
        return {
          minX,
          minY,
          maxX,
          maxY,
          width: Math.max(1, maxX - minX),
          height: Math.max(1, maxY - minY)
        };
      }
      static centerBounds(bounds3, point) {
        const boundsCenter = this.getBoundsCenter(bounds3);
        const dx = point[0] - boundsCenter[0];
        const dy = point[1] - boundsCenter[1];
        return this.translateBounds(bounds3, [dx, dy]);
      }
      static translateBounds(bounds3, delta) {
        return {
          minX: bounds3.minX + delta[0],
          minY: bounds3.minY + delta[1],
          maxX: bounds3.maxX + delta[0],
          maxY: bounds3.maxY + delta[1],
          width: bounds3.width,
          height: bounds3.height
        };
      }
      static rotateBounds(bounds3, center, rotation) {
        const [minX, minY] = vec_default.rotWith([bounds3.minX, bounds3.minY], center, rotation);
        const [maxX, maxY] = vec_default.rotWith([bounds3.maxX, bounds3.maxY], center, rotation);
        return {
          minX,
          minY,
          maxX,
          maxY,
          width: bounds3.width,
          height: bounds3.height
        };
      }
      static getRotatedEllipseBounds(x6, y5, rx, ry, rotation) {
        const c7 = Math.cos(rotation);
        const s9 = Math.sin(rotation);
        const w5 = Math.hypot(rx * c7, ry * s9);
        const h5 = Math.hypot(rx * s9, ry * c7);
        return {
          minX: x6 + rx - w5,
          minY: y5 + ry - h5,
          maxX: x6 + rx + w5,
          maxY: y5 + ry + h5,
          width: w5 * 2,
          height: h5 * 2
        };
      }
      static getExpandedBounds(a6, b5) {
        const minX = Math.min(a6.minX, b5.minX);
        const minY = Math.min(a6.minY, b5.minY);
        const maxX = Math.max(a6.maxX, b5.maxX);
        const maxY = Math.max(a6.maxY, b5.maxY);
        const width = Math.abs(maxX - minX);
        const height = Math.abs(maxY - minY);
        return {minX, minY, maxX, maxY, width, height};
      }
      static getCommonBounds(bounds3) {
        if (bounds3.length < 2)
          return bounds3[0];
        let result = bounds3[0];
        for (let i6 = 1; i6 < bounds3.length; i6++) {
          result = Utils24.getExpandedBounds(result, bounds3[i6]);
        }
        return result;
      }
      static getRotatedCorners(b5, rotation = 0) {
        const center = [b5.minX + b5.width / 2, b5.minY + b5.height / 2];
        return [
          [b5.minX, b5.minY],
          [b5.maxX, b5.minY],
          [b5.maxX, b5.maxY],
          [b5.minX, b5.maxY]
        ].map((point) => vec_default.rotWith(point, center, rotation));
      }
      static getTransformedBoundingBox(bounds3, handle, delta, rotation = 0, isAspectRatioLocked = false) {
        const [ax0, ay0] = [bounds3.minX, bounds3.minY];
        const [ax1, ay1] = [bounds3.maxX, bounds3.maxY];
        let [bx0, by0] = [bounds3.minX, bounds3.minY];
        let [bx1, by1] = [bounds3.maxX, bounds3.maxY];
        if (handle === "center") {
          return {
            minX: bx0 + delta[0],
            minY: by0 + delta[1],
            maxX: bx1 + delta[0],
            maxY: by1 + delta[1],
            width: bx1 - bx0,
            height: by1 - by0,
            scaleX: 1,
            scaleY: 1
          };
        }
        const [dx, dy] = vec_default.rot(delta, -rotation);
        switch (handle) {
          case TLBoundsEdge4.Top:
          case TLBoundsCorner6.TopLeft:
          case TLBoundsCorner6.TopRight: {
            by0 += dy;
            break;
          }
          case TLBoundsEdge4.Bottom:
          case TLBoundsCorner6.BottomLeft:
          case TLBoundsCorner6.BottomRight: {
            by1 += dy;
            break;
          }
        }
        switch (handle) {
          case TLBoundsEdge4.Left:
          case TLBoundsCorner6.TopLeft:
          case TLBoundsCorner6.BottomLeft: {
            bx0 += dx;
            break;
          }
          case TLBoundsEdge4.Right:
          case TLBoundsCorner6.TopRight:
          case TLBoundsCorner6.BottomRight: {
            bx1 += dx;
            break;
          }
        }
        const aw = ax1 - ax0;
        const ah = ay1 - ay0;
        const scaleX = (bx1 - bx0) / aw;
        const scaleY = (by1 - by0) / ah;
        const flipX = scaleX < 0;
        const flipY = scaleY < 0;
        const bw = Math.abs(bx1 - bx0);
        const bh = Math.abs(by1 - by0);
        if (isAspectRatioLocked) {
          const ar = aw / ah;
          const isTall = ar < bw / bh;
          const tw = bw * (scaleY < 0 ? 1 : -1) * (1 / ar);
          const th = bh * (scaleX < 0 ? 1 : -1) * ar;
          switch (handle) {
            case TLBoundsCorner6.TopLeft: {
              if (isTall)
                by0 = by1 + tw;
              else
                bx0 = bx1 + th;
              break;
            }
            case TLBoundsCorner6.TopRight: {
              if (isTall)
                by0 = by1 + tw;
              else
                bx1 = bx0 - th;
              break;
            }
            case TLBoundsCorner6.BottomRight: {
              if (isTall)
                by1 = by0 - tw;
              else
                bx1 = bx0 - th;
              break;
            }
            case TLBoundsCorner6.BottomLeft: {
              if (isTall)
                by1 = by0 - tw;
              else
                bx0 = bx1 + th;
              break;
            }
            case TLBoundsEdge4.Bottom:
            case TLBoundsEdge4.Top: {
              const m8 = (bx0 + bx1) / 2;
              const w5 = bh * ar;
              bx0 = m8 - w5 / 2;
              bx1 = m8 + w5 / 2;
              break;
            }
            case TLBoundsEdge4.Left:
            case TLBoundsEdge4.Right: {
              const m8 = (by0 + by1) / 2;
              const h5 = bw / ar;
              by0 = m8 - h5 / 2;
              by1 = m8 + h5 / 2;
              break;
            }
          }
        }
        if (rotation % (Math.PI * 2) !== 0) {
          let cv = [0, 0];
          const c0 = vec_default.med([ax0, ay0], [ax1, ay1]);
          const c1 = vec_default.med([bx0, by0], [bx1, by1]);
          switch (handle) {
            case TLBoundsCorner6.TopLeft: {
              cv = vec_default.sub(vec_default.rotWith([bx1, by1], c1, rotation), vec_default.rotWith([ax1, ay1], c0, rotation));
              break;
            }
            case TLBoundsCorner6.TopRight: {
              cv = vec_default.sub(vec_default.rotWith([bx0, by1], c1, rotation), vec_default.rotWith([ax0, ay1], c0, rotation));
              break;
            }
            case TLBoundsCorner6.BottomRight: {
              cv = vec_default.sub(vec_default.rotWith([bx0, by0], c1, rotation), vec_default.rotWith([ax0, ay0], c0, rotation));
              break;
            }
            case TLBoundsCorner6.BottomLeft: {
              cv = vec_default.sub(vec_default.rotWith([bx1, by0], c1, rotation), vec_default.rotWith([ax1, ay0], c0, rotation));
              break;
            }
            case TLBoundsEdge4.Top: {
              cv = vec_default.sub(vec_default.rotWith(vec_default.med([bx0, by1], [bx1, by1]), c1, rotation), vec_default.rotWith(vec_default.med([ax0, ay1], [ax1, ay1]), c0, rotation));
              break;
            }
            case TLBoundsEdge4.Left: {
              cv = vec_default.sub(vec_default.rotWith(vec_default.med([bx1, by0], [bx1, by1]), c1, rotation), vec_default.rotWith(vec_default.med([ax1, ay0], [ax1, ay1]), c0, rotation));
              break;
            }
            case TLBoundsEdge4.Bottom: {
              cv = vec_default.sub(vec_default.rotWith(vec_default.med([bx0, by0], [bx1, by0]), c1, rotation), vec_default.rotWith(vec_default.med([ax0, ay0], [ax1, ay0]), c0, rotation));
              break;
            }
            case TLBoundsEdge4.Right: {
              cv = vec_default.sub(vec_default.rotWith(vec_default.med([bx0, by0], [bx0, by1]), c1, rotation), vec_default.rotWith(vec_default.med([ax0, ay0], [ax0, ay1]), c0, rotation));
              break;
            }
          }
          ;
          [bx0, by0] = vec_default.sub([bx0, by0], cv);
          [bx1, by1] = vec_default.sub([bx1, by1], cv);
        }
        if (bx1 < bx0) {
          ;
          [bx1, bx0] = [bx0, bx1];
        }
        if (by1 < by0) {
          ;
          [by1, by0] = [by0, by1];
        }
        return {
          minX: bx0,
          minY: by0,
          maxX: bx1,
          maxY: by1,
          width: bx1 - bx0,
          height: by1 - by0,
          scaleX: (bx1 - bx0) / (ax1 - ax0 || 1) * (flipX ? -1 : 1),
          scaleY: (by1 - by0) / (ay1 - ay0 || 1) * (flipY ? -1 : 1)
        };
      }
      static getTransformAnchor(type, isFlippedX, isFlippedY) {
        let anchor = type;
        switch (type) {
          case TLBoundsCorner6.TopLeft: {
            if (isFlippedX && isFlippedY) {
              anchor = TLBoundsCorner6.BottomRight;
            } else if (isFlippedX) {
              anchor = TLBoundsCorner6.TopRight;
            } else if (isFlippedY) {
              anchor = TLBoundsCorner6.BottomLeft;
            } else {
              anchor = TLBoundsCorner6.BottomRight;
            }
            break;
          }
          case TLBoundsCorner6.TopRight: {
            if (isFlippedX && isFlippedY) {
              anchor = TLBoundsCorner6.BottomLeft;
            } else if (isFlippedX) {
              anchor = TLBoundsCorner6.TopLeft;
            } else if (isFlippedY) {
              anchor = TLBoundsCorner6.BottomRight;
            } else {
              anchor = TLBoundsCorner6.BottomLeft;
            }
            break;
          }
          case TLBoundsCorner6.BottomRight: {
            if (isFlippedX && isFlippedY) {
              anchor = TLBoundsCorner6.TopLeft;
            } else if (isFlippedX) {
              anchor = TLBoundsCorner6.BottomLeft;
            } else if (isFlippedY) {
              anchor = TLBoundsCorner6.TopRight;
            } else {
              anchor = TLBoundsCorner6.TopLeft;
            }
            break;
          }
          case TLBoundsCorner6.BottomLeft: {
            if (isFlippedX && isFlippedY) {
              anchor = TLBoundsCorner6.TopRight;
            } else if (isFlippedX) {
              anchor = TLBoundsCorner6.BottomRight;
            } else if (isFlippedY) {
              anchor = TLBoundsCorner6.TopLeft;
            } else {
              anchor = TLBoundsCorner6.TopRight;
            }
            break;
          }
        }
        return anchor;
      }
      static getRelativeTransformedBoundingBox(bounds3, initialBounds, initialShapeBounds, isFlippedX, isFlippedY) {
        const nx = (isFlippedX ? initialBounds.maxX - initialShapeBounds.maxX : initialShapeBounds.minX - initialBounds.minX) / initialBounds.width;
        const ny = (isFlippedY ? initialBounds.maxY - initialShapeBounds.maxY : initialShapeBounds.minY - initialBounds.minY) / initialBounds.height;
        const nw = initialShapeBounds.width / initialBounds.width;
        const nh = initialShapeBounds.height / initialBounds.height;
        const minX = bounds3.minX + bounds3.width * nx;
        const minY = bounds3.minY + bounds3.height * ny;
        const width = bounds3.width * nw;
        const height = bounds3.height * nh;
        return {
          minX,
          minY,
          maxX: minX + width,
          maxY: minY + height,
          width,
          height
        };
      }
      static getRotatedSize(size, rotation) {
        const center = vec_default.div(size, 2);
        const points = [[0, 0], [size[0], 0], size, [0, size[1]]].map((point) => vec_default.rotWith(point, center, rotation));
        const bounds3 = Utils24.getBoundsFromPoints(points);
        return [bounds3.width, bounds3.height];
      }
      static getBoundsCenter(bounds3) {
        return [bounds3.minX + bounds3.width / 2, bounds3.minY + bounds3.height / 2];
      }
      static removeDuplicatePoints(points) {
        return points.reduce((acc, pt, i6) => {
          if (i6 === 0 || !vec_default.isEqual(pt, acc[i6 - 1])) {
            acc.push(pt);
          }
          return acc;
        }, []);
      }
      static getFromCache(cache, item, getNext) {
        let value = cache.get(item);
        if (value === void 0) {
          cache.set(item, getNext());
          value = cache.get(item);
          if (value === void 0) {
            throw Error("Cache did not include item!");
          }
        }
        return value;
      }
      static uniqueId(a6 = "") {
        return a6 ? ((Number(a6) ^ Math.random() * 16) >> Number(a6) / 4).toString(16) : `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, Utils24.uniqueId);
      }
      static shuffleArr(arr, offset) {
        return arr.map((_, i6) => arr[(i6 + offset) % arr.length]);
      }
      static deepCompareArrays(a6, b5) {
        if (a6?.length !== b5?.length)
          return false;
        return Utils24.deepCompare(a6, b5);
      }
      static deepCompare(a6, b5) {
        return a6 === b5 || JSON.stringify(a6) === JSON.stringify(b5);
      }
      static arrsIntersect(a6, b5, fn) {
        return a6.some((item) => b5.includes(fn ? fn(item) : item));
      }
      static uniqueArray(...items) {
        return Array.from(new Set(items).values());
      }
      static setToArray(set) {
        return Array.from(set.values());
      }
      static debounce(fn, ms = 0) {
        let timeoutId;
        return function(...args) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn.apply(args), ms);
        };
      }
      static getSvgPathFromStroke(stroke) {
        if (!stroke.length)
          return "";
        const d8 = stroke.reduce((acc, [x0, y0], i6, arr) => {
          const [x1, y1] = arr[(i6 + 1) % arr.length];
          acc.push(` ${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`);
          return acc;
        }, ["M ", `${stroke[0][0]},${stroke[0][1]}`, " Q"]);
        d8.push(" Z");
        return d8.join("").replaceAll(/(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g, "$1");
      }
      static isMobile() {
        return isMobile().any;
      }
      static throttle(func, limit) {
        let inThrottle;
        let lastResult;
        return function() {
          const args = arguments;
          const context = this;
          if (!inThrottle) {
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
            lastResult = func.apply(context, args);
          }
          return lastResult;
        };
      }
      static isTouchDisplay() {
        return "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
      }
      static isDarwin() {
        return /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
      }
      static metaKey(e14) {
        return Utils24.isDarwin() ? e14.metaKey : e14.ctrlKey;
      }
    };
    function getIntersection(message, ...points) {
      const didIntersect = points.length > 0;
      return {didIntersect, message, points};
    }
    var _Intersect = class {
    };
    var Intersect6 = _Intersect;
    Intersect6.ray = {
      ray(p0, n0, p1, n1) {
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const det = n1[0] * n0[1] - n1[1] * n0[0];
        const u6 = (dy * n1[0] - dx * n1[1]) / det;
        const v6 = (dy * n0[0] - dx * n0[1]) / det;
        if (u6 < 0 || v6 < 0)
          return getIntersection("miss");
        const m0 = n0[1] / n0[0];
        const m1 = n1[1] / n1[0];
        const b0 = p0[1] - m0 * p0[0];
        const b1 = p1[1] - m1 * p1[0];
        const x6 = (b1 - b0) / (m0 - m1);
        const y5 = m0 * x6 + b0;
        return Number.isFinite(x6) ? getIntersection("intersection", [x6, y5]) : getIntersection("parallel");
      },
      lineSegment(origin, direction, a1, a22) {
        const [x6, y5] = origin;
        const [dx, dy] = direction;
        const [x1, y1] = a1;
        const [x22, y22] = a22;
        if (dy / dx !== (y22 - y1) / (x22 - x1)) {
          const d8 = dx * (y22 - y1) - dy * (x22 - x1);
          if (d8 !== 0) {
            const r11 = ((y5 - y1) * (x22 - x1) - (x6 - x1) * (y22 - y1)) / d8;
            const s9 = ((y5 - y1) * dx - (x6 - x1) * dy) / d8;
            if (r11 >= 0 && s9 >= 0 && s9 <= 1) {
              return getIntersection("intersection", [x6 + r11 * dx, y5 + r11 * dy]);
            }
          }
        }
        return getIntersection("no intersection");
      },
      rectangle(origin, direction, point, size) {
        return _Intersect.rectangle.ray(point, size, origin, direction);
      },
      ellipse(origin, direction, center, rx, ry, rotation) {
        const a1 = origin;
        const a22 = Vec18.mul(direction, 999999999);
        return _Intersect.lineSegment.ellipse(a1, a22, center, rx, ry, rotation);
      },
      bounds(origin, direction, bounds3) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.ray.rectangle(origin, direction, [minX, minY], [width, height]);
      }
    };
    Intersect6.lineSegment = {
      ray(a1, a22, origin, direction) {
        return _Intersect.ray.lineSegment(origin, direction, a1, a22);
      },
      lineSegment(a1, a22, b1, b22) {
        const AB = Vec18.sub(a1, b1);
        const BV = Vec18.sub(b22, b1);
        const AV = Vec18.sub(a22, a1);
        const ua_t = BV[0] * AB[1] - BV[1] * AB[0];
        const ub_t = AV[0] * AB[1] - AV[1] * AB[0];
        const u_b = BV[1] * AV[0] - BV[0] * AV[1];
        if (ua_t === 0 || ub_t === 0) {
          return getIntersection("coincident");
        }
        if (u_b === 0) {
          return getIntersection("parallel");
        }
        if (u_b !== 0) {
          const ua = ua_t / u_b;
          const ub = ub_t / u_b;
          if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
            return getIntersection("intersection", Vec18.add(a1, Vec18.mul(AV, ua)));
          }
        }
        return getIntersection("no intersection");
      },
      rectangle(a1, a22, point, size) {
        return _Intersect.rectangle.lineSegment(point, size, a1, a22);
      },
      arc(a1, a22, center, radius, start, end) {
        const sa = Vec18.angle(center, start);
        const ea = Vec18.angle(center, end);
        const ellipseTest = _Intersect.ellipse.lineSegment(center, radius, radius, 0, a1, a22);
        if (!ellipseTest.didIntersect)
          return getIntersection("No intersection");
        const points = ellipseTest.points.filter((point) => Utils24.isAngleBetween(sa, ea, Vec18.angle(center, point)));
        if (points.length === 0) {
          return getIntersection("No intersection");
        }
        return getIntersection("intersection", ...points);
      },
      circle(a1, a22, c7, r11) {
        const a6 = (a22[0] - a1[0]) * (a22[0] - a1[0]) + (a22[1] - a1[1]) * (a22[1] - a1[1]);
        const b5 = 2 * ((a22[0] - a1[0]) * (a1[0] - c7[0]) + (a22[1] - a1[1]) * (a1[1] - c7[1]));
        const cc = c7[0] * c7[0] + c7[1] * c7[1] + a1[0] * a1[0] + a1[1] * a1[1] - 2 * (c7[0] * a1[0] + c7[1] * a1[1]) - r11 * r11;
        const deter = b5 * b5 - 4 * a6 * cc;
        if (deter < 0) {
          return getIntersection("outside");
        }
        if (deter === 0) {
          return getIntersection("tangent");
        }
        const e14 = Math.sqrt(deter);
        const u1 = (-b5 + e14) / (2 * a6);
        const u22 = (-b5 - e14) / (2 * a6);
        if ((u1 < 0 || u1 > 1) && (u22 < 0 || u22 > 1)) {
          if (u1 < 0 && u22 < 0 || u1 > 1 && u22 > 1) {
            return getIntersection("outside");
          } else {
            return getIntersection("inside");
          }
        }
        const results = [];
        if (0 <= u1 && u1 <= 1)
          results.push(Vec18.lrp(a1, a22, u1));
        if (0 <= u22 && u22 <= 1)
          results.push(Vec18.lrp(a1, a22, u22));
        return getIntersection("intersection", ...results);
      },
      ellipse(a1, a22, center, rx, ry, rotation = 0) {
        if (rx === 0 || ry === 0 || Vec18.isEqual(a1, a22)) {
          return getIntersection("No intersection");
        }
        rx = rx < 0 ? rx : -rx;
        ry = ry < 0 ? ry : -ry;
        a1 = Vec18.sub(Vec18.rotWith(a1, center, -rotation), center);
        a22 = Vec18.sub(Vec18.rotWith(a22, center, -rotation), center);
        const diff = Vec18.sub(a22, a1);
        const A3 = diff[0] * diff[0] / rx / rx + diff[1] * diff[1] / ry / ry;
        const B3 = 2 * a1[0] * diff[0] / rx / rx + 2 * a1[1] * diff[1] / ry / ry;
        const C6 = a1[0] * a1[0] / rx / rx + a1[1] * a1[1] / ry / ry - 1;
        const tValues = [];
        const discriminant = B3 * B3 - 4 * A3 * C6;
        if (discriminant === 0) {
          tValues.push(-B3 / 2 / A3);
        } else if (discriminant > 0) {
          const root = Math.sqrt(discriminant);
          tValues.push((-B3 + root) / 2 / A3);
          tValues.push((-B3 - root) / 2 / A3);
        }
        const points = tValues.filter((t14) => t14 >= 0 && t14 <= 1).map((t14) => Vec18.add(center, Vec18.add(a1, Vec18.mul(Vec18.sub(a22, a1), t14)))).map((p8) => Vec18.rotWith(p8, center, rotation));
        return getIntersection("intersection", ...points);
      },
      bounds(a1, a22, bounds3) {
        return _Intersect.bounds.lineSegment(bounds3, a1, a22);
      },
      polyline(a1, a22, points) {
        const intersections = [];
        for (let i6 = 1; i6 < points.length + 1; i6++) {
          const int = _Intersect.lineSegment.lineSegment(a1, a22, points[i6 - 1], points[i6 % points.length]);
          if (int) {
            intersections.push(int);
          }
        }
        return intersections;
      }
    };
    Intersect6.rectangle = {
      ray(point, size, origin, direction) {
        const sideIntersections = Utils24.getRectangleSides(point, size).reduce((acc, [message, [a1, a22]]) => {
          const intersection = _Intersect.ray.lineSegment(origin, direction, a1, a22);
          if (intersection) {
            acc.push(getIntersection(message, ...intersection.points));
          }
          return acc;
        }, []);
        return sideIntersections.filter((int) => int.didIntersect);
      },
      lineSegment(point, size, a1, a22) {
        const sideIntersections = Utils24.getRectangleSides(point, size).reduce((acc, [message, [b1, b22]]) => {
          const intersection = _Intersect.lineSegment.lineSegment(a1, a22, b1, b22);
          if (intersection) {
            acc.push(getIntersection(message, ...intersection.points));
          }
          return acc;
        }, []);
        return sideIntersections.filter((int) => int.didIntersect);
      },
      rectangle(point1, size1, point2, size2) {
        const sideIntersections = Utils24.getRectangleSides(point1, size1).reduce((acc, [message, [a1, a22]]) => {
          const intersections = _Intersect.rectangle.lineSegment(point2, size2, a1, a22);
          acc.push(...intersections.map((int) => getIntersection(`${message} ${int.message}`, ...int.points)));
          return acc;
        }, []);
        return sideIntersections.filter((int) => int.didIntersect);
      },
      arc(point, size, center, radius, start, end) {
        const sideIntersections = Utils24.getRectangleSides(point, size).reduce((acc, [message, [a1, a22]]) => {
          const intersection = _Intersect.arc.lineSegment(center, radius, start, end, a1, a22);
          if (intersection) {
            acc.push({...intersection, message});
          }
          return acc;
        }, []);
        return sideIntersections.filter((int) => int.didIntersect);
      },
      circle(point, size, c7, r11) {
        const sideIntersections = Utils24.getRectangleSides(point, size).reduce((acc, [message, [a1, a22]]) => {
          const intersection = _Intersect.lineSegment.circle(a1, a22, c7, r11);
          if (intersection) {
            acc.push({...intersection, message});
          }
          return acc;
        }, []);
        return sideIntersections.filter((int) => int.didIntersect);
      },
      ellipse(point, size, c7, rx, ry, rotation = 0) {
        const sideIntersections = Utils24.getRectangleSides(point, size).reduce((acc, [message, [a1, a22]]) => {
          const intersection = _Intersect.lineSegment.ellipse(a1, a22, c7, rx, ry, rotation);
          if (intersection) {
            acc.push({...intersection, message});
          }
          return acc;
        }, []);
        return sideIntersections.filter((int) => int.didIntersect);
      },
      bounds(point, size, bounds3) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.rectangle.rectangle(point, size, [minX, minY], [width, height]);
      },
      polyline(point, size, points) {
        const sideIntersections = Utils24.getRectangleSides(point, size).reduce((acc, [message, [a1, a22]]) => {
          const intersections = _Intersect.lineSegment.polyline(a1, a22, points);
          if (intersections.length > 0) {
            acc.push(getIntersection(message, ...intersections.flatMap((i6) => i6.points)));
          }
          return acc;
        }, []);
        return sideIntersections.filter((int) => int.didIntersect);
      }
    };
    Intersect6.arc = {
      lineSegment(center, radius, start, end, a1, a22) {
        return _Intersect.lineSegment.arc(a1, a22, center, radius, start, end);
      },
      rectangle(center, radius, start, end, point, size) {
        return _Intersect.rectangle.arc(point, size, center, radius, start, end);
      },
      bounds(center, radius, start, end, bounds3) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.arc.rectangle(center, radius, start, end, [minX, minY], [width, height]);
      }
    };
    Intersect6.circle = {
      lineSegment(c7, r11, a1, a22) {
        return _Intersect.lineSegment.circle(a1, a22, c7, r11);
      },
      circle(c1, r1, c22, r22) {
        let dx = c22[0] - c1[0], dy = c22[1] - c1[1];
        const d8 = Math.sqrt(dx * dx + dy * dy), x6 = (d8 * d8 - r22 * r22 + r1 * r1) / (2 * d8), y5 = Math.sqrt(r1 * r1 - x6 * x6);
        dx /= d8;
        dy /= d8;
        return getIntersection("intersection", [c1[0] + dx * x6 - dy * y5, c1[1] + dy * x6 + dx * y5], [c1[0] + dx * x6 + dy * y5, c1[1] + dy * x6 - dx * y5]);
      },
      rectangle(c7, r11, point, size) {
        return _Intersect.rectangle.circle(point, size, c7, r11);
      },
      bounds(c7, r11, bounds3) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.circle.rectangle(c7, r11, [minX, minY], [width, height]);
      }
    };
    Intersect6.ellipse = {
      ray(center, rx, ry, rotation, point, direction) {
        return _Intersect.ray.ellipse(point, direction, center, rx, ry, rotation);
      },
      lineSegment(center, rx, ry, rotation = 0, a1, a22) {
        if (rx === ry) {
          return _Intersect.lineSegment.circle(a1, a22, center, rx);
        }
        return _Intersect.lineSegment.ellipse(a1, a22, center, rx, ry, rotation);
      },
      rectangle(center, rx, ry, rotation = 0, point, size) {
        if (rx === ry) {
          return _Intersect.rectangle.circle(point, size, center, rx);
        }
        return _Intersect.rectangle.ellipse(point, size, center, rx, ry, rotation);
      },
      ellipse(_c1, _rx1, _ry1, _r1, _c2, _rx2, _ry2, _r2) {
        return getIntersection("no intersection");
      },
      circle(c7, rx, ry, rotation, c22, r22) {
        return _Intersect.ellipse.ellipse(c7, rx, ry, rotation, c22, r22, r22, 0);
      },
      bounds(c7, rx, ry, rotation, bounds3) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.ellipse.rectangle(c7, rx, ry, rotation, [minX, minY], [width, height]);
      }
    };
    Intersect6.bounds = {
      ray(bounds3, origin, direction) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.ray.rectangle(origin, direction, [minX, minY], [width, height]);
      },
      lineSegment(bounds3, a1, a22) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.lineSegment.rectangle(a1, a22, [minX, minY], [width, height]);
      },
      rectangle(bounds3, point, size) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.rectangle.rectangle(point, size, [minX, minY], [width, height]);
      },
      bounds(bounds1, bounds22) {
        return _Intersect.rectangle.rectangle([bounds1.minX, bounds1.minY], [bounds1.width, bounds1.height], [bounds22.minX, bounds22.minY], [bounds22.width, bounds22.height]);
      },
      arc(bounds3, center, radius, start, end) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.arc.rectangle(center, radius, start, end, [minX, minY], [width, height]);
      },
      circle(bounds3, c7, r11) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.circle.rectangle(c7, r11, [minX, minY], [width, height]);
      },
      ellipse(bounds3, c7, rx, ry, rotation = 0) {
        const {minX, minY, width, height} = bounds3;
        return _Intersect.ellipse.rectangle(c7, rx, ry, rotation, [minX, minY], [width, height]);
      },
      polyline(bounds3, points) {
        return _Intersect.polyline.bounds(points, bounds3);
      }
    };
    Intersect6.polyline = {
      lineSegment(points, a1, a22) {
        return _Intersect.lineSegment.polyline(a1, a22, points);
      },
      rectangle(points, point, size) {
        return _Intersect.rectangle.polyline(point, size, points);
      },
      bounds(points, bounds3) {
        return _Intersect.rectangle.polyline([bounds3.minX, bounds3.minY], [bounds3.width, bounds3.height], points);
      }
    };
    var _Svg = class {
    };
    var Svg = _Svg;
    Svg.ellipse = (A3, r11) => {
      return `M ${A3[0] - r11},${A3[1]}
      a ${r11},${r11} 0 1,0 ${r11 * 2},0
      a ${r11},${r11} 0 1,0 -${r11 * 2},0 `;
    };
    Svg.moveTo = (v6) => {
      return `M ${v6[0]},${v6[1]} `;
    };
    Svg.lineTo = (v6) => {
      return `L ${v6[0]},${v6[1]} `;
    };
    Svg.line = (a6, ...pts) => {
      return _Svg.moveTo(a6) + pts.map((p8) => _Svg.lineTo(p8)).join();
    };
    Svg.hLineTo = (v6) => {
      return `H ${v6[0]},${v6[1]} `;
    };
    Svg.vLineTo = (v6) => {
      return `V ${v6[0]},${v6[1]} `;
    };
    Svg.bezierTo = (A3, B3, C6) => {
      return `C ${A3[0]},${A3[1]} ${B3[0]},${B3[1]} ${C6[0]},${C6[1]} `;
    };
    Svg.arcTo = (C6, r11, A3, B3) => {
      return [
        _Svg.moveTo(A3),
        "A",
        r11,
        r11,
        0,
        Utils24.getSweep(C6, A3, B3) > 0 ? "1" : "0",
        0,
        B3[0],
        B3[1]
      ].join(" ");
    };
    Svg.closePath = () => {
      return "Z";
    };
    Svg.rectTo = (A3) => {
      return ["R", A3[0], A3[1]].join(" ");
    };
    Svg.getPointAtLength = (path, length) => {
      const point = path.getPointAtLength(length);
      return [point.x, point.y];
    };
    var utils_default = Utils24;
    var import_react8 = __toModule2(require("react"));
    function addV(v1, v22) {
      return v1.map(function(v6, i6) {
        return v6 + v22[i6];
      });
    }
    function subV(v1, v22) {
      return v1.map(function(v6, i6) {
        return v6 - v22[i6];
      });
    }
    function calculateDistance(movement) {
      return Math.hypot.apply(Math, movement);
    }
    function calculateAllGeometry(movement, delta) {
      if (delta === void 0) {
        delta = movement;
      }
      var dl = calculateDistance(delta);
      var alpha = dl === 0 ? 0 : 1 / dl;
      var direction = delta.map(function(v6) {
        return alpha * v6;
      });
      var distance = calculateDistance(movement);
      return {
        distance,
        direction
      };
    }
    function calculateAllKinematics(movement, delta, dt) {
      var dl = calculateDistance(delta);
      var alpha = dl === 0 ? 0 : 1 / dl;
      var beta = dt === 0 ? 0 : 1 / dt;
      var velocity = beta * dl;
      var velocities = delta.map(function(v6) {
        return beta * v6;
      });
      var direction = delta.map(function(v6) {
        return alpha * v6;
      });
      var distance = calculateDistance(movement);
      return {
        velocities,
        velocity,
        distance,
        direction
      };
    }
    function sign(x6) {
      if (Math.sign)
        return Math.sign(x6);
      return Number(x6 > 0) - Number(x6 < 0) || +x6;
    }
    function minMax(value, min2, max) {
      return Math.max(min2, Math.min(value, max));
    }
    function rubberband2(distance, constant) {
      return Math.pow(distance, constant * 5);
    }
    function rubberband(distance, dimension, constant) {
      if (dimension === 0 || Math.abs(dimension) === Infinity)
        return rubberband2(distance, constant);
      return distance * dimension * constant / (dimension + constant * distance);
    }
    function rubberbandIfOutOfBounds(position, min2, max, constant) {
      if (constant === void 0) {
        constant = 0.15;
      }
      if (constant === 0)
        return minMax(position, min2, max);
      if (position < min2)
        return -rubberband(min2 - position, max - min2, constant) + min2;
      if (position > max)
        return +rubberband(position - max, max - min2, constant) + max;
      return position;
    }
    function _defineProperties(target, props) {
      for (var i6 = 0; i6 < props.length; i6++) {
        var descriptor = props[i6];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor)
          descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps)
        _defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        _defineProperties(Constructor, staticProps);
      return Constructor;
    }
    function _extends2() {
      _extends2 = Object.assign || function(target) {
        for (var i6 = 1; i6 < arguments.length; i6++) {
          var source = arguments[i6];
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      };
      return _extends2.apply(this, arguments);
    }
    function _inheritsLoose(subClass, superClass) {
      subClass.prototype = Object.create(superClass.prototype);
      subClass.prototype.constructor = subClass;
      subClass.__proto__ = superClass;
    }
    function _objectWithoutPropertiesLoose2(source, excluded) {
      if (source == null)
        return {};
      var target = {};
      var sourceKeys = Object.keys(source);
      var key, i6;
      for (i6 = 0; i6 < sourceKeys.length; i6++) {
        key = sourceKeys[i6];
        if (excluded.indexOf(key) >= 0)
          continue;
        target[key] = source[key];
      }
      return target;
    }
    function _assertThisInitialized(self2) {
      if (self2 === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return self2;
    }
    function _unsupportedIterableToArray(o13, minLen) {
      if (!o13)
        return;
      if (typeof o13 === "string")
        return _arrayLikeToArray(o13, minLen);
      var n5 = Object.prototype.toString.call(o13).slice(8, -1);
      if (n5 === "Object" && o13.constructor)
        n5 = o13.constructor.name;
      if (n5 === "Map" || n5 === "Set")
        return Array.from(o13);
      if (n5 === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n5))
        return _arrayLikeToArray(o13, minLen);
    }
    function _arrayLikeToArray(arr, len3) {
      if (len3 == null || len3 > arr.length)
        len3 = arr.length;
      for (var i6 = 0, arr2 = new Array(len3); i6 < len3; i6++)
        arr2[i6] = arr[i6];
      return arr2;
    }
    function _createForOfIteratorHelperLoose(o13, allowArrayLike) {
      var it;
      if (typeof Symbol === "undefined" || o13[Symbol.iterator] == null) {
        if (Array.isArray(o13) || (it = _unsupportedIterableToArray(o13)) || allowArrayLike && o13 && typeof o13.length === "number") {
          if (it)
            o13 = it;
          var i6 = 0;
          return function() {
            if (i6 >= o13.length)
              return {
                done: true
              };
            return {
              done: false,
              value: o13[i6++]
            };
          };
        }
        throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }
      it = o13[Symbol.iterator]();
      return it.next.bind(it);
    }
    function noop() {
    }
    function chainFns() {
      for (var _len = arguments.length, fns = new Array(_len), _key = 0; _key < _len; _key++) {
        fns[_key] = arguments[_key];
      }
      if (fns.length === 0)
        return noop;
      if (fns.length === 1)
        return fns[0];
      return function() {
        var result;
        for (var _iterator = _createForOfIteratorHelperLoose(fns), _step; !(_step = _iterator()).done; ) {
          var fn = _step.value;
          result = fn.apply(this, arguments) || result;
        }
        return result;
      };
    }
    function ensureVector(value, fallback) {
      if (value === void 0) {
        if (fallback === void 0) {
          throw new Error("Must define fallback value if undefined is expected");
        }
        value = fallback;
      }
      if (Array.isArray(value))
        return value;
      return [value, value];
    }
    function assignDefault(value, fallback) {
      return Object.assign({}, fallback, value || {});
    }
    function valueFn(v6) {
      if (typeof v6 === "function") {
        for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }
        return v6.apply(void 0, args);
      } else {
        return v6;
      }
    }
    function resolveWith(config, resolvers) {
      if (config === void 0) {
        config = {};
      }
      var result = {};
      for (var _i = 0, _Object$entries = Object.entries(resolvers); _i < _Object$entries.length; _i++) {
        var _Object$entries$_i = _Object$entries[_i], key = _Object$entries$_i[0], resolver = _Object$entries$_i[1];
        switch (typeof resolver) {
          case "function":
            result[key] = resolver.call(result, config[key], key, config);
            break;
          case "object":
            result[key] = resolveWith(config[key], resolver);
            break;
          case "boolean":
            if (resolver)
              result[key] = config[key];
            break;
        }
      }
      return result;
    }
    function supportsGestureEvents() {
      try {
        return "constructor" in GestureEvent;
      } catch (e14) {
        return false;
      }
    }
    function supportsTouchEvents() {
      return typeof window !== "undefined" && "ontouchstart" in window;
    }
    function getEventTouches(event) {
      if ("pointerId" in event)
        return null;
      return event.type === "touchend" ? event.changedTouches : event.targetTouches;
    }
    function getTouchIds(event) {
      return Array.from(getEventTouches(event)).map(function(t14) {
        return t14.identifier;
      });
    }
    function getGenericEventData(event) {
      var buttons = "buttons" in event ? event.buttons : 0;
      var shiftKey = event.shiftKey, altKey = event.altKey, metaKey = event.metaKey, ctrlKey = event.ctrlKey;
      return {
        buttons,
        shiftKey,
        altKey,
        metaKey,
        ctrlKey
      };
    }
    var identity = function identity2(xy) {
      return xy;
    };
    function getTwoTouchesEventValues(event, pointerIds, transform) {
      if (transform === void 0) {
        transform = identity;
      }
      var _Array$from$filter = Array.from(event.touches).filter(function(t14) {
        return pointerIds.includes(t14.identifier);
      }), A3 = _Array$from$filter[0], B3 = _Array$from$filter[1];
      if (!A3 || !B3)
        throw Error("The event doesn't have two pointers matching the pointerIds");
      var dx = B3.clientX - A3.clientX;
      var dy = B3.clientY - A3.clientY;
      var cx = (B3.clientX + A3.clientX) / 2;
      var cy = (B3.clientY + A3.clientY) / 2;
      var distance = Math.hypot(dx, dy);
      var angle = -(Math.atan2(dx, dy) * 180) / Math.PI;
      var values = transform([distance, angle]);
      var origin = transform([cx, cy]);
      return {
        values,
        origin
      };
    }
    var LINE_HEIGHT = 40;
    var PAGE_HEIGHT = 800;
    function getWheelEventValues(event, transform) {
      if (transform === void 0) {
        transform = identity;
      }
      var deltaX = event.deltaX, deltaY = event.deltaY, deltaMode = event.deltaMode;
      if (deltaMode === 1) {
        deltaX *= LINE_HEIGHT;
        deltaY *= LINE_HEIGHT;
      } else if (deltaMode === 2) {
        deltaX *= PAGE_HEIGHT;
        deltaY *= PAGE_HEIGHT;
      }
      return transform([deltaX, deltaY]);
    }
    function getWebkitGestureEventValues(event, transform) {
      if (transform === void 0) {
        transform = identity;
      }
      return transform([event.scale, event.rotation]);
    }
    var DEFAULT_RUBBERBAND = 0.15;
    var InternalGestureOptionsNormalizers = {
      threshold: function threshold(value) {
        if (value === void 0) {
          value = 0;
        }
        return ensureVector(value);
      },
      rubberband: function rubberband3(value) {
        if (value === void 0) {
          value = 0;
        }
        switch (value) {
          case true:
            return ensureVector(DEFAULT_RUBBERBAND);
          case false:
            return ensureVector(0);
          default:
            return ensureVector(value);
        }
      },
      enabled: function enabled(value) {
        if (value === void 0) {
          value = true;
        }
        return value;
      },
      triggerAllEvents: function triggerAllEvents(value) {
        if (value === void 0) {
          value = false;
        }
        return value;
      },
      initial: function initial(value) {
        if (value === void 0) {
          value = 0;
        }
        if (typeof value === "function")
          return value;
        return ensureVector(value);
      },
      transform: true
    };
    var InternalCoordinatesOptionsNormalizers = /* @__PURE__ */ _extends2({}, InternalGestureOptionsNormalizers, {
      axis: true,
      lockDirection: function lockDirection(value) {
        if (value === void 0) {
          value = false;
        }
        return value;
      },
      bounds: function bounds(value) {
        if (value === void 0) {
          value = {};
        }
        if (typeof value === "function")
          return function(state) {
            return InternalCoordinatesOptionsNormalizers.bounds(value(state));
          };
        var _value2 = value, _value2$left = _value2.left, left = _value2$left === void 0 ? -Infinity : _value2$left, _value2$right = _value2.right, right = _value2$right === void 0 ? Infinity : _value2$right, _value2$top = _value2.top, top = _value2$top === void 0 ? -Infinity : _value2$top, _value2$bottom = _value2.bottom, bottom = _value2$bottom === void 0 ? Infinity : _value2$bottom;
        return [[left, right], [top, bottom]];
      }
    });
    var isBrowser = typeof window !== "undefined" && window.document && window.document.createElement;
    var InternalGenericOptionsNormalizers = {
      enabled: function enabled2(value) {
        if (value === void 0) {
          value = true;
        }
        return value;
      },
      domTarget: true,
      window: /* @__PURE__ */ function(_window) {
        function window2(_x) {
          return _window.apply(this, arguments);
        }
        window2.toString = function() {
          return _window.toString();
        };
        return window2;
      }(function(value) {
        if (value === void 0) {
          value = isBrowser ? window : void 0;
        }
        return value;
      }),
      eventOptions: function eventOptions(_temp) {
        var _ref = _temp === void 0 ? {} : _temp, _ref$passive = _ref.passive, passive = _ref$passive === void 0 ? true : _ref$passive, _ref$capture = _ref.capture, capture = _ref$capture === void 0 ? false : _ref$capture;
        return {
          passive,
          capture
        };
      },
      transform: true
    };
    var InternalDistanceAngleOptionsNormalizers = /* @__PURE__ */ _extends2({}, InternalGestureOptionsNormalizers, {
      bounds: function bounds2(_value, _key, _ref2) {
        var _ref2$distanceBounds = _ref2.distanceBounds, distanceBounds = _ref2$distanceBounds === void 0 ? {} : _ref2$distanceBounds, _ref2$angleBounds = _ref2.angleBounds, angleBounds = _ref2$angleBounds === void 0 ? {} : _ref2$angleBounds;
        var _distanceBounds = function _distanceBounds2(state) {
          var D4 = assignDefault(valueFn(distanceBounds, state), {
            min: -Infinity,
            max: Infinity
          });
          return [D4.min, D4.max];
        };
        var _angleBounds = function _angleBounds2(state) {
          var A3 = assignDefault(valueFn(angleBounds, state), {
            min: -Infinity,
            max: Infinity
          });
          return [A3.min, A3.max];
        };
        if (typeof distanceBounds !== "function" && typeof angleBounds !== "function")
          return [_distanceBounds(), _angleBounds()];
        return function(state) {
          return [_distanceBounds(state), _angleBounds(state)];
        };
      }
    });
    function getInternalGenericOptions(config) {
      if (config === void 0) {
        config = {};
      }
      return resolveWith(config, InternalGenericOptionsNormalizers);
    }
    function getInternalCoordinatesOptions(config) {
      if (config === void 0) {
        config = {};
      }
      return resolveWith(config, InternalCoordinatesOptionsNormalizers);
    }
    function getInternalDistanceAngleOptions(config) {
      if (config === void 0) {
        config = {};
      }
      return resolveWith(config, InternalDistanceAngleOptionsNormalizers);
    }
    function _buildPinchConfig(_ref4) {
      var domTarget = _ref4.domTarget, eventOptions2 = _ref4.eventOptions, window2 = _ref4.window, enabled3 = _ref4.enabled, rest = _objectWithoutPropertiesLoose2(_ref4, ["domTarget", "eventOptions", "window", "enabled"]);
      var opts = getInternalGenericOptions({
        domTarget,
        eventOptions: eventOptions2,
        window: window2,
        enabled: enabled3
      });
      opts.pinch = getInternalDistanceAngleOptions(rest);
      return opts;
    }
    function _buildWheelConfig(_ref6) {
      var domTarget = _ref6.domTarget, eventOptions2 = _ref6.eventOptions, window2 = _ref6.window, enabled3 = _ref6.enabled, rest = _objectWithoutPropertiesLoose2(_ref6, ["domTarget", "eventOptions", "window", "enabled"]);
      var opts = getInternalGenericOptions({
        domTarget,
        eventOptions: eventOptions2,
        window: window2,
        enabled: enabled3
      });
      opts.wheel = getInternalCoordinatesOptions(rest);
      return opts;
    }
    function getInitial(mixed) {
      return _extends2({
        _active: false,
        _blocked: false,
        _intentional: [false, false],
        _movement: [0, 0],
        _initial: [0, 0],
        _bounds: [[-Infinity, Infinity], [-Infinity, Infinity]],
        _threshold: [0, 0],
        _lastEventType: void 0,
        _dragStarted: false,
        _dragPreventScroll: false,
        _dragIsTap: true,
        _dragDelayed: false,
        event: void 0,
        intentional: false,
        values: [0, 0],
        velocities: [0, 0],
        delta: [0, 0],
        movement: [0, 0],
        offset: [0, 0],
        lastOffset: [0, 0],
        direction: [0, 0],
        initial: [0, 0],
        previous: [0, 0],
        first: false,
        last: false,
        active: false,
        timeStamp: 0,
        startTime: 0,
        elapsedTime: 0,
        cancel: noop,
        canceled: false,
        memo: void 0,
        args: void 0
      }, mixed);
    }
    function getInitialState() {
      var shared = {
        hovering: false,
        scrolling: false,
        wheeling: false,
        dragging: false,
        moving: false,
        pinching: false,
        touches: 0,
        buttons: 0,
        down: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        ctrlKey: false,
        locked: false
      };
      var drag = getInitial({
        _pointerId: void 0,
        axis: void 0,
        xy: [0, 0],
        vxvy: [0, 0],
        velocity: 0,
        distance: 0,
        tap: false,
        swipe: [0, 0]
      });
      var pinch = getInitial({
        _pointerIds: [],
        da: [0, 0],
        vdva: [0, 0],
        origin: void 0,
        turns: 0
      });
      var wheel = getInitial({
        axis: void 0,
        xy: [0, 0],
        vxvy: [0, 0],
        velocity: 0,
        distance: 0
      });
      var move2 = getInitial({
        axis: void 0,
        xy: [0, 0],
        vxvy: [0, 0],
        velocity: 0,
        distance: 0
      });
      var scroll = getInitial({
        axis: void 0,
        xy: [0, 0],
        vxvy: [0, 0],
        velocity: 0,
        distance: 0
      });
      return {
        shared,
        drag,
        pinch,
        wheel,
        move: move2,
        scroll
      };
    }
    var RecognizersMap = /* @__PURE__ */ new Map();
    var identity$1 = function identity3(xy) {
      return xy;
    };
    var Recognizer = /* @__PURE__ */ function() {
      function Recognizer2(controller, args) {
        var _this = this;
        if (args === void 0) {
          args = [];
        }
        this.controller = controller;
        this.args = args;
        this.debounced = true;
        this.setTimeout = function(callback, ms) {
          var _window;
          if (ms === void 0) {
            ms = 140;
          }
          clearTimeout(_this.controller.timeouts[_this.stateKey]);
          for (var _len = arguments.length, args2 = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
            args2[_key - 2] = arguments[_key];
          }
          _this.controller.timeouts[_this.stateKey] = (_window = window).setTimeout.apply(_window, [callback, ms].concat(args2));
        };
        this.clearTimeout = function() {
          clearTimeout(_this.controller.timeouts[_this.stateKey]);
        };
        this.fireGestureHandler = function(forceFlag) {
          if (forceFlag === void 0) {
            forceFlag = false;
          }
          if (_this.state._blocked) {
            if (!_this.debounced) {
              _this.state._active = false;
              _this.clean();
            }
            return null;
          }
          if (!forceFlag && !_this.state.intentional && !_this.config.triggerAllEvents)
            return null;
          if (_this.state.intentional) {
            var prev_active = _this.state.active;
            var next_active = _this.state._active;
            _this.state.active = next_active;
            _this.state.first = next_active && !prev_active;
            _this.state.last = prev_active && !next_active;
            _this.controller.state.shared[_this.ingKey] = next_active;
          }
          var touches = _this.controller.pointerIds.size || _this.controller.touchIds.size;
          var down = _this.controller.state.shared.buttons > 0 || touches > 0;
          var state = _extends2({}, _this.controller.state.shared, _this.state, _this.mapStateValues(_this.state), {
            locked: !!document.pointerLockElement,
            touches,
            down
          });
          var newMemo = _this.handler(state);
          _this.state.memo = newMemo !== void 0 ? newMemo : _this.state.memo;
          return state;
        };
        this.controller = controller;
        this.args = args;
      }
      var _proto = Recognizer2.prototype;
      _proto.updateSharedState = function updateSharedState(sharedState) {
        Object.assign(this.controller.state.shared, sharedState);
      };
      _proto.updateGestureState = function updateGestureState(gestureState) {
        Object.assign(this.state, gestureState);
      };
      _proto.checkIntentionality = function checkIntentionality(_intentional, _movement) {
        return {
          _intentional,
          _blocked: false
        };
      };
      _proto.getMovement = function getMovement(values) {
        var rubberband4 = this.config.rubberband;
        var _this$state = this.state, _bounds = _this$state._bounds, _initial = _this$state._initial, _active = _this$state._active, wasIntentional = _this$state._intentional, lastOffset = _this$state.lastOffset, prevMovement = _this$state.movement, _T = _this$state._threshold;
        var M3 = this.getInternalMovement(values, this.state);
        var i0 = wasIntentional[0] === false ? getIntentionalDisplacement(M3[0], _T[0]) : wasIntentional[0];
        var i1 = wasIntentional[1] === false ? getIntentionalDisplacement(M3[1], _T[1]) : wasIntentional[1];
        var intentionalityCheck = this.checkIntentionality([i0, i1], M3);
        if (intentionalityCheck._blocked) {
          return _extends2({}, intentionalityCheck, {
            _movement: M3,
            delta: [0, 0]
          });
        }
        var _intentional = intentionalityCheck._intentional;
        var _movement = M3;
        var movement = [_intentional[0] !== false ? M3[0] - _intentional[0] : 0, _intentional[1] !== false ? M3[1] - _intentional[1] : 0];
        var offset = addV(movement, lastOffset);
        var _rubberband = _active ? rubberband4 : [0, 0];
        movement = computeRubberband(_bounds, addV(movement, _initial), _rubberband);
        return _extends2({}, intentionalityCheck, {
          intentional: _intentional[0] !== false || _intentional[1] !== false,
          _initial,
          _movement,
          movement,
          values,
          offset: computeRubberband(_bounds, offset, _rubberband),
          delta: subV(movement, prevMovement)
        });
      };
      _proto.clean = function clean() {
        this.clearTimeout();
      };
      _createClass(Recognizer2, [{
        key: "config",
        get: function get() {
          return this.controller.config[this.stateKey];
        }
      }, {
        key: "enabled",
        get: function get() {
          return this.controller.config.enabled && this.config.enabled;
        }
      }, {
        key: "state",
        get: function get() {
          return this.controller.state[this.stateKey];
        }
      }, {
        key: "handler",
        get: function get() {
          return this.controller.handlers[this.stateKey];
        }
      }, {
        key: "transform",
        get: function get() {
          return this.config.transform || this.controller.config.transform || identity$1;
        }
      }]);
      return Recognizer2;
    }();
    function getIntentionalDisplacement(movement, threshold2) {
      if (Math.abs(movement) >= threshold2) {
        return sign(movement) * threshold2;
      } else {
        return false;
      }
    }
    function computeRubberband(bounds3, _ref, _ref2) {
      var Vx = _ref[0], Vy = _ref[1];
      var Rx = _ref2[0], Ry = _ref2[1];
      var _bounds$ = bounds3[0], X1 = _bounds$[0], X2 = _bounds$[1], _bounds$2 = bounds3[1], Y1 = _bounds$2[0], Y22 = _bounds$2[1];
      return [rubberbandIfOutOfBounds(Vx, X1, X2, Rx), rubberbandIfOutOfBounds(Vy, Y1, Y22, Ry)];
    }
    function getGenericPayload(_ref3, event, isStartEvent) {
      var state = _ref3.state;
      var timeStamp = event.timeStamp, _lastEventType = event.type;
      var previous = state.values;
      var elapsedTime = isStartEvent ? 0 : timeStamp - state.startTime;
      return {
        _lastEventType,
        event,
        timeStamp,
        elapsedTime,
        previous
      };
    }
    function getStartGestureState(_ref4, values, event, initial2) {
      var state = _ref4.state, config = _ref4.config, stateKey = _ref4.stateKey, args = _ref4.args, transform = _ref4.transform;
      var offset = state.offset;
      var startTime = event.timeStamp;
      var initialFn = config.initial, bounds3 = config.bounds, threshold2 = config.threshold;
      var _threshold = subV(transform(threshold2), transform([0, 0])).map(Math.abs);
      var _state = _extends2({}, getInitialState()[stateKey], {
        _active: true,
        args,
        values,
        initial: initial2 != null ? initial2 : values,
        _threshold,
        offset,
        lastOffset: offset,
        startTime
      });
      return _extends2({}, _state, {
        _initial: valueFn(initialFn, _state),
        _bounds: valueFn(bounds3, _state)
      });
    }
    var Controller = function Controller2(classes) {
      var _this = this;
      this.classes = classes;
      this.pointerIds = new Set();
      this.touchIds = new Set();
      this.supportsTouchEvents = supportsTouchEvents();
      this.supportsGestureEvents = supportsGestureEvents();
      this.bind = function() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        var bindings = {};
        for (var _iterator = _createForOfIteratorHelperLoose(_this.classes), _step; !(_step = _iterator()).done; ) {
          var RecognizerClass = _step.value;
          new RecognizerClass(_this, args).addBindings(bindings);
        }
        var _loop = function _loop2(eventKey2) {
          addBindings(bindings, eventKey2, function(event) {
            return _this.nativeRefs[eventKey2](_extends2({}, _this.state.shared, {
              event,
              args
            }));
          });
        };
        for (var eventKey in _this.nativeRefs) {
          _loop(eventKey);
        }
        if (_this.config.domTarget) {
          return updateDomListeners(_this, bindings);
        } else {
          return getPropsListener(_this, bindings);
        }
      };
      this.effect = function() {
        if (_this.config.domTarget)
          _this.bind();
        return _this.clean;
      };
      this.clean = function() {
        var domTarget = getDomTargetFromConfig(_this.config);
        var eventOptions2 = _this.config.eventOptions;
        if (domTarget)
          removeListeners(domTarget, takeAll(_this.domListeners), eventOptions2);
        Object.values(_this.timeouts).forEach(clearTimeout);
        clearAllWindowListeners(_this);
      };
      this.classes = classes;
      this.state = getInitialState();
      this.timeouts = {};
      this.domListeners = [];
      this.windowListeners = {};
    };
    function addEventIds(controller, event) {
      if ("pointerId" in event) {
        controller.pointerIds.add(event.pointerId);
      } else {
        controller.touchIds = new Set(getTouchIds(event));
      }
    }
    function removeEventIds(controller, event) {
      if ("pointerId" in event) {
        controller.pointerIds["delete"](event.pointerId);
      } else {
        getTouchIds(event).forEach(function(id) {
          return controller.touchIds["delete"](id);
        });
      }
    }
    function clearAllWindowListeners(controller) {
      var _controller$config = controller.config, el = _controller$config.window, eventOptions2 = _controller$config.eventOptions, windowListeners = controller.windowListeners;
      if (!el)
        return;
      for (var stateKey in windowListeners) {
        var handlers = windowListeners[stateKey];
        removeListeners(el, handlers, eventOptions2);
      }
      controller.windowListeners = {};
    }
    function updateDomListeners(_ref3, bindings) {
      var config = _ref3.config, domListeners = _ref3.domListeners;
      var domTarget = getDomTargetFromConfig(config);
      if (!domTarget)
        throw new Error("domTarget must be defined");
      var eventOptions2 = config.eventOptions;
      removeListeners(domTarget, takeAll(domListeners), eventOptions2);
      for (var _i = 0, _Object$entries = Object.entries(bindings); _i < _Object$entries.length; _i++) {
        var _Object$entries$_i = _Object$entries[_i], key = _Object$entries$_i[0], fns = _Object$entries$_i[1];
        var name = key.slice(2).toLowerCase();
        domListeners.push([name, chainFns.apply(void 0, fns)]);
      }
      addListeners(domTarget, domListeners, eventOptions2);
    }
    function getPropsListener(_ref4, bindings) {
      var config = _ref4.config;
      var props = {};
      var captureString = config.eventOptions.capture ? "Capture" : "";
      for (var _i2 = 0, _Object$entries2 = Object.entries(bindings); _i2 < _Object$entries2.length; _i2++) {
        var _Object$entries2$_i = _Object$entries2[_i2], event = _Object$entries2$_i[0], fns = _Object$entries2$_i[1];
        var fnsArray = Array.isArray(fns) ? fns : [fns];
        var key = event + captureString;
        props[key] = chainFns.apply(void 0, fnsArray);
      }
      return props;
    }
    function takeAll(array) {
      if (array === void 0) {
        array = [];
      }
      return array.splice(0, array.length);
    }
    function getDomTargetFromConfig(_ref5) {
      var domTarget = _ref5.domTarget;
      return domTarget && "current" in domTarget ? domTarget.current : domTarget;
    }
    function addBindings(bindings, name, fn) {
      if (!bindings[name])
        bindings[name] = [];
      bindings[name].push(fn);
    }
    function addListeners(el, listeners, options) {
      if (listeners === void 0) {
        listeners = [];
      }
      if (options === void 0) {
        options = {};
      }
      for (var _iterator2 = _createForOfIteratorHelperLoose(listeners), _step2; !(_step2 = _iterator2()).done; ) {
        var _step2$value = _step2.value, eventName = _step2$value[0], eventHandler2 = _step2$value[1];
        el.addEventListener(eventName, eventHandler2, options);
      }
    }
    function removeListeners(el, listeners, options) {
      if (listeners === void 0) {
        listeners = [];
      }
      if (options === void 0) {
        options = {};
      }
      for (var _iterator3 = _createForOfIteratorHelperLoose(listeners), _step3; !(_step3 = _iterator3()).done; ) {
        var _step3$value = _step3.value, eventName = _step3$value[0], eventHandler2 = _step3$value[1];
        el.removeEventListener(eventName, eventHandler2, options);
      }
    }
    function useRecognizers(handlers, config, nativeHandlers) {
      if (nativeHandlers === void 0) {
        nativeHandlers = {};
      }
      var classes = resolveClasses(handlers);
      var controller = import_react8.default.useMemo(function() {
        return new Controller(classes);
      }, []);
      controller.config = config;
      controller.handlers = handlers;
      controller.nativeRefs = nativeHandlers;
      import_react8.default.useEffect(controller.effect, []);
      if (controller.config.domTarget)
        return deprecationNoticeForDomTarget;
      return controller.bind;
    }
    function deprecationNoticeForDomTarget() {
      if (true) {
        console.warn("Deprecation notice: When the `domTarget` option is specified, you don't need to write `useEffect(bind, [bind])` anymore: event binding is now made handled internally to this lib.\n\nNext version won't return anything when `domTarget` is provided, therefore your code will break if you try to call `useEffect`.");
      }
    }
    function resolveClasses(internalHandlers) {
      var classes = new Set();
      if (internalHandlers.drag)
        classes.add(RecognizersMap.get("drag"));
      if (internalHandlers.wheel)
        classes.add(RecognizersMap.get("wheel"));
      if (internalHandlers.scroll)
        classes.add(RecognizersMap.get("scroll"));
      if (internalHandlers.move)
        classes.add(RecognizersMap.get("move"));
      if (internalHandlers.pinch)
        classes.add(RecognizersMap.get("pinch"));
      if (internalHandlers.hover)
        classes.add(RecognizersMap.get("hover"));
      return classes;
    }
    var CoordinatesRecognizer = /* @__PURE__ */ function(_Recognizer) {
      _inheritsLoose(CoordinatesRecognizer2, _Recognizer);
      function CoordinatesRecognizer2() {
        return _Recognizer.apply(this, arguments) || this;
      }
      var _proto = CoordinatesRecognizer2.prototype;
      _proto.getInternalMovement = function getInternalMovement(values, state) {
        return subV(values, state.initial);
      };
      _proto.checkIntentionality = function checkIntentionality(_intentional, _movement) {
        if (_intentional[0] === false && _intentional[1] === false) {
          return {
            _intentional,
            axis: this.state.axis
          };
        }
        var _movement$map = _movement.map(Math.abs), absX = _movement$map[0], absY = _movement$map[1];
        var axis = this.state.axis || (absX > absY ? "x" : absX < absY ? "y" : void 0);
        if (!this.config.axis && !this.config.lockDirection)
          return {
            _intentional,
            _blocked: false,
            axis
          };
        if (!axis)
          return {
            _intentional: [false, false],
            _blocked: false,
            axis
          };
        if (!!this.config.axis && axis !== this.config.axis)
          return {
            _intentional,
            _blocked: true,
            axis
          };
        _intentional[axis === "x" ? 1 : 0] = false;
        return {
          _intentional,
          _blocked: false,
          axis
        };
      };
      _proto.getKinematics = function getKinematics(values, event) {
        var state = this.getMovement(values);
        if (!state._blocked) {
          var dt = event.timeStamp - this.state.timeStamp;
          Object.assign(state, calculateAllKinematics(state.movement, state.delta, dt));
        }
        return state;
      };
      _proto.mapStateValues = function mapStateValues(state) {
        return {
          xy: state.values,
          vxvy: state.velocities
        };
      };
      return CoordinatesRecognizer2;
    }(Recognizer);
    function memoizeOne(resultFn, isEqual22) {
      var lastThis;
      var lastArgs = [];
      var lastResult;
      var calledOnce = false;
      function memoized() {
        for (var _len = arguments.length, newArgs = new Array(_len), _key = 0; _key < _len; _key++) {
          newArgs[_key] = arguments[_key];
        }
        if (calledOnce && lastThis === this && isEqual22(newArgs, lastArgs)) {
          return lastResult;
        }
        lastResult = resultFn.apply(this, newArgs);
        calledOnce = true;
        lastThis = this;
        lastArgs = newArgs;
        return lastResult;
      }
      return memoized;
    }
    function equal(a6, b5) {
      if (a6 === b5)
        return true;
      if (a6 && b5 && typeof a6 == "object" && typeof b5 == "object") {
        if (a6.constructor !== b5.constructor)
          return false;
        var length, i6, keys;
        if (Array.isArray(a6)) {
          length = a6.length;
          if (length !== b5.length)
            return false;
          for (i6 = length; i6-- !== 0; ) {
            if (!equal(a6[i6], b5[i6]))
              return false;
          }
          return true;
        }
        var it;
        if (typeof Map === "function" && a6 instanceof Map && b5 instanceof Map) {
          if (a6.size !== b5.size)
            return false;
          it = a6.entries();
          while (!(i6 = it.next()).done) {
            if (!b5.has(i6.value[0]))
              return false;
          }
          it = a6.entries();
          while (!(i6 = it.next()).done) {
            if (!equal(i6.value[1], b5.get(i6.value[0])))
              return false;
          }
          return true;
        }
        if (typeof Set === "function" && a6 instanceof Set && b5 instanceof Set) {
          if (a6.size !== b5.size)
            return false;
          it = a6.entries();
          while (!(i6 = it.next()).done) {
            if (!b5.has(i6.value[0]))
              return false;
          }
          return true;
        }
        if (a6.constructor === RegExp)
          return a6.source === b5.source && a6.flags === b5.flags;
        if (a6.valueOf !== Object.prototype.valueOf)
          return a6.valueOf() === b5.valueOf();
        if (a6.toString !== Object.prototype.toString)
          return a6.toString() === b5.toString();
        keys = Object.keys(a6);
        length = keys.length;
        if (length !== Object.keys(b5).length)
          return false;
        for (i6 = length; i6-- !== 0; ) {
          if (!Object.prototype.hasOwnProperty.call(b5, keys[i6]))
            return false;
        }
        if (typeof Element !== "undefined" && a6 instanceof Element)
          return false;
        for (i6 = length; i6-- !== 0; ) {
          if (keys[i6] === "_owner" && a6.$$typeof)
            continue;
          if (!equal(a6[keys[i6]], b5[keys[i6]]))
            return false;
        }
        return true;
      }
      return a6 !== a6 && b5 !== b5;
    }
    function isEqual2(a6, b5) {
      try {
        return equal(a6, b5);
      } catch (error) {
        if ((error.message || "").match(/stack|recursion/i)) {
          console.warn("react-fast-compare cannot handle circular refs");
          return false;
        }
        throw error;
      }
    }
    var DistanceAngleRecognizer = /* @__PURE__ */ function(_Recognizer) {
      _inheritsLoose(DistanceAngleRecognizer2, _Recognizer);
      function DistanceAngleRecognizer2() {
        return _Recognizer.apply(this, arguments) || this;
      }
      var _proto = DistanceAngleRecognizer2.prototype;
      _proto.getInternalMovement = function getInternalMovement(values, state) {
        var prev_a = state.values[1];
        var d8 = values[0], _values$ = values[1], a6 = _values$ === void 0 ? prev_a : _values$;
        var delta_a = a6 - prev_a;
        var next_turns = state.turns;
        if (Math.abs(delta_a) > 270)
          next_turns += sign(delta_a);
        return subV([d8, a6 - 360 * next_turns], state.initial);
      };
      _proto.getKinematics = function getKinematics(values, event) {
        var state = this.getMovement(values);
        var turns = (values[1] - state._movement[1] - this.state.initial[1]) / 360;
        var dt = event.timeStamp - this.state.timeStamp;
        var _calculateAllKinemati = calculateAllKinematics(state.movement, state.delta, dt), kinematics = _objectWithoutPropertiesLoose2(_calculateAllKinemati, ["distance", "velocity"]);
        return _extends2({
          turns
        }, state, kinematics);
      };
      _proto.mapStateValues = function mapStateValues(state) {
        return {
          da: state.values,
          vdva: state.velocities
        };
      };
      return DistanceAngleRecognizer2;
    }(Recognizer);
    var ZOOM_CONSTANT = 7;
    var WEBKIT_DISTANCE_SCALE_FACTOR = 260;
    var PinchRecognizer = /* @__PURE__ */ function(_DistanceAngleRecogni) {
      _inheritsLoose(PinchRecognizer2, _DistanceAngleRecogni);
      function PinchRecognizer2() {
        var _this;
        _this = _DistanceAngleRecogni.apply(this, arguments) || this;
        _this.ingKey = "pinching";
        _this.stateKey = "pinch";
        _this.onPinchStart = function(event) {
          addEventIds(_this.controller, event);
          var touchIds = _this.controller.touchIds;
          if (!_this.enabled)
            return;
          if (_this.state._active) {
            if (_this.state._pointerIds.every(function(id) {
              return touchIds.has(id);
            }))
              return;
          }
          if (touchIds.size < 2)
            return;
          var _pointerIds = Array.from(touchIds).slice(0, 2);
          var _getTwoTouchesEventVa = getTwoTouchesEventValues(event, _pointerIds, _this.transform), values = _getTwoTouchesEventVa.values, origin = _getTwoTouchesEventVa.origin;
          _this.updateSharedState(getGenericEventData(event));
          _this.updateGestureState(_extends2({}, getStartGestureState(_assertThisInitialized(_this), values, event), getGenericPayload(_assertThisInitialized(_this), event, true), {
            _pointerIds,
            cancel: _this.onCancel,
            origin
          }));
          _this.updateGestureState(_this.getMovement(values));
          _this.fireGestureHandler();
        };
        _this.onPinchChange = function(event) {
          var _this$state = _this.state, canceled = _this$state.canceled, _active = _this$state._active;
          if (canceled || !_active || event.timeStamp === _this.state.timeStamp)
            return;
          var genericEventData = getGenericEventData(event);
          _this.updateSharedState(genericEventData);
          try {
            var _getTwoTouchesEventVa2 = getTwoTouchesEventValues(event, _this.state._pointerIds, _this.transform), values = _getTwoTouchesEventVa2.values, origin = _getTwoTouchesEventVa2.origin;
            var kinematics = _this.getKinematics(values, event);
            _this.updateGestureState(_extends2({}, getGenericPayload(_assertThisInitialized(_this), event), kinematics, {
              origin
            }));
            _this.fireGestureHandler();
          } catch (e14) {
            _this.onPinchEnd(event);
          }
        };
        _this.onPinchEnd = function(event) {
          removeEventIds(_this.controller, event);
          var pointerIds = getTouchIds(event);
          if (_this.state._pointerIds.every(function(id) {
            return !pointerIds.includes(id);
          }))
            return;
          _this.clean();
          if (!_this.state._active)
            return;
          _this.updateGestureState(_extends2({}, getGenericPayload(_assertThisInitialized(_this), event), _this.getMovement(_this.state.values), {
            _active: false
          }));
          _this.fireGestureHandler();
        };
        _this.onCancel = function() {
          if (_this.state.canceled)
            return;
          _this.updateGestureState({
            _active: false,
            canceled: true
          });
          setTimeout(function() {
            return _this.fireGestureHandler();
          }, 0);
        };
        _this.onGestureStart = function(event) {
          if (!_this.enabled)
            return;
          event.preventDefault();
          var values = getWebkitGestureEventValues(event, _this.transform);
          _this.updateSharedState(getGenericEventData(event));
          _this.updateGestureState(_extends2({}, getStartGestureState(_assertThisInitialized(_this), values, event), getGenericPayload(_assertThisInitialized(_this), event, true), {
            origin: [event.clientX, event.clientY],
            cancel: _this.onCancel
          }));
          _this.updateGestureState(_this.getMovement(values));
          _this.fireGestureHandler();
        };
        _this.onGestureChange = function(event) {
          var _this$state2 = _this.state, canceled = _this$state2.canceled, _active = _this$state2._active;
          if (canceled || !_active)
            return;
          event.preventDefault();
          var genericEventData = getGenericEventData(event);
          _this.updateSharedState(genericEventData);
          var values = getWebkitGestureEventValues(event, _this.transform);
          values[0] = (values[0] - _this.state.event.scale) * WEBKIT_DISTANCE_SCALE_FACTOR + _this.state.values[0];
          var kinematics = _this.getKinematics(values, event);
          _this.updateGestureState(_extends2({}, getGenericPayload(_assertThisInitialized(_this), event), kinematics, {
            origin: [event.clientX, event.clientY]
          }));
          _this.fireGestureHandler();
        };
        _this.onGestureEnd = function(event) {
          _this.clean();
          if (!_this.state._active)
            return;
          _this.updateGestureState(_extends2({}, getGenericPayload(_assertThisInitialized(_this), event), _this.getMovement(_this.state.values), {
            _active: false,
            origin: [event.clientX, event.clientY]
          }));
          _this.fireGestureHandler();
        };
        _this.wheelShouldRun = function(event) {
          return _this.enabled && event.ctrlKey;
        };
        _this.getWheelValuesFromEvent = function(event) {
          var _getWheelEventValues = getWheelEventValues(event, _this.transform), delta_d = _getWheelEventValues[1];
          var _this$state$values = _this.state.values, prev_d = _this$state$values[0], prev_a = _this$state$values[1];
          var _delta_d = -delta_d * ZOOM_CONSTANT;
          var d8 = prev_d + _delta_d;
          var a6 = prev_a !== void 0 ? prev_a : 0;
          return {
            values: [d8, a6],
            origin: [event.clientX, event.clientY],
            delta: [_delta_d, a6]
          };
        };
        _this.onWheel = function(event) {
          if (!_this.wheelShouldRun(event))
            return;
          _this.setTimeout(_this.onWheelEnd);
          if (!_this.state._active)
            _this.onWheelStart(event);
          else
            _this.onWheelChange(event);
        };
        _this.onWheelStart = function(event) {
          var _this$getWheelValuesF = _this.getWheelValuesFromEvent(event), values = _this$getWheelValuesF.values, delta = _this$getWheelValuesF.delta, origin = _this$getWheelValuesF.origin;
          if (event.cancelable)
            event.preventDefault();
          else if (true) {
            console.warn("To properly support zoom on trackpads, try using the `domTarget` option and `config.eventOptions.passive` set to `false`. This message will only appear in development mode.");
          }
          _this.updateSharedState(getGenericEventData(event));
          _this.updateGestureState(_extends2({}, getStartGestureState(_assertThisInitialized(_this), values, event, _this.state.values), getGenericPayload(_assertThisInitialized(_this), event, true), {
            offset: values,
            delta,
            origin
          }));
          _this.updateGestureState(_this.getMovement(values));
          _this.fireGestureHandler();
        };
        _this.onWheelChange = function(event) {
          if (event.cancelable)
            event.preventDefault();
          _this.updateSharedState(getGenericEventData(event));
          var _this$getWheelValuesF2 = _this.getWheelValuesFromEvent(event), values = _this$getWheelValuesF2.values, origin = _this$getWheelValuesF2.origin, delta = _this$getWheelValuesF2.delta;
          _this.updateGestureState(_extends2({}, getGenericPayload(_assertThisInitialized(_this), event), _this.getKinematics(values, event), {
            origin,
            delta
          }));
          _this.fireGestureHandler();
        };
        _this.onWheelEnd = function() {
          _this.clean();
          if (!_this.state._active)
            return;
          _this.state._active = false;
          _this.updateGestureState(_this.getMovement(_this.state.values));
          _this.fireGestureHandler();
        };
        return _this;
      }
      var _proto = PinchRecognizer2.prototype;
      _proto.addBindings = function addBindings$1(bindings) {
        if (this.controller.config.domTarget && !this.controller.supportsTouchEvents && this.controller.supportsGestureEvents) {
          addBindings(bindings, "onGestureStart", this.onGestureStart);
          addBindings(bindings, "onGestureChange", this.onGestureChange);
          addBindings(bindings, "onGestureEnd", this.onGestureEnd);
        } else {
          addBindings(bindings, "onTouchStart", this.onPinchStart);
          addBindings(bindings, "onTouchMove", this.onPinchChange);
          addBindings(bindings, "onTouchEnd", this.onPinchEnd);
          addBindings(bindings, "onTouchCancel", this.onPinchEnd);
          addBindings(bindings, "onWheel", this.onWheel);
        }
      };
      return PinchRecognizer2;
    }(DistanceAngleRecognizer);
    function usePinch(handler, config) {
      if (config === void 0) {
        config = {};
      }
      RecognizersMap.set("pinch", PinchRecognizer);
      var buildPinchConfig = (0, import_react8.useRef)();
      if (!buildPinchConfig.current) {
        buildPinchConfig.current = memoizeOne(_buildPinchConfig, isEqual2);
      }
      return useRecognizers({
        pinch: handler
      }, buildPinchConfig.current(config));
    }
    var WheelRecognizer = /* @__PURE__ */ function(_CoordinatesRecognize) {
      _inheritsLoose(WheelRecognizer2, _CoordinatesRecognize);
      function WheelRecognizer2() {
        var _this;
        _this = _CoordinatesRecognize.apply(this, arguments) || this;
        _this.ingKey = "wheeling";
        _this.stateKey = "wheel";
        _this.debounced = true;
        _this.handleEvent = function(event) {
          if (event.ctrlKey && "pinch" in _this.controller.handlers)
            return;
          if (!_this.enabled)
            return;
          _this.setTimeout(_this.onEnd);
          _this.updateSharedState(getGenericEventData(event));
          var values = addV(getWheelEventValues(event, _this.transform), _this.state.values);
          if (!_this.state._active) {
            _this.updateGestureState(_extends2({}, getStartGestureState(_assertThisInitialized(_this), values, event, _this.state.values), getGenericPayload(_assertThisInitialized(_this), event, true)));
            var movement = _this.getMovement(values);
            var geometry = calculateAllGeometry(movement.delta);
            _this.updateGestureState(movement);
            _this.updateGestureState(geometry);
          } else {
            _this.updateGestureState(_extends2({}, getGenericPayload(_assertThisInitialized(_this), event), _this.getKinematics(values, event)));
          }
          _this.fireGestureHandler();
        };
        _this.onEnd = function() {
          _this.clean();
          if (!_this.state._active)
            return;
          var movement = _this.getMovement(_this.state.values);
          _this.updateGestureState(movement);
          _this.updateGestureState({
            _active: false,
            velocities: [0, 0],
            velocity: 0
          });
          _this.fireGestureHandler();
        };
        return _this;
      }
      var _proto = WheelRecognizer2.prototype;
      _proto.addBindings = function addBindings$1(bindings) {
        addBindings(bindings, "onWheel", this.handleEvent);
      };
      return WheelRecognizer2;
    }(CoordinatesRecognizer);
    function useWheel(handler, config) {
      if (config === void 0) {
        config = {};
      }
      RecognizersMap.set("wheel", WheelRecognizer);
      var buildWheelConfig = (0, import_react8.useRef)();
      if (!buildWheelConfig.current) {
        buildWheelConfig.current = memoizeOne(_buildWheelConfig, isEqual2);
      }
      return useRecognizers({
        wheel: handler
      }, buildWheelConfig.current(config));
    }
    var DOUBLE_CLICK_DURATION = 250;
    var Inputs = class {
      constructor() {
        this.keys = {};
        this.pointerUpTime = 0;
        this.panStart = (e14) => {
          const {shiftKey, ctrlKey, metaKey, altKey} = e14;
          const info = {
            target: "wheel",
            pointerId: this.pointer?.pointerId || 0,
            origin: this.pointer?.origin || [0, 0],
            delta: [0, 0],
            pressure: 0.5,
            point: Inputs.getPoint(e14),
            shiftKey,
            ctrlKey,
            metaKey,
            altKey
          };
          this.pointer = info;
          return info;
        };
        this.pan = (delta, e14) => {
          if (!this.pointer || this.pointer.target !== "wheel") {
            return this.panStart(e14);
          }
          const {shiftKey, ctrlKey, metaKey, altKey} = e14;
          const prev = this.pointer;
          const point = Inputs.getPoint(e14);
          const info = {
            ...prev,
            target: "wheel",
            delta,
            point,
            shiftKey,
            ctrlKey,
            metaKey,
            altKey
          };
          this.pointer = info;
          return info;
        };
        this.canAccept = (_pointerId) => {
          return true;
        };
        this.keydown = (e14) => {
          const {shiftKey, ctrlKey, metaKey, altKey} = e14;
          this.keys[e14.key] = true;
          return {
            point: this.pointer?.point || [0, 0],
            origin: this.pointer?.origin || [0, 0],
            key: e14.key,
            keys: Object.keys(this.keys),
            shiftKey,
            ctrlKey,
            metaKey: Utils24.isDarwin() ? metaKey : ctrlKey,
            altKey
          };
        };
        this.keyup = (e14) => {
          const {shiftKey, ctrlKey, metaKey, altKey} = e14;
          delete this.keys[e14.key];
          return {
            point: this.pointer?.point || [0, 0],
            origin: this.pointer?.origin || [0, 0],
            key: e14.key,
            keys: Object.keys(this.keys),
            shiftKey,
            ctrlKey,
            metaKey: Utils24.isDarwin() ? metaKey : ctrlKey,
            altKey
          };
        };
      }
      touchStart(e14, target) {
        const {shiftKey, ctrlKey, metaKey, altKey} = e14;
        e14.preventDefault();
        const touch = e14.changedTouches[0];
        const info = {
          target,
          pointerId: touch.identifier,
          origin: Inputs.getPoint(touch),
          delta: [0, 0],
          point: Inputs.getPoint(touch),
          pressure: Inputs.getPressure(touch),
          shiftKey,
          ctrlKey,
          metaKey: Utils24.isDarwin() ? metaKey : ctrlKey,
          altKey
        };
        this.pointer = info;
        return info;
      }
      touchMove(e14, target) {
        const {shiftKey, ctrlKey, metaKey, altKey} = e14;
        e14.preventDefault();
        const touch = e14.changedTouches[0];
        const prev = this.pointer;
        const point = Inputs.getPoint(touch);
        const delta = prev?.point ? Vec18.sub(point, prev.point) : [0, 0];
        const info = {
          origin: point,
          ...prev,
          target,
          pointerId: touch.identifier,
          point,
          delta,
          pressure: Inputs.getPressure(touch),
          shiftKey,
          ctrlKey,
          metaKey: Utils24.isDarwin() ? metaKey : ctrlKey,
          altKey
        };
        this.pointer = info;
        return info;
      }
      pointerDown(e14, target) {
        const {shiftKey, ctrlKey, metaKey, altKey} = e14;
        const point = Inputs.getPoint(e14);
        const info = {
          target,
          pointerId: e14.pointerId,
          origin: point,
          point,
          delta: [0, 0],
          pressure: Inputs.getPressure(e14),
          shiftKey,
          ctrlKey,
          metaKey: Utils24.isDarwin() ? metaKey : ctrlKey,
          altKey
        };
        this.pointer = info;
        return info;
      }
      pointerEnter(e14, target) {
        const {shiftKey, ctrlKey, metaKey, altKey} = e14;
        const point = Inputs.getPoint(e14);
        const info = {
          target,
          pointerId: e14.pointerId,
          origin: point,
          delta: [0, 0],
          point,
          pressure: Inputs.getPressure(e14),
          shiftKey,
          ctrlKey,
          metaKey: Utils24.isDarwin() ? metaKey : ctrlKey,
          altKey
        };
        this.pointer = info;
        return info;
      }
      pointerMove(e14, target) {
        const {shiftKey, ctrlKey, metaKey, altKey} = e14;
        const prev = this.pointer;
        const point = Inputs.getPoint(e14);
        const delta = prev?.point ? Vec18.sub(point, prev.point) : [0, 0];
        const info = {
          origin: point,
          ...prev,
          target,
          pointerId: e14.pointerId,
          point,
          delta,
          pressure: Inputs.getPressure(e14),
          shiftKey,
          ctrlKey,
          metaKey: Utils24.isDarwin() ? metaKey : ctrlKey,
          altKey
        };
        this.pointer = info;
        return info;
      }
      pointerUp(e14, target) {
        const {shiftKey, ctrlKey, metaKey, altKey} = e14;
        const prev = this.pointer;
        const point = Inputs.getPoint(e14);
        const delta = prev?.point ? Vec18.sub(point, prev.point) : [0, 0];
        const info = {
          origin: point,
          ...prev,
          target,
          pointerId: e14.pointerId,
          point,
          delta,
          pressure: Inputs.getPressure(e14),
          shiftKey,
          ctrlKey,
          metaKey: Utils24.isDarwin() ? metaKey : ctrlKey,
          altKey
        };
        this.pointer = info;
        this.pointerUpTime = Date.now();
        return info;
      }
      isDoubleClick() {
        if (!this.pointer)
          return false;
        const {origin, point} = this.pointer;
        return Date.now() - this.pointerUpTime < DOUBLE_CLICK_DURATION && Vec18.dist(origin, point) < 4;
      }
      clear() {
        this.pointer = void 0;
      }
      resetDoubleClick() {
        this.pointerUpTime = 0;
      }
      pinch(point, origin) {
        const {shiftKey, ctrlKey, metaKey, altKey} = this.keys;
        const prev = this.pointer;
        const delta = Vec18.sub(origin, point);
        const info = {
          pointerId: 0,
          target: "pinch",
          origin: prev?.origin || Vec18.round(point),
          delta,
          point: Vec18.round(point),
          pressure: 0.5,
          shiftKey,
          ctrlKey,
          metaKey: Utils24.isDarwin() ? metaKey : ctrlKey,
          altKey
        };
        this.pointer = info;
        return info;
      }
      reset() {
        this.pointerUpTime = 0;
        this.pointer = void 0;
        this.keyboard = void 0;
        this.keys = {};
      }
      static getPoint(e14) {
        return [Number(e14.clientX.toPrecision(5)), Number(e14.clientY.toPrecision(5))];
      }
      static getPressure(e14) {
        return "pressure" in e14 ? Number(e14.pressure.toPrecision(5)) || 0.5 : 0.5;
      }
      static commandKey() {
        return Utils24.isDarwin() ? "\u2318" : "Ctrl";
      }
    };
    var inputs2 = new Inputs();
    function useZoomEvents() {
      const rPinchDa = (0, import_react22.useRef)(void 0);
      const rOriginPoint = (0, import_react22.useRef)(void 0);
      const rPinchPoint = (0, import_react22.useRef)(void 0);
      const {callbacks} = useTLContext();
      useWheel(({event: e14, delta}) => {
        if (Vec18.isEqual(delta, [0, 0]))
          return;
        const info = inputs2.pan(delta, e14);
        callbacks.onPan?.(info, e14);
      }, {
        domTarget: typeof document === "undefined" ? void 0 : document.body,
        eventOptions: {passive: false}
      });
      usePinch(({pinching, da, origin, event: e14}) => {
        if (!pinching) {
          const info2 = inputs2.pinch(origin, origin);
          callbacks.onPinchEnd?.(info2, e14);
          rPinchDa.current = void 0;
          rPinchPoint.current = void 0;
          rOriginPoint.current = void 0;
          return;
        }
        if (rPinchPoint.current === void 0) {
          const info2 = inputs2.pinch(origin, origin);
          callbacks.onPinchStart?.(info2, e14);
          rPinchDa.current = da;
          rPinchPoint.current = origin;
          rOriginPoint.current = origin;
        }
        const [distanceDelta] = Vec18.sub(rPinchDa.current, da);
        const info = inputs2.pinch(rPinchPoint.current, origin);
        callbacks.onPinch?.({
          ...info,
          point: origin,
          origin: rOriginPoint.current,
          delta: [...info.delta, distanceDelta]
        }, e14);
        rPinchDa.current = da;
        rPinchPoint.current = origin;
      }, {
        domTarget: typeof document === "undefined" ? void 0 : document.body,
        eventOptions: {passive: false}
      });
    }
    var import_react32 = __toModule2(require("react"));
    function useSafariFocusOutFix() {
      const {callbacks} = useTLContext();
      (0, import_react32.useEffect)(() => {
        function handleFocusOut() {
          callbacks.onBlurEditingShape?.();
        }
        if (utils_default.isMobile()) {
          document.addEventListener("focusout", handleFocusOut);
          return () => document.removeEventListener("focusout", handleFocusOut);
        }
        return () => null;
      }, [callbacks]);
    }
    var React38 = __toModule2(require("react"));
    function useCanvasEvents() {
      const {callbacks} = useTLContext();
      const onPointerDown = React38.useCallback((e14) => {
        if (e14.button !== 0)
          return;
        e14.currentTarget.setPointerCapture(e14.pointerId);
        if (e14.button === 0) {
          const info = inputs2.pointerDown(e14, "canvas");
          callbacks.onPointCanvas?.(info, e14);
          callbacks.onPointerDown?.(info, e14);
        }
      }, [callbacks]);
      const onPointerMove = React38.useCallback((e14) => {
        e14.stopPropagation();
        if (e14.currentTarget.hasPointerCapture(e14.pointerId)) {
          const info2 = inputs2.pointerMove(e14, "canvas");
          callbacks.onDragCanvas?.(info2, e14);
        }
        const info = inputs2.pointerMove(e14, "canvas");
        callbacks.onPointerMove?.(info, e14);
      }, [callbacks]);
      const onPointerUp = React38.useCallback((e14) => {
        if (e14.button !== 0)
          return;
        const isDoubleClick = inputs2.isDoubleClick();
        const info = inputs2.pointerUp(e14, "canvas");
        if (e14.currentTarget.hasPointerCapture(e14.pointerId)) {
          e14.currentTarget?.releasePointerCapture(e14.pointerId);
        }
        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoubleClickCanvas?.(info, e14);
        }
        callbacks.onReleaseCanvas?.(info, e14);
        callbacks.onPointerUp?.(info, e14);
      }, [callbacks]);
      return {
        onPointerDown,
        onPointerMove,
        onPointerUp
      };
    }
    var React42 = __toModule2(require("react"));
    function useShapeEvents(id, disable = false) {
      const {rPageState, rScreenBounds, callbacks} = useTLContext();
      const onPointerDown = React42.useCallback((e14) => {
        if (e14.button !== 0)
          return;
        if (disable)
          return;
        const info = inputs2.pointerDown(e14, id);
        e14.stopPropagation();
        e14.currentTarget?.setPointerCapture(e14.pointerId);
        if (rScreenBounds.current && Utils24.pointInBounds(info.point, rScreenBounds.current) && !rPageState.current.selectedIds.includes(id)) {
          callbacks.onPointBounds?.(inputs2.pointerDown(e14, "bounds"), e14);
          callbacks.onPointShape?.(info, e14);
          return;
        }
        callbacks.onPointShape?.(info, e14);
        callbacks.onPointerDown?.(info, e14);
      }, [callbacks, id, disable]);
      const onPointerUp = React42.useCallback((e14) => {
        if (e14.button !== 0)
          return;
        if (disable)
          return;
        e14.stopPropagation();
        const isDoubleClick = inputs2.isDoubleClick();
        const info = inputs2.pointerUp(e14, id);
        if (e14.currentTarget.hasPointerCapture(e14.pointerId)) {
          e14.currentTarget?.releasePointerCapture(e14.pointerId);
        }
        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoubleClickShape?.(info, e14);
        }
        callbacks.onReleaseShape?.(info, e14);
        callbacks.onPointerUp?.(info, e14);
      }, [callbacks, id, disable]);
      const onPointerMove = React42.useCallback((e14) => {
        if (disable)
          return;
        e14.stopPropagation();
        if (inputs2.pointer && e14.pointerId !== inputs2.pointer.pointerId)
          return;
        const info = inputs2.pointerMove(e14, id);
        if (e14.currentTarget.hasPointerCapture(e14.pointerId)) {
          callbacks.onDragShape?.(info, e14);
        }
        callbacks.onPointerMove?.(info, e14);
      }, [callbacks, id, disable]);
      const onPointerEnter = React42.useCallback((e14) => {
        if (disable)
          return;
        const info = inputs2.pointerEnter(e14, id);
        callbacks.onHoverShape?.(info, e14);
      }, [callbacks, id, disable]);
      const onPointerLeave = React42.useCallback((e14) => {
        if (disable)
          return;
        const info = inputs2.pointerEnter(e14, id);
        callbacks.onUnhoverShape?.(info, e14);
      }, [callbacks, id, disable]);
      const onTouchStart = React42.useCallback((e14) => {
        e14.preventDefault();
      }, []);
      const onTouchEnd = React42.useCallback((e14) => {
        e14.preventDefault();
      }, []);
      return {
        onPointerDown,
        onPointerUp,
        onPointerEnter,
        onPointerMove,
        onPointerLeave,
        onTouchStart,
        onTouchEnd
      };
    }
    var React52 = __toModule2(require("react"));
    function addToShapeTree(shape, branch, shapes, selectedIds, info) {
      const node = {
        shape,
        isCurrentParent: info.currentParentId === shape.id,
        isEditing: info.editingId === shape.id,
        isBinding: info.bindingId === shape.id,
        isDarkMode: info.isDarkMode || false
      };
      branch.push(node);
      if (shape.children) {
        node.children = [];
        shape.children.map((id) => shapes[id]).sort((a6, b5) => a6.childIndex - b5.childIndex).forEach((childShape) => addToShapeTree(childShape, node.children, shapes, selectedIds, info));
      }
    }
    function useShapeTree(page, pageState, shapeUtils, onChange) {
      const rPreviousCount = React52.useRef(0);
      if (typeof window === "undefined")
        return [];
      const {selectedIds, camera} = pageState;
      const [minX, minY] = Vec18.sub(Vec18.div([0, 0], camera.zoom), camera.point);
      const [maxX, maxY] = Vec18.sub(Vec18.div([window.innerWidth, window.innerHeight], camera.zoom), camera.point);
      const viewport = {
        minX,
        minY,
        maxX,
        maxY,
        height: maxX - minX,
        width: maxY - minY
      };
      const shapesToRender = Object.values(page.shapes).filter((shape) => {
        if (shape.parentId !== page.id)
          return false;
        if (pageState.selectedIds.includes(shape.id))
          return true;
        const shapeBounds = shapeUtils[shape.type].getBounds(shape);
        return utils_default.boundsContain(viewport, shapeBounds) || utils_default.boundsCollide(viewport, shapeBounds);
      });
      if (shapesToRender.length !== rPreviousCount.current) {
        setTimeout(() => onChange?.(shapesToRender.map((shape) => shape.id)), 0);
        rPreviousCount.current = shapesToRender.length;
      }
      const tree = [];
      shapesToRender.sort((a6, b5) => a6.childIndex - b5.childIndex).forEach((shape) => addToShapeTree(shape, tree, page.shapes, selectedIds, pageState));
      return tree;
    }
    var React62 = __toModule2(require("react"));
    var styles = new Map();
    function makeCssTheme(prefix, theme2) {
      return Object.keys(theme2).reduce((acc, key) => {
        const value = theme2[key];
        if (value) {
          return acc + `${`--${prefix}-${key}`}: ${value};
`;
        }
        return acc;
      }, "");
    }
    function useTheme2(prefix, theme2, selector = ":root") {
      React62.useLayoutEffect(() => {
        const style2 = document.createElement("style");
        const cssTheme = makeCssTheme(prefix, theme2);
        style2.setAttribute("id", `${prefix}-theme`);
        style2.setAttribute("data-selector", selector);
        style2.innerHTML = `
        ${selector} {
          ${cssTheme}
        }
      `;
        document.head.appendChild(style2);
        return () => {
          if (style2 && document.head.contains(style2)) {
            document.head.removeChild(style2);
          }
        };
      }, [prefix, theme2, selector]);
    }
    function useStyle(uid, rules) {
      React62.useLayoutEffect(() => {
        if (styles.get(uid)) {
          return () => {
          };
        }
        const style2 = document.createElement("style");
        style2.innerHTML = rules;
        style2.setAttribute("id", uid);
        document.head.appendChild(style2);
        styles.set(uid, style2);
        return () => {
          if (style2 && document.head.contains(style2)) {
            document.head.removeChild(style2);
            styles.delete(uid);
          }
        };
      }, [uid, rules]);
    }
    var css2 = (strings, ...args) => strings.reduce((acc, string, index) => acc + string + (index < args.length ? args[index] : ""), "");
    var defaultTheme = {
      brushFill: "rgba(0,0,0,.05)",
      brushStroke: "rgba(0,0,0,.25)",
      selectStroke: "rgb(66, 133, 244)",
      selectFill: "rgba(65, 132, 244, 0.12)",
      background: "rgb(248, 249, 250)",
      foreground: "rgb(51, 51, 51)"
    };
    var tlcss = css2`
  :root {
    --tl-zoom: 1;
    --tl-scale: calc(1 / var(--tl-zoom));
  }
  .tl-counter-scaled {
    transform: scale(var(--tl-scale));
  }
  .tl-dashed {
    stroke-dasharray: calc(2px * var(--tl-scale)), calc(2px * var(--tl-scale));
  }
  .tl-transparent {
    fill: transparent;
    stroke: transparent;
  }
  .tl-cursor-ns {
    cursor: ns-resize;
  }
  .tl-cursor-ew {
    cursor: ew-resize;
  }
  .tl-cursor-nesw {
    cursor: nesw-resize;
  }
  .tl-cursor-nwse {
    cursor: nwse-resize;
  }
  .tl-corner-handle {
    stroke: var(--tl-selectStroke);
    fill: var(--tl-background);
    stroke-width: calc(1.5px * var(--tl-scale));
  }
  .tl-rotate-handle {
    stroke: var(--tl-selectStroke);
    fill: var(--tl-background);
    stroke-width: calc(1.5px * var(--tl-scale));
    cursor: grab;
  }
  .tl-binding {
    fill: var(--tl-selectFill);
    stroke: var(--tl-selectStroke);
    stroke-width: calc(1px * var(--tl-scale));
    pointer-events: none;
  }
  .tl-selected {
    fill: transparent;
    stroke: var(--tl-selectStroke);
    stroke-width: calc(1.5px * var(--tl-scale));
    pointer-events: none;
  }
  .tl-hovered {
    fill: transparent;
    stroke: var(--tl-selectStroke);
    stroke-width: calc(1.5px * var(--tl-scale));
    pointer-events: none;
  }
  .tl-bounds-center {
    fill: transparent;
    stroke: var(--tl-selectStroke);
    stroke-width: calc(1.5px * var(--tl-scale));
  }
  .tl-bounds-bg {
    stroke: none;
    fill: var(--tl-selectFill);
    pointer-events: all;
  }
  .tl-brush {
    fill: var(--tl-brushFill);
    stroke: var(--tl-brushStroke);
    stroke-width: calc(1px * var(--tl-scale));
    pointer-events: none;
  }
  .tl-canvas {
    position: fixed;
    overflow: hidden;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    touch-action: none;
    z-index: 100;
    pointer-events: all;
  }
  .tl-container {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 0px;
    margin: 0px;
    overscroll-behavior: none;
    overscroll-behavior-x: none;
    background-color: var(--tl-background);
  }
  .tl-container * {
    user-select: none;
  }
  .tl-dot {
    fill: var(--tl-background);
    stroke: var(--tl-foreground);
    stroke-width: 2px;
  }
  .tl-handles {
    pointer-events: all;
  }
  .tl-handles:hover > .tl-handle-bg {
    fill: var(--tl-selectFill);
  }
  .tl-handles:hover > .tl-handle-bg > * {
    stroke: var(--tl-selectFill);
  }
  .tl-handles:active > .tl-handle-bg {
    fill: var(--tl-selectFill);
  }
  .tl-handles:active > .tl-handle-bg > * {
    stroke: var(--tl-selectFill);
  }
  .tl-handle {
    fill: var(--tl-background);
    stroke: var(--tl-selectStroke);
    stroke-width: 1.5px;
  }
  .tl-handle-bg {
    fill: transparent;
    stroke: none;
    pointer-events: all;
  }
  .tl-binding-indicator {
    stroke-width: calc(3px * var(--tl-scale));
    fill: none;
    stroke: var(--tl-selected);
  }
  .tl-shape-group {
    outline: none;
  }
  .tl-shape-group > *[data-shy='true'] {
    opacity: 0;
  }
  .tl-shape-group:hover > *[data-shy='true'] {
    opacity: 1;
  }
  .tl-current-parent > *[data-shy='true'] {
    opacity: 1;
  }
`;
    function useTLTheme(theme2) {
      const [tltheme] = React62.useState(() => ({
        ...defaultTheme,
        ...theme2
      }));
      useTheme2("tl", tltheme);
      useStyle("tl-canvas", tlcss);
    }
    var React72 = __toModule2(require("react"));
    function useBoundsHandleEvents(id) {
      const {callbacks} = useTLContext();
      const onPointerDown = React72.useCallback((e14) => {
        if (e14.button !== 0)
          return;
        e14.stopPropagation();
        e14.currentTarget?.setPointerCapture(e14.pointerId);
        const info = inputs2.pointerDown(e14, id);
        callbacks.onPointBoundsHandle?.(info, e14);
        callbacks.onPointerDown?.(info, e14);
      }, [callbacks, id]);
      const onPointerUp = React72.useCallback((e14) => {
        if (e14.button !== 0)
          return;
        e14.stopPropagation();
        const isDoubleClick = inputs2.isDoubleClick();
        const info = inputs2.pointerUp(e14, id);
        if (e14.currentTarget.hasPointerCapture(e14.pointerId)) {
          e14.currentTarget?.releasePointerCapture(e14.pointerId);
        }
        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoubleClickBoundsHandle?.(info, e14);
        }
        callbacks.onReleaseBoundsHandle?.(info, e14);
        callbacks.onPointerUp?.(info, e14);
      }, [callbacks, id]);
      const onPointerMove = React72.useCallback((e14) => {
        e14.stopPropagation();
        if (e14.currentTarget.hasPointerCapture(e14.pointerId)) {
          callbacks.onDragBoundsHandle?.(inputs2.pointerMove(e14, id), e14);
        }
        const info = inputs2.pointerMove(e14, id);
        callbacks.onPointerMove?.(info, e14);
      }, [callbacks, id]);
      const onPointerEnter = React72.useCallback((e14) => {
        callbacks.onHoverBoundsHandle?.(inputs2.pointerEnter(e14, id), e14);
      }, [callbacks, id]);
      const onPointerLeave = React72.useCallback((e14) => {
        callbacks.onUnhoverBoundsHandle?.(inputs2.pointerEnter(e14, id), e14);
      }, [callbacks, id]);
      const onTouchStart = React72.useCallback((e14) => {
        e14.preventDefault();
      }, []);
      const onTouchEnd = React72.useCallback((e14) => {
        e14.preventDefault();
      }, []);
      return {
        onPointerDown,
        onPointerUp,
        onPointerEnter,
        onPointerMove,
        onPointerLeave,
        onTouchStart,
        onTouchEnd
      };
    }
    var React82 = __toModule2(require("react"));
    function useCameraCss(pageState) {
      const rGroup = React82.useRef(null);
      React82.useEffect(() => {
        document.documentElement.style.setProperty("--tl-zoom", pageState.camera.zoom.toString());
      }, [pageState.camera.zoom]);
      React82.useEffect(() => {
        const {
          zoom,
          point: [x6 = 0, y5 = 0]
        } = pageState.camera;
        rGroup.current?.setAttribute("transform", `scale(${zoom}) translate(${x6} ${y5})`);
      }, [pageState.camera]);
      return rGroup;
    }
    var React92 = __toModule2(require("react"));
    function useRenderOnResize() {
      const forceUpdate = React92.useReducer((x6) => x6 + 1, 0)[1];
      React92.useEffect(() => {
        const debouncedUpdate = utils_default.debounce(forceUpdate, 96);
        window.addEventListener("resize", debouncedUpdate);
        return () => {
          window.removeEventListener("resize", debouncedUpdate);
        };
      }, [forceUpdate]);
    }
    function canvasToScreen(point, camera) {
      return [
        (point[0] + camera.point[0]) * camera.zoom,
        (point[1] + camera.point[1]) * camera.zoom
      ];
    }
    function useSelection(page, pageState, shapeUtils) {
      const {rScreenBounds} = useTLContext();
      const {selectedIds} = pageState;
      let bounds3 = void 0;
      let rotation = 0;
      let isLocked = false;
      if (selectedIds.length === 1) {
        const id = selectedIds[0];
        const shape = page.shapes[id];
        rotation = shape.rotation || 0;
        isLocked = shape.isLocked || false;
        bounds3 = shapeUtils[shape.type].getBounds(shape);
      } else if (selectedIds.length > 1) {
        const selectedShapes = selectedIds.map((id) => page.shapes[id]);
        rotation = 0;
        isLocked = selectedShapes.every((shape) => shape.isLocked);
        bounds3 = selectedShapes.reduce((acc, shape, i6) => {
          if (i6 === 0) {
            return shapeUtils[shape.type].getRotatedBounds(shape);
          }
          return utils_default.getExpandedBounds(acc, shapeUtils[shape.type].getRotatedBounds(shape));
        }, {});
      }
      if (bounds3) {
        const [minX, minY] = canvasToScreen([bounds3.minX, bounds3.minY], pageState.camera);
        const [maxX, maxY] = canvasToScreen([bounds3.maxX, bounds3.maxY], pageState.camera);
        rScreenBounds.current = {
          minX,
          minY,
          maxX,
          maxY,
          width: maxX - minX,
          height: maxY - minY
        };
      } else {
        rScreenBounds.current = null;
      }
      return {bounds: bounds3, rotation, isLocked};
    }
    var React102 = __toModule2(require("react"));
    function useHandleEvents(id) {
      const {callbacks} = useTLContext();
      const onPointerDown = React102.useCallback((e14) => {
        if (e14.button !== 0)
          return;
        e14.stopPropagation();
        e14.currentTarget?.setPointerCapture(e14.pointerId);
        const info = inputs2.pointerDown(e14, id);
        callbacks.onPointHandle?.(info, e14);
        callbacks.onPointerDown?.(info, e14);
      }, [callbacks, id]);
      const onPointerUp = React102.useCallback((e14) => {
        if (e14.button !== 0)
          return;
        e14.stopPropagation();
        const isDoubleClick = inputs2.isDoubleClick();
        const info = inputs2.pointerUp(e14, "bounds");
        if (e14.currentTarget.hasPointerCapture(e14.pointerId)) {
          e14.currentTarget?.releasePointerCapture(e14.pointerId);
          if (isDoubleClick && !(info.altKey || info.metaKey)) {
            callbacks.onDoubleClickHandle?.(info, e14);
          }
          callbacks.onReleaseHandle?.(info, e14);
        }
        callbacks.onPointerUp?.(info, e14);
      }, [callbacks]);
      const onPointerMove = React102.useCallback((e14) => {
        e14.stopPropagation();
        if (e14.currentTarget.hasPointerCapture(e14.pointerId)) {
          const info2 = inputs2.pointerMove(e14, id);
          callbacks.onDragHandle?.(info2, e14);
        }
        const info = inputs2.pointerMove(e14, id);
        callbacks.onPointerMove?.(info, e14);
      }, [callbacks, id]);
      const onPointerEnter = React102.useCallback((e14) => {
        const info = inputs2.pointerEnter(e14, id);
        callbacks.onHoverHandle?.(info, e14);
      }, [callbacks, id]);
      const onPointerLeave = React102.useCallback((e14) => {
        const info = inputs2.pointerEnter(e14, id);
        callbacks.onUnhoverHandle?.(info, e14);
      }, [callbacks, id]);
      const onTouchStart = React102.useCallback((e14) => {
        e14.preventDefault();
      }, []);
      const onTouchEnd = React102.useCallback((e14) => {
        e14.preventDefault();
      }, []);
      return {
        onPointerDown,
        onPointerUp,
        onPointerEnter,
        onPointerMove,
        onPointerLeave,
        onTouchStart,
        onTouchEnd
      };
    }
    function useHandles(page, pageState) {
      const {selectedIds} = pageState;
      let shapeWithHandles = void 0;
      if (selectedIds.length === 1) {
        const id = selectedIds[0];
        const shape = page.shapes[id];
        if (shape.handles !== void 0) {
          shapeWithHandles = shape;
        }
      }
      return {shapeWithHandles};
    }
    var React112 = __toModule2(require("react"));
    var ErrorFallback = React112.memo(({error, resetErrorBoundary}) => {
      const {callbacks} = useTLContext();
      React112.useEffect(() => {
        callbacks.onError?.(error);
        console.error(error);
      }, [error, resetErrorBoundary, callbacks]);
      return null;
    });
    var React132 = __toModule2(require("react"));
    var React122 = __toModule2(require("react"));
    var BrushUpdater = class {
      constructor() {
        this.ref = React122.createRef();
        this.isControlled = false;
      }
      set(bounds3) {
        if (!this.isControlled)
          this.isControlled = true;
        if (!bounds3) {
          this.clear();
          return;
        }
        const elm = this.ref?.current;
        if (!elm)
          return;
        elm.setAttribute("opacity", "1");
        elm.setAttribute("x", bounds3.minX.toString());
        elm.setAttribute("y", bounds3.minY.toString());
        elm.setAttribute("width", bounds3.width.toString());
        elm.setAttribute("height", bounds3.height.toString());
      }
      clear() {
        const elm = this.ref?.current;
        if (!elm)
          return;
        elm.setAttribute("opacity", "0");
        elm.setAttribute("width", "0");
        elm.setAttribute("height", "0");
      }
    };
    var brushUpdater3 = new BrushUpdater();
    var Brush = React132.memo(() => {
      return /* @__PURE__ */ React132.createElement("rect", {
        ref: brushUpdater3.ref,
        className: "tl-brush",
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
    });
    var React142 = __toModule2(require("react"));
    function Defs({zoom}) {
      return /* @__PURE__ */ React142.createElement("defs", null, /* @__PURE__ */ React142.createElement("circle", {
        id: "dot",
        className: "tl-counter-scaled tl-dot",
        r: 4
      }), /* @__PURE__ */ React142.createElement("circle", {
        id: "handle-bg",
        className: "tl-handle-bg",
        pointerEvents: "all",
        r: 12
      }), /* @__PURE__ */ React142.createElement("circle", {
        id: "handle",
        className: "tl-counter-scaled tl-handle",
        pointerEvents: "none",
        r: 4
      }), /* @__PURE__ */ React142.createElement("g", {
        id: "cross",
        className: "tl-binding-indicator"
      }, /* @__PURE__ */ React142.createElement("line", {
        x1: -6,
        y1: -6,
        x2: 6,
        y2: 6
      }), /* @__PURE__ */ React142.createElement("line", {
        x1: 6,
        y1: -6,
        x2: -6,
        y2: 6
      })), /* @__PURE__ */ React142.createElement("filter", {
        id: "expand"
      }, /* @__PURE__ */ React142.createElement("feMorphology", {
        operator: "dilate",
        radius: 0.5 / zoom
      })));
    }
    var React272 = __toModule2(require("react"));
    var React172 = __toModule2(require("react"));
    var React152 = __toModule2(require("react"));
    var RenderedShape = React152.memo(function RenderedShape2({
      shape,
      utils,
      isEditing,
      isBinding,
      isDarkMode,
      isCurrentParent
    }) {
      return utils.render(shape, {
        isEditing,
        isBinding,
        isDarkMode,
        isCurrentParent
      });
    }, (prev, next) => {
      if (prev.isEditing !== next.isEditing || prev.isDarkMode !== next.isDarkMode || prev.isBinding !== next.isBinding || prev.isCurrentParent !== next.isCurrentParent) {
        return false;
      }
      if (next.shape !== prev.shape) {
        return !next.utils.shouldRender(next.shape, prev.shape);
      }
      return true;
    });
    var React162 = __toModule2(require("react"));
    function EditingTextShape({
      shape,
      utils,
      isEditing,
      isBinding,
      isDarkMode,
      isCurrentParent
    }) {
      const {
        callbacks: {
          onTextChange,
          onTextBlur,
          onTextFocus,
          onTextKeyDown,
          onTextKeyUp
        }
      } = useTLContext();
      const ref = React162.useRef(null);
      return utils.render(shape, {
        ref,
        isEditing,
        isCurrentParent,
        isBinding,
        isDarkMode,
        onTextChange,
        onTextBlur,
        onTextFocus,
        onTextKeyDown,
        onTextKeyUp
      });
    }
    var Shape = React172.memo(({
      shape,
      isEditing,
      isBinding,
      isDarkMode,
      isCurrentParent
    }) => {
      const {shapeUtils} = useTLContext();
      const events = useShapeEvents(shape.id, isCurrentParent);
      const utils = shapeUtils[shape.type];
      const center = utils.getCenter(shape);
      const rotation = (shape.rotation || 0) * (180 / Math.PI);
      const transform = `rotate(${rotation}, ${center}) translate(${shape.point})`;
      return /* @__PURE__ */ React172.createElement("g", {
        className: isCurrentParent ? "tl-shape-group tl-current-parent" : "tl-shape-group",
        id: shape.id,
        transform,
        ...events
      }, isEditing && utils.isEditableText ? /* @__PURE__ */ React172.createElement(EditingTextShape, {
        shape,
        isBinding: false,
        isCurrentParent: false,
        isDarkMode,
        isEditing: true,
        utils
      }) : /* @__PURE__ */ React172.createElement(RenderedShape, {
        shape,
        utils,
        isBinding,
        isCurrentParent,
        isDarkMode,
        isEditing
      }));
    });
    var React222 = __toModule2(require("react"));
    var React182 = __toModule2(require("react"));
    var CenterHandle = React182.memo(({bounds: bounds3, isLocked}) => {
      return /* @__PURE__ */ React182.createElement("rect", {
        className: isLocked ? "tl-bounds-center tl-dashed" : "tl-bounds-center",
        x: -1,
        y: -1,
        width: bounds3.width + 2,
        height: bounds3.height + 2,
        pointerEvents: "none"
      });
    });
    var React192 = __toModule2(require("react"));
    var RotateHandle = React192.memo(({bounds: bounds3, size}) => {
      const events = useBoundsHandleEvents("rotate");
      return /* @__PURE__ */ React192.createElement("g", {
        cursor: "grab"
      }, /* @__PURE__ */ React192.createElement("circle", {
        cx: bounds3.width / 2,
        cy: size * -2,
        r: size * 2,
        fill: "transparent",
        stroke: "none",
        pointerEvents: "all",
        ...events
      }), /* @__PURE__ */ React192.createElement("circle", {
        className: "tl-rotate-handle",
        cx: bounds3.width / 2,
        cy: size * -2,
        r: size / 2,
        pointerEvents: "none"
      }));
    });
    var React202 = __toModule2(require("react"));
    var cornerBgClassnames = {
      [TLBoundsCorner6.TopLeft]: "tl-transparent tl-cursor-nwse",
      [TLBoundsCorner6.TopRight]: "tl-transparent tl-cursor-nesw",
      [TLBoundsCorner6.BottomRight]: "tl-transparent tl-cursor-nwse",
      [TLBoundsCorner6.BottomLeft]: "tl-transparent tl-cursor-nesw"
    };
    var CornerHandle = React202.memo(({
      size,
      corner,
      bounds: bounds3
    }) => {
      const events = useBoundsHandleEvents(corner);
      const isTop = corner === TLBoundsCorner6.TopLeft || corner === TLBoundsCorner6.TopRight;
      const isLeft = corner === TLBoundsCorner6.TopLeft || corner === TLBoundsCorner6.BottomLeft;
      return /* @__PURE__ */ React202.createElement("g", null, /* @__PURE__ */ React202.createElement("rect", {
        className: cornerBgClassnames[corner],
        x: (isLeft ? -1 : bounds3.width + 1) - size,
        y: (isTop ? -1 : bounds3.height + 1) - size,
        width: size * 2,
        height: size * 2,
        pointerEvents: "all",
        ...events
      }), /* @__PURE__ */ React202.createElement("rect", {
        className: "tl-corner-handle",
        x: (isLeft ? -1 : bounds3.width + 1) - size / 2,
        y: (isTop ? -1 : bounds3.height + 1) - size / 2,
        width: size,
        height: size,
        pointerEvents: "none"
      }));
    });
    var React212 = __toModule2(require("react"));
    var edgeClassnames = {
      [TLBoundsEdge4.Top]: "tl-transparent tl-cursor-ns",
      [TLBoundsEdge4.Right]: "tl-transparent tl-cursor-ew",
      [TLBoundsEdge4.Bottom]: "tl-transparent tl-cursor-ns",
      [TLBoundsEdge4.Left]: "tl-transparent tl-cursor-ew"
    };
    var EdgeHandle = React212.memo(({size, bounds: bounds3, edge}) => {
      const events = useBoundsHandleEvents(edge);
      const isHorizontal = edge === TLBoundsEdge4.Top || edge === TLBoundsEdge4.Bottom;
      const isFarEdge = edge === TLBoundsEdge4.Right || edge === TLBoundsEdge4.Bottom;
      const {height, width} = bounds3;
      return /* @__PURE__ */ React212.createElement("rect", {
        className: edgeClassnames[edge],
        x: isHorizontal ? size / 2 : (isFarEdge ? width + 1 : -1) - size / 2,
        y: isHorizontal ? (isFarEdge ? height + 1 : -1) - size / 2 : size / 2,
        width: isHorizontal ? Math.max(0, width + 1 - size) : size,
        height: isHorizontal ? size : Math.max(0, height + 1 - size),
        ...events
      });
    });
    function Bounds({zoom, bounds: bounds3, rotation, isLocked}) {
      const size = (Utils24.isMobile() ? 10 : 8) / zoom;
      const center = Utils24.getBoundsCenter(bounds3);
      return /* @__PURE__ */ React222.createElement("g", {
        pointerEvents: "all",
        transform: `
        rotate(${rotation * (180 / Math.PI)},${center})
        translate(${bounds3.minX},${bounds3.minY})
        rotate(${(bounds3.rotation || 0) * (180 / Math.PI)}, 0, 0)`
      }, /* @__PURE__ */ React222.createElement(CenterHandle, {
        bounds: bounds3,
        isLocked
      }), !isLocked && /* @__PURE__ */ React222.createElement(React222.Fragment, null, /* @__PURE__ */ React222.createElement(EdgeHandle, {
        size,
        bounds: bounds3,
        edge: TLBoundsEdge4.Top
      }), /* @__PURE__ */ React222.createElement(EdgeHandle, {
        size,
        bounds: bounds3,
        edge: TLBoundsEdge4.Right
      }), /* @__PURE__ */ React222.createElement(EdgeHandle, {
        size,
        bounds: bounds3,
        edge: TLBoundsEdge4.Bottom
      }), /* @__PURE__ */ React222.createElement(EdgeHandle, {
        size,
        bounds: bounds3,
        edge: TLBoundsEdge4.Left
      }), /* @__PURE__ */ React222.createElement(CornerHandle, {
        size,
        bounds: bounds3,
        corner: TLBoundsCorner6.TopLeft
      }), /* @__PURE__ */ React222.createElement(CornerHandle, {
        size,
        bounds: bounds3,
        corner: TLBoundsCorner6.TopRight
      }), /* @__PURE__ */ React222.createElement(CornerHandle, {
        size,
        bounds: bounds3,
        corner: TLBoundsCorner6.BottomRight
      }), /* @__PURE__ */ React222.createElement(CornerHandle, {
        size,
        bounds: bounds3,
        corner: TLBoundsCorner6.BottomLeft
      }), /* @__PURE__ */ React222.createElement(RotateHandle, {
        size,
        bounds: bounds3
      })));
    }
    var React242 = __toModule2(require("react"));
    var React232 = __toModule2(require("react"));
    function useBoundsEvents() {
      const {callbacks} = useTLContext();
      const onPointerDown = React232.useCallback((e14) => {
        if (e14.button !== 0)
          return;
        e14.stopPropagation();
        e14.currentTarget?.setPointerCapture(e14.pointerId);
        const info = inputs2.pointerDown(e14, "bounds");
        callbacks.onPointBounds?.(info, e14);
        callbacks.onPointerDown?.(info, e14);
      }, [callbacks]);
      const onPointerUp = React232.useCallback((e14) => {
        if (e14.button !== 0)
          return;
        e14.stopPropagation();
        const isDoubleClick = inputs2.isDoubleClick();
        const info = inputs2.pointerUp(e14, "bounds");
        if (e14.currentTarget.hasPointerCapture(e14.pointerId)) {
          e14.currentTarget?.releasePointerCapture(e14.pointerId);
        }
        if (isDoubleClick && !(info.altKey || info.metaKey)) {
          callbacks.onDoubleClickBounds?.(info, e14);
        }
        callbacks.onReleaseBounds?.(info, e14);
        callbacks.onPointerUp?.(info, e14);
      }, [callbacks]);
      const onPointerMove = React232.useCallback((e14) => {
        e14.stopPropagation();
        if (inputs2.pointer && e14.pointerId !== inputs2.pointer.pointerId)
          return;
        if (e14.currentTarget.hasPointerCapture(e14.pointerId)) {
          callbacks.onDragBounds?.(inputs2.pointerMove(e14, "bounds"), e14);
        }
        const info = inputs2.pointerMove(e14, "bounds");
        callbacks.onPointerMove?.(info, e14);
      }, [callbacks]);
      const onPointerEnter = React232.useCallback((e14) => {
        callbacks.onHoverBounds?.(inputs2.pointerEnter(e14, "bounds"), e14);
      }, [callbacks]);
      const onPointerLeave = React232.useCallback((e14) => {
        callbacks.onUnhoverBounds?.(inputs2.pointerEnter(e14, "bounds"), e14);
      }, [callbacks]);
      const onTouchStart = React232.useCallback((e14) => {
        e14.preventDefault();
      }, []);
      const onTouchEnd = React232.useCallback((e14) => {
        e14.preventDefault();
      }, []);
      return {
        onPointerDown,
        onPointerUp,
        onPointerEnter,
        onPointerMove,
        onPointerLeave,
        onTouchStart,
        onTouchEnd
      };
    }
    function BoundsBg({bounds: bounds3, rotation}) {
      const events = useBoundsEvents();
      const {width, height} = bounds3;
      const center = Utils24.getBoundsCenter(bounds3);
      return /* @__PURE__ */ React242.createElement("rect", {
        className: "tl-bounds-bg",
        width: Math.max(1, width),
        height: Math.max(1, height),
        transform: `
        rotate(${rotation * (180 / Math.PI)},${center})
        translate(${bounds3.minX},${bounds3.minY})
        rotate(${(bounds3.rotation || 0) * (180 / Math.PI)}, 0, 0)`,
        ...events
      });
    }
    var React262 = __toModule2(require("react"));
    var React252 = __toModule2(require("react"));
    var Handle = React252.memo(({id, point, zoom}) => {
      const events = useHandleEvents(id);
      return /* @__PURE__ */ React252.createElement("g", {
        className: "tl-handles",
        transform: `translate(${point})`,
        ...events
      }, /* @__PURE__ */ React252.createElement("circle", {
        id: "handle-bg",
        className: "tl-handle-bg",
        pointerEvents: "all",
        r: 20 / Math.max(1, zoom)
      }), /* @__PURE__ */ React252.createElement("use", {
        href: "#handle"
      }));
    });
    var toAngle = 180 / Math.PI;
    var Handles = React262.memo(({shape, zoom}) => {
      const {shapeUtils} = useTLContext();
      const center = shapeUtils[shape.type].getCenter(shape);
      if (shape.handles === void 0) {
        return null;
      }
      return /* @__PURE__ */ React262.createElement("g", {
        transform: `rotate(${(shape.rotation || 0) * toAngle},${center})`
      }, Object.values(shape.handles).map((handle) => /* @__PURE__ */ React262.createElement(Handle, {
        key: shape.id + "_" + handle.id,
        id: handle.id,
        point: Vec18.add(handle.point, shape.point),
        zoom
      })));
    });
    function Page({
      page,
      pageState,
      hideBounds,
      hideIndicators
    }) {
      const {callbacks, shapeUtils} = useTLContext();
      useRenderOnResize();
      const shapeTree = useShapeTree(page, pageState, shapeUtils, callbacks.onChange);
      const {shapeWithHandles} = useHandles(page, pageState);
      const {bounds: bounds3, isLocked, rotation} = useSelection(page, pageState, shapeUtils);
      const {
        selectedIds,
        hoveredId,
        camera: {zoom}
      } = pageState;
      return /* @__PURE__ */ React272.createElement(React272.Fragment, null, bounds3 && !hideBounds && /* @__PURE__ */ React272.createElement(BoundsBg, {
        bounds: bounds3,
        rotation
      }), shapeTree.map((node) => /* @__PURE__ */ React272.createElement(ShapeNode, {
        key: node.shape.id,
        ...node
      })), bounds3 && !hideBounds && /* @__PURE__ */ React272.createElement(Bounds, {
        zoom,
        bounds: bounds3,
        isLocked,
        rotation
      }), !hideIndicators && selectedIds.length > 1 && selectedIds.filter(Boolean).map((id) => /* @__PURE__ */ React272.createElement(ShapeIndicator, {
        key: "selected_" + id,
        shape: page.shapes[id],
        variant: "selected"
      })), !hideIndicators && hoveredId && /* @__PURE__ */ React272.createElement(ShapeIndicator, {
        key: "hovered_" + hoveredId,
        shape: page.shapes[hoveredId],
        variant: "hovered"
      }), shapeWithHandles && /* @__PURE__ */ React272.createElement(Handles, {
        shape: shapeWithHandles,
        zoom
      }));
    }
    var ShapeIndicator = React272.memo(({shape, variant}) => {
      const {shapeUtils} = useTLContext();
      const utils = shapeUtils[shape.type];
      const center = utils.getCenter(shape);
      const rotation = (shape.rotation || 0) * (180 / Math.PI);
      const transform = `rotate(${rotation}, ${center}) translate(${shape.point})`;
      return /* @__PURE__ */ React272.createElement("g", {
        className: variant === "selected" ? "tl-selected" : "tl-hovered",
        transform
      }, shapeUtils[shape.type].renderIndicator(shape));
    });
    var ShapeNode = React272.memo(({
      shape,
      children,
      isEditing,
      isDarkMode,
      isBinding,
      isCurrentParent
    }) => {
      return /* @__PURE__ */ React272.createElement(React272.Fragment, null, /* @__PURE__ */ React272.createElement(Shape, {
        shape,
        isEditing,
        isDarkMode,
        isBinding,
        isCurrentParent
      }), children && children.map((childNode) => /* @__PURE__ */ React272.createElement(ShapeNode, {
        key: childNode.shape.id,
        ...childNode
      })));
    });
    var React282 = __toModule2(require("react"));
    function usePreventNavigation(rCanvas) {
      React282.useEffect(() => {
        const preventGestureNavigation = (event) => {
          event.preventDefault();
        };
        const preventNavigation = (event) => {
          const touchXPosition = event.touches[0].pageX;
          const touchXRadius = event.touches[0].radiusX || 0;
          if (touchXPosition - touchXRadius < 10 || touchXPosition + touchXRadius > window.innerWidth - 10) {
            event.preventDefault();
          }
        };
        const elm = rCanvas.current;
        if (!elm)
          return () => {
          };
        elm.addEventListener("touchstart", preventGestureNavigation);
        elm.addEventListener("gestureend", preventGestureNavigation);
        elm.addEventListener("gesturechange", preventGestureNavigation);
        elm.addEventListener("gesturestart", preventGestureNavigation);
        elm.addEventListener("touchstart", preventNavigation);
        return () => {
          if (elm) {
            elm.removeEventListener("touchstart", preventGestureNavigation);
            elm.removeEventListener("gestureend", preventGestureNavigation);
            elm.removeEventListener("gesturechange", preventGestureNavigation);
            elm.removeEventListener("gesturestart", preventGestureNavigation);
            elm.removeEventListener("touchstart", preventNavigation);
          }
        };
      }, [rCanvas]);
    }
    function resetError() {
      void 0;
    }
    var Canvas = React292.memo(function Canvas2({
      page,
      pageState,
      hideBounds = false,
      hideIndicators = false
    }) {
      const rCanvas = React292.useRef(null);
      const rGroup = useCameraCss(pageState);
      useZoomEvents();
      useSafariFocusOutFix();
      usePreventNavigation(rCanvas);
      const events = useCanvasEvents();
      return /* @__PURE__ */ React292.createElement("div", {
        className: "tl-container"
      }, /* @__PURE__ */ React292.createElement("svg", {
        id: "canvas",
        className: "tl-canvas",
        ref: rCanvas,
        ...events
      }, /* @__PURE__ */ React292.createElement(import_react_error_boundary.ErrorBoundary, {
        FallbackComponent: ErrorFallback,
        onReset: resetError
      }, /* @__PURE__ */ React292.createElement(Defs, {
        zoom: pageState.camera.zoom
      }), /* @__PURE__ */ React292.createElement("g", {
        ref: rGroup,
        id: "tl-shapes"
      }, /* @__PURE__ */ React292.createElement(Page, {
        page,
        pageState,
        hideBounds,
        hideIndicators
      }), /* @__PURE__ */ React292.createElement(Brush, null)))));
    });
    function Renderer2({
      shapeUtils,
      page,
      pageState,
      theme: theme2,
      hideIndicators = false,
      hideBounds = false,
      isDarkMode = false,
      isDebugMode = false,
      isPenMode = false,
      ...rest
    }) {
      useTLTheme(theme2);
      const rScreenBounds = React302.useRef(null);
      const rPageState = React302.useRef(pageState);
      React302.useEffect(() => {
        rPageState.current = pageState;
      }, [pageState]);
      const [context] = React302.useState(() => ({
        callbacks: rest,
        shapeUtils,
        rScreenBounds,
        rPageState
      }));
      return /* @__PURE__ */ React302.createElement(TLContext.Provider, {
        value: context
      }, /* @__PURE__ */ React302.createElement(Canvas, {
        page,
        pageState,
        hideBounds,
        hideIndicators
      }));
    }
  }
});

// ../../node_modules/react-remove-scroll/node_modules/tslib/tslib.js
var require_tslib = __commonJS({
  "../../node_modules/react-remove-scroll/node_modules/tslib/tslib.js"(exports, module2) {
    var __extends3;
    var __assign3;
    var __rest3;
    var __decorate3;
    var __param3;
    var __metadata3;
    var __awaiter3;
    var __generator3;
    var __exportStar3;
    var __values3;
    var __read3;
    var __spread3;
    var __spreadArrays3;
    var __await3;
    var __asyncGenerator3;
    var __asyncDelegator3;
    var __asyncValues3;
    var __makeTemplateObject3;
    var __importStar3;
    var __importDefault3;
    var __classPrivateFieldGet3;
    var __classPrivateFieldSet3;
    var __createBinding3;
    (function(factory) {
      var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
      if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function(exports2) {
          factory(createExporter(root, createExporter(exports2)));
        });
      } else if (typeof module2 === "object" && typeof module2.exports === "object") {
        factory(createExporter(root, createExporter(module2.exports)));
      } else {
        factory(createExporter(root));
      }
      function createExporter(exports2, previous) {
        if (exports2 !== root) {
          if (typeof Object.create === "function") {
            Object.defineProperty(exports2, "__esModule", {value: true});
          } else {
            exports2.__esModule = true;
          }
        }
        return function(id, v6) {
          return exports2[id] = previous ? previous(id, v6) : v6;
        };
      }
    })(function(exporter) {
      var extendStatics = Object.setPrototypeOf || {__proto__: []} instanceof Array && function(d8, b5) {
        d8.__proto__ = b5;
      } || function(d8, b5) {
        for (var p8 in b5)
          if (b5.hasOwnProperty(p8))
            d8[p8] = b5[p8];
      };
      __extends3 = function(d8, b5) {
        extendStatics(d8, b5);
        function __() {
          this.constructor = d8;
        }
        d8.prototype = b5 === null ? Object.create(b5) : (__.prototype = b5.prototype, new __());
      };
      __assign3 = Object.assign || function(t14) {
        for (var s9, i6 = 1, n5 = arguments.length; i6 < n5; i6++) {
          s9 = arguments[i6];
          for (var p8 in s9)
            if (Object.prototype.hasOwnProperty.call(s9, p8))
              t14[p8] = s9[p8];
        }
        return t14;
      };
      __rest3 = function(s9, e14) {
        var t14 = {};
        for (var p8 in s9)
          if (Object.prototype.hasOwnProperty.call(s9, p8) && e14.indexOf(p8) < 0)
            t14[p8] = s9[p8];
        if (s9 != null && typeof Object.getOwnPropertySymbols === "function")
          for (var i6 = 0, p8 = Object.getOwnPropertySymbols(s9); i6 < p8.length; i6++) {
            if (e14.indexOf(p8[i6]) < 0 && Object.prototype.propertyIsEnumerable.call(s9, p8[i6]))
              t14[p8[i6]] = s9[p8[i6]];
          }
        return t14;
      };
      __decorate3 = function(decorators, target, key, desc) {
        var c7 = arguments.length, r11 = c7 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d8;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
          r11 = Reflect.decorate(decorators, target, key, desc);
        else
          for (var i6 = decorators.length - 1; i6 >= 0; i6--)
            if (d8 = decorators[i6])
              r11 = (c7 < 3 ? d8(r11) : c7 > 3 ? d8(target, key, r11) : d8(target, key)) || r11;
        return c7 > 3 && r11 && Object.defineProperty(target, key, r11), r11;
      };
      __param3 = function(paramIndex, decorator) {
        return function(target, key) {
          decorator(target, key, paramIndex);
        };
      };
      __metadata3 = function(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
          return Reflect.metadata(metadataKey, metadataValue);
      };
      __awaiter3 = function(thisArg, _arguments, P3, generator) {
        function adopt(value) {
          return value instanceof P3 ? value : new P3(function(resolve) {
            resolve(value);
          });
        }
        return new (P3 || (P3 = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e14) {
              reject(e14);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e14) {
              reject(e14);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      __generator3 = function(thisArg, body) {
        var _ = {label: 0, sent: function() {
          if (t14[0] & 1)
            throw t14[1];
          return t14[1];
        }, trys: [], ops: []}, f7, y5, t14, g5;
        return g5 = {next: verb(0), "throw": verb(1), "return": verb(2)}, typeof Symbol === "function" && (g5[Symbol.iterator] = function() {
          return this;
        }), g5;
        function verb(n5) {
          return function(v6) {
            return step([n5, v6]);
          };
        }
        function step(op) {
          if (f7)
            throw new TypeError("Generator is already executing.");
          while (_)
            try {
              if (f7 = 1, y5 && (t14 = op[0] & 2 ? y5["return"] : op[0] ? y5["throw"] || ((t14 = y5["return"]) && t14.call(y5), 0) : y5.next) && !(t14 = t14.call(y5, op[1])).done)
                return t14;
              if (y5 = 0, t14)
                op = [op[0] & 2, t14.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t14 = op;
                  break;
                case 4:
                  _.label++;
                  return {value: op[1], done: false};
                case 5:
                  _.label++;
                  y5 = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t14 = _.trys, t14 = t14.length > 0 && t14[t14.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t14 || op[1] > t14[0] && op[1] < t14[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t14[1]) {
                    _.label = t14[1];
                    t14 = op;
                    break;
                  }
                  if (t14 && _.label < t14[2]) {
                    _.label = t14[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t14[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e14) {
              op = [6, e14];
              y5 = 0;
            } finally {
              f7 = t14 = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return {value: op[0] ? op[1] : void 0, done: true};
        }
      };
      __createBinding3 = function(o13, m8, k4, k22) {
        if (k22 === void 0)
          k22 = k4;
        o13[k22] = m8[k4];
      };
      __exportStar3 = function(m8, exports2) {
        for (var p8 in m8)
          if (p8 !== "default" && !exports2.hasOwnProperty(p8))
            exports2[p8] = m8[p8];
      };
      __values3 = function(o13) {
        var s9 = typeof Symbol === "function" && Symbol.iterator, m8 = s9 && o13[s9], i6 = 0;
        if (m8)
          return m8.call(o13);
        if (o13 && typeof o13.length === "number")
          return {
            next: function() {
              if (o13 && i6 >= o13.length)
                o13 = void 0;
              return {value: o13 && o13[i6++], done: !o13};
            }
          };
        throw new TypeError(s9 ? "Object is not iterable." : "Symbol.iterator is not defined.");
      };
      __read3 = function(o13, n5) {
        var m8 = typeof Symbol === "function" && o13[Symbol.iterator];
        if (!m8)
          return o13;
        var i6 = m8.call(o13), r11, ar = [], e14;
        try {
          while ((n5 === void 0 || n5-- > 0) && !(r11 = i6.next()).done)
            ar.push(r11.value);
        } catch (error) {
          e14 = {error};
        } finally {
          try {
            if (r11 && !r11.done && (m8 = i6["return"]))
              m8.call(i6);
          } finally {
            if (e14)
              throw e14.error;
          }
        }
        return ar;
      };
      __spread3 = function() {
        for (var ar = [], i6 = 0; i6 < arguments.length; i6++)
          ar = ar.concat(__read3(arguments[i6]));
        return ar;
      };
      __spreadArrays3 = function() {
        for (var s9 = 0, i6 = 0, il = arguments.length; i6 < il; i6++)
          s9 += arguments[i6].length;
        for (var r11 = Array(s9), k4 = 0, i6 = 0; i6 < il; i6++)
          for (var a6 = arguments[i6], j2 = 0, jl = a6.length; j2 < jl; j2++, k4++)
            r11[k4] = a6[j2];
        return r11;
      };
      __await3 = function(v6) {
        return this instanceof __await3 ? (this.v = v6, this) : new __await3(v6);
      };
      __asyncGenerator3 = function(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator)
          throw new TypeError("Symbol.asyncIterator is not defined.");
        var g5 = generator.apply(thisArg, _arguments || []), i6, q2 = [];
        return i6 = {}, verb("next"), verb("throw"), verb("return"), i6[Symbol.asyncIterator] = function() {
          return this;
        }, i6;
        function verb(n5) {
          if (g5[n5])
            i6[n5] = function(v6) {
              return new Promise(function(a6, b5) {
                q2.push([n5, v6, a6, b5]) > 1 || resume(n5, v6);
              });
            };
        }
        function resume(n5, v6) {
          try {
            step(g5[n5](v6));
          } catch (e14) {
            settle(q2[0][3], e14);
          }
        }
        function step(r11) {
          r11.value instanceof __await3 ? Promise.resolve(r11.value.v).then(fulfill, reject) : settle(q2[0][2], r11);
        }
        function fulfill(value) {
          resume("next", value);
        }
        function reject(value) {
          resume("throw", value);
        }
        function settle(f7, v6) {
          if (f7(v6), q2.shift(), q2.length)
            resume(q2[0][0], q2[0][1]);
        }
      };
      __asyncDelegator3 = function(o13) {
        var i6, p8;
        return i6 = {}, verb("next"), verb("throw", function(e14) {
          throw e14;
        }), verb("return"), i6[Symbol.iterator] = function() {
          return this;
        }, i6;
        function verb(n5, f7) {
          i6[n5] = o13[n5] ? function(v6) {
            return (p8 = !p8) ? {value: __await3(o13[n5](v6)), done: n5 === "return"} : f7 ? f7(v6) : v6;
          } : f7;
        }
      };
      __asyncValues3 = function(o13) {
        if (!Symbol.asyncIterator)
          throw new TypeError("Symbol.asyncIterator is not defined.");
        var m8 = o13[Symbol.asyncIterator], i6;
        return m8 ? m8.call(o13) : (o13 = typeof __values3 === "function" ? __values3(o13) : o13[Symbol.iterator](), i6 = {}, verb("next"), verb("throw"), verb("return"), i6[Symbol.asyncIterator] = function() {
          return this;
        }, i6);
        function verb(n5) {
          i6[n5] = o13[n5] && function(v6) {
            return new Promise(function(resolve, reject) {
              v6 = o13[n5](v6), settle(resolve, reject, v6.done, v6.value);
            });
          };
        }
        function settle(resolve, reject, d8, v6) {
          Promise.resolve(v6).then(function(v7) {
            resolve({value: v7, done: d8});
          }, reject);
        }
      };
      __makeTemplateObject3 = function(cooked, raw) {
        if (Object.defineProperty) {
          Object.defineProperty(cooked, "raw", {value: raw});
        } else {
          cooked.raw = raw;
        }
        return cooked;
      };
      __importStar3 = function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k4 in mod)
            if (Object.hasOwnProperty.call(mod, k4))
              result[k4] = mod[k4];
        }
        result["default"] = mod;
        return result;
      };
      __importDefault3 = function(mod) {
        return mod && mod.__esModule ? mod : {"default": mod};
      };
      __classPrivateFieldGet3 = function(receiver, privateMap) {
        if (!privateMap.has(receiver)) {
          throw new TypeError("attempted to get private field on non-instance");
        }
        return privateMap.get(receiver);
      };
      __classPrivateFieldSet3 = function(receiver, privateMap, value) {
        if (!privateMap.has(receiver)) {
          throw new TypeError("attempted to set private field on non-instance");
        }
        privateMap.set(receiver, value);
        return value;
      };
      exporter("__extends", __extends3);
      exporter("__assign", __assign3);
      exporter("__rest", __rest3);
      exporter("__decorate", __decorate3);
      exporter("__param", __param3);
      exporter("__metadata", __metadata3);
      exporter("__awaiter", __awaiter3);
      exporter("__generator", __generator3);
      exporter("__exportStar", __exportStar3);
      exporter("__createBinding", __createBinding3);
      exporter("__values", __values3);
      exporter("__read", __read3);
      exporter("__spread", __spread3);
      exporter("__spreadArrays", __spreadArrays3);
      exporter("__await", __await3);
      exporter("__asyncGenerator", __asyncGenerator3);
      exporter("__asyncDelegator", __asyncDelegator3);
      exporter("__asyncValues", __asyncValues3);
      exporter("__makeTemplateObject", __makeTemplateObject3);
      exporter("__importStar", __importStar3);
      exporter("__importDefault", __importDefault3);
      exporter("__classPrivateFieldGet", __classPrivateFieldGet3);
      exporter("__classPrivateFieldSet", __classPrivateFieldSet3);
    });
  }
});

// ../../node_modules/use-sidecar/node_modules/tslib/tslib.js
var require_tslib2 = __commonJS({
  "../../node_modules/use-sidecar/node_modules/tslib/tslib.js"(exports, module2) {
    var __extends3;
    var __assign3;
    var __rest3;
    var __decorate3;
    var __param3;
    var __metadata3;
    var __awaiter3;
    var __generator3;
    var __exportStar3;
    var __values3;
    var __read3;
    var __spread3;
    var __spreadArrays3;
    var __await3;
    var __asyncGenerator3;
    var __asyncDelegator3;
    var __asyncValues3;
    var __makeTemplateObject3;
    var __importStar3;
    var __importDefault3;
    var __classPrivateFieldGet3;
    var __classPrivateFieldSet3;
    var __createBinding3;
    (function(factory) {
      var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
      if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function(exports2) {
          factory(createExporter(root, createExporter(exports2)));
        });
      } else if (typeof module2 === "object" && typeof module2.exports === "object") {
        factory(createExporter(root, createExporter(module2.exports)));
      } else {
        factory(createExporter(root));
      }
      function createExporter(exports2, previous) {
        if (exports2 !== root) {
          if (typeof Object.create === "function") {
            Object.defineProperty(exports2, "__esModule", {value: true});
          } else {
            exports2.__esModule = true;
          }
        }
        return function(id, v6) {
          return exports2[id] = previous ? previous(id, v6) : v6;
        };
      }
    })(function(exporter) {
      var extendStatics = Object.setPrototypeOf || {__proto__: []} instanceof Array && function(d8, b5) {
        d8.__proto__ = b5;
      } || function(d8, b5) {
        for (var p8 in b5)
          if (b5.hasOwnProperty(p8))
            d8[p8] = b5[p8];
      };
      __extends3 = function(d8, b5) {
        extendStatics(d8, b5);
        function __() {
          this.constructor = d8;
        }
        d8.prototype = b5 === null ? Object.create(b5) : (__.prototype = b5.prototype, new __());
      };
      __assign3 = Object.assign || function(t14) {
        for (var s9, i6 = 1, n5 = arguments.length; i6 < n5; i6++) {
          s9 = arguments[i6];
          for (var p8 in s9)
            if (Object.prototype.hasOwnProperty.call(s9, p8))
              t14[p8] = s9[p8];
        }
        return t14;
      };
      __rest3 = function(s9, e14) {
        var t14 = {};
        for (var p8 in s9)
          if (Object.prototype.hasOwnProperty.call(s9, p8) && e14.indexOf(p8) < 0)
            t14[p8] = s9[p8];
        if (s9 != null && typeof Object.getOwnPropertySymbols === "function")
          for (var i6 = 0, p8 = Object.getOwnPropertySymbols(s9); i6 < p8.length; i6++) {
            if (e14.indexOf(p8[i6]) < 0 && Object.prototype.propertyIsEnumerable.call(s9, p8[i6]))
              t14[p8[i6]] = s9[p8[i6]];
          }
        return t14;
      };
      __decorate3 = function(decorators, target, key, desc) {
        var c7 = arguments.length, r11 = c7 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d8;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
          r11 = Reflect.decorate(decorators, target, key, desc);
        else
          for (var i6 = decorators.length - 1; i6 >= 0; i6--)
            if (d8 = decorators[i6])
              r11 = (c7 < 3 ? d8(r11) : c7 > 3 ? d8(target, key, r11) : d8(target, key)) || r11;
        return c7 > 3 && r11 && Object.defineProperty(target, key, r11), r11;
      };
      __param3 = function(paramIndex, decorator) {
        return function(target, key) {
          decorator(target, key, paramIndex);
        };
      };
      __metadata3 = function(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
          return Reflect.metadata(metadataKey, metadataValue);
      };
      __awaiter3 = function(thisArg, _arguments, P3, generator) {
        function adopt(value) {
          return value instanceof P3 ? value : new P3(function(resolve) {
            resolve(value);
          });
        }
        return new (P3 || (P3 = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e14) {
              reject(e14);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e14) {
              reject(e14);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      __generator3 = function(thisArg, body) {
        var _ = {label: 0, sent: function() {
          if (t14[0] & 1)
            throw t14[1];
          return t14[1];
        }, trys: [], ops: []}, f7, y5, t14, g5;
        return g5 = {next: verb(0), "throw": verb(1), "return": verb(2)}, typeof Symbol === "function" && (g5[Symbol.iterator] = function() {
          return this;
        }), g5;
        function verb(n5) {
          return function(v6) {
            return step([n5, v6]);
          };
        }
        function step(op) {
          if (f7)
            throw new TypeError("Generator is already executing.");
          while (_)
            try {
              if (f7 = 1, y5 && (t14 = op[0] & 2 ? y5["return"] : op[0] ? y5["throw"] || ((t14 = y5["return"]) && t14.call(y5), 0) : y5.next) && !(t14 = t14.call(y5, op[1])).done)
                return t14;
              if (y5 = 0, t14)
                op = [op[0] & 2, t14.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t14 = op;
                  break;
                case 4:
                  _.label++;
                  return {value: op[1], done: false};
                case 5:
                  _.label++;
                  y5 = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t14 = _.trys, t14 = t14.length > 0 && t14[t14.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t14 || op[1] > t14[0] && op[1] < t14[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t14[1]) {
                    _.label = t14[1];
                    t14 = op;
                    break;
                  }
                  if (t14 && _.label < t14[2]) {
                    _.label = t14[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t14[2])
                    _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e14) {
              op = [6, e14];
              y5 = 0;
            } finally {
              f7 = t14 = 0;
            }
          if (op[0] & 5)
            throw op[1];
          return {value: op[0] ? op[1] : void 0, done: true};
        }
      };
      __createBinding3 = function(o13, m8, k4, k22) {
        if (k22 === void 0)
          k22 = k4;
        o13[k22] = m8[k4];
      };
      __exportStar3 = function(m8, exports2) {
        for (var p8 in m8)
          if (p8 !== "default" && !exports2.hasOwnProperty(p8))
            exports2[p8] = m8[p8];
      };
      __values3 = function(o13) {
        var s9 = typeof Symbol === "function" && Symbol.iterator, m8 = s9 && o13[s9], i6 = 0;
        if (m8)
          return m8.call(o13);
        if (o13 && typeof o13.length === "number")
          return {
            next: function() {
              if (o13 && i6 >= o13.length)
                o13 = void 0;
              return {value: o13 && o13[i6++], done: !o13};
            }
          };
        throw new TypeError(s9 ? "Object is not iterable." : "Symbol.iterator is not defined.");
      };
      __read3 = function(o13, n5) {
        var m8 = typeof Symbol === "function" && o13[Symbol.iterator];
        if (!m8)
          return o13;
        var i6 = m8.call(o13), r11, ar = [], e14;
        try {
          while ((n5 === void 0 || n5-- > 0) && !(r11 = i6.next()).done)
            ar.push(r11.value);
        } catch (error) {
          e14 = {error};
        } finally {
          try {
            if (r11 && !r11.done && (m8 = i6["return"]))
              m8.call(i6);
          } finally {
            if (e14)
              throw e14.error;
          }
        }
        return ar;
      };
      __spread3 = function() {
        for (var ar = [], i6 = 0; i6 < arguments.length; i6++)
          ar = ar.concat(__read3(arguments[i6]));
        return ar;
      };
      __spreadArrays3 = function() {
        for (var s9 = 0, i6 = 0, il = arguments.length; i6 < il; i6++)
          s9 += arguments[i6].length;
        for (var r11 = Array(s9), k4 = 0, i6 = 0; i6 < il; i6++)
          for (var a6 = arguments[i6], j2 = 0, jl = a6.length; j2 < jl; j2++, k4++)
            r11[k4] = a6[j2];
        return r11;
      };
      __await3 = function(v6) {
        return this instanceof __await3 ? (this.v = v6, this) : new __await3(v6);
      };
      __asyncGenerator3 = function(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator)
          throw new TypeError("Symbol.asyncIterator is not defined.");
        var g5 = generator.apply(thisArg, _arguments || []), i6, q2 = [];
        return i6 = {}, verb("next"), verb("throw"), verb("return"), i6[Symbol.asyncIterator] = function() {
          return this;
        }, i6;
        function verb(n5) {
          if (g5[n5])
            i6[n5] = function(v6) {
              return new Promise(function(a6, b5) {
                q2.push([n5, v6, a6, b5]) > 1 || resume(n5, v6);
              });
            };
        }
        function resume(n5, v6) {
          try {
            step(g5[n5](v6));
          } catch (e14) {
            settle(q2[0][3], e14);
          }
        }
        function step(r11) {
          r11.value instanceof __await3 ? Promise.resolve(r11.value.v).then(fulfill, reject) : settle(q2[0][2], r11);
        }
        function fulfill(value) {
          resume("next", value);
        }
        function reject(value) {
          resume("throw", value);
        }
        function settle(f7, v6) {
          if (f7(v6), q2.shift(), q2.length)
            resume(q2[0][0], q2[0][1]);
        }
      };
      __asyncDelegator3 = function(o13) {
        var i6, p8;
        return i6 = {}, verb("next"), verb("throw", function(e14) {
          throw e14;
        }), verb("return"), i6[Symbol.iterator] = function() {
          return this;
        }, i6;
        function verb(n5, f7) {
          i6[n5] = o13[n5] ? function(v6) {
            return (p8 = !p8) ? {value: __await3(o13[n5](v6)), done: n5 === "return"} : f7 ? f7(v6) : v6;
          } : f7;
        }
      };
      __asyncValues3 = function(o13) {
        if (!Symbol.asyncIterator)
          throw new TypeError("Symbol.asyncIterator is not defined.");
        var m8 = o13[Symbol.asyncIterator], i6;
        return m8 ? m8.call(o13) : (o13 = typeof __values3 === "function" ? __values3(o13) : o13[Symbol.iterator](), i6 = {}, verb("next"), verb("throw"), verb("return"), i6[Symbol.asyncIterator] = function() {
          return this;
        }, i6);
        function verb(n5) {
          i6[n5] = o13[n5] && function(v6) {
            return new Promise(function(resolve, reject) {
              v6 = o13[n5](v6), settle(resolve, reject, v6.done, v6.value);
            });
          };
        }
        function settle(resolve, reject, d8, v6) {
          Promise.resolve(v6).then(function(v7) {
            resolve({value: v7, done: d8});
          }, reject);
        }
      };
      __makeTemplateObject3 = function(cooked, raw) {
        if (Object.defineProperty) {
          Object.defineProperty(cooked, "raw", {value: raw});
        } else {
          cooked.raw = raw;
        }
        return cooked;
      };
      __importStar3 = function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k4 in mod)
            if (Object.hasOwnProperty.call(mod, k4))
              result[k4] = mod[k4];
        }
        result["default"] = mod;
        return result;
      };
      __importDefault3 = function(mod) {
        return mod && mod.__esModule ? mod : {"default": mod};
      };
      __classPrivateFieldGet3 = function(receiver, privateMap) {
        if (!privateMap.has(receiver)) {
          throw new TypeError("attempted to get private field on non-instance");
        }
        return privateMap.get(receiver);
      };
      __classPrivateFieldSet3 = function(receiver, privateMap, value) {
        if (!privateMap.has(receiver)) {
          throw new TypeError("attempted to set private field on non-instance");
        }
        privateMap.set(receiver, value);
        return value;
      };
      exporter("__extends", __extends3);
      exporter("__assign", __assign3);
      exporter("__rest", __rest3);
      exporter("__decorate", __decorate3);
      exporter("__param", __param3);
      exporter("__metadata", __metadata3);
      exporter("__awaiter", __awaiter3);
      exporter("__generator", __generator3);
      exporter("__exportStar", __exportStar3);
      exporter("__createBinding", __createBinding3);
      exporter("__values", __values3);
      exporter("__read", __read3);
      exporter("__spread", __spread3);
      exporter("__spreadArrays", __spreadArrays3);
      exporter("__await", __await3);
      exporter("__asyncGenerator", __asyncGenerator3);
      exporter("__asyncDelegator", __asyncDelegator3);
      exporter("__asyncValues", __asyncValues3);
      exporter("__makeTemplateObject", __makeTemplateObject3);
      exporter("__importStar", __importStar3);
      exporter("__importDefault", __importDefault3);
      exporter("__classPrivateFieldGet", __classPrivateFieldGet3);
      exporter("__classPrivateFieldSet", __classPrivateFieldSet3);
    });
  }
});

// src/index.ts
__markAsModule(exports);
__export(exports, {
  AlignType: () => AlignType,
  ColorStyle: () => ColorStyle,
  DashStyle: () => DashStyle,
  Decoration: () => Decoration,
  DistributeType: () => DistributeType,
  FlipType: () => FlipType,
  FontSize: () => FontSize,
  MoveType: () => MoveType,
  SizeStyle: () => SizeStyle,
  StretchType: () => StretchType,
  TLDraw: () => TLDraw,
  TLDrawShapeType: () => TLDrawShapeType,
  TLDrawShapeUtil: () => TLDrawShapeUtil,
  TLDrawState: () => TLDrawState,
  TLDrawToolType: () => TLDrawToolType,
  createShape: () => createShape,
  defaultStyle: () => defaultStyle,
  fills: () => fills,
  getFontSize: () => getFontSize,
  getFontStyle: () => getFontStyle,
  getPerfectDashProps: () => getPerfectDashProps,
  getShapeStyle: () => getShapeStyle,
  getShapeUtils: () => getShapeUtils,
  getShapeUtilsByType: () => getShapeUtilsByType,
  getStrokeWidth: () => getStrokeWidth,
  strokes: () => strokes,
  tldrawShapeUtils: () => tldrawShapeUtils
});

// src/components/tldraw.tsx
var React36 = __toModule(require("react"));

// ../../node_modules/@radix-ui/react-id/dist/index.module.js
var e = __toModule(require("react"));

// ../../node_modules/@babel/runtime/helpers/esm/extends.js
function _extends() {
  _extends = Object.assign || function(target) {
    for (var i6 = 1; i6 < arguments.length; i6++) {
      var source = arguments[i6];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}

// ../../node_modules/@radix-ui/react-id/dist/index.module.js
var t = {prefix: Math.round(1e10 * Math.random()), current: 0};
var n = /* @__PURE__ */ e.createContext(t);
var IdProvider = (o13) => {
  const i6 = e.useContext(n), s9 = i6 === t, a6 = e.useMemo(() => ({prefix: s9 ? 0 : ++i6.prefix, current: 0}), [s9, i6]);
  return e.createElement(n.Provider, _extends({value: a6}, o13));
};
function useId(r11) {
  const o13 = e.useContext(n);
  return Boolean(globalThis === null || globalThis === void 0 ? void 0 : globalThis.document) || o13 !== t || console.warn("When server rendering, you must wrap your application in an <IdProvider> to ensure consistent ids are generated between the client and server."), e.useMemo(() => r11 || `radix-id-${o13.prefix}-${++o13.current}`, [r11]);
}

// src/components/tldraw.tsx
var import_core29 = __toModule(require_cjs());

// src/shape/shapes/draw/draw.tsx
var React = __toModule(require("react"));
var import_core3 = __toModule(require_cjs());

// ../../node_modules/perfect-freehand/dist/perfect-freehand.esm.js
function add(A3, B3) {
  return [A3[0] + B3[0], A3[1] + B3[1]];
}
function sub(A3, B3) {
  return [A3[0] - B3[0], A3[1] - B3[1]];
}
function vec(A3, B3) {
  return [B3[0] - A3[0], B3[1] - A3[1]];
}
function mul(A3, n5) {
  return [A3[0] * n5, A3[1] * n5];
}
function div(A3, n5) {
  return [A3[0] / n5, A3[1] / n5];
}
function per(A3) {
  return [A3[1], -A3[0]];
}
function dpr(A3, B3) {
  return A3[0] * B3[0] + A3[1] * B3[1];
}
function len(A3) {
  return Math.hypot(A3[0], A3[1]);
}
function len2(A3) {
  return A3[0] * A3[0] + A3[1] * A3[1];
}
function dist2(A3, B3) {
  return len2(sub(A3, B3));
}
function uni(A3) {
  return div(A3, len(A3));
}
function dist(A3, B3) {
  return Math.hypot(A3[1] - B3[1], A3[0] - B3[0]);
}
function rotAround(A3, C6, r11) {
  var s9 = Math.sin(r11);
  var c7 = Math.cos(r11);
  var px = A3[0] - C6[0];
  var py = A3[1] - C6[1];
  var nx = px * c7 - py * s9;
  var ny = px * s9 + py * c7;
  return [nx + C6[0], ny + C6[1]];
}
function lrp(A3, B3, t14) {
  return add(A3, mul(vec(A3, B3), t14));
}
function isEqual(a6, b5) {
  return a6[0] === b5[0] && a6[1] === b5[1];
}
function lerp(y1, y22, mu) {
  return y1 * (1 - mu) + y22 * mu;
}
function clamp(n5, a6, b5) {
  return Math.max(a6, Math.min(b5, n5));
}
function toPointsArray(points) {
  if (Array.isArray(points[0])) {
    return points.map(function(_ref) {
      var x6 = _ref[0], y5 = _ref[1], _ref$ = _ref[2], pressure = _ref$ === void 0 ? 0.5 : _ref$;
      return [x6, y5, pressure];
    });
  } else {
    return points.map(function(_ref2) {
      var x6 = _ref2.x, y5 = _ref2.y, _ref2$pressure = _ref2.pressure, pressure = _ref2$pressure === void 0 ? 0.5 : _ref2$pressure;
      return [x6, y5, pressure];
    });
  }
}
function getStrokeRadius(size, thinning, easing, pressure) {
  if (pressure === void 0) {
    pressure = 0.5;
  }
  if (!thinning)
    return size / 2;
  pressure = clamp(easing(pressure), 0, 1);
  return (thinning < 0 ? lerp(size, size + size * clamp(thinning, -0.95, -0.05), pressure) : lerp(size - size * clamp(thinning, 0.05, 0.95), size, pressure)) / 2;
}
var min = Math.min;
var PI = Math.PI;
function getStrokePoints(points, options) {
  if (options === void 0) {
    options = {};
  }
  var _options = options, _options$simulatePres = _options.simulatePressure, simulatePressure = _options$simulatePres === void 0 ? true : _options$simulatePres, _options$streamline = _options.streamline, streamline = _options$streamline === void 0 ? 0.5 : _options$streamline, _options$size = _options.size, size = _options$size === void 0 ? 8 : _options$size;
  streamline /= 2;
  if (!simulatePressure) {
    streamline /= 2;
  }
  var pts = toPointsArray(points);
  if (pts.length === 0)
    return [];
  if (pts.length === 1)
    pts.push([].concat(add(pts[0], [1, 1]), [pts[0][2]]));
  var strokePoints = [{
    point: [pts[0][0], pts[0][1]],
    pressure: pts[0][2],
    vector: [0, 0],
    distance: 0,
    runningLength: 0
  }];
  for (var i6 = 1, j2 = 0, curr = pts[i6], prev = strokePoints[j2]; i6 < pts.length; i6++, curr = pts[i6], prev = strokePoints[j2]) {
    var point = lrp(prev.point, curr, 1 - streamline);
    if (isEqual(prev.point, point))
      continue;
    var pressure = curr[2];
    var vector = uni(vec(point, prev.point));
    var distance = dist(point, prev.point);
    var runningLength = prev.runningLength + distance;
    var strokePoint = {
      point,
      pressure,
      vector,
      distance,
      runningLength
    };
    strokePoints.push(strokePoint);
    j2 += 1;
  }
  var len3 = strokePoints.length;
  var totalLength = strokePoints[len3 - 1].runningLength;
  for (var _i = len3 - 2; _i > 1; _i--) {
    var _strokePoints$_i = strokePoints[_i], _runningLength = _strokePoints$_i.runningLength, _vector = _strokePoints$_i.vector;
    var dpr$1 = dpr(strokePoints[_i - 1].vector, strokePoints[_i].vector);
    if (totalLength - _runningLength > size / 2 || dpr$1 < 0.8) {
      for (var _j = _i; _j < len3; _j++) {
        strokePoints[_j].vector = _vector;
      }
      break;
    }
  }
  return strokePoints;
}
function getStrokeOutlinePoints(points, options) {
  if (options === void 0) {
    options = {};
  }
  var _options2 = options, _options2$size = _options2.size, size = _options2$size === void 0 ? 8 : _options2$size, _options2$thinning = _options2.thinning, thinning = _options2$thinning === void 0 ? 0.5 : _options2$thinning, _options2$smoothing = _options2.smoothing, smoothing = _options2$smoothing === void 0 ? 0.5 : _options2$smoothing, _options2$simulatePre = _options2.simulatePressure, simulatePressure = _options2$simulatePre === void 0 ? true : _options2$simulatePre, _options2$easing = _options2.easing, easing = _options2$easing === void 0 ? function(t15) {
    return t15;
  } : _options2$easing, _options2$start = _options2.start, start = _options2$start === void 0 ? {} : _options2$start, _options2$end = _options2.end, end = _options2$end === void 0 ? {} : _options2$end, _options2$last = _options2.last, isComplete = _options2$last === void 0 ? false : _options2$last;
  var _options3 = options, _options3$streamline = _options3.streamline, streamline = _options3$streamline === void 0 ? 0.5 : _options3$streamline;
  streamline /= 2;
  var _start$taper = start.taper, taperStart = _start$taper === void 0 ? 0 : _start$taper, _start$easing = start.easing, taperStartEase = _start$easing === void 0 ? function(t15) {
    return t15 * (2 - t15);
  } : _start$easing;
  var _end$taper = end.taper, taperEnd = _end$taper === void 0 ? 0 : _end$taper, _end$easing = end.easing, taperEndEase = _end$easing === void 0 ? function(t15) {
    return --t15 * t15 * t15 + 1;
  } : _end$easing;
  var len3 = points.length;
  if (len3 === 0)
    return [];
  var totalLength = points[len3 - 1].runningLength;
  var leftPts = [];
  var rightPts = [];
  var prevPressure = points.slice(0, 5).reduce(function(acc, cur) {
    return (acc + cur.pressure) / 2;
  }, points[0].pressure);
  var radius = getStrokeRadius(size, thinning, easing, points[len3 - 1].pressure);
  var prevVector = points[0].vector;
  var pl = points[0].point;
  var pr = pl;
  var tl = pl;
  var tr = pr;
  for (var i6 = 1; i6 < len3 - 1; i6++) {
    var _points$i = points[i6], point = _points$i.point, pressure = _points$i.pressure, vector = _points$i.vector, distance = _points$i.distance, runningLength = _points$i.runningLength;
    if (thinning) {
      if (simulatePressure) {
        var rp = min(1, 1 - distance / size);
        var sp = min(1, distance / size);
        pressure = min(1, prevPressure + (rp - prevPressure) * (sp / 2));
      }
      radius = getStrokeRadius(size, thinning, easing, pressure);
    } else {
      radius = size / 2;
    }
    var ts = runningLength < taperStart ? taperStartEase(runningLength / taperStart) : 1;
    var te = totalLength - runningLength < taperEnd ? taperEndEase((totalLength - runningLength) / taperEnd) : 1;
    radius *= Math.min(ts, te);
    var nextVector = points[i6 + 1].vector;
    var dpr$1 = dpr(vector, nextVector);
    if (dpr$1 < 0) {
      var _offset = mul(per(prevVector), radius);
      for (var t14 = 0; t14 < 1; t14 += 0.2) {
        tr = rotAround(add(point, _offset), point, PI * -t14);
        tl = rotAround(sub(point, _offset), point, PI * t14);
        rightPts.push(tr);
        leftPts.push(tl);
      }
      pl = tl;
      pr = tr;
      continue;
    }
    var offset = mul(per(lrp(nextVector, vector, dpr$1)), radius);
    tl = sub(point, offset);
    tr = add(point, offset);
    var alwaysAdd = i6 === 1 || dpr$1 < 0.25;
    var minDistance = Math.pow((runningLength > size ? size : size / 2) * smoothing, 2);
    if (alwaysAdd || dist2(pl, tl) > minDistance) {
      leftPts.push(lrp(pl, tl, streamline));
      pl = tl;
    }
    if (alwaysAdd || dist2(pr, tr) > minDistance) {
      rightPts.push(lrp(pr, tr, streamline));
      pr = tr;
    }
    prevPressure = pressure;
    prevVector = vector;
  }
  var firstPoint = points[0];
  var lastPoint = points[len3 - 1];
  var isVeryShort = rightPts.length < 2 || leftPts.length < 2;
  if (isVeryShort && (!(taperStart || taperEnd) || isComplete)) {
    var ir = 0;
    for (var _i2 = 0; _i2 < len3; _i2++) {
      var _points$_i = points[_i2], _pressure = _points$_i.pressure, _runningLength2 = _points$_i.runningLength;
      if (_runningLength2 > size) {
        ir = getStrokeRadius(size, thinning, easing, _pressure);
        break;
      }
    }
    var _start = sub(firstPoint.point, mul(per(uni(vec(lastPoint.point, firstPoint.point))), ir || radius));
    var dotPts = [];
    for (var _t = 0, step = 0.1; _t <= 1; _t += step) {
      dotPts.push(rotAround(_start, firstPoint.point, PI * 2 * _t));
    }
    return dotPts;
  }
  var startCap = [];
  if (!taperStart && !(taperEnd && isVeryShort)) {
    tr = rightPts[1];
    for (var _i3 = 1; _i3 < leftPts.length; _i3++) {
      if (!isEqual(tr, leftPts[_i3])) {
        tl = leftPts[_i3];
        break;
      }
    }
    if (!isEqual(tr, tl)) {
      var _start2 = sub(firstPoint.point, mul(uni(vec(tr, tl)), dist(tr, tl) / 2));
      for (var _t2 = 0, _step = 0.2; _t2 <= 1; _t2 += _step) {
        startCap.push(rotAround(_start2, firstPoint.point, PI * _t2));
      }
      leftPts.shift();
      rightPts.shift();
    }
  }
  var endCap = [];
  if (!taperEnd && !(taperStart && isVeryShort)) {
    var _start3 = sub(lastPoint.point, mul(per(lastPoint.vector), radius));
    for (var _t3 = 0, _step2 = 0.1; _t3 <= 1; _t3 += _step2) {
      endCap.push(rotAround(_start3, lastPoint.point, PI * 3 * _t3));
    }
  } else {
    endCap.push(lastPoint.point);
  }
  return leftPts.concat(endCap, rightPts.reverse(), startCap);
}
function getStroke(points, options) {
  if (options === void 0) {
    options = {};
  }
  return getStrokeOutlinePoints(getStrokePoints(points, options), options);
}
var perfect_freehand_esm_default = getStroke;

// src/shape/shape-styles.ts
var import_core2 = __toModule(require_cjs());

// src/shape/shape-types.ts
var import_core = __toModule(require_cjs());
var TLDrawToolType;
(function(TLDrawToolType2) {
  TLDrawToolType2["Draw"] = "draw";
  TLDrawToolType2["Bounds"] = "bounds";
  TLDrawToolType2["Point"] = "point";
  TLDrawToolType2["Handle"] = "handle";
  TLDrawToolType2["Points"] = "points";
  TLDrawToolType2["Text"] = "text";
})(TLDrawToolType || (TLDrawToolType = {}));
var TLDrawShapeType;
(function(TLDrawShapeType2) {
  TLDrawShapeType2["Ellipse"] = "ellipse";
  TLDrawShapeType2["Rectangle"] = "rectangle";
  TLDrawShapeType2["Draw"] = "draw";
  TLDrawShapeType2["Arrow"] = "arrow";
  TLDrawShapeType2["Text"] = "text";
})(TLDrawShapeType || (TLDrawShapeType = {}));
var Decoration;
(function(Decoration2) {
  Decoration2["Arrow"] = "Arrow";
})(Decoration || (Decoration = {}));
var TLDrawShapeUtil = class extends import_core.TLShapeUtil {
};
var ColorStyle;
(function(ColorStyle3) {
  ColorStyle3["White"] = "White";
  ColorStyle3["LightGray"] = "LightGray";
  ColorStyle3["Gray"] = "Gray";
  ColorStyle3["Black"] = "Black";
  ColorStyle3["Green"] = "Green";
  ColorStyle3["Cyan"] = "Cyan";
  ColorStyle3["Blue"] = "Blue";
  ColorStyle3["Indigo"] = "Indigo";
  ColorStyle3["Violet"] = "Violet";
  ColorStyle3["Red"] = "Red";
  ColorStyle3["Orange"] = "Orange";
  ColorStyle3["Yellow"] = "Yellow";
})(ColorStyle || (ColorStyle = {}));
var SizeStyle;
(function(SizeStyle2) {
  SizeStyle2["Small"] = "Small";
  SizeStyle2["Medium"] = "Medium";
  SizeStyle2["Large"] = "Large";
})(SizeStyle || (SizeStyle = {}));
var DashStyle;
(function(DashStyle2) {
  DashStyle2["Draw"] = "Draw";
  DashStyle2["Solid"] = "Solid";
  DashStyle2["Dashed"] = "Dashed";
  DashStyle2["Dotted"] = "Dotted";
})(DashStyle || (DashStyle = {}));
var FontSize;
(function(FontSize2) {
  FontSize2["Small"] = "Small";
  FontSize2["Medium"] = "Medium";
  FontSize2["Large"] = "Large";
  FontSize2["ExtraLarge"] = "ExtraLarge";
})(FontSize || (FontSize = {}));

// src/shape/shape-styles.ts
var canvasLight = "#fafafa";
var canvasDark = "#343d45";
var colors = {
  [ColorStyle.Black]: "#212528",
  [ColorStyle.White]: "#f0f1f3",
  [ColorStyle.LightGray]: "#c6cbd1",
  [ColorStyle.Gray]: "#788492",
  [ColorStyle.Green]: "#36b24d",
  [ColorStyle.Cyan]: "#0e98ad",
  [ColorStyle.Blue]: "#1c7ed6",
  [ColorStyle.Indigo]: "#4263eb",
  [ColorStyle.Violet]: "#7746f1",
  [ColorStyle.Red]: "#ff2133",
  [ColorStyle.Orange]: "#ff9433",
  [ColorStyle.Yellow]: "#ffc936"
};
var strokes = {
  light: colors,
  dark: {
    ...Object.fromEntries(Object.entries(colors).map(([k4, v6]) => [k4, import_core2.Utils.lerpColor(v6, canvasDark, 0.1)])),
    [ColorStyle.White]: "#ffffff",
    [ColorStyle.Black]: "#000"
  }
};
var fills = {
  light: {
    ...Object.fromEntries(Object.entries(colors).map(([k4, v6]) => [k4, import_core2.Utils.lerpColor(v6, canvasLight, 0.82)])),
    [ColorStyle.White]: "#ffffff",
    [ColorStyle.Black]: "#ffffff"
  },
  dark: Object.fromEntries(Object.entries(colors).map(([k4, v6]) => [k4, import_core2.Utils.lerpColor(v6, canvasDark, 0.618)]))
};
var strokeWidths = {
  [SizeStyle.Small]: 2,
  [SizeStyle.Medium]: 4,
  [SizeStyle.Large]: 8
};
var fontSizes = {
  [SizeStyle.Small]: 24,
  [SizeStyle.Medium]: 48,
  [SizeStyle.Large]: 72,
  auto: "auto"
};
function getStrokeWidth(size) {
  return strokeWidths[size];
}
function getFontSize(size) {
  return fontSizes[size];
}
function getFontStyle(style2) {
  const fontSize = getFontSize(style2.size);
  const {scale = 1} = style2;
  return `${fontSize * scale}px/1.4 Verveine Regular`;
}
function getShapeStyle(style2, isDarkMode = false) {
  const {color, size, isFilled} = style2;
  const strokeWidth = getStrokeWidth(size);
  const theme2 = isDarkMode ? "dark" : "light";
  return {
    stroke: strokes[theme2][color],
    fill: isFilled ? fills[theme2][color] : "none",
    strokeWidth
  };
}
var defaultStyle = {
  color: ColorStyle.Black,
  size: SizeStyle.Medium,
  isFilled: false,
  dash: DashStyle.Draw
};
function getPerfectDashProps(length, strokeWidth, style2, snap = 1) {
  let dashLength;
  let strokeDashoffset;
  let ratio;
  if (style2 === DashStyle.Solid || style2 === DashStyle.Draw) {
    return {
      strokeDasharray: "none",
      strokeDashoffset: "none"
    };
  } else if (style2 === DashStyle.Dashed) {
    dashLength = strokeWidth * 2;
    ratio = 1;
    strokeDashoffset = (dashLength / 2).toString();
  } else {
    dashLength = strokeWidth / 100;
    ratio = 100;
    strokeDashoffset = "0";
  }
  let dashes2 = Math.floor(length / dashLength / (2 * ratio));
  dashes2 -= dashes2 % snap;
  if (dashes2 === 0)
    dashes2 = 1;
  const gapLength = (length - dashes2 * dashLength) / dashes2;
  return {
    strokeDasharray: [dashLength, gapLength].join(" "),
    strokeDashoffset
  };
}

// src/shape/shapes/draw/draw.tsx
var Draw = class extends TLDrawShapeUtil {
  constructor() {
    super(...arguments);
    this.type = TLDrawShapeType.Draw;
    this.toolType = TLDrawToolType.Draw;
    this.pointsBoundsCache = new WeakMap([]);
    this.rotatedCache = new WeakMap([]);
    this.drawPathCache = new WeakMap([]);
    this.simplePathCache = new WeakMap([]);
    this.polygonCache = new WeakMap([]);
    this.defaultProps = {
      id: "id",
      type: TLDrawShapeType.Draw,
      name: "Draw",
      parentId: "page",
      childIndex: 1,
      point: [0, 0],
      points: [[0, 0, 0.5]],
      rotation: 0,
      style: defaultStyle
    };
  }
  shouldRender(prev, next) {
    return next.points !== prev.points || next.style !== prev.style;
  }
  render(shape, {isDarkMode}) {
    const {points, style: style2} = shape;
    const styles = getShapeStyle(style2, isDarkMode);
    const strokeWidth = +styles.strokeWidth;
    const shouldFill = style2.isFilled && points.length > 3 && import_core3.Vec.dist(points[0], points[points.length - 1]) < +styles.strokeWidth * 2;
    if (points.length > 0 && points.length < 3) {
      const sw2 = strokeWidth * 0.618;
      return /* @__PURE__ */ React.createElement("circle", {
        r: strokeWidth * 0.618,
        fill: styles.stroke,
        stroke: styles.stroke,
        strokeWidth: sw2,
        pointerEvents: "all"
      });
    }
    if (shape.style.dash === DashStyle.Draw) {
      const polygonPathData = import_core3.Utils.getFromCache(this.polygonCache, points, () => getFillPath(shape));
      const drawPathData = import_core3.Utils.getFromCache(this.drawPathCache, points, () => getDrawStrokePath(shape));
      return /* @__PURE__ */ React.createElement(React.Fragment, null, shouldFill && /* @__PURE__ */ React.createElement("path", {
        d: polygonPathData,
        stroke: "none",
        fill: styles.fill,
        strokeLinejoin: "round",
        strokeLinecap: "round",
        pointerEvents: "fill"
      }), /* @__PURE__ */ React.createElement("path", {
        d: drawPathData,
        fill: styles.stroke,
        stroke: styles.stroke,
        strokeWidth,
        strokeLinejoin: "round",
        strokeLinecap: "round",
        pointerEvents: "all"
      }));
    }
    const strokeDasharray = {
      [DashStyle.Draw]: "none",
      [DashStyle.Solid]: `none`,
      [DashStyle.Dotted]: `${strokeWidth / 10} ${strokeWidth * 3}`,
      [DashStyle.Dashed]: `${strokeWidth * 3} ${strokeWidth * 3}`
    }[style2.dash];
    const strokeDashoffset = {
      [DashStyle.Draw]: "none",
      [DashStyle.Solid]: `none`,
      [DashStyle.Dotted]: `-${strokeWidth / 20}`,
      [DashStyle.Dashed]: `-${strokeWidth}`
    }[style2.dash];
    const path = import_core3.Utils.getFromCache(this.simplePathCache, points, () => getSolidStrokePath(shape));
    const sw = strokeWidth * 1.618;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", {
      d: path,
      fill: shouldFill ? styles.fill : "none",
      stroke: "transparent",
      strokeWidth: Math.min(4, strokeWidth * 2),
      strokeLinejoin: "round",
      strokeLinecap: "round",
      pointerEvents: shouldFill ? "all" : "stroke"
    }), /* @__PURE__ */ React.createElement("path", {
      d: path,
      fill: "transparent",
      stroke: styles.stroke,
      strokeWidth: sw,
      strokeDasharray,
      strokeDashoffset,
      strokeLinejoin: "round",
      strokeLinecap: "round",
      pointerEvents: "stroke"
    }));
  }
  renderIndicator(shape) {
    const {points} = shape;
    const path = import_core3.Utils.getFromCache(this.simplePathCache, points, () => getSolidStrokePath(shape));
    return /* @__PURE__ */ React.createElement("path", {
      d: path
    });
  }
  getBounds(shape) {
    return import_core3.Utils.translateBounds(import_core3.Utils.getFromCache(this.pointsBoundsCache, shape.points, () => import_core3.Utils.getBoundsFromPoints(shape.points)), shape.point);
  }
  getRotatedBounds(shape) {
    return import_core3.Utils.translateBounds(import_core3.Utils.getBoundsFromPoints(shape.points, shape.rotation), shape.point);
  }
  getCenter(shape) {
    return import_core3.Utils.getBoundsCenter(this.getBounds(shape));
  }
  hitTest() {
    return true;
  }
  hitTestBounds(shape, brushBounds) {
    if (!shape.rotation) {
      const bounds = this.getBounds(shape);
      return import_core3.Utils.boundsContain(brushBounds, bounds) || (import_core3.Utils.boundsContain(bounds, brushBounds) || import_core3.Intersect.bounds.bounds(bounds, brushBounds).length > 0) && import_core3.Intersect.polyline.bounds(shape.points, import_core3.Utils.translateBounds(brushBounds, import_core3.Vec.neg(shape.point))).length > 0;
    }
    const rBounds = this.getRotatedBounds(shape);
    const rotatedBounds = import_core3.Utils.getFromCache(this.rotatedCache, shape, () => {
      const c7 = import_core3.Utils.getBoundsCenter(import_core3.Utils.getBoundsFromPoints(shape.points));
      return shape.points.map((pt) => import_core3.Vec.rotWith(pt, c7, shape.rotation || 0));
    });
    return import_core3.Utils.boundsContain(brushBounds, rBounds) || import_core3.Intersect.bounds.polyline(import_core3.Utils.translateBounds(brushBounds, import_core3.Vec.neg(shape.point)), rotatedBounds).length > 0;
  }
  transform(shape, bounds, {initialShape, scaleX, scaleY}) {
    const initialShapeBounds = import_core3.Utils.getFromCache(this.boundsCache, initialShape, () => import_core3.Utils.getBoundsFromPoints(initialShape.points));
    const points = initialShape.points.map(([x6, y5, r11]) => {
      return [
        bounds.width * (scaleX < 0 ? 1 - x6 / initialShapeBounds.width : x6 / initialShapeBounds.width),
        bounds.height * (scaleY < 0 ? 1 - y5 / initialShapeBounds.height : y5 / initialShapeBounds.height),
        r11
      ];
    });
    const newBounds = import_core3.Utils.getBoundsFromPoints(shape.points);
    const point = import_core3.Vec.sub([bounds.minX, bounds.minY], [newBounds.minX, newBounds.minY]);
    return {
      points,
      point
    };
  }
  transformSingle(shape, bounds, info) {
    return this.transform(shape, bounds, info);
  }
  onSessionComplete(shape) {
    const bounds = this.getBounds(shape);
    const [x1, y1] = import_core3.Vec.sub([bounds.minX, bounds.minY], shape.point);
    return {
      points: shape.points.map(([x0, y0, p8]) => [x0 - x1, y0 - y1, p8]),
      point: import_core3.Vec.add(shape.point, [x1, y1])
    };
  }
};
var simulatePressureSettings = {
  simulatePressure: true
};
var realPressureSettings = {
  easing: (t14) => t14 * t14,
  simulatePressure: false,
  start: {taper: 1},
  end: {taper: 1}
};
function getFillPath(shape) {
  const styles = getShapeStyle(shape.style);
  if (shape.points.length < 2) {
    return "";
  }
  return import_core3.Utils.getSvgPathFromStroke(getStrokePoints(shape.points, {
    size: 1 + +styles.strokeWidth * 2,
    thinning: 0.85,
    end: {taper: +styles.strokeWidth * 20},
    start: {taper: +styles.strokeWidth * 20}
  }).map((pt) => pt.point));
}
function getDrawStrokePath(shape) {
  const styles = getShapeStyle(shape.style);
  if (shape.points.length < 2) {
    return "";
  }
  const options = shape.points[1][2] === 0.5 ? simulatePressureSettings : realPressureSettings;
  const stroke = perfect_freehand_esm_default(shape.points, {
    size: 1 + +styles.strokeWidth * 2,
    thinning: 0.85,
    end: {taper: +styles.strokeWidth * 10},
    start: {taper: +styles.strokeWidth * 10},
    ...options
  });
  return import_core3.Utils.getSvgPathFromStroke(stroke);
}
function getSolidStrokePath(shape) {
  let {points} = shape;
  let len3 = points.length;
  if (len3 === 0)
    return "M 0 0 L 0 0";
  if (len3 < 3)
    return `M ${points[0][0]} ${points[0][1]}`;
  points = getStrokePoints(points).map((pt) => pt.point);
  len3 = points.length;
  const d8 = points.reduce((acc, [x0, y0], i6, arr) => {
    if (i6 === len3 - 1) {
      acc.push("L", x0, y0);
      return acc;
    }
    const [x1, y1] = arr[i6 + 1];
    acc.push(x0.toFixed(2), y0.toFixed(2), ((x0 + x1) / 2).toFixed(2), ((y0 + y1) / 2).toFixed(2));
    return acc;
  }, ["M", points[0][0], points[0][1], "Q"]);
  const path = d8.join(" ").replaceAll(/(\s[0-9]*\.[0-9]{2})([0-9]*)\b/g, "$1");
  return path;
}

// src/shape/shapes/arrow/arrow.tsx
var React2 = __toModule(require("react"));
var import_core4 = __toModule(require_cjs());
var Arrow = class extends TLDrawShapeUtil {
  constructor() {
    super(...arguments);
    this.type = TLDrawShapeType.Arrow;
    this.toolType = TLDrawToolType.Handle;
    this.canStyleFill = false;
    this.simplePathCache = new WeakMap();
    this.pathCache = new WeakMap();
    this.defaultProps = {
      id: "id",
      type: TLDrawShapeType.Arrow,
      name: "Arrow",
      parentId: "page",
      childIndex: 1,
      point: [0, 0],
      rotation: 0,
      bend: 0,
      handles: {
        start: {
          id: "start",
          index: 0,
          point: [0, 0],
          canBind: true
        },
        end: {
          id: "end",
          index: 1,
          point: [1, 1],
          canBind: true
        },
        bend: {
          id: "bend",
          index: 2,
          point: [0.5, 0.5]
        }
      },
      decorations: {
        end: Decoration.Arrow
      },
      style: {
        ...defaultStyle,
        isFilled: false
      }
    };
    this.shouldRender = (prev, next) => {
      return next.handles !== prev.handles || next.style !== prev.style;
    };
    this.render = (shape, {isDarkMode}) => {
      const {bend, handles, style: style2} = shape;
      const {start, end, bend: _bend} = handles;
      const isStraightLine = import_core4.Vec.dist(_bend.point, import_core4.Vec.round(import_core4.Vec.med(start.point, end.point))) < 1;
      const isDraw = shape.style.dash === DashStyle.Draw;
      const styles = getShapeStyle(style2, isDarkMode);
      const {strokeWidth} = styles;
      const arrowDist = import_core4.Vec.dist(start.point, end.point);
      const arrowHeadlength = Math.min(arrowDist / 3, strokeWidth * 8);
      let shaftPath;
      let insetStart;
      let insetEnd;
      if (isStraightLine) {
        const sw2 = strokeWidth * (isDraw ? 0.618 : 1.618);
        const path = import_core4.Utils.getFromCache(this.pathCache, shape, () => isDraw ? renderFreehandArrowShaft(shape) : "M" + import_core4.Vec.round(start.point) + "L" + import_core4.Vec.round(end.point));
        const {strokeDasharray, strokeDashoffset} = getPerfectDashProps(arrowDist, sw2, shape.style.dash, 2);
        insetStart = import_core4.Vec.nudge(start.point, end.point, arrowHeadlength);
        insetEnd = import_core4.Vec.nudge(end.point, start.point, arrowHeadlength);
        shaftPath = /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement("path", {
          d: path,
          fill: "none",
          strokeWidth: Math.max(8, strokeWidth * 2),
          strokeDasharray: "none",
          strokeDashoffset: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }), /* @__PURE__ */ React2.createElement("path", {
          d: path,
          fill: styles.stroke,
          stroke: styles.stroke,
          strokeWidth: sw2,
          strokeDasharray,
          strokeDashoffset,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }));
      } else {
        const circle = getCtp(shape);
        const sw2 = strokeWidth * (isDraw ? 0.618 : 1.618);
        const path = import_core4.Utils.getFromCache(this.pathCache, shape, () => isDraw ? renderCurvedFreehandArrowShaft(shape, circle) : getArrowArcPath(start, end, circle, bend));
        const arcLength = import_core4.Utils.getArcLength([circle[0], circle[1]], circle[2], start.point, end.point);
        const {strokeDasharray, strokeDashoffset} = getPerfectDashProps(arcLength - 1, sw2, shape.style.dash, 2);
        const center = [circle[0], circle[1]];
        const radius = circle[2];
        const sa = import_core4.Vec.angle(center, start.point);
        const ea = import_core4.Vec.angle(center, end.point);
        const t14 = arrowHeadlength / Math.abs(arcLength);
        insetStart = import_core4.Vec.nudgeAtAngle(center, import_core4.Utils.lerpAngles(sa, ea, t14), radius);
        insetEnd = import_core4.Vec.nudgeAtAngle(center, import_core4.Utils.lerpAngles(ea, sa, t14), radius);
        shaftPath = /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement("path", {
          d: path,
          fill: "none",
          stroke: "transparent",
          strokeWidth: Math.max(8, strokeWidth * 2),
          strokeDasharray: "none",
          strokeDashoffset: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }), /* @__PURE__ */ React2.createElement("path", {
          d: path,
          fill: isDraw ? styles.stroke : "none",
          stroke: styles.stroke,
          strokeWidth: sw2,
          strokeDasharray,
          strokeDashoffset,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }));
      }
      const sw = strokeWidth * 1.618;
      return /* @__PURE__ */ React2.createElement("g", {
        pointerEvents: "all"
      }, shaftPath, shape.decorations?.start === Decoration.Arrow && /* @__PURE__ */ React2.createElement("path", {
        d: getArrowHeadPath(shape, start.point, insetStart),
        fill: "none",
        stroke: styles.stroke,
        strokeWidth: sw,
        strokeDashoffset: "none",
        strokeDasharray: "none",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        pointerEvents: "stroke"
      }), shape.decorations?.end === Decoration.Arrow && /* @__PURE__ */ React2.createElement("path", {
        d: getArrowHeadPath(shape, end.point, insetEnd),
        fill: "none",
        stroke: styles.stroke,
        strokeWidth: sw,
        strokeDashoffset: "none",
        strokeDasharray: "none",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        pointerEvents: "stroke"
      }));
    };
    this.getBounds = (shape) => {
      const bounds = import_core4.Utils.getFromCache(this.boundsCache, shape, () => {
        const {start, bend, end} = shape.handles;
        return import_core4.Utils.getBoundsFromPoints([start.point, bend.point, end.point]);
      });
      return import_core4.Utils.translateBounds(bounds, shape.point);
    };
    this.getRotatedBounds = (shape) => {
      const {start, bend, end} = shape.handles;
      return import_core4.Utils.translateBounds(import_core4.Utils.getBoundsFromPoints([start.point, bend.point, end.point], shape.rotation), shape.point);
    };
    this.getCenter = (shape) => {
      const {start, end} = shape.handles;
      return import_core4.Vec.add(shape.point, import_core4.Vec.med(start.point, end.point));
    };
    this.hitTest = () => {
      return true;
    };
    this.hitTestBounds = (shape, brushBounds) => {
      const {start, end, bend} = shape.handles;
      const sp = import_core4.Vec.add(shape.point, start.point);
      const ep = import_core4.Vec.add(shape.point, end.point);
      if (import_core4.Utils.pointInBounds(sp, brushBounds) || import_core4.Utils.pointInBounds(ep, brushBounds)) {
        return true;
      }
      if (import_core4.Vec.isEqual(import_core4.Vec.med(start.point, end.point), bend.point)) {
        return import_core4.Intersect.lineSegment.bounds(sp, ep, brushBounds).length > 0;
      } else {
        const [cx, cy, r11] = getCtp(shape);
        const cp = import_core4.Vec.add(shape.point, [cx, cy]);
        return import_core4.Intersect.arc.bounds(cp, r11, sp, ep, brushBounds).length > 0;
      }
    };
    this.transform = (_shape, bounds, {initialShape, scaleX, scaleY}) => {
      const initialShapeBounds = this.getBounds(initialShape);
      const handles = ["start", "end"];
      const nextHandles = {...initialShape.handles};
      handles.forEach((handle) => {
        const [x6, y5] = nextHandles[handle].point;
        const nw = x6 / initialShapeBounds.width;
        const nh = y5 / initialShapeBounds.height;
        nextHandles[handle] = {
          ...nextHandles[handle],
          point: [
            bounds.width * (scaleX < 0 ? 1 - nw : nw),
            bounds.height * (scaleY < 0 ? 1 - nh : nh)
          ]
        };
      });
      const {start, bend, end} = nextHandles;
      const dist3 = import_core4.Vec.dist(start.point, end.point);
      const midPoint = import_core4.Vec.med(start.point, end.point);
      const bendDist = dist3 / 2 * initialShape.bend;
      const u6 = import_core4.Vec.uni(import_core4.Vec.vec(start.point, end.point));
      const point = import_core4.Vec.add(midPoint, import_core4.Vec.mul(import_core4.Vec.per(u6), bendDist));
      nextHandles["bend"] = {
        ...bend,
        point: Math.abs(bendDist) < 10 ? midPoint : point
      };
      return {
        point: [bounds.minX, bounds.minY],
        handles: nextHandles
      };
    };
    this.onDoubleClickHandle = (shape, handle) => {
      switch (handle) {
        case "bend": {
          return {
            bend: 0,
            handles: {
              ...shape.handles,
              bend: {
                ...shape.handles.bend,
                point: getBendPoint(shape.handles, shape.bend)
              }
            }
          };
        }
        case "start": {
          return {
            decorations: {
              ...shape.decorations,
              start: shape.decorations?.start ? void 0 : Decoration.Arrow
            }
          };
        }
        case "end": {
          return {
            decorations: {
              ...shape.decorations,
              end: shape.decorations?.end ? void 0 : Decoration.Arrow
            }
          };
        }
      }
      return this;
    };
    this.onHandleChange = (shape, handles, {shiftKey}) => {
      let nextHandles = import_core4.Utils.deepMerge(shape.handles, handles);
      let nextBend = shape.bend;
      for (const id in handles) {
        if ((id === "start" || id === "end") && shiftKey) {
          const point = handles[id].point;
          const other = id === "start" ? shape.handles.end : shape.handles.start;
          const angle = import_core4.Vec.angle(other.point, point);
          const distance = import_core4.Vec.dist(other.point, point);
          const newAngle = import_core4.Utils.clampToRotationToSegments(angle, 24);
          nextHandles = {
            ...nextHandles,
            [id]: {
              ...nextHandles[id],
              point: import_core4.Vec.nudgeAtAngle(other.point, newAngle, distance)
            }
          };
        }
      }
      if ("bend" in handles) {
        const {start, end, bend} = nextHandles;
        const distance = import_core4.Vec.dist(start.point, end.point);
        const midPoint = import_core4.Vec.med(start.point, end.point);
        const angle = import_core4.Vec.angle(start.point, end.point);
        const u6 = import_core4.Vec.uni(import_core4.Vec.vec(start.point, end.point));
        const ap = import_core4.Vec.add(midPoint, import_core4.Vec.mul(import_core4.Vec.per(u6), distance / 2));
        const bp = import_core4.Vec.sub(midPoint, import_core4.Vec.mul(import_core4.Vec.per(u6), distance / 2));
        const bendPoint = import_core4.Vec.nearestPointOnLineSegment(ap, bp, bend.point, true);
        const bendDist = import_core4.Vec.dist(midPoint, bendPoint);
        nextBend = import_core4.Utils.clamp(bendDist / (distance / 2), -0.99, 0.99);
        const angleToBend = import_core4.Vec.angle(start.point, bendPoint);
        if (import_core4.Utils.isAngleBetween(angle, angle + Math.PI, angleToBend)) {
          nextBend *= -1;
        }
      }
      nextHandles = {
        ...nextHandles,
        start: {
          ...nextHandles.start,
          point: import_core4.Vec.round(nextHandles.start.point)
        },
        end: {
          ...nextHandles.end,
          point: import_core4.Vec.round(nextHandles.end.point)
        }
      };
      return {
        bend: nextBend,
        handles: {
          ...nextHandles,
          bend: {
            ...nextHandles.bend,
            point: getBendPoint(nextHandles, nextBend)
          }
        }
      };
    };
    this.onSessionComplete = (shape) => {
      const bounds = this.getBounds(shape);
      const offset = import_core4.Vec.sub([bounds.minX, bounds.minY], shape.point);
      const {start, end, bend} = shape.handles;
      return {
        point: import_core4.Vec.round(import_core4.Vec.add(shape.point, offset)),
        handles: {
          start: {
            ...start,
            point: import_core4.Vec.round(import_core4.Vec.sub(start.point, offset))
          },
          end: {
            ...end,
            point: import_core4.Vec.round(import_core4.Vec.sub(end.point, offset))
          },
          bend: {
            ...bend,
            point: import_core4.Vec.round(import_core4.Vec.sub(bend.point, offset))
          }
        }
      };
    };
  }
  renderIndicator(shape) {
    const {
      handles: {start, end},
      bend,
      style: style2
    } = shape;
    const circle = getCtp(shape);
    const path = import_core4.Utils.getFromCache(this.simplePathCache, shape, () => getArrowArcPath(start, end, getCtp(shape), bend));
    const styles = getShapeStyle(style2, false);
    const {strokeWidth} = styles;
    const arrowDist = import_core4.Vec.dist(start.point, end.point);
    const arrowHeadlength = Math.min(arrowDist / 3, strokeWidth * 8);
    const arcLength = import_core4.Utils.getArcLength([circle[0], circle[1]], circle[2], start.point, end.point);
    const center = [circle[0], circle[1]];
    const radius = circle[2];
    const sa = import_core4.Vec.angle(center, start.point);
    const ea = import_core4.Vec.angle(center, end.point);
    const t14 = arrowHeadlength / Math.abs(arcLength);
    const insetStart = import_core4.Vec.nudgeAtAngle(center, import_core4.Utils.lerpAngles(sa, ea, t14), radius);
    const insetEnd = import_core4.Vec.nudgeAtAngle(center, import_core4.Utils.lerpAngles(ea, sa, t14), radius);
    return /* @__PURE__ */ React2.createElement("g", null, /* @__PURE__ */ React2.createElement("path", {
      d: path
    }), shape.decorations?.start === Decoration.Arrow && /* @__PURE__ */ React2.createElement("path", {
      d: getArrowHeadPath(shape, start.point, insetStart)
    }), shape.decorations?.end === Decoration.Arrow && /* @__PURE__ */ React2.createElement("path", {
      d: getArrowHeadPath(shape, end.point, insetEnd)
    }));
  }
};
function getArrowArcPath(start, end, circle, bend) {
  return [
    "M",
    start.point[0],
    start.point[1],
    "A",
    circle[2],
    circle[2],
    0,
    0,
    bend < 0 ? 0 : 1,
    end.point[0],
    end.point[1]
  ].join(" ");
}
function getBendPoint(handles, bend) {
  const {start, end} = handles;
  const dist3 = import_core4.Vec.dist(start.point, end.point);
  const midPoint = import_core4.Vec.med(start.point, end.point);
  const bendDist = dist3 / 2 * bend;
  const u6 = import_core4.Vec.uni(import_core4.Vec.vec(start.point, end.point));
  const point = import_core4.Vec.round(Math.abs(bendDist) < 10 ? midPoint : import_core4.Vec.add(midPoint, import_core4.Vec.mul(import_core4.Vec.per(u6), bendDist)));
  return point;
}
function renderFreehandArrowShaft(shape) {
  const {style: style2, id} = shape;
  const {start, end} = shape.handles;
  const getRandom = import_core4.Utils.rng(id);
  const strokeWidth = +getShapeStyle(style2).strokeWidth * 2;
  const st = Math.abs(getRandom());
  const stroke = perfect_freehand_esm_default([...import_core4.Vec.pointsBetween(start.point, end.point), end.point, end.point, end.point, end.point], {
    size: strokeWidth / 2,
    thinning: 0.5 + getRandom() * 0.3,
    easing: (t14) => t14 * t14,
    end: {taper: 1},
    start: {taper: 1 + 32 * (st * st * st)},
    simulatePressure: true,
    last: true
  });
  const path = import_core4.Utils.getSvgPathFromStroke(stroke);
  return path;
}
function renderCurvedFreehandArrowShaft(shape, circle) {
  const {style: style2, id} = shape;
  const {start, end} = shape.handles;
  const getRandom = import_core4.Utils.rng(id);
  const strokeWidth = +getShapeStyle(style2).strokeWidth * 2;
  const st = Math.abs(getRandom());
  const center = [circle[0], circle[1]];
  const radius = circle[2];
  const startAngle = import_core4.Vec.angle(center, start.point);
  const endAngle = import_core4.Vec.angle(center, end.point);
  const points = [];
  for (let i6 = 0; i6 < 21; i6++) {
    const t14 = i6 / 20;
    const angle = import_core4.Utils.lerpAngles(startAngle, endAngle, t14);
    points.push(import_core4.Vec.round(import_core4.Vec.nudgeAtAngle(center, angle, radius)));
  }
  const stroke = perfect_freehand_esm_default([...points, end.point, end.point], {
    size: strokeWidth / 2,
    thinning: 0.5 + getRandom() * 0.3,
    easing: (t14) => t14 * t14,
    end: {
      taper: shape.decorations?.end ? 1 : 1 + strokeWidth * 5 * (st * st * st)
    },
    start: {
      taper: shape.decorations?.start ? 1 : 1 + strokeWidth * 5 * (st * st * st)
    },
    simulatePressure: true,
    streamline: 0.01,
    last: true
  });
  const path = import_core4.Utils.getSvgPathFromStroke(stroke);
  return path;
}
function getArrowHeadPath(shape, point, inset) {
  const {left, right} = getArrowHeadPoints(shape, point, inset);
  return ["M", left, "L", point, right].join(" ");
}
function getArrowHeadPoints(shape, point, inset) {
  const getRandom = import_core4.Utils.rng(shape.id);
  return {
    left: import_core4.Vec.rotWith(inset, point, Math.PI / 6 + Math.PI / 12 * getRandom()),
    right: import_core4.Vec.rotWith(inset, point, -Math.PI / 6 + Math.PI / 12 * getRandom())
  };
}
function getCtp(shape) {
  const {start, end, bend} = shape.handles;
  return import_core4.Utils.circleFromThreePoints(start.point, end.point, bend.point);
}

// src/shape/shapes/rectangle/rectangle.tsx
var React3 = __toModule(require("react"));
var import_core5 = __toModule(require_cjs());
var Rectangle = class extends TLDrawShapeUtil {
  constructor() {
    super(...arguments);
    this.type = TLDrawShapeType.Rectangle;
    this.toolType = TLDrawToolType.Bounds;
    this.pathCache = new WeakMap([]);
    this.defaultProps = {
      id: "id",
      type: TLDrawShapeType.Rectangle,
      name: "Rectangle",
      parentId: "page",
      childIndex: 1,
      point: [0, 0],
      size: [1, 1],
      rotation: 0,
      style: defaultStyle
    };
  }
  shouldRender(prev, next) {
    return next.size !== prev.size || next.style !== prev.style;
  }
  render(shape, {isBinding, isDarkMode}) {
    const {id, size, style: style2} = shape;
    const styles = getShapeStyle(style2, isDarkMode);
    const strokeWidth = +styles.strokeWidth;
    if (style2.dash === DashStyle.Draw) {
      const pathData = import_core5.Utils.getFromCache(this.pathCache, shape.size, () => renderPath(shape));
      return /* @__PURE__ */ React3.createElement(React3.Fragment, null, isBinding && /* @__PURE__ */ React3.createElement("rect", {
        className: "tl-binding-indicator",
        x: strokeWidth / 2 - 32,
        y: strokeWidth / 2 - 32,
        width: Math.max(0, size[0] - strokeWidth / 2) + 64,
        height: Math.max(0, size[1] - strokeWidth / 2) + 64
      }), /* @__PURE__ */ React3.createElement("rect", {
        x: +styles.strokeWidth / 2,
        y: +styles.strokeWidth / 2,
        width: Math.max(0, size[0] - strokeWidth),
        height: Math.max(0, size[1] - strokeWidth),
        fill: style2.isFilled ? styles.fill : "transparent",
        stroke: "none",
        pointerEvents: "all"
      }), /* @__PURE__ */ React3.createElement("path", {
        d: pathData,
        fill: styles.stroke,
        stroke: styles.stroke,
        strokeWidth: styles.strokeWidth,
        pointerEvents: "all"
      }));
    }
    const sw = strokeWidth * 1.618;
    const w5 = Math.max(0, size[0] - sw / 2);
    const h5 = Math.max(0, size[1] - sw / 2);
    const strokes2 = [
      [[sw / 2, sw / 2], [w5, sw / 2], w5 - sw / 2],
      [[w5, sw / 2], [w5, h5], h5 - sw / 2],
      [[w5, h5], [sw / 2, h5], w5 - sw / 2],
      [[sw / 2, h5], [sw / 2, sw / 2], h5 - sw / 2]
    ];
    const paths = strokes2.map(([start, end, length], i6) => {
      const {strokeDasharray, strokeDashoffset} = getPerfectDashProps(length, sw, shape.style.dash);
      return /* @__PURE__ */ React3.createElement("line", {
        key: id + "_" + i6,
        x1: start[0],
        y1: start[1],
        x2: end[0],
        y2: end[1],
        stroke: styles.stroke,
        strokeWidth: sw,
        strokeLinecap: "round",
        strokeDasharray,
        strokeDashoffset
      });
    });
    return /* @__PURE__ */ React3.createElement(React3.Fragment, null, isBinding && /* @__PURE__ */ React3.createElement("rect", {
      className: "tl-binding-indicator",
      x: sw / 2 - 32,
      y: sw / 2 - 32,
      width: w5 + 64,
      height: h5 + 64
    }), /* @__PURE__ */ React3.createElement("rect", {
      x: sw / 2,
      y: sw / 2,
      width: w5,
      height: h5,
      fill: styles.fill,
      stroke: "transparent",
      strokeWidth: sw,
      pointerEvents: "all"
    }), /* @__PURE__ */ React3.createElement("g", {
      pointerEvents: "stroke"
    }, paths));
  }
  renderIndicator(shape) {
    const {
      style: style2,
      size: [width, height]
    } = shape;
    const styles = getShapeStyle(style2, false);
    const strokeWidth = +styles.strokeWidth;
    const sw = strokeWidth;
    return /* @__PURE__ */ React3.createElement("rect", {
      x: sw / 2,
      y: sw / 2,
      rx: 1,
      ry: 1,
      width: Math.max(1, width - sw),
      height: Math.max(1, height - sw)
    });
  }
  getBounds(shape) {
    const bounds = import_core5.Utils.getFromCache(this.boundsCache, shape, () => {
      const [width, height] = shape.size;
      return {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height
      };
    });
    return import_core5.Utils.translateBounds(bounds, shape.point);
  }
  getRotatedBounds(shape) {
    return import_core5.Utils.getBoundsFromPoints(import_core5.Utils.getRotatedCorners(this.getBounds(shape), shape.rotation));
  }
  getCenter(shape) {
    return import_core5.Utils.getBoundsCenter(this.getBounds(shape));
  }
  hitTest(shape, point) {
    return import_core5.Utils.pointInBounds(point, this.getBounds(shape));
  }
  hitTestBounds(shape, bounds) {
    const rotatedCorners = import_core5.Utils.getRotatedCorners(this.getBounds(shape), shape.rotation);
    return rotatedCorners.every((point) => import_core5.Utils.pointInBounds(point, bounds)) || import_core5.Intersect.polyline.bounds(rotatedCorners, bounds).length > 0;
  }
  transform(shape, bounds, {
    initialShape,
    transformOrigin,
    scaleX,
    scaleY
  }) {
    if (!shape.rotation && !shape.isAspectRatioLocked) {
      return {
        point: import_core5.Vec.round([bounds.minX, bounds.minY]),
        size: import_core5.Vec.round([bounds.width, bounds.height])
      };
    } else {
      const size = import_core5.Vec.round(import_core5.Vec.mul(initialShape.size, Math.min(Math.abs(scaleX), Math.abs(scaleY))));
      const point = import_core5.Vec.round([
        bounds.minX + (bounds.width - shape.size[0]) * (scaleX < 0 ? 1 - transformOrigin[0] : transformOrigin[0]),
        bounds.minY + (bounds.height - shape.size[1]) * (scaleY < 0 ? 1 - transformOrigin[1] : transformOrigin[1])
      ]);
      const rotation = scaleX < 0 && scaleY >= 0 || scaleY < 0 && scaleX >= 0 ? initialShape.rotation ? -initialShape.rotation : 0 : initialShape.rotation;
      return {
        size,
        point,
        rotation
      };
    }
  }
  transformSingle(shape, bounds, info) {
    return {
      size: import_core5.Vec.round([bounds.width, bounds.height]),
      point: import_core5.Vec.round([bounds.minX, bounds.minY])
    };
  }
};
function renderPath(shape) {
  const styles = getShapeStyle(shape.style);
  const getRandom = import_core5.Utils.rng(shape.id);
  const strokeWidth = +styles.strokeWidth;
  const baseOffset = strokeWidth / 2;
  const offsets = Array.from(Array(4)).map(() => [
    getRandom() * baseOffset,
    getRandom() * baseOffset
  ]);
  const sw = strokeWidth;
  const w5 = Math.max(0, shape.size[0] - sw / 2);
  const h5 = Math.max(0, shape.size[1] - sw / 2);
  const tl = import_core5.Vec.add([sw / 2, sw / 2], offsets[0]);
  const tr = import_core5.Vec.add([w5, sw / 2], offsets[1]);
  const br = import_core5.Vec.add([w5, h5], offsets[2]);
  const bl = import_core5.Vec.add([sw / 2, h5], offsets[3]);
  const lines = import_core5.Utils.shuffleArr([
    import_core5.Vec.pointsBetween(tr, br),
    import_core5.Vec.pointsBetween(br, bl),
    import_core5.Vec.pointsBetween(bl, tl),
    import_core5.Vec.pointsBetween(tl, tr)
  ], Math.floor(5 + getRandom() * 4));
  const stroke = perfect_freehand_esm_default([...lines.flat().slice(2), ...lines[0], ...lines[0].slice(4)], {
    size: 1 + +styles.strokeWidth,
    thinning: 0.6,
    easing: (t14) => t14 * t14 * t14 * t14,
    end: {taper: +styles.strokeWidth * 20},
    start: {taper: +styles.strokeWidth * 20},
    simulatePressure: false
  });
  return import_core5.Utils.getSvgPathFromStroke(stroke);
}

// src/shape/shapes/ellipse/ellipse.tsx
var React4 = __toModule(require("react"));
var import_core6 = __toModule(require_cjs());
var Ellipse = class extends TLDrawShapeUtil {
  constructor() {
    super(...arguments);
    this.type = TLDrawShapeType.Ellipse;
    this.toolType = TLDrawToolType.Bounds;
    this.pathCache = new WeakMap([]);
    this.defaultProps = {
      id: "id",
      type: TLDrawShapeType.Ellipse,
      name: "Ellipse",
      parentId: "page",
      childIndex: 1,
      point: [0, 0],
      radius: [1, 1],
      rotation: 0,
      style: defaultStyle
    };
  }
  shouldRender(prev, next) {
    return next.radius !== prev.radius || next.style !== prev.style;
  }
  render(shape, {isDarkMode, isBinding}) {
    const {
      radius: [radiusX, radiusY],
      style: style2
    } = shape;
    const styles = getShapeStyle(style2, isDarkMode);
    const strokeWidth = +styles.strokeWidth;
    const rx = Math.max(0, radiusX - strokeWidth / 2);
    const ry = Math.max(0, radiusY - strokeWidth / 2);
    if (style2.dash === DashStyle.Draw) {
      const path = import_core6.Utils.getFromCache(this.pathCache, shape, () => renderPath2(shape, this.getCenter(shape)));
      return /* @__PURE__ */ React4.createElement(React4.Fragment, null, isBinding && /* @__PURE__ */ React4.createElement("ellipse", {
        className: "tl-binding-indicator",
        cx: radiusX,
        cy: radiusY,
        rx: rx + 2,
        ry: ry + 2
      }), /* @__PURE__ */ React4.createElement("ellipse", {
        cx: radiusX,
        cy: radiusY,
        rx,
        ry,
        stroke: "none",
        fill: style2.isFilled ? styles.fill : "transparent",
        pointerEvents: "all"
      }), /* @__PURE__ */ React4.createElement("path", {
        d: path,
        fill: styles.stroke,
        stroke: styles.stroke,
        strokeWidth,
        pointerEvents: "all",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }));
    }
    const h5 = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2);
    const perimeter = Math.PI * (rx + ry) * (1 + 3 * h5 / (10 + Math.sqrt(4 - 3 * h5)));
    const {strokeDasharray, strokeDashoffset} = getPerfectDashProps(perimeter, strokeWidth * 1.618, shape.style.dash, 4);
    const sw = strokeWidth * 1.618;
    return /* @__PURE__ */ React4.createElement(React4.Fragment, null, isBinding && /* @__PURE__ */ React4.createElement("ellipse", {
      className: "tl-binding-indicator",
      cx: radiusX,
      cy: radiusY,
      rx: rx + 32,
      ry: ry + 32
    }), /* @__PURE__ */ React4.createElement("ellipse", {
      cx: radiusX,
      cy: radiusY,
      rx,
      ry,
      fill: styles.fill,
      stroke: styles.stroke,
      strokeWidth: sw,
      strokeDasharray,
      strokeDashoffset,
      pointerEvents: "all",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }));
  }
  renderIndicator(shape) {
    const {
      style: style2,
      radius: [rx, ry]
    } = shape;
    const styles = getShapeStyle(style2, false);
    const strokeWidth = +styles.strokeWidth;
    const sw = strokeWidth;
    return /* @__PURE__ */ React4.createElement("ellipse", {
      cx: rx,
      cy: ry,
      rx: rx - sw / 2,
      ry: ry - sw / 2
    });
  }
  getBounds(shape) {
    return import_core6.Utils.getFromCache(this.boundsCache, shape, () => {
      return import_core6.Utils.getRotatedEllipseBounds(shape.point[0], shape.point[1], shape.radius[0], shape.radius[1], shape.rotation || 0);
    });
  }
  getRotatedBounds(shape) {
    return import_core6.Utils.getBoundsFromPoints(import_core6.Utils.getRotatedCorners(this.getBounds(shape), shape.rotation));
  }
  getCenter(shape) {
    return import_core6.Utils.getBoundsCenter(this.getBounds(shape));
  }
  hitTest(shape, point) {
    return import_core6.Utils.pointInBounds(point, this.getBounds(shape));
  }
  hitTestBounds(shape, bounds) {
    const rotatedCorners = import_core6.Utils.getRotatedCorners(this.getBounds(shape), shape.rotation);
    return rotatedCorners.every((point) => import_core6.Utils.pointInBounds(point, bounds)) || import_core6.Intersect.polyline.bounds(rotatedCorners, bounds).length > 0;
  }
  transform(shape, bounds, {scaleX, scaleY, initialShape}) {
    const {rotation = 0} = initialShape;
    return {
      point: [bounds.minX, bounds.minY],
      radius: [bounds.width / 2, bounds.height / 2],
      rotation: scaleX < 0 && scaleY >= 0 || scaleY < 0 && scaleX >= 0 ? -(rotation || 0) : rotation || 0
    };
  }
  transformSingle(shape, bounds) {
    return {
      point: import_core6.Vec.round([bounds.minX, bounds.minY]),
      radius: import_core6.Vec.div([bounds.width, bounds.height], 2)
    };
  }
};
function renderPath2(shape, boundsCenter) {
  const {
    style: style2,
    id,
    radius: [radiusX, radiusY],
    point
  } = shape;
  const getRandom = import_core6.Utils.rng(id);
  const center = import_core6.Vec.sub(boundsCenter, point);
  const strokeWidth = +getShapeStyle(style2).strokeWidth;
  const rx = radiusX + getRandom() * strokeWidth - strokeWidth / 2;
  const ry = radiusY + getRandom() * strokeWidth - strokeWidth / 2;
  const points = [];
  const start = Math.PI + Math.PI * getRandom();
  const overlap = Math.PI / 12;
  for (let i6 = 2; i6 < 8; i6++) {
    const rads = start + overlap * 2 * (i6 / 8);
    const x6 = rx * Math.cos(rads) + center[0];
    const y5 = ry * Math.sin(rads) + center[1];
    points.push([x6, y5]);
  }
  for (let i6 = 5; i6 < 32; i6++) {
    const t14 = i6 / 35;
    const rads = start + overlap * 2 + Math.PI * 2.5 * (t14 * t14 * t14);
    const x6 = rx * Math.cos(rads) + center[0];
    const y5 = ry * Math.sin(rads) + center[1];
    points.push([x6, y5]);
  }
  for (let i6 = 0; i6 < 8; i6++) {
    const rads = start + overlap * 2 * (i6 / 4);
    const x6 = rx * Math.cos(rads) + center[0];
    const y5 = ry * Math.sin(rads) + center[1];
    points.push([x6, y5]);
  }
  const stroke = perfect_freehand_esm_default(points, {
    size: 1 + strokeWidth,
    thinning: 0.6,
    easing: (t14) => t14 * t14 * t14 * t14,
    end: {taper: strokeWidth * 20},
    start: {taper: strokeWidth * 20},
    simulatePressure: false
  });
  return import_core6.Utils.getSvgPathFromStroke(stroke);
}

// src/shape/shapes/text/text.tsx
var React5 = __toModule(require("react"));
var import_core7 = __toModule(require_cjs());

// ../../node_modules/@stitches/react/dist/index.mjs
var import_react = __toModule(require("react"));
var e2 = {all: "all"};
var t2 = "colors";
var n2 = "sizes";
var i = "space";
var r = {gap: i, gridGap: i, columnGap: i, gridColumnGap: i, rowGap: i, gridRowGap: i, inset: i, insetBlock: i, insetBlockEnd: i, insetBlockStart: i, insetInline: i, insetInlineEnd: i, insetInlineStart: i, margin: i, marginTop: i, marginRight: i, marginBottom: i, marginLeft: i, marginBlock: i, marginBlockEnd: i, marginBlockStart: i, marginInline: i, marginInlineEnd: i, marginInlineStart: i, padding: i, paddingTop: i, paddingRight: i, paddingBottom: i, paddingLeft: i, paddingBlock: i, paddingBlockEnd: i, paddingBlockStart: i, paddingInline: i, paddingInlineEnd: i, paddingInlineStart: i, top: i, right: i, bottom: i, left: i, scrollMargin: i, scrollMarginTop: i, scrollMarginRight: i, scrollMarginBottom: i, scrollMarginLeft: i, scrollMarginX: i, scrollMarginY: i, scrollMarginBlock: i, scrollMarginBlockEnd: i, scrollMarginBlockStart: i, scrollMarginInline: i, scrollMarginInlineEnd: i, scrollMarginInlineStart: i, scrollPadding: i, scrollPaddingTop: i, scrollPaddingRight: i, scrollPaddingBottom: i, scrollPaddingLeft: i, scrollPaddingX: i, scrollPaddingY: i, scrollPaddingBlock: i, scrollPaddingBlockEnd: i, scrollPaddingBlockStart: i, scrollPaddingInline: i, scrollPaddingInlineEnd: i, scrollPaddingInlineStart: i, fontSize: "fontSizes", background: t2, backgroundColor: t2, backgroundImage: t2, border: t2, borderBlock: t2, borderBlockEnd: t2, borderBlockStart: t2, borderBottom: t2, borderBottomColor: t2, borderColor: t2, borderInline: t2, borderInlineEnd: t2, borderInlineStart: t2, borderLeft: t2, borderLeftColor: t2, borderRight: t2, borderRightColor: t2, borderTop: t2, borderTopColor: t2, caretColor: t2, color: t2, columnRuleColor: t2, fill: t2, outline: t2, outlineColor: t2, stroke: t2, textDecorationColor: t2, fontFamily: "fonts", fontWeight: "fontWeights", lineHeight: "lineHeights", letterSpacing: "letterSpacings", blockSize: n2, minBlockSize: n2, maxBlockSize: n2, inlineSize: n2, minInlineSize: n2, maxInlineSize: n2, width: n2, minWidth: n2, maxWidth: n2, height: n2, minHeight: n2, maxHeight: n2, flexBasis: n2, gridTemplateColumns: n2, gridTemplateRows: n2, borderWidth: "borderWidths", borderTopWidth: "borderWidths", borderRightWidth: "borderWidths", borderBottomWidth: "borderWidths", borderLeftWidth: "borderWidths", borderStyle: "borderStyles", borderTopStyle: "borderStyles", borderRightStyle: "borderStyles", borderBottomStyle: "borderStyles", borderLeftStyle: "borderStyles", borderRadius: "radii", borderTopLeftRadius: "radii", borderTopRightRadius: "radii", borderBottomRightRadius: "radii", borderBottomLeftRadius: "radii", boxShadow: "shadows", textShadow: "shadows", transition: "transitions", zIndex: "zIndices"};
var o = (e14, t14) => typeof t14 == "function" ? {"()": Function.prototype.toString.call(t14)} : t14;
var l = () => {
  const e14 = Object.create(null);
  return (t14, n5, ...i6) => {
    const r11 = ((e15) => JSON.stringify(e15, o))(t14);
    return r11 in e14 ? e14[r11] : e14[r11] = n5(t14, ...i6);
  };
};
var s = Symbol.for("sxs.composers");
var a = (e14, t14) => Object.defineProperties(e14, Object.getOwnPropertyDescriptors(t14));
var c = (e14) => {
  for (const t14 in e14)
    return true;
  return false;
};
var {hasOwnProperty: d} = Object.prototype;
var g = (e14, t14) => d.call(e14, t14);
var u = (e14) => e14.includes("-") ? e14 : e14.replace(/[A-Z]/g, (e15) => "-" + e15.toLowerCase());
var p = /\s+(?![^()]*\))/;
var h = (e14) => (t14) => e14(...typeof t14 == "string" ? String(t14).split(p) : [t14]);
var f = {appearance: (e14) => ({WebkitAppearance: e14, appearance: e14}), backfaceVisibility: (e14) => ({WebkitBackfaceVisibility: e14, backfaceVisibility: e14}), backdropFilter: (e14) => ({WebkitBackdropFilter: e14, backdropFilter: e14}), backgroundClip: (e14) => ({WebkitBackgroundClip: e14, backgroundClip: e14}), boxDecorationBreak: (e14) => ({WebkitBoxDecorationBreak: e14, boxDecorationBreak: e14}), clipPath: (e14) => ({WebkitClipPath: e14, clipPath: e14}), content: (e14) => ({content: e14.includes('"') || e14.includes("'") || /^([A-Za-z]+\([^]*|[^]*-quote|inherit|initial|none|normal|revert|unset)$/.test(e14) ? e14 : `"${e14}"`}), hyphens: (e14) => ({WebkitHyphens: e14, hyphens: e14}), maskImage: (e14) => ({WebkitMaskImage: e14, maskImage: e14}), tabSize: (e14) => ({MozTabSize: e14, tabSize: e14}), textSizeAdjust: (e14) => ({WebkitTextSizeAdjust: e14, textSizeAdjust: e14}), userSelect: (e14) => ({WebkitUserSelect: e14, userSelect: e14}), marginBlock: h((e14, t14) => ({marginBlockStart: e14, marginBlockEnd: t14 || e14})), marginInline: h((e14, t14) => ({marginInlineStart: e14, marginInlineEnd: t14 || e14})), maxSize: h((e14, t14) => ({maxBlockSize: e14, maxInlineSize: t14 || e14})), minSize: h((e14, t14) => ({minBlockSize: e14, minInlineSize: t14 || e14})), paddingBlock: h((e14, t14) => ({paddingBlockStart: e14, paddingBlockEnd: t14 || e14})), paddingInline: h((e14, t14) => ({paddingInlineStart: e14, paddingInlineEnd: t14 || e14}))};
var m = /([\d.]+)([^]*)/;
var b = (e14, t14) => e14.length ? e14.reduce((e15, n5) => (e15.push(...t14.map((e16) => e16.includes("&") ? e16.replace(/&/g, /[ +>|~]/.test(n5) && /&.*&/.test(e16) ? `:is(${n5})` : n5) : n5 + " " + e16)), e15), []) : t14;
var S = (e14, t14) => e14 in k && typeof t14 == "string" ? t14.replace(/^((?:[^]*[^\w-])?)(fit-content|stretch)((?:[^\w-][^]*)?)$/, (t15, n5, i6, r11) => n5 + (i6 === "stretch" ? `-moz-available${r11};${e14}:${n5}-webkit-fill-available` : `-moz-fit-content${r11};${e14}:${n5}fit-content`) + r11) : String(t14);
var k = {blockSize: 1, height: 1, inlineSize: 1, maxBlockSize: 1, maxHeight: 1, maxInlineSize: 1, maxWidth: 1, minBlockSize: 1, minHeight: 1, minInlineSize: 1, minWidth: 1, width: 1};
var y = (e14) => e14 ? e14 + "-" : "";
var B = (e14, t14, n5) => e14.replace(/([+-])?((?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)?(\$|--)([$\w-]+)/g, (e15, i6, r11, o13, l7) => o13 == "$" == !!r11 ? e15 : (i6 || o13 == "--" ? "calc(" : "") + "var(--" + (o13 === "$" ? y(t14) + (l7.includes("$") ? "" : y(n5)) + l7.replace(/\$/g, "-") : l7) + ")" + (i6 || o13 == "--" ? "*" + (i6 || "") + (r11 || "1") + ")" : ""));
var R = /\s*,\s*(?![^()]*\))/;
var $ = Object.prototype.toString;
var x = (e14, t14, n5, i6, r11) => {
  let o13, l7, s9;
  const a6 = (e15, t15, n6) => {
    let c7, d8;
    const g5 = (e16) => {
      for (c7 in e16) {
        const k4 = c7.charCodeAt(0) === 64, x6 = k4 && Array.isArray(e16[c7]) ? e16[c7] : [e16[c7]];
        for (d8 of x6) {
          const e17 = typeof d8 == "object" && d8 && d8.toString === $, x7 = /[A-Z]/.test(h5 = c7) ? h5 : h5.replace(/-[^]/g, (e18) => e18[1].toUpperCase());
          if (x7 in i6.utils) {
            const e18 = i6.utils[x7];
            if (e18 !== l7) {
              l7 = e18, g5(e18(i6)(d8)), l7 = null;
              continue;
            }
          } else if (x7 in f) {
            const e18 = f[x7];
            if (e18 !== s9) {
              s9 = e18, g5(e18(d8)), s9 = null;
              continue;
            }
          }
          if (k4 && (p8 = c7.slice(1) in i6.media ? "@media " + i6.media[c7.slice(1)] : c7, c7 = p8.replace(/\(\s*([\w-]+)\s*(=|<|<=|>|>=)\s*([\w-]+)\s*(?:(<|<=|>|>=)\s*([\w-]+)\s*)?\)/g, (e18, t16, n7, i7, r12, o14) => {
            const l8 = m.test(t16), s10 = 0.0625 * (l8 ? -1 : 1), [a7, c8] = l8 ? [i7, t16] : [t16, i7];
            return "(" + (n7[0] === "=" ? "" : n7[0] === ">" === l8 ? "max-" : "min-") + a7 + ":" + (n7[0] !== "=" && n7.length === 1 ? c8.replace(m, (e19, t17, i8) => Number(t17) + s10 * (n7 === ">" ? 1 : -1) + i8) : c8) + (r12 ? ") and (" + (r12[0] === ">" ? "min-" : "max-") + a7 + ":" + (r12.length === 1 ? o14.replace(m, (e19, t17, n8) => Number(t17) + s10 * (r12 === ">" ? -1 : 1) + n8) : o14) : "") + ")";
          })), e17) {
            const e18 = k4 ? n6.concat(c7) : [...n6], i7 = k4 ? [...t15] : b(t15, c7.split(R));
            o13 !== void 0 && r11(I(...o13)), o13 = void 0, a6(d8, i7, e18);
          } else
            o13 === void 0 && (o13 = [[], t15, n6]), c7 = k4 || c7.charCodeAt(0) !== 36 ? c7 : `--${y(i6.prefix)}${c7.slice(1).replace(/\$/g, "-")}`, d8 = e17 ? d8 : typeof d8 == "number" ? d8 && x7 in W ? String(d8) + "px" : String(d8) : B(S(x7, d8), i6.prefix, i6.themeMap[x7]), o13[0].push(`${k4 ? `${c7} ` : `${u(c7)}:`}${d8}`);
        }
      }
      var p8, h5;
    };
    g5(e15), o13 !== void 0 && r11(I(...o13)), o13 = void 0;
  };
  a6(e14, t14, n5);
};
var I = (e14, t14, n5) => `${n5.map((e15) => `${e15}{`).join("")}${t14.length ? `${t14.join(",")}{` : ""}${e14.join(";")}${t14.length ? "}" : ""}${Array(n5.length ? n5.length + 1 : 0).join("}")}`;
var W = {animationDelay: 1, animationDuration: 1, backgroundSize: 1, blockSize: 1, border: 1, borderBlock: 1, borderBlockEnd: 1, borderBlockEndWidth: 1, borderBlockStart: 1, borderBlockStartWidth: 1, borderBlockWidth: 1, borderBottom: 1, borderBottomLeftRadius: 1, borderBottomRightRadius: 1, borderBottomWidth: 1, borderEndEndRadius: 1, borderEndStartRadius: 1, borderInlineEnd: 1, borderInlineEndWidth: 1, borderInlineStart: 1, borderInlineStartWidth: 1, borderInlineWidth: 1, borderLeft: 1, borderLeftWidth: 1, borderRadius: 1, borderRight: 1, borderRightWidth: 1, borderSpacing: 1, borderStartEndRadius: 1, borderStartStartRadius: 1, borderTop: 1, borderTopLeftRadius: 1, borderTopRightRadius: 1, borderTopWidth: 1, borderWidth: 1, bottom: 1, columnGap: 1, columnRule: 1, columnRuleWidth: 1, columnWidth: 1, containIntrinsicSize: 1, flexBasis: 1, fontSize: 1, gap: 1, gridAutoColumns: 1, gridAutoRows: 1, gridTemplateColumns: 1, gridTemplateRows: 1, height: 1, inlineSize: 1, inset: 1, insetBlock: 1, insetBlockEnd: 1, insetBlockStart: 1, insetInline: 1, insetInlineEnd: 1, insetInlineStart: 1, left: 1, letterSpacing: 1, margin: 1, marginBlock: 1, marginBlockEnd: 1, marginBlockStart: 1, marginBottom: 1, marginInline: 1, marginInlineEnd: 1, marginInlineStart: 1, marginLeft: 1, marginRight: 1, marginTop: 1, maxBlockSize: 1, maxHeight: 1, maxInlineSize: 1, maxWidth: 1, minBlockSize: 1, minHeight: 1, minInlineSize: 1, minWidth: 1, offsetDistance: 1, offsetRotate: 1, outline: 1, outlineOffset: 1, outlineWidth: 1, overflowClipMargin: 1, padding: 1, paddingBlock: 1, paddingBlockEnd: 1, paddingBlockStart: 1, paddingBottom: 1, paddingInline: 1, paddingInlineEnd: 1, paddingInlineStart: 1, paddingLeft: 1, paddingRight: 1, paddingTop: 1, perspective: 1, right: 1, rowGap: 1, scrollMargin: 1, scrollMarginBlock: 1, scrollMarginBlockEnd: 1, scrollMarginBlockStart: 1, scrollMarginBottom: 1, scrollMarginInline: 1, scrollMarginInlineEnd: 1, scrollMarginInlineStart: 1, scrollMarginLeft: 1, scrollMarginRight: 1, scrollMarginTop: 1, scrollPadding: 1, scrollPaddingBlock: 1, scrollPaddingBlockEnd: 1, scrollPaddingBlockStart: 1, scrollPaddingBottom: 1, scrollPaddingInline: 1, scrollPaddingInlineEnd: 1, scrollPaddingInlineStart: 1, scrollPaddingLeft: 1, scrollPaddingRight: 1, scrollPaddingTop: 1, shapeMargin: 1, textDecoration: 1, textDecorationThickness: 1, textIndent: 1, textUnderlineOffset: 1, top: 1, transitionDelay: 1, transitionDuration: 1, verticalAlign: 1, width: 1, wordSpacing: 1};
var j = (e14) => String.fromCharCode(e14 + (e14 > 25 ? 39 : 97));
var z = (e14) => ((e15) => {
  let t14, n5 = "";
  for (t14 = Math.abs(e15); t14 > 52; t14 = t14 / 52 | 0)
    n5 = j(t14 % 52) + n5;
  return j(t14 % 52) + n5;
})(((e15, t14) => {
  let n5 = t14.length;
  for (; n5; )
    e15 = 33 * e15 ^ t14.charCodeAt(--n5);
  return e15;
})(5381, JSON.stringify(e14)) >>> 0);
var w = l();
var v = (e14, t14) => w(e14, () => (...n5) => {
  let i6 = null;
  const r11 = new Set();
  for (const t15 of n5)
    if (t15 != null)
      switch (typeof t15) {
        case "function":
          if (i6 == null && !t15[s]) {
            i6 = t15;
            break;
          }
        case "object":
          if (i6 == null && t15.type != null && (i6 = t15.type), s in t15)
            for (const e15 of t15[s])
              r11.add(e15);
          else if (!("$$typeof" in t15)) {
            const n6 = E(t15, e14);
            r11.add(n6);
          }
          break;
        case "string":
          i6 = t15;
      }
  return i6 == null && (i6 = "span"), r11.size || r11.add(["PJLV", {}, [], [], {}, []]), M(e14, i6, r11, t14);
});
var E = ({variants: e14, compoundVariants: t14, defaultVariants: n5, ...i6}, r11) => {
  const o13 = `${y(r11.prefix)}c-${z(i6)}`, l7 = [], s9 = [], a6 = Object.create(null), d8 = [];
  for (const e15 in n5)
    a6[e15] = String(n5[e15]);
  if (typeof e14 == "object" && e14)
    for (const t15 in e14) {
      g(a6, t15) || (a6[t15] = "undefined");
      const n6 = e14[t15];
      for (const e15 in n6) {
        const i7 = {[t15]: String(e15)};
        String(e15) === "undefined" && d8.push(t15);
        const r12 = n6[e15], o14 = [i7, r12, !c(r12)];
        l7.push(o14);
      }
    }
  if (typeof t14 == "object" && t14)
    for (const e15 of t14) {
      let {css: t15, ...n6} = e15;
      t15 = typeof t15 == "object" && t15 || {};
      for (const e16 in n6)
        n6[e16] = String(n6[e16]);
      const i7 = [n6, t15, !c(t15)];
      s9.push(i7);
    }
  return [o13, i6, l7, s9, a6, d8];
};
var M = (e14, t14, n5, i6) => {
  const [r11, o13, l7, c7] = C(n5), d8 = `.${r11}`, g5 = (s9) => {
    s9 = typeof s9 == "object" && s9 || T;
    const {css: a6, ...g6} = s9, u6 = {};
    for (const e15 in l7)
      if (delete g6[e15], e15 in s9) {
        let t15 = s9[e15];
        typeof t15 == "object" && t15 ? u6[e15] = {"@initial": l7[e15], ...t15} : (t15 = String(t15), u6[e15] = t15 !== "undefined" || c7.has(e15) ? t15 : l7[e15]);
      } else
        u6[e15] = l7[e15];
    const p8 = new Set([...o13]);
    for (const [t15, r12, o14, l8] of n5) {
      i6.rules.styled.cache.has(t15) || (i6.rules.styled.cache.add(t15), x(r12, [`.${t15}`], [], e14, (e15) => {
        i6.rules.styled.apply(e15);
      }));
      const n6 = P(o14, u6, e14.media), s10 = P(l8, u6, e14.media, true);
      for (const r13 of n6)
        if (r13 !== void 0)
          for (const [n7, o15] of r13) {
            const r14 = `${t15}-${z(o15)}-${n7}`;
            p8.add(r14), i6.rules.onevar.cache.has(r14) || (i6.rules.onevar.cache.add(r14), x(o15, [`.${r14}`], [], e14, (e15) => {
              i6.rules.onevar.apply(e15);
            }));
          }
      for (const n7 of s10)
        if (n7 !== void 0)
          for (const [r13, o15] of n7) {
            const n8 = `${t15}-${z(o15)}-${r13}`;
            p8.add(n8), i6.rules.allvar.cache.has(n8) || (i6.rules.allvar.cache.add(n8), x(o15, [`.${n8}`], [], e14, (e15) => {
              i6.rules.allvar.apply(e15);
            }));
          }
    }
    if (typeof a6 == "object" && a6) {
      const t15 = `${r11}-i${z(a6)}-css`;
      p8.add(t15), i6.rules.inline.cache.has(t15) || (i6.rules.inline.cache.add(t15), x(a6, [`.${t15}`], [], e14, (e15) => {
        i6.rules.inline.apply(e15);
      }));
    }
    for (const e15 of String(s9.className || "").trim().split(/\s+/))
      e15 && p8.add(e15);
    const h5 = g6.className = [...p8].join(" ");
    return {type: t14, className: h5, selector: d8, props: g6, toString: () => h5};
  };
  return a(g5, {type: t14, className: r11, selector: d8, [s]: n5, toString: () => (i6.rules.styled.cache.has(r11) || g5(), r11)});
};
var C = (e14) => {
  let t14 = "";
  const n5 = [], i6 = {}, r11 = [];
  for (const [o13, , , , l7, s9] of e14) {
    t14 === "" && (t14 = o13), n5.push(o13), r11.push(...s9);
    for (const e15 in l7) {
      const t15 = l7[e15];
      (i6[e15] === void 0 || t15 !== "undefined" || s9.includes(t15)) && (i6[e15] = t15);
    }
  }
  return [t14, n5, i6, new Set(r11)];
};
var P = (e14, t14, n5, i6) => {
  const r11 = [];
  e:
    for (let [o13, l7, s9] of e14) {
      if (s9)
        continue;
      let e15, a6 = 0;
      for (e15 in o13) {
        const i7 = o13[e15];
        let r12 = t14[e15];
        if (r12 !== i7) {
          if (typeof r12 != "object" || !r12)
            continue e;
          {
            let e16, t15 = 0;
            for (const o14 in r12)
              i7 === String(r12[o14]) && (o14 !== "@initial" && (l7 = {[o14 in n5 ? n5[o14] : o14]: l7}), a6 += t15, e16 = true), ++t15;
            if (!e16)
              continue e;
          }
        }
      }
      (r11[a6] = r11[a6] || []).push([i6 ? "cv" : `${e15}-${o13[e15]}`, l7]);
    }
  return r11;
};
var T = {};
var L = l();
var O = (e14, t14) => L(e14, () => (n5) => {
  const i6 = z(n5 = typeof n5 == "object" && n5 || {}), r11 = () => {
    if (!t14.rules.global.cache.has(i6)) {
      if (t14.rules.global.cache.add(i6), "@import" in n5) {
        let e15 = [].indexOf.call(t14.sheet.cssRules, t14.rules.themed.group) - 1;
        for (let i7 of [].concat(n5["@import"]))
          i7 = i7.includes('"') || i7.includes("'") ? i7 : `"${i7}"`, t14.sheet.insertRule(`@import ${i7};`, e15++);
        delete n5["@import"];
      }
      x(n5, [], [], e14, (e15) => {
        t14.rules.global.apply(e15);
      });
    }
    return "";
  };
  return a(r11, {toString: r11});
});
var A = l();
var N = (e14, t14) => A(e14, () => (n5) => {
  const i6 = `${y(e14.prefix)}k-${z(n5)}`, r11 = () => {
    if (!t14.rules.global.cache.has(i6)) {
      t14.rules.global.cache.add(i6);
      const r12 = [];
      x(n5, [], [], e14, (e15) => r12.push(e15));
      const o13 = `@keyframes ${i6}{${r12.join("")}}`;
      t14.rules.global.apply(o13);
    }
    return i6;
  };
  return a(r11, {get name() {
    return r11();
  }, toString: r11});
});
var D = class {
  constructor(e14, t14, n5, i6) {
    this.token = e14 == null ? "" : String(e14), this.value = t14 == null ? "" : String(t14), this.scale = n5 == null ? "" : String(n5), this.prefix = i6 == null ? "" : String(i6);
  }
  get computedValue() {
    return "var(" + this.variable + ")";
  }
  get variable() {
    return "--" + y(this.prefix) + y(this.scale) + this.token;
  }
  toString() {
    return this.computedValue;
  }
};
var H = l();
var V = (e14, t14) => H(e14, () => (n5, i6) => {
  i6 = typeof n5 == "object" && n5 || Object(i6);
  const r11 = `.${n5 = (n5 = typeof n5 == "string" ? n5 : "") || `${y(e14.prefix)}t-${z(i6)}`}`, o13 = {}, l7 = [];
  for (const t15 in i6) {
    o13[t15] = {};
    for (const n6 in i6[t15]) {
      const r12 = `--${y(e14.prefix)}${t15}-${n6}`, s9 = B(String(i6[t15][n6]), e14.prefix, t15);
      o13[t15][n6] = new D(n6, s9, t15, e14.prefix), l7.push(`${r12}:${s9}`);
    }
  }
  return {...o13, className: n5, selector: r11, toString: () => {
    if (l7.length && !t14.rules.themed.cache.has(n5)) {
      t14.rules.themed.cache.add(n5);
      const r12 = `${i6 === e14.theme ? ":root," : ""}.${n5}{${l7.join(";")}}`;
      t14.rules.themed.apply(r12);
    }
    return n5;
  }};
});
var G = ["themed", "global", "styled", "onevar", "allvar", "inline"];
var F = (e14) => {
  let t14;
  const n5 = () => {
    if (t14) {
      const {rules: e15, sheet: n6} = t14;
      if (!n6.deleteRule) {
        for (; Object(Object(n6.cssRules)[0]).type === 3; )
          n6.cssRules.splice(0, 1);
        n6.cssRules = [];
      }
      for (const t15 in e15)
        delete e15[t15];
      n6.ownerRule && (n6.ownerRule.textContent = n6.ownerRule.textContent);
    }
    const i6 = Object(e14).styleSheets || [];
    for (const e15 of i6)
      if (!e15.href || e15.href.startsWith(location.origin)) {
        for (let i7 = 0, r12 = e15.cssRules; r12[i7]; ++i7) {
          const o14 = Object(r12[i7]);
          if (o14.type !== 1)
            continue;
          const l7 = Object(r12[i7 + 1]);
          if (l7.type !== 4)
            continue;
          ++i7;
          const {cssText: s9} = o14;
          if (!s9.startsWith("--stitches"))
            continue;
          const a6 = s9.slice(16, -3).trim().split(/\s+/), c7 = G[a6[0]];
          c7 && (t14 || (t14 = {sheet: e15, reset: n5, rules: {}}), t14.rules[c7] = {group: l7, index: i7, cache: new Set(a6)});
        }
        if (t14)
          break;
      }
    if (!t14) {
      const i7 = (e15, t15) => ({type: t15, cssRules: [], insertRule(e16, t16) {
        this.cssRules.splice(t16, 0, i7(e16, {import: 3, undefined: 1}[(e16.toLowerCase().match(/^@([a-z]+)/) || [])[1]] || 4));
      }, get cssText() {
        return e15 === "@media{}" ? `@media{${[].map.call(this.cssRules, (e16) => e16.cssText).join("")}}` : e15;
      }});
      t14 = {sheet: e14 ? (e14.head || e14).appendChild(document.createElement("style")).sheet : i7("", "text/css"), rules: {}, reset: n5, toString() {
        const {cssRules: e15} = t14.sheet;
        return [].map.call(e15, (n6, i8) => {
          const {cssText: r12} = n6;
          let o14 = "";
          if (r12.startsWith("--stitches"))
            return "";
          if (e15[i8 - 1] && (o14 = e15[i8 - 1].cssText).startsWith("--stitches")) {
            if (!n6.cssRules.length)
              return "";
            for (const e16 in t14.rules)
              if (t14.rules[e16].group === n6)
                return `--stitches{--:${[...t14.rules[e16].cache].join(" ")}}${r12}`;
            return n6.cssRules.length ? `${o14}${r12}` : "";
          }
          return r12;
        }).join("");
      }};
    }
    const {sheet: r11, rules: o13} = t14;
    if (!o13.inline) {
      const e15 = r11.cssRules.length;
      r11.insertRule("@media{}", e15), r11.insertRule("--stitches{--:5}", e15), o13.inline = {index: e15, group: r11.cssRules[e15 + 1], cache: new Set([5])};
    }
    if (J(o13.inline), !o13.allvar) {
      const e15 = o13.inline.index;
      r11.insertRule("@media{}", e15), r11.insertRule("--stitches{--:4}", e15), o13.allvar = {index: e15, group: r11.cssRules[e15 + 1], cache: new Set([4])};
    }
    if (J(o13.allvar), !o13.onevar) {
      const e15 = o13.allvar.index;
      r11.insertRule("@media{}", e15), r11.insertRule("--stitches{--:3}", e15), o13.onevar = {index: e15, group: r11.cssRules[e15 + 1], cache: new Set([3])};
    }
    if (J(o13.onevar), !o13.styled) {
      const e15 = o13.onevar.index;
      r11.insertRule("@media{}", e15), r11.insertRule("--stitches{--:2}", e15), o13.styled = {index: e15, group: r11.cssRules[e15 + 1], cache: new Set([2])};
    }
    if (J(o13.styled), !o13.global) {
      const e15 = o13.styled.index;
      r11.insertRule("@media{}", e15), r11.insertRule("--stitches{--:1}", e15), o13.global = {index: e15, group: r11.cssRules[e15 + 1], cache: new Set([1])};
    }
    if (J(o13.global), !o13.themed) {
      const e15 = o13.global.index;
      r11.insertRule("@media{}", e15), r11.insertRule("--stitches{--:0}", e15), o13.themed = {index: e15, group: r11.cssRules[e15 + 1], cache: new Set([0])};
    }
    J(o13.themed);
  };
  return n5(), t14;
};
var J = (e14) => {
  const t14 = e14.group;
  let n5 = t14.cssRules.length;
  e14.apply = (e15) => {
    try {
      t14.insertRule(e15, n5), ++n5;
    } catch {
    }
  };
};
var U = l();
var Y = (e14) => e14 == null ? "span" : typeof e14 != "object" || e14.$$typeof ? g(e14, s) ? Y(e14.type) : e14 : "span";
var q = l();
var K = (t14) => {
  const n5 = ((t15) => {
    let n6 = false;
    const i6 = U(t15, (t16) => {
      n6 = true;
      const i7 = "prefix" in (t16 = typeof t16 == "object" && t16 || {}) ? String(t16.prefix) : "", o13 = {...e2, ...typeof t16.media == "object" && t16.media || {}}, l7 = typeof t16.root == "object" ? t16.root || null : globalThis.document || null, s9 = typeof t16.theme == "object" && t16.theme || {}, a6 = {prefix: i7, media: o13, root: l7, theme: s9, themeMap: typeof t16.themeMap == "object" && t16.themeMap || {...r}, utils: typeof t16.utils == "object" && t16.utils || {}}, c7 = F(l7), d8 = {css: v(a6, c7), global: O(a6, c7), keyframes: N(a6, c7), theme: V(a6, c7), reset() {
        c7.reset(), g5.toString();
      }, sheet: c7, config: a6, prefix: i7, getCssString: c7.toString, toString: c7.toString}, g5 = d8.theme(s9);
      return Object.assign(d8.theme, g5), g5.toString(), d8;
    });
    return n6 || i6.reset(), i6;
  })(t14);
  return n5.styled = (({config: e14, sheet: t15}) => q(e14, () => {
    const n6 = v(e14, t15);
    return (...e15) => {
      const t16 = Y(e15[0]), i6 = n6(...e15), r11 = import_react.default.forwardRef((e16, n7) => {
        const r12 = e16 && e16.as || t16, o13 = i6(e16).props;
        return delete o13.as, o13.ref = n7, import_react.default.createElement(r12, o13);
      });
      return r11.className = i6.className, r11.displayName = `Styled.${t16.displayName || t16.name || t16}`, r11.selector = i6.selector, r11.type = t16, r11.toString = () => i6.selector, r11[s] = i6[s], r11;
    };
  }))(n5), n5;
};

// src/styles/stitches.config.ts
var {styled, css, theme, getCssString} = K({
  themeMap: {
    ...r
  },
  theme: {
    colors: {
      codeHl: "rgba(144, 144, 144, .15)",
      brushFill: "rgba(0,0,0,.05)",
      brushStroke: "rgba(0,0,0,.25)",
      hint: "rgba(216, 226, 249, 1.000)",
      selected: "rgba(66, 133, 244, 1.000)",
      bounds: "rgba(65, 132, 244, 1.000)",
      boundsBg: "rgba(65, 132, 244, 0.05)",
      highlight: "rgba(65, 132, 244, 0.15)",
      overlay: "rgba(0, 0, 0, 0.15)",
      overlayContrast: "rgba(255, 255, 255, 0.15)",
      border: "#aaaaaa",
      canvas: "#f8f9fa",
      panel: "#fefefe",
      inactive: "#cccccf",
      hover: "#efefef",
      text: "#333333",
      tooltipBg: "#1d1d1d",
      tooltipText: "#ffffff",
      muted: "#777777",
      input: "#f3f3f3",
      inputBorder: "#dddddd",
      warn: "rgba(255, 100, 100, 1)",
      lineError: "rgba(255, 0, 0, .1)"
    },
    shadows: {
      2: "0px 1px 1px rgba(0, 0, 0, 0.14)",
      3: "0px 2px 3px rgba(0, 0, 0, 0.14)",
      4: "0px 4px 5px -1px rgba(0, 0, 0, 0.14)",
      8: "0px 12px 17px rgba(0, 0, 0, 0.14)",
      12: "0px 12px 17px rgba(0, 0, 0, 0.14)",
      24: "0px 24px 38px rgba(0, 0, 0, 0.14)",
      key: "1px 1px rgba(0,0,0,1)"
    },
    space: {
      0: "2px",
      1: "3px",
      2: "4px",
      3: "8px",
      4: "12px",
      5: "16px"
    },
    fontSizes: {
      0: "10px",
      1: "12px",
      2: "13px",
      3: "16px",
      4: "18px"
    },
    fonts: {
      ui: '"Recursive", system-ui, sans-serif',
      body: '"Recursive", system-ui, sans-serif',
      mono: '"Recursive Mono", monospace'
    },
    fontWeights: {},
    lineHeights: {},
    letterSpacings: {},
    sizes: {},
    borderWidths: {
      0: "$1"
    },
    borderStyles: {},
    radii: {
      0: "2px",
      1: "4px",
      2: "8px"
    },
    zIndices: {},
    transitions: {}
  },
  media: {
    sm: "(min-width: 640px)",
    md: "(min-width: 768px)"
  },
  utils: {
    zDash: () => (value) => {
      return {
        strokeDasharray: `calc(${value}px / var(--camera-zoom)) calc(${value}px / var(--camera-zoom))`
      };
    },
    zStrokeWidth: () => (value) => {
      if (Array.isArray(value)) {
        return {
          strokeWidth: `calc(${value[0]}px / var(--camera-zoom))`
        };
      }
      return {
        strokeWidth: `calc(${value}px / var(--camera-zoom))`
      };
    }
  }
});
var light = theme({});
var dark = theme({
  colors: {
    brushFill: "rgba(180, 180, 180, .05)",
    brushStroke: "rgba(180, 180, 180, .25)",
    hint: "rgba(216, 226, 249, 1.000)",
    selected: "rgba(38, 150, 255, 1.000)",
    bounds: "rgba(38, 150, 255, 1.000)",
    boundsBg: "rgba(38, 150, 255, 0.05)",
    highlight: "rgba(38, 150, 255, 0.15)",
    overlay: "rgba(0, 0, 0, 0.15)",
    overlayContrast: "rgba(255, 255, 255, 0.15)",
    border: "#202529",
    canvas: "#343d45",
    panel: "#49555f",
    inactive: "#aaaaad",
    hover: "#343d45",
    text: "#f8f9fa",
    muted: "#e0e2e6",
    input: "#f3f3f3",
    inputBorder: "#ddd",
    tooltipBg: "#1d1d1d",
    tooltipText: "#ffffff",
    codeHl: "rgba(144, 144, 144, .15)",
    lineError: "rgba(255, 0, 0, .1)"
  },
  shadows: {
    2: "0px 1px 1px rgba(0, 0, 0, 0.24)",
    3: "0px 2px 3px rgba(0, 0, 0, 0.24)",
    4: "0px 4px 5px -1px rgba(0, 0, 0, 0.24)",
    8: "0px 12px 17px rgba(0, 0, 0, 0.24)",
    12: "0px 12px 17px rgba(0, 0, 0, 0.24)",
    24: "0px 24px 38px rgba(0, 0, 0, 0.24)"
  }
});
var stitches_config_default = styled;

// src/styles/index.ts
var styles_default = stitches_config_default;

// src/shape/shapes/text/text-utils.ts
var INDENT = "  ";
var TextAreaUtils = class {
  static insertTextFirefox(field, text) {
    field.setRangeText(text, field.selectionStart || 0, field.selectionEnd || 0, "end");
    field.dispatchEvent(new InputEvent("input", {
      data: text,
      inputType: "insertText",
      isComposing: false
    }));
  }
  static insert(field, text) {
    const document2 = field.ownerDocument;
    const initialFocus = document2.activeElement;
    if (initialFocus !== field) {
      field.focus();
    }
    if (!document2.execCommand("insertText", false, text)) {
      TextAreaUtils.insertTextFirefox(field, text);
    }
    if (initialFocus === document2.body) {
      field.blur();
    } else if (initialFocus instanceof HTMLElement && initialFocus !== field) {
      initialFocus.focus();
    }
  }
  static set(field, text) {
    field.select();
    TextAreaUtils.insert(field, text);
  }
  static getSelection(field) {
    const {selectionStart, selectionEnd} = field;
    return field.value.slice(selectionStart ? selectionStart : void 0, selectionEnd ? selectionEnd : void 0);
  }
  static wrapSelection(field, wrap, wrapEnd) {
    const {selectionStart, selectionEnd} = field;
    const selection = TextAreaUtils.getSelection(field);
    TextAreaUtils.insert(field, wrap + selection + (wrapEnd ?? wrap));
    field.selectionStart = (selectionStart || 0) + wrap.length;
    field.selectionEnd = (selectionEnd || 0) + wrap.length;
  }
  static replace(field, searchValue, replacer) {
    let drift = 0;
    field.value.replace(searchValue, (...args) => {
      const matchStart = drift + args[args.length - 2];
      const matchLength = args[0].length;
      field.selectionStart = matchStart;
      field.selectionEnd = matchStart + matchLength;
      const replacement = typeof replacer === "string" ? replacer : replacer(...args);
      TextAreaUtils.insert(field, replacement);
      field.selectionStart = matchStart;
      drift += replacement.length - matchLength;
      return replacement;
    });
  }
  static findLineEnd(value, currentEnd) {
    const lastLineStart = value.lastIndexOf("\n", currentEnd - 1) + 1;
    if (value.charAt(lastLineStart) !== "	") {
      return currentEnd;
    }
    return lastLineStart + 1;
  }
  static indent(element) {
    const {selectionStart, selectionEnd, value} = element;
    const selectedText = value.slice(selectionStart, selectionEnd);
    const lineBreakCount = /\n/g.exec(selectedText)?.length;
    if (lineBreakCount && lineBreakCount > 0) {
      const firstLineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const newSelection = element.value.slice(firstLineStart, selectionEnd - 1);
      const indentedText = newSelection.replace(/^|\n/g, `$&${INDENT}`);
      const replacementsCount = indentedText.length - newSelection.length;
      element.setSelectionRange(firstLineStart, selectionEnd - 1);
      TextAreaUtils.insert(element, indentedText);
      element.setSelectionRange(selectionStart + 1, selectionEnd + replacementsCount);
    } else {
      TextAreaUtils.insert(element, INDENT);
    }
  }
  static unindent(element) {
    const {selectionStart, selectionEnd, value} = element;
    const firstLineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const minimumSelectionEnd = TextAreaUtils.findLineEnd(value, selectionEnd);
    const newSelection = element.value.slice(firstLineStart, minimumSelectionEnd);
    const indentedText = newSelection.replace(/(^|\n)(\t| {1,2})/g, "$1");
    const replacementsCount = newSelection.length - indentedText.length;
    element.setSelectionRange(firstLineStart, minimumSelectionEnd);
    TextAreaUtils.insert(element, indentedText);
    const firstLineIndentation = /\t| {1,2}/.exec(value.slice(firstLineStart, selectionStart));
    const difference = firstLineIndentation ? firstLineIndentation[0].length : 0;
    const newSelectionStart = selectionStart - difference;
    element.setSelectionRange(selectionStart - difference, Math.max(newSelectionStart, selectionEnd - replacementsCount));
  }
};
var text_utils_default = TextAreaUtils;

// src/shape/shapes/text/text.tsx
function normalizeText(text) {
  return text.replace(/\r?\n|\r/g, "\n");
}
var mdiv;
function getMeasurementDiv() {
  document.getElementById("__textMeasure")?.remove();
  const mdiv2 = document.createElement("pre");
  mdiv2.id = "__textMeasure";
  Object.assign(mdiv2.style, {
    whiteSpace: "pre",
    width: "auto",
    border: "1px solid red",
    padding: "4px",
    margin: "0px",
    opacity: "0",
    position: "absolute",
    top: "-500px",
    left: "0px",
    zIndex: "9999",
    pointerEvents: "none",
    userSelect: "none",
    alignmentBaseline: "mathematical",
    dominantBaseline: "mathematical"
  });
  mdiv2.tabIndex = -1;
  document.body.appendChild(mdiv2);
  return mdiv2;
}
if (typeof window !== "undefined") {
  getMeasurementDiv();
}
var Text = class extends TLDrawShapeUtil {
  constructor() {
    super(...arguments);
    this.type = TLDrawShapeType.Text;
    this.toolType = TLDrawToolType.Text;
    this.canChangeAspectRatio = false;
    this.canBind = true;
    this.isEditableText = true;
    this.pathCache = new WeakMap([]);
    this.defaultProps = {
      id: "id",
      type: TLDrawShapeType.Text,
      name: "Text",
      parentId: "page",
      childIndex: 1,
      point: [0, 0],
      rotation: 0,
      text: "hi",
      style: defaultStyle
    };
  }
  shouldRender(prev, next) {
    return next.text !== prev.text || next.style.scale !== prev.style.scale || next.style !== prev.style;
  }
  render(shape, {
    ref,
    isBinding,
    isEditing,
    isDarkMode,
    onTextBlur,
    onTextChange,
    onTextFocus,
    onTextKeyDown,
    onTextKeyUp
  }) {
    const {id, text, style: style2} = shape;
    const styles = getShapeStyle(style2, isDarkMode);
    const font = getFontStyle(shape.style);
    const bounds = this.getBounds(shape);
    function handleChange(e14) {
      onTextChange?.(id, normalizeText(e14.currentTarget.value));
    }
    function handleKeyDown(e14) {
      onTextKeyDown?.(id, e14.key);
      if (e14.key === "Escape")
        return;
      e14.stopPropagation();
      if (e14.key === "Tab") {
        e14.preventDefault();
        if (e14.shiftKey) {
          text_utils_default.unindent(e14.currentTarget);
        } else {
          text_utils_default.indent(e14.currentTarget);
        }
        onTextChange?.(id, normalizeText(e14.currentTarget.value));
      }
    }
    function handleKeyUp(e14) {
      onTextKeyUp?.(id, e14.key);
    }
    function handleBlur(e14) {
      if (isEditing) {
        e14.currentTarget.focus();
        e14.currentTarget.select();
        return;
      }
      setTimeout(() => {
        onTextBlur?.(id);
      }, 0);
    }
    function handleFocus(e14) {
      e14.currentTarget.select();
      onTextFocus?.(id);
    }
    function handlePointerDown() {
      if (ref && ref.current.selectionEnd !== 0) {
        ref.current.selectionEnd = 0;
      }
    }
    const fontSize = getFontSize(shape.style.size) * (shape.style.scale || 1);
    const lineHeight = fontSize * 1.4;
    if (!isEditing) {
      return /* @__PURE__ */ React5.createElement(React5.Fragment, null, text.split("\n").map((str, i6) => /* @__PURE__ */ React5.createElement("text", {
        key: i6,
        x: 4,
        y: 4 + fontSize / 2 + i6 * lineHeight,
        fontFamily: "Verveine Regular",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize,
        width: bounds.width,
        height: bounds.height,
        fill: styles.stroke,
        color: styles.stroke,
        stroke: "none",
        xmlSpace: "preserve",
        dominantBaseline: "mathematical",
        alignmentBaseline: "mathematical"
      }, str)));
    }
    if (ref === void 0) {
      throw Error("This component should receive a ref when editing.");
    }
    return /* @__PURE__ */ React5.createElement("foreignObject", {
      width: bounds.width,
      height: bounds.height,
      pointerEvents: "none",
      onPointerDown: (e14) => e14.stopPropagation()
    }, /* @__PURE__ */ React5.createElement(StyledTextArea, {
      ref,
      style: {
        font,
        color: styles.stroke
      },
      name: "text",
      defaultValue: text,
      tabIndex: -1,
      autoComplete: "false",
      autoCapitalize: "false",
      autoCorrect: "false",
      autoSave: "false",
      placeholder: "",
      color: styles.stroke,
      autoFocus: true,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
      onChange: handleChange,
      onPointerDown: handlePointerDown
    }));
  }
  renderIndicator(shape) {
    return null;
  }
  getBounds(shape) {
    const bounds = import_core7.Utils.getFromCache(this.boundsCache, shape, () => {
      mdiv.innerHTML = `${shape.text}&zwj;`;
      mdiv.style.font = getFontStyle(shape.style);
      const [width, height] = [mdiv.offsetWidth, mdiv.offsetHeight];
      return {
        minX: 0,
        maxX: width,
        minY: 0,
        maxY: height,
        width,
        height
      };
    });
    return import_core7.Utils.translateBounds(bounds, shape.point);
  }
  getRotatedBounds(shape) {
    return import_core7.Utils.getBoundsFromPoints(import_core7.Utils.getRotatedCorners(this.getBounds(shape), shape.rotation));
  }
  getCenter(shape) {
    return import_core7.Utils.getBoundsCenter(this.getBounds(shape));
  }
  hitTest(shape, point) {
    return import_core7.Utils.pointInBounds(point, this.getBounds(shape));
  }
  hitTestBounds(shape, bounds) {
    const rotatedCorners = import_core7.Utils.getRotatedCorners(this.getBounds(shape), shape.rotation);
    return rotatedCorners.every((point) => import_core7.Utils.pointInBounds(point, bounds)) || import_core7.Intersect.polyline.bounds(rotatedCorners, bounds).length > 0;
  }
  transform(_shape, bounds, {initialShape, scaleX, scaleY}) {
    const {
      isAspectRatioLocked,
      rotation = 0,
      style: {scale = 1}
    } = initialShape;
    if (!rotation && !isAspectRatioLocked) {
      return {
        point: [bounds.minX, bounds.minY],
        style: {
          ...initialShape.style,
          scale: scale * Math.abs(scaleX)
        }
      };
    }
    return {
      point: [bounds.minX, bounds.minY],
      rotation: scaleX < 0 && scaleY >= 0 || scaleY < 0 && scaleX >= 0 ? -(rotation || 0) : rotation,
      style: {
        ...initialShape.style,
        scale: scale * Math.abs(Math.min(scaleX, scaleY))
      }
    };
  }
  transformSingle(_shape, bounds, {initialShape, scaleX}) {
    const {
      style: {scale = 1}
    } = initialShape;
    return {
      point: import_core7.Vec.round([bounds.minX, bounds.minY]),
      style: {
        ...initialShape.style,
        scale: scale * Math.abs(scaleX)
      }
    };
  }
  onBoundsReset(shape) {
    const center = this.getCenter(shape);
    this.boundsCache.delete(shape);
    const newCenter = this.getCenter(shape);
    return {
      style: {
        ...shape.style,
        scale: 1
      },
      point: import_core7.Vec.round(import_core7.Vec.add(shape.point, import_core7.Vec.sub(center, newCenter)))
    };
  }
  onStyleChange(shape) {
    const center = this.getCenter(shape);
    this.boundsCache.delete(shape);
    const newCenter = this.getCenter(shape);
    return {
      point: import_core7.Vec.round(import_core7.Vec.add(shape.point, import_core7.Vec.sub(center, newCenter)))
    };
  }
  shouldDelete(shape) {
    return shape.text.length === 0;
  }
};
var StyledTextArea = styles_default("textarea", {
  zIndex: 1,
  width: "100%",
  height: "100%",
  border: "none",
  padding: "4px",
  whiteSpace: "pre",
  alignmentBaseline: "mathematical",
  dominantBaseline: "mathematical",
  resize: "none",
  minHeight: 1,
  minWidth: 1,
  lineHeight: 1.4,
  outline: 0,
  fontWeight: "500",
  backgroundColor: "$boundsBg",
  overflow: "hidden",
  pointerEvents: "all",
  backfaceVisibility: "hidden",
  display: "inline-block",
  userSelect: "text",
  WebkitUserSelect: "text",
  WebkitTouchCallout: "none"
});

// src/shape/shape-utils.tsx
var tldrawShapeUtils = {
  [TLDrawShapeType.Rectangle]: new Rectangle(),
  [TLDrawShapeType.Ellipse]: new Ellipse(),
  [TLDrawShapeType.Draw]: new Draw(),
  [TLDrawShapeType.Arrow]: new Arrow(),
  [TLDrawShapeType.Text]: new Text()
};
function getShapeUtilsByType(shape) {
  return tldrawShapeUtils[shape.type];
}
function getShapeUtils(shape) {
  return tldrawShapeUtils[shape.type];
}
function createShape(type, props) {
  return tldrawShapeUtils[type].create(props);
}

// src/hooks/useKeyboardShortcuts.tsx
var React6 = __toModule(require("react"));
var import_core8 = __toModule(require_cjs());

// ../../node_modules/hotkeys-js/dist/hotkeys.esm.js
var isff = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase().indexOf("firefox") > 0 : false;
function addEvent(object, event, method) {
  if (object.addEventListener) {
    object.addEventListener(event, method, false);
  } else if (object.attachEvent) {
    object.attachEvent("on".concat(event), function() {
      method(window.event);
    });
  }
}
function getMods(modifier, key) {
  var mods = key.slice(0, key.length - 1);
  for (var i6 = 0; i6 < mods.length; i6++) {
    mods[i6] = modifier[mods[i6].toLowerCase()];
  }
  return mods;
}
function getKeys(key) {
  if (typeof key !== "string")
    key = "";
  key = key.replace(/\s/g, "");
  var keys = key.split(",");
  var index = keys.lastIndexOf("");
  for (; index >= 0; ) {
    keys[index - 1] += ",";
    keys.splice(index, 1);
    index = keys.lastIndexOf("");
  }
  return keys;
}
function compareArray(a1, a22) {
  var arr1 = a1.length >= a22.length ? a1 : a22;
  var arr2 = a1.length >= a22.length ? a22 : a1;
  var isIndex = true;
  for (var i6 = 0; i6 < arr1.length; i6++) {
    if (arr2.indexOf(arr1[i6]) === -1)
      isIndex = false;
  }
  return isIndex;
}
var _keyMap = {
  backspace: 8,
  tab: 9,
  clear: 12,
  enter: 13,
  return: 13,
  esc: 27,
  escape: 27,
  space: 32,
  left: 37,
  up: 38,
  right: 39,
  down: 40,
  del: 46,
  delete: 46,
  ins: 45,
  insert: 45,
  home: 36,
  end: 35,
  pageup: 33,
  pagedown: 34,
  capslock: 20,
  num_0: 96,
  num_1: 97,
  num_2: 98,
  num_3: 99,
  num_4: 100,
  num_5: 101,
  num_6: 102,
  num_7: 103,
  num_8: 104,
  num_9: 105,
  num_multiply: 106,
  num_add: 107,
  num_enter: 108,
  num_subtract: 109,
  num_decimal: 110,
  num_divide: 111,
  "\u21EA": 20,
  ",": 188,
  ".": 190,
  "/": 191,
  "`": 192,
  "-": isff ? 173 : 189,
  "=": isff ? 61 : 187,
  ";": isff ? 59 : 186,
  "'": 222,
  "[": 219,
  "]": 221,
  "\\": 220
};
var _modifier = {
  "\u21E7": 16,
  shift: 16,
  "\u2325": 18,
  alt: 18,
  option: 18,
  "\u2303": 17,
  ctrl: 17,
  control: 17,
  "\u2318": 91,
  cmd: 91,
  command: 91
};
var modifierMap = {
  16: "shiftKey",
  18: "altKey",
  17: "ctrlKey",
  91: "metaKey",
  shiftKey: 16,
  ctrlKey: 17,
  altKey: 18,
  metaKey: 91
};
var _mods = {
  16: false,
  18: false,
  17: false,
  91: false
};
var _handlers = {};
for (var k4 = 1; k4 < 20; k4++) {
  _keyMap["f".concat(k4)] = 111 + k4;
}
var _downKeys = [];
var _scope = "all";
var elementHasBindEvent = [];
var code = function code2(x6) {
  return _keyMap[x6.toLowerCase()] || _modifier[x6.toLowerCase()] || x6.toUpperCase().charCodeAt(0);
};
function setScope(scope) {
  _scope = scope || "all";
}
function getScope() {
  return _scope || "all";
}
function getPressedKeyCodes() {
  return _downKeys.slice(0);
}
function filter(event) {
  var target = event.target || event.srcElement;
  var tagName = target.tagName;
  var flag = true;
  if (target.isContentEditable || (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") && !target.readOnly) {
    flag = false;
  }
  return flag;
}
function isPressed(keyCode) {
  if (typeof keyCode === "string") {
    keyCode = code(keyCode);
  }
  return _downKeys.indexOf(keyCode) !== -1;
}
function deleteScope(scope, newScope) {
  var handlers;
  var i6;
  if (!scope)
    scope = getScope();
  for (var key in _handlers) {
    if (Object.prototype.hasOwnProperty.call(_handlers, key)) {
      handlers = _handlers[key];
      for (i6 = 0; i6 < handlers.length; ) {
        if (handlers[i6].scope === scope)
          handlers.splice(i6, 1);
        else
          i6++;
      }
    }
  }
  if (getScope() === scope)
    setScope(newScope || "all");
}
function clearModifier(event) {
  var key = event.keyCode || event.which || event.charCode;
  var i6 = _downKeys.indexOf(key);
  if (i6 >= 0) {
    _downKeys.splice(i6, 1);
  }
  if (event.key && event.key.toLowerCase() === "meta") {
    _downKeys.splice(0, _downKeys.length);
  }
  if (key === 93 || key === 224)
    key = 91;
  if (key in _mods) {
    _mods[key] = false;
    for (var k4 in _modifier) {
      if (_modifier[k4] === key)
        hotkeys[k4] = false;
    }
  }
}
function unbind(keysInfo) {
  if (!keysInfo) {
    Object.keys(_handlers).forEach(function(key) {
      return delete _handlers[key];
    });
  } else if (Array.isArray(keysInfo)) {
    keysInfo.forEach(function(info) {
      if (info.key)
        eachUnbind(info);
    });
  } else if (typeof keysInfo === "object") {
    if (keysInfo.key)
      eachUnbind(keysInfo);
  } else if (typeof keysInfo === "string") {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    var scope = args[0], method = args[1];
    if (typeof scope === "function") {
      method = scope;
      scope = "";
    }
    eachUnbind({
      key: keysInfo,
      scope,
      method,
      splitKey: "+"
    });
  }
}
var eachUnbind = function eachUnbind2(_ref) {
  var key = _ref.key, scope = _ref.scope, method = _ref.method, _ref$splitKey = _ref.splitKey, splitKey = _ref$splitKey === void 0 ? "+" : _ref$splitKey;
  var multipleKeys = getKeys(key);
  multipleKeys.forEach(function(originKey) {
    var unbindKeys = originKey.split(splitKey);
    var len3 = unbindKeys.length;
    var lastKey = unbindKeys[len3 - 1];
    var keyCode = lastKey === "*" ? "*" : code(lastKey);
    if (!_handlers[keyCode])
      return;
    if (!scope)
      scope = getScope();
    var mods = len3 > 1 ? getMods(_modifier, unbindKeys) : [];
    _handlers[keyCode] = _handlers[keyCode].map(function(record) {
      var isMatchingMethod = method ? record.method === method : true;
      if (isMatchingMethod && record.scope === scope && compareArray(record.mods, mods)) {
        return {};
      }
      return record;
    });
  });
};
function eventHandler(event, handler, scope) {
  var modifiersMatch;
  if (handler.scope === scope || handler.scope === "all") {
    modifiersMatch = handler.mods.length > 0;
    for (var y5 in _mods) {
      if (Object.prototype.hasOwnProperty.call(_mods, y5)) {
        if (!_mods[y5] && handler.mods.indexOf(+y5) > -1 || _mods[y5] && handler.mods.indexOf(+y5) === -1) {
          modifiersMatch = false;
        }
      }
    }
    if (handler.mods.length === 0 && !_mods[16] && !_mods[18] && !_mods[17] && !_mods[91] || modifiersMatch || handler.shortcut === "*") {
      if (handler.method(event, handler) === false) {
        if (event.preventDefault)
          event.preventDefault();
        else
          event.returnValue = false;
        if (event.stopPropagation)
          event.stopPropagation();
        if (event.cancelBubble)
          event.cancelBubble = true;
      }
    }
  }
}
function dispatch(event) {
  var asterisk = _handlers["*"];
  var key = event.keyCode || event.which || event.charCode;
  if (!hotkeys.filter.call(this, event))
    return;
  if (key === 93 || key === 224)
    key = 91;
  if (_downKeys.indexOf(key) === -1 && key !== 229)
    _downKeys.push(key);
  ["ctrlKey", "altKey", "shiftKey", "metaKey"].forEach(function(keyName) {
    var keyNum = modifierMap[keyName];
    if (event[keyName] && _downKeys.indexOf(keyNum) === -1) {
      _downKeys.push(keyNum);
    } else if (!event[keyName] && _downKeys.indexOf(keyNum) > -1) {
      _downKeys.splice(_downKeys.indexOf(keyNum), 1);
    } else if (keyName === "metaKey" && event[keyName] && _downKeys.length === 3) {
      if (!(event.ctrlKey || event.shiftKey || event.altKey)) {
        _downKeys = _downKeys.slice(_downKeys.indexOf(keyNum));
      }
    }
  });
  if (key in _mods) {
    _mods[key] = true;
    for (var k4 in _modifier) {
      if (_modifier[k4] === key)
        hotkeys[k4] = true;
    }
    if (!asterisk)
      return;
  }
  for (var e14 in _mods) {
    if (Object.prototype.hasOwnProperty.call(_mods, e14)) {
      _mods[e14] = event[modifierMap[e14]];
    }
  }
  if (event.getModifierState && !(event.altKey && !event.ctrlKey) && event.getModifierState("AltGraph")) {
    if (_downKeys.indexOf(17) === -1) {
      _downKeys.push(17);
    }
    if (_downKeys.indexOf(18) === -1) {
      _downKeys.push(18);
    }
    _mods[17] = true;
    _mods[18] = true;
  }
  var scope = getScope();
  if (asterisk) {
    for (var i6 = 0; i6 < asterisk.length; i6++) {
      if (asterisk[i6].scope === scope && (event.type === "keydown" && asterisk[i6].keydown || event.type === "keyup" && asterisk[i6].keyup)) {
        eventHandler(event, asterisk[i6], scope);
      }
    }
  }
  if (!(key in _handlers))
    return;
  for (var _i = 0; _i < _handlers[key].length; _i++) {
    if (event.type === "keydown" && _handlers[key][_i].keydown || event.type === "keyup" && _handlers[key][_i].keyup) {
      if (_handlers[key][_i].key) {
        var record = _handlers[key][_i];
        var splitKey = record.splitKey;
        var keyShortcut = record.key.split(splitKey);
        var _downKeysCurrent = [];
        for (var a6 = 0; a6 < keyShortcut.length; a6++) {
          _downKeysCurrent.push(code(keyShortcut[a6]));
        }
        if (_downKeysCurrent.sort().join("") === _downKeys.sort().join("")) {
          eventHandler(event, record, scope);
        }
      }
    }
  }
}
function isElementBind(element) {
  return elementHasBindEvent.indexOf(element) > -1;
}
function hotkeys(key, option, method) {
  _downKeys = [];
  var keys = getKeys(key);
  var mods = [];
  var scope = "all";
  var element = document;
  var i6 = 0;
  var keyup = false;
  var keydown = true;
  var splitKey = "+";
  if (method === void 0 && typeof option === "function") {
    method = option;
  }
  if (Object.prototype.toString.call(option) === "[object Object]") {
    if (option.scope)
      scope = option.scope;
    if (option.element)
      element = option.element;
    if (option.keyup)
      keyup = option.keyup;
    if (option.keydown !== void 0)
      keydown = option.keydown;
    if (typeof option.splitKey === "string")
      splitKey = option.splitKey;
  }
  if (typeof option === "string")
    scope = option;
  for (; i6 < keys.length; i6++) {
    key = keys[i6].split(splitKey);
    mods = [];
    if (key.length > 1)
      mods = getMods(_modifier, key);
    key = key[key.length - 1];
    key = key === "*" ? "*" : code(key);
    if (!(key in _handlers))
      _handlers[key] = [];
    _handlers[key].push({
      keyup,
      keydown,
      scope,
      mods,
      shortcut: keys[i6],
      method,
      key: keys[i6],
      splitKey
    });
  }
  if (typeof element !== "undefined" && !isElementBind(element) && window) {
    elementHasBindEvent.push(element);
    addEvent(element, "keydown", function(e14) {
      dispatch(e14);
    });
    addEvent(window, "focus", function() {
      _downKeys = [];
    });
    addEvent(element, "keyup", function(e14) {
      dispatch(e14);
      clearModifier(e14);
    });
  }
}
var _api = {
  setScope,
  getScope,
  deleteScope,
  getPressedKeyCodes,
  isPressed,
  filter,
  unbind
};
for (var a6 in _api) {
  if (Object.prototype.hasOwnProperty.call(_api, a6)) {
    hotkeys[a6] = _api[a6];
  }
}
if (typeof window !== "undefined") {
  _hotkeys = window.hotkeys;
  hotkeys.noConflict = function(deep) {
    if (deep && window.hotkeys === hotkeys) {
      window.hotkeys = _hotkeys;
    }
    return hotkeys;
  };
  window.hotkeys = hotkeys;
}
var _hotkeys;
var hotkeys_esm_default = hotkeys;

// ../../node_modules/react-hotkeys-hook/dist/react-hotkeys-hook.esm.js
var import_react3 = __toModule(require("react"));
hotkeys_esm_default.filter = function() {
  return true;
};
var tagFilter = function tagFilter2(_ref, enableOnTags) {
  var target = _ref.target;
  var targetTagName = target && target.tagName;
  return Boolean(targetTagName && enableOnTags && enableOnTags.includes(targetTagName));
};
var isKeyboardEventTriggeredByInput = function isKeyboardEventTriggeredByInput2(ev) {
  return tagFilter(ev, ["INPUT", "TEXTAREA", "SELECT"]);
};
function useHotkeys(keys, callback, options, deps) {
  if (options instanceof Array) {
    deps = options;
    options = void 0;
  }
  var _ref2 = options || {}, enableOnTags = _ref2.enableOnTags, filter2 = _ref2.filter, keyup = _ref2.keyup, keydown = _ref2.keydown, _ref2$filterPreventDe = _ref2.filterPreventDefault, filterPreventDefault = _ref2$filterPreventDe === void 0 ? true : _ref2$filterPreventDe, _ref2$enabled = _ref2.enabled, enabled = _ref2$enabled === void 0 ? true : _ref2$enabled, _ref2$enableOnContent = _ref2.enableOnContentEditable, enableOnContentEditable = _ref2$enableOnContent === void 0 ? false : _ref2$enableOnContent;
  var ref = (0, import_react3.useRef)(null);
  var memoisedCallback = (0, import_react3.useCallback)(function(keyboardEvent, hotkeysEvent) {
    var _keyboardEvent$target;
    if (filter2 && !filter2(keyboardEvent)) {
      return !filterPreventDefault;
    }
    if (isKeyboardEventTriggeredByInput(keyboardEvent) && !tagFilter(keyboardEvent, enableOnTags) || (_keyboardEvent$target = keyboardEvent.target) != null && _keyboardEvent$target.isContentEditable && !enableOnContentEditable) {
      return true;
    }
    if (ref.current === null || document.activeElement === ref.current) {
      callback(keyboardEvent, hotkeysEvent);
      return true;
    }
    return false;
  }, deps ? [ref, enableOnTags, filter2].concat(deps) : [ref, enableOnTags, filter2]);
  (0, import_react3.useEffect)(function() {
    if (!enabled) {
      return;
    }
    if (keyup && keydown !== true) {
      options.keydown = false;
    }
    hotkeys_esm_default(keys, options || {}, memoisedCallback);
    return function() {
      return hotkeys_esm_default.unbind(keys, memoisedCallback);
    };
  }, [memoisedCallback, keys, enabled]);
  return ref;
}
var isHotkeyPressed = hotkeys_esm_default.isPressed;

// src/hooks/useKeyboardShortcuts.tsx
function useKeyboardShortcuts(tlstate) {
  React6.useEffect(() => {
    const handleKeyDown = (e14) => {
      const info = import_core8.inputs.keydown(e14);
      tlstate.onKeyDown(e14.key, info);
    };
    const handleKeyUp = (e14) => {
      const info = import_core8.inputs.keyup(e14);
      tlstate.onKeyUp(e14.key, info);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [tlstate]);
  useHotkeys("v,1", (e14) => {
    tlstate.selectTool("select");
    e14.preventDefault();
  });
  useHotkeys("d,2", (e14) => {
    tlstate.selectTool(TLDrawShapeType.Draw);
    e14.preventDefault();
  });
  useHotkeys("r,3", (e14) => {
    tlstate.selectTool(TLDrawShapeType.Rectangle);
    e14.preventDefault();
  });
  useHotkeys("e,4", (e14) => {
    tlstate.selectTool(TLDrawShapeType.Ellipse);
    e14.preventDefault();
  });
  useHotkeys("a,5", (e14) => {
    tlstate.selectTool(TLDrawShapeType.Arrow);
    e14.preventDefault();
  });
  useHotkeys("t,6", (e14) => {
    tlstate.selectTool(TLDrawShapeType.Text);
    e14.preventDefault();
  });
  useHotkeys("ctrl+s,command+s", (e14) => {
    tlstate.save();
    e14.preventDefault();
  });
  useHotkeys("command+z", (e14) => {
    tlstate.undo();
    e14.preventDefault();
  });
  useHotkeys("ctrl+shift-z,command+shift+z", (e14) => {
    tlstate.redo();
    e14.preventDefault();
  });
  useHotkeys("ctrl+=,command+=", (e14) => {
    tlstate.zoomIn();
    e14.preventDefault();
  });
  useHotkeys("ctrl+-,command+-", (e14) => {
    tlstate.zoomOut();
    e14.preventDefault();
  });
  useHotkeys("shift+1", (e14) => {
    tlstate.zoomToFit();
    e14.preventDefault();
  });
  useHotkeys("shift+2", (e14) => {
    tlstate.zoomToSelection();
    e14.preventDefault();
  });
  useHotkeys("shift+0", (e14) => {
    tlstate.zoomToActual();
    e14.preventDefault();
  });
  useHotkeys("ctrl+d,command+d", (e14) => {
    tlstate.duplicate();
    e14.preventDefault();
  });
  useHotkeys("shift+h", (e14) => {
    tlstate.flipHorizontal();
    e14.preventDefault();
  });
  useHotkeys("shift+v", (e14) => {
    tlstate.flipVertical();
    e14.preventDefault();
  });
  useHotkeys("escape", (e14) => {
    tlstate.cancel();
    e14.preventDefault();
  });
  useHotkeys("backspace", (e14) => {
    tlstate.delete();
    e14.preventDefault();
  });
  useHotkeys("command+a,ctrl+a", (e14) => {
    tlstate.selectAll();
    e14.preventDefault();
  });
  useHotkeys("up", (e14) => {
    tlstate.nudge([0, -1], false);
    e14.preventDefault();
  });
  useHotkeys("right", (e14) => {
    tlstate.nudge([1, 0], false);
    e14.preventDefault();
  });
  useHotkeys("down", (e14) => {
    tlstate.nudge([0, 1], false);
    e14.preventDefault();
  });
  useHotkeys("left", (e14) => {
    tlstate.nudge([-1, 0], false);
    e14.preventDefault();
  });
  useHotkeys("shift+up", (e14) => {
    tlstate.nudge([0, -1], true);
    e14.preventDefault();
  });
  useHotkeys("shift+right", (e14) => {
    tlstate.nudge([1, 0], true);
    e14.preventDefault();
  });
  useHotkeys("shift+down", (e14) => {
    tlstate.nudge([0, 1], true);
    e14.preventDefault();
  });
  useHotkeys("shift+left", (e14) => {
    tlstate.nudge([-1, 0], true);
    e14.preventDefault();
  });
  useHotkeys("command+c,ctrl+c", (e14) => {
    tlstate.copy();
    e14.preventDefault();
  });
  useHotkeys("command+v,ctrl+v", (e14) => {
    tlstate.paste();
    e14.preventDefault();
  });
  useHotkeys("[", (e14) => {
    tlstate.moveBackward();
    e14.preventDefault();
  });
  useHotkeys("]", (e14) => {
    tlstate.moveForward();
    e14.preventDefault();
  });
  useHotkeys("shift+[", (e14) => {
    tlstate.moveToBack();
    e14.preventDefault();
  });
  useHotkeys("shift+]", (e14) => {
    tlstate.moveToFront();
    e14.preventDefault();
  });
  useHotkeys("command+shift+backspace", (e14) => {
    tlstate.reset();
    e14.preventDefault();
  });
}

// src/hooks/useTLDrawContext.tsx
var React7 = __toModule(require("react"));
var TLDrawContext = React7.createContext({});
function useTLDrawContext() {
  const context = React7.useContext(TLDrawContext);
  return context;
}

// src/hooks/useTheme.ts
function useTheme() {
  return {
    theme: "light",
    toggle: () => null
  };
}

// src/components/context-menu/context-menu.tsx
var React17 = __toModule(require("react"));
var import_core10 = __toModule(require_cjs());

// ../../node_modules/@radix-ui/react-use-callback-ref/dist/index.module.js
var e3 = __toModule(require("react"));
function useCallbackRef(r11) {
  const t14 = e3.useRef(r11);
  return e3.useEffect(() => {
    t14.current = r11;
  }), e3.useCallback((...e14) => {
    var r12;
    return (r12 = t14.current) === null || r12 === void 0 ? void 0 : r12.call(t14, ...e14);
  }, []);
}

// ../../node_modules/@radix-ui/react-focus-guards/dist/index.module.js
var e4 = __toModule(require("react"));
var t3 = 0;
function useFocusGuards() {
  e4.useEffect(() => {
    var e14, n5;
    const r11 = document.querySelectorAll("[data-radix-focus-guard]");
    return document.body.insertAdjacentElement("afterbegin", (e14 = r11[0]) !== null && e14 !== void 0 ? e14 : o2()), document.body.insertAdjacentElement("beforeend", (n5 = r11[1]) !== null && n5 !== void 0 ? n5 : o2()), t3++, () => {
      t3 === 1 && document.querySelectorAll("[data-radix-focus-guard]").forEach((e15) => e15.remove()), t3--;
    };
  }, []);
}
function o2() {
  const e14 = document.createElement("span");
  return e14.setAttribute("data-radix-focus-guard", ""), e14.tabIndex = 0, e14.style.cssText = "outline: none; opacity: 0; position: fixed; pointer-events: none", e14;
}

// ../../node_modules/@radix-ui/react-use-direction/dist/index.module.js
var e5 = __toModule(require("react"));
function useDirection(t14, n5) {
  const [r11, o13] = e5.useState("ltr"), [i6, u6] = e5.useState(), c7 = e5.useRef(0);
  return e5.useEffect(() => {
    if (n5 === void 0 && t14 != null && t14.parentElement) {
      const e14 = getComputedStyle(t14.parentElement);
      u6(e14);
    }
  }, [t14, n5]), e5.useEffect(() => (n5 === void 0 && function e14() {
    c7.current = requestAnimationFrame(() => {
      const t15 = i6 == null ? void 0 : i6.direction;
      t15 && o13(t15), e14();
    });
  }(), () => cancelAnimationFrame(c7.current)), [i6, n5, o13]), n5 || r11;
}

// ../../node_modules/@radix-ui/react-compose-refs/dist/index.module.js
var o3 = __toModule(require("react"));
function composeRefs(...o13) {
  return (e14) => o13.forEach((o14) => function(o15, e15) {
    typeof o15 == "function" ? o15(e15) : o15 != null && (o15.current = e15);
  }(o14, e14));
}
function useComposedRefs(...e14) {
  return o3.useCallback(composeRefs(...e14), e14);
}

// ../../node_modules/@radix-ui/react-slot/dist/index.module.js
var t4 = __toModule(require("react"));
var Slot = /* @__PURE__ */ t4.forwardRef((e14, o13) => {
  const {children: l7, ...c7} = e14;
  return t4.Children.count(l7) === 1 ? /* @__PURE__ */ t4.createElement(r2, _extends({}, c7, {ref: o13}), l7) : /* @__PURE__ */ t4.createElement(t4.Fragment, null, t4.Children.map(l7, (e15) => /* @__PURE__ */ t4.isValidElement(e15) && e15.type === Slottable ? /* @__PURE__ */ t4.createElement(r2, _extends({}, c7, {ref: o13}), e15.props.children) : e15));
});
Slot.displayName = "Slot";
var r2 = /* @__PURE__ */ t4.forwardRef((n5, r11) => {
  const {children: l7, ...c7} = n5, i6 = t4.Children.only(l7);
  return t4.isValidElement(i6) ? /* @__PURE__ */ t4.cloneElement(i6, {...o4(c7, i6.props), ref: composeRefs(r11, i6.ref)}) : null;
});
r2.displayName = "SlotClone";
var Slottable = ({children: e14}) => e14;
function o4(e14, t14) {
  const n5 = {...t14};
  for (const r11 in t14) {
    const o13 = e14[r11], c7 = t14[r11];
    /^on[A-Z]/.test(r11) ? n5[r11] = l2(c7, o13) : r11 === "style" && (n5[r11] = {...o13, ...c7});
  }
  return {...e14, ...n5};
}
function l2(e14, t14) {
  return function(...n5) {
    e14 == null || e14(...n5);
    n5[0] instanceof Event && n5[0].defaultPrevented || t14 == null || t14(...n5);
  };
}

// ../../node_modules/@radix-ui/react-use-controllable-state/dist/index.module.js
var t5 = __toModule(require("react"));
function useControllableState({prop: o13, defaultProp: r11, onChange: n5 = () => {
}}) {
  const [a6, u6] = function({defaultProp: o14, onChange: r12}) {
    const n6 = t5.useState(o14), [a7] = n6, u7 = t5.useRef(a7), c8 = useCallbackRef(r12);
    return t5.useEffect(() => {
      u7.current !== a7 && (c8(a7), u7.current = a7);
    }, [a7, u7, c8]), n6;
  }({defaultProp: r11, onChange: n5}), c7 = o13 !== void 0, f7 = c7 ? o13 : a6, l7 = useCallbackRef(n5);
  return [f7, t5.useCallback((e14) => {
    if (c7) {
      const t14 = e14, r12 = typeof e14 == "function" ? t14(o13) : e14;
      r12 !== o13 && l7(r12);
    } else
      u6(e14);
  }, [c7, o13, u6, l7])];
}

// ../../node_modules/@radix-ui/react-primitive/dist/index.module.js
var e6 = __toModule(require("react"));
var r3 = "div";
var Primitive = /* @__PURE__ */ e6.forwardRef((o13, i6) => {
  const {as: n5 = r3, ...a6} = o13;
  return e6.createElement(n5, _extends({}, a6, {ref: i6}));
});
function extendPrimitive(r11, o13) {
  const i6 = /* @__PURE__ */ e6.forwardRef((i7, n5) => {
    const a6 = r11, s9 = {...o13.defaultProps, ...i7};
    return e6.createElement(a6, _extends({}, s9, {ref: n5}));
  });
  return i6.displayName = o13.displayName || "Extended" + r11.displayName, i6;
}

// ../../node_modules/@radix-ui/react-context/dist/index.module.js
var e7 = __toModule(require("react"));
function createContext4(t14) {
  const r11 = /* @__PURE__ */ e7.createContext(null);
  function n5(t15) {
    const {children: n6, ...o13} = t15, u6 = e7.useMemo(() => o13, Object.values(o13));
    return e7.createElement(r11.Provider, {value: u6}, n6);
  }
  return n5.displayName = t14 + "Provider", [n5, function(n6) {
    const o13 = e7.useContext(r11);
    if (o13 === null)
      throw new Error(`\`${n6}\` must be used within \`${t14}\``);
    return o13;
  }];
}

// ../../node_modules/@radix-ui/react-collection/dist/index.module.js
var import_react4 = __toModule(require("react"));
function createCollection() {
  const o13 = /* @__PURE__ */ import_react4.default.createContext({}), n5 = /* @__PURE__ */ import_react4.default.forwardRef((n6, c8) => {
    const {children: f8} = n6, u6 = import_react4.default.useRef(null), a6 = useComposedRefs(c8, u6), i6 = import_react4.default.useRef(new Map()).current;
    return import_react4.default.createElement(o13.Provider, {value: import_react4.default.useMemo(() => ({itemMap: i6, collectionRef: u6}), [i6])}, /* @__PURE__ */ import_react4.default.createElement(Slot, {ref: a6}, f8));
  }), c7 = "data-radix-collection-item", f7 = /* @__PURE__ */ import_react4.default.forwardRef((n6, f8) => {
    const {children: u6, ...a6} = n6, i6 = import_react4.default.useRef(null), l7 = useComposedRefs(f8, i6), m8 = import_react4.default.useContext(o13);
    return import_react4.default.useEffect(() => (m8.itemMap.set(i6, {ref: i6, ...a6}), () => {
      m8.itemMap.delete(i6);
    })), /* @__PURE__ */ import_react4.default.createElement(Slot, {[c7]: "", ref: l7}, u6);
  });
  return [n5, f7, function() {
    const e14 = import_react4.default.useContext(o13);
    return {getItems() {
      const r11 = Array.from(e14.collectionRef.current.querySelectorAll(`[${c7}]`));
      return Array.from(e14.itemMap.values()).sort((e15, t14) => r11.indexOf(e15.ref.current) - r11.indexOf(t14.ref.current));
    }};
  }];
}

// ../../node_modules/@radix-ui/primitive/dist/index.module.js
function composeEventHandlers(e14, n5, {checkForDefaultPrevented: t14 = true} = {}) {
  return function(r11) {
    if (e14 == null || e14(r11), t14 === false || !r11.defaultPrevented)
      return n5 == null ? void 0 : n5(r11);
  };
}

// ../../node_modules/@radix-ui/react-roving-focus/dist/index.module.js
var u2 = __toModule(require("react"));
var f2 = {bubbles: false, cancelable: true};
var [l3, m2, p2] = createCollection();
var d2 = "span";
var [v2, g2] = createContext4("RovingFocusGroup");
var RovingFocusGroup = /* @__PURE__ */ u2.forwardRef((e14, t14) => /* @__PURE__ */ u2.createElement(l3, null, /* @__PURE__ */ u2.createElement(w2, _extends({}, e14, {ref: t14}))));
var w2 = /* @__PURE__ */ u2.forwardRef((o13, n5) => {
  const {as: a6 = d2, orientation: l7, dir: m8 = "ltr", loop: g5 = false, currentTabStopId: w5, defaultCurrentTabStopId: b5, onCurrentTabStopIdChange: x6, onEntryFocus: E4, ...I4} = o13, R4 = u2.useRef(null), h5 = useComposedRefs(n5, R4), [T4 = null, A3] = useControllableState({prop: w5, defaultProp: b5, onChange: x6}), [y5, D4] = u2.useState(false), S3 = useCallbackRef(E4), {getItems: C6} = p2(), G3 = u2.useRef(false);
  return u2.useEffect(() => {
    const e14 = R4.current;
    if (e14)
      return e14.addEventListener("rovingFocusGroup.onEntryFocus", S3), () => e14.removeEventListener("rovingFocusGroup.onEntryFocus", S3);
  }, [S3]), /* @__PURE__ */ u2.createElement(v2, {orientation: l7, dir: m8, loop: g5, currentTabStopId: T4, onItemFocus: u2.useCallback((e14) => A3(e14), [A3]), onItemShiftTab: u2.useCallback(() => D4(true), [])}, /* @__PURE__ */ u2.createElement(Primitive, _extends({tabIndex: y5 ? -1 : 0, "aria-orientation": l7, "data-orientation": l7}, I4, {as: a6, ref: h5, style: {outline: "none", ...o13.style}, onMouseDown: composeEventHandlers(o13.onMouseDown, () => {
    G3.current = true;
  }), onFocus: composeEventHandlers(o13.onFocus, (e14) => {
    const t14 = !G3.current;
    if (e14.target === e14.currentTarget && t14 && !y5) {
      const t15 = new Event("rovingFocusGroup.onEntryFocus", f2);
      if (e14.currentTarget.dispatchEvent(t15), !t15.defaultPrevented) {
        const e15 = C6().filter((e16) => e16.focusable);
        F2([e15.find((e16) => e16.active), e15.find((e16) => e16.id === T4), ...e15].filter(Boolean).map((e16) => e16.ref.current));
      }
    }
    G3.current = false;
  }), onBlur: composeEventHandlers(o13.onBlur, () => D4(false))})));
});
var b2 = "span";
var RovingFocusItem = /* @__PURE__ */ u2.forwardRef((e14, t14) => {
  const {as: n5 = b2, focusable: i6 = true, active: a6 = false, ...f7} = e14, l7 = useId(), d8 = g2("RovingFocusItem"), v6 = d8.currentTabStopId === l7, {getItems: w5} = p2();
  return u2.createElement(m2, {id: l7, focusable: i6, active: a6}, /* @__PURE__ */ u2.createElement(Primitive, _extends({tabIndex: v6 ? 0 : -1, "data-orientation": d8.orientation}, f7, {as: n5, ref: t14, onMouseDown: composeEventHandlers(e14.onMouseDown, (e15) => {
    i6 ? d8.onItemFocus(l7) : e15.preventDefault();
  }), onFocus: composeEventHandlers(e14.onFocus, () => d8.onItemFocus(l7)), onKeyDown: composeEventHandlers(e14.onKeyDown, (e15) => {
    if (e15.key === "Tab" && e15.shiftKey)
      return void d8.onItemShiftTab();
    if (e15.target !== e15.currentTarget)
      return;
    const t15 = function(e16, t16, r12) {
      const o14 = function(e17, t17) {
        return t17 !== "rtl" ? e17 : e17 === "ArrowLeft" ? "ArrowRight" : e17 === "ArrowRight" ? "ArrowLeft" : e17;
      }(e16.key, r12);
      return t16 === "vertical" && ["ArrowLeft", "ArrowRight"].includes(o14) || t16 === "horizontal" && ["ArrowUp", "ArrowDown"].includes(o14) ? void 0 : x2[o14];
    }(e15, d8.orientation, d8.dir);
    if (t15 !== void 0) {
      e15.preventDefault();
      let n6 = w5().filter((e16) => e16.focusable).map((e16) => e16.ref.current);
      if (t15 === "last")
        n6.reverse();
      else if (t15 === "prev" || t15 === "next") {
        t15 === "prev" && n6.reverse();
        const i7 = n6.indexOf(e15.currentTarget);
        n6 = d8.loop ? (o13 = i7 + 1, (r11 = n6).map((e16, t16) => r11[(o13 + t16) % r11.length])) : n6.slice(i7 + 1);
      }
      setTimeout(() => F2(n6));
    }
    var r11, o13;
  })})));
});
var x2 = {ArrowLeft: "prev", ArrowUp: "prev", ArrowRight: "next", ArrowDown: "next", PageUp: "first", Home: "first", PageDown: "last", End: "last"};
function F2(e14) {
  const t14 = document.activeElement;
  for (const r11 of e14) {
    if (r11 === t14)
      return;
    if (r11.focus(), document.activeElement !== t14)
      return;
  }
}

// ../../node_modules/@radix-ui/react-use-layout-effect/dist/index.module.js
var o5 = __toModule(require("react"));
var useLayoutEffect2 = Boolean(globalThis === null || globalThis === void 0 ? void 0 : globalThis.document) ? o5.useLayoutEffect : () => {
};

// ../../node_modules/@radix-ui/react-portal/dist/index.module.js
var import_react_dom = __toModule(require("react-dom"));
var r4 = __toModule(require("react"));
var Portal = /* @__PURE__ */ r4.forwardRef((a6, i6) => {
  var n5, d8;
  const {containerRef: m8, style: s9, ...u6} = a6, c7 = (n5 = m8 == null ? void 0 : m8.current) !== null && n5 !== void 0 ? n5 : globalThis === null || globalThis === void 0 || (d8 = globalThis.document) === null || d8 === void 0 ? void 0 : d8.body, [, f7] = r4.useState({});
  return useLayoutEffect2(() => {
    f7({});
  }, []), c7 ? /* @__PURE__ */ import_react_dom.default.createPortal(/* @__PURE__ */ r4.createElement(Primitive, _extends({"data-radix-portal": ""}, u6, {ref: i6, style: c7 === document.body ? {position: "absolute", top: 0, left: 0, zIndex: 2147483647, ...s9} : void 0})), c7) : null;
});

// ../../node_modules/@radix-ui/react-arrow/dist/index.module.js
var r5 = __toModule(require("react"));
var Arrow2 = /* @__PURE__ */ r5.forwardRef((i6, n5) => {
  const {as: s9 = o6, ...a6} = i6;
  return r5.createElement(Primitive, _extends({}, a6, {as: s9, ref: n5}));
});
var o6 = /* @__PURE__ */ r5.forwardRef((e14, o13) => {
  const {width: i6 = 10, height: n5 = 5, ...s9} = e14;
  return r5.createElement("svg", _extends({}, s9, {ref: o13, width: i6, height: n5, viewBox: "0 0 30 10", preserveAspectRatio: "none"}), /* @__PURE__ */ r5.createElement("polygon", {points: "0,0 30,0 15,10"}));
});
var Root = Arrow2;

// ../../node_modules/@radix-ui/react-use-size/dist/index.module.js
var e9 = __toModule(require("react"));
function useSize(r11) {
  const [i6, t14] = e9.useState(void 0);
  return e9.useEffect(() => {
    if (r11) {
      const e14 = new ResizeObserver((e15) => {
        if (!Array.isArray(e15))
          return;
        if (!e15.length)
          return;
        const i7 = e15[0];
        let o13, n5;
        if ("borderBoxSize" in i7) {
          const e16 = i7.borderBoxSize, r12 = Array.isArray(e16) ? e16[0] : e16;
          o13 = r12.inlineSize, n5 = r12.blockSize;
        } else {
          const e16 = r11.getBoundingClientRect();
          o13 = e16.width, n5 = e16.height;
        }
        t14({width: o13, height: n5});
      });
      return e14.observe(r11, {box: "border-box"}), () => {
        t14(void 0), e14.unobserve(r11);
      };
    }
  }, [r11]), i6;
}

// ../../node_modules/@radix-ui/rect/dist/index.module.js
function observeElementRect(n5, o13) {
  const a6 = e10.get(n5);
  return a6 === void 0 ? (e10.set(n5, {rect: {}, callbacks: [o13]}), e10.size === 1 && (t7 = requestAnimationFrame(c2))) : a6.callbacks.push(o13), () => {
    const c7 = e10.get(n5);
    if (c7 === void 0)
      return;
    const a7 = c7.callbacks.indexOf(o13);
    a7 > -1 && c7.callbacks.splice(a7, 1), c7.callbacks.length === 0 && (e10.delete(n5), e10.size === 0 && cancelAnimationFrame(t7));
  };
}
var t7;
var e10 = new Map();
function c2() {
  const n5 = [];
  e10.forEach((t14, e14) => {
    const c7 = e14.getBoundingClientRect();
    var o13, a6;
    o13 = t14.rect, a6 = c7, (o13.width !== a6.width || o13.height !== a6.height || o13.top !== a6.top || o13.right !== a6.right || o13.bottom !== a6.bottom || o13.left !== a6.left) && (t14.rect = c7, n5.push(t14));
  }), n5.forEach((t14) => {
    t14.callbacks.forEach((e14) => e14(t14.rect));
  }), t7 = requestAnimationFrame(c2);
}

// ../../node_modules/@radix-ui/react-use-rect/dist/index.module.js
var r6 = __toModule(require("react"));
function useRect(e14) {
  const [o13, c7] = r6.useState();
  return r6.useEffect(() => {
    if (e14) {
      const r11 = observeElementRect(e14, c7);
      return () => {
        c7(void 0), r11();
      };
    }
  }, [e14]), o13;
}

// ../../node_modules/@radix-ui/popper/dist/index.module.js
function getPlacementData({anchorRect: p8, popperSize: c7, arrowSize: f7, arrowOffset: l7 = 0, side: d8, sideOffset: h5 = 0, align: x6, alignOffset: g5 = 0, shouldAvoidCollisions: u6 = true, collisionBoundariesRect: w5, collisionTolerance: m8 = 0}) {
  if (!p8 || !c7 || !w5)
    return {popperStyles: o7, arrowStyles: n3};
  const y5 = function(e14, r11, o13 = 0, n5 = 0, i6) {
    const p9 = i6 ? i6.height : 0, a6 = t8(r11, e14, "x"), s9 = t8(r11, e14, "y"), c8 = s9.before - o13 - p9, f8 = s9.after + o13 + p9, l8 = a6.before - o13 - p9, d9 = a6.after + o13 + p9;
    return {top: {start: {x: a6.start + n5, y: c8}, center: {x: a6.center, y: c8}, end: {x: a6.end - n5, y: c8}}, right: {start: {x: d9, y: s9.start + n5}, center: {x: d9, y: s9.center}, end: {x: d9, y: s9.end - n5}}, bottom: {start: {x: a6.start + n5, y: f8}, center: {x: a6.center, y: f8}, end: {x: a6.end - n5, y: f8}}, left: {start: {x: l8, y: s9.start + n5}, center: {x: l8, y: s9.center}, end: {x: l8, y: s9.end - n5}}};
  }(c7, p8, h5, g5, f7), b5 = y5[d8][x6];
  if (u6 === false) {
    const t14 = e11(b5);
    let o13 = n3;
    f7 && (o13 = i2({popperSize: c7, arrowSize: f7, arrowOffset: l7, side: d8, align: x6}));
    return {popperStyles: {...t14, "--radix-popper-transform-origin": r7(c7, d8, x6, l7, f7)}, arrowStyles: o13, placedSide: d8, placedAlign: x6};
  }
  const S3 = DOMRect.fromRect({...c7, ...b5}), $2 = (O4 = w5, z3 = m8, DOMRect.fromRect({width: O4.width - 2 * z3, height: O4.height - 2 * z3, x: O4.left + z3, y: O4.top + z3}));
  var O4, z3;
  const R4 = s2(S3, $2), M3 = y5[a2(d8)][x6], D4 = function(t14, e14, r11) {
    const o13 = a2(t14);
    return e14[t14] && !r11[o13] ? o13 : t14;
  }(d8, R4, s2(DOMRect.fromRect({...c7, ...M3}), $2)), A3 = function(t14, e14, r11, o13, n5) {
    const i6 = r11 === "top" || r11 === "bottom", p9 = i6 ? "left" : "top", a6 = i6 ? "right" : "bottom", s9 = i6 ? "width" : "height", c8 = e14[s9] > t14[s9];
    if ((o13 === "start" || o13 === "center") && (n5[p9] && c8 || n5[a6] && !c8))
      return "end";
    if ((o13 === "end" || o13 === "center") && (n5[a6] && c8 || n5[p9] && !c8))
      return "start";
    return o13;
  }(c7, p8, d8, x6, R4), I4 = e11(y5[D4][A3]);
  let C6 = n3;
  f7 && (C6 = i2({popperSize: c7, arrowSize: f7, arrowOffset: l7, side: D4, align: A3}));
  return {popperStyles: {...I4, "--radix-popper-transform-origin": r7(c7, D4, A3, l7, f7)}, arrowStyles: C6, placedSide: D4, placedAlign: A3};
}
function t8(t14, e14, r11) {
  const o13 = t14[r11 === "x" ? "left" : "top"], n5 = r11 === "x" ? "width" : "height", i6 = t14[n5], p8 = e14[n5];
  return {before: o13 - p8, start: o13, center: o13 + (i6 - p8) / 2, end: o13 + i6 - p8, after: o13 + i6};
}
function e11(t14) {
  return {position: "absolute", top: 0, left: 0, minWidth: "max-content", willChange: "transform", transform: `translate3d(${Math.round(t14.x + window.scrollX)}px, ${Math.round(t14.y + window.scrollY)}px, 0)`};
}
function r7(t14, e14, r11, o13, n5) {
  const i6 = e14 === "top" || e14 === "bottom", p8 = n5 ? n5.width : 0, a6 = n5 ? n5.height : 0, s9 = p8 / 2 + o13;
  let c7 = "", f7 = "";
  return i6 ? (c7 = {start: `${s9}px`, center: "center", end: t14.width - s9 + "px"}[r11], f7 = e14 === "top" ? `${t14.height + a6}px` : -a6 + "px") : (c7 = e14 === "left" ? `${t14.width + a6}px` : -a6 + "px", f7 = {start: `${s9}px`, center: "center", end: t14.height - s9 + "px"}[r11]), `${c7} ${f7}`;
}
var o7 = {position: "fixed", top: 0, left: 0, opacity: 0, transform: "translate3d(0, -200%, 0)"};
var n3 = {position: "absolute", opacity: 0};
function i2({popperSize: t14, arrowSize: e14, arrowOffset: r11, side: o13, align: n5}) {
  const i6 = (t14.width - e14.width) / 2, a6 = (t14.height - e14.width) / 2, s9 = {top: 0, right: 90, bottom: 180, left: -90}[o13], c7 = Math.max(e14.width, e14.height), f7 = {width: `${c7}px`, height: `${c7}px`, transform: `rotate(${s9}deg)`, willChange: "transform", position: "absolute", [o13]: "100%", direction: p3(o13, n5)};
  return o13 !== "top" && o13 !== "bottom" || (n5 === "start" && (f7.left = `${r11}px`), n5 === "center" && (f7.left = `${i6}px`), n5 === "end" && (f7.right = `${r11}px`)), o13 !== "left" && o13 !== "right" || (n5 === "start" && (f7.top = `${r11}px`), n5 === "center" && (f7.top = `${a6}px`), n5 === "end" && (f7.bottom = `${r11}px`)), f7;
}
function p3(t14, e14) {
  return (t14 !== "top" && t14 !== "right" || e14 !== "end") && (t14 !== "bottom" && t14 !== "left" || e14 === "end") ? "ltr" : "rtl";
}
function a2(t14) {
  return {top: "bottom", right: "left", bottom: "top", left: "right"}[t14];
}
function s2(t14, e14) {
  return {top: t14.top < e14.top, right: t14.right > e14.right, bottom: t14.bottom > e14.bottom, left: t14.left < e14.left};
}

// ../../node_modules/@radix-ui/react-popper/dist/index.module.js
var s3 = __toModule(require("react"));
var [p4, l4] = createContext4("Popper");
var Popper = ({children: e14}) => {
  const [r11, o13] = s3.useState(null);
  return s3.createElement(p4, {anchor: r11, onAnchorChange: o13}, e14);
};
var PopperAnchor = /* @__PURE__ */ s3.forwardRef((e14, o13) => {
  const {virtualRef: t14, children: n5, ...a6} = e14, p8 = l4("PopperAnchor"), f7 = s3.useRef(null), d8 = useComposedRefs(o13, f7);
  return s3.useEffect(() => {
    p8.onAnchorChange((t14 == null ? void 0 : t14.current) || f7.current);
  }), t14 ? null : /* @__PURE__ */ s3.createElement(Primitive, _extends({}, a6, {ref: d8}), n5);
});
var [f3, d3] = createContext4("PopperContent");
var PopperContent = /* @__PURE__ */ s3.forwardRef((e14, n5) => {
  const {side: p8 = "bottom", sideOffset: d8, align: u6 = "center", alignOffset: m8, collisionTolerance: w5, avoidCollisions: h5 = true, ...x6} = e14, A3 = l4("PopperContent"), [v6, g5] = s3.useState(), E4 = useRect(A3.anchor), [y5, C6] = s3.useState(null), P3 = useSize(y5), [S3, R4] = s3.useState(null), O4 = useSize(S3), b5 = useComposedRefs(n5, (e15) => C6(e15)), z3 = function() {
    const [e15, r11] = s3.useState(void 0);
    return s3.useEffect(() => {
      let e16;
      function o13() {
        r11({width: window.innerWidth, height: window.innerHeight});
      }
      function t14() {
        window.clearTimeout(e16), e16 = window.setTimeout(o13, 100);
      }
      return o13(), window.addEventListener("resize", t14), () => window.removeEventListener("resize", t14);
    }, []), e15;
  }(), T4 = z3 ? DOMRect.fromRect({...z3, x: 0, y: 0}) : void 0, {popperStyles: k4, arrowStyles: L3, placedSide: B3, placedAlign: D4} = getPlacementData({anchorRect: E4, popperSize: P3, arrowSize: O4, arrowOffset: v6, side: p8, sideOffset: d8, align: u6, alignOffset: m8, shouldAvoidCollisions: h5, collisionBoundariesRect: T4, collisionTolerance: w5}), H3 = B3 !== void 0;
  return s3.createElement("div", {style: k4, "data-radix-popper-content-wrapper": ""}, /* @__PURE__ */ s3.createElement(f3, {arrowStyles: L3, onArrowChange: R4, onArrowOffsetChange: g5}, /* @__PURE__ */ s3.createElement(Primitive, _extends({"data-side": B3, "data-align": D4}, x6, {style: {...x6.style, animation: H3 ? void 0 : "none"}, ref: b5}))));
});
var PopperArrow = /* @__PURE__ */ s3.forwardRef(function(r11, o13) {
  const {offset: t14, ...n5} = r11, i6 = d3("PopperArrow"), {onArrowOffsetChange: a6} = i6;
  return s3.useEffect(() => a6(t14), [a6, t14]), /* @__PURE__ */ s3.createElement("span", {style: {...i6.arrowStyles, pointerEvents: "none"}}, /* @__PURE__ */ s3.createElement("span", {ref: i6.onArrowChange, style: {display: "inline-block", verticalAlign: "top", pointerEvents: "auto"}}, /* @__PURE__ */ s3.createElement(Root, _extends({}, n5, {ref: o13, style: {...n5.style, display: "block"}}))));
});
var Root2 = Popper;
var Anchor = PopperAnchor;
var Content = PopperContent;
var Arrow3 = PopperArrow;

// ../../node_modules/@radix-ui/react-presence/dist/index.module.js
var n4 = __toModule(require("react"));
var Presence = (r11) => {
  const {present: u6, children: o13} = r11, s9 = function(e14) {
    const [r12, u7] = n4.useState(), o14 = n4.useRef({}), s10 = n4.useRef(e14), i7 = n4.useRef(), c8 = e14 ? "mounted" : "unmounted", [a6, d8] = function(e15, t14) {
      return n4.useReducer((e16, n5) => {
        const r13 = t14[e16][n5];
        return r13 != null ? r13 : e16;
      }, e15);
    }(c8, {mounted: {UNMOUNT: "unmounted", ANIMATION_OUT: "unmountSuspended"}, unmountSuspended: {MOUNT: "mounted", ANIMATION_END: "unmounted"}, unmounted: {MOUNT: "mounted"}});
    return n4.useEffect(() => {
      const n5 = o14.current, r13 = s10.current;
      if (r13 !== e14) {
        const u8 = i7.current, o15 = t9(n5);
        if (e14)
          d8("MOUNT");
        else if (o15 === "none" || (n5 == null ? void 0 : n5.display) === "none")
          d8("UNMOUNT");
        else {
          const e15 = u8 !== o15;
          d8(r13 && e15 ? "ANIMATION_OUT" : "UNMOUNT");
        }
        s10.current = e14;
      }
    }, [e14, d8]), n4.useEffect(() => {
      if (r12) {
        const e15 = (e16) => {
          const n6 = t9(o14.current).includes(e16.animationName);
          e16.target === r12 && n6 && d8("ANIMATION_END");
        }, n5 = (e16) => {
          e16.target === r12 && (i7.current = t9(o14.current));
        };
        return r12.addEventListener("animationstart", n5), r12.addEventListener("animationcancel", e15), r12.addEventListener("animationend", e15), () => {
          r12.removeEventListener("animationstart", n5), r12.removeEventListener("animationcancel", e15), r12.removeEventListener("animationend", e15);
        };
      }
    }, [r12, d8]), {isPresent: ["mounted", "unmountSuspended"].includes(a6), ref: n4.useCallback((e15) => {
      e15 && (o14.current = getComputedStyle(e15), u7(e15));
    }, [])};
  }(u6), i6 = typeof o13 == "function" ? o13({present: s9.isPresent}) : n4.Children.only(o13), c7 = useComposedRefs(s9.ref, i6.ref);
  return typeof o13 == "function" || s9.isPresent ? /* @__PURE__ */ n4.cloneElement(i6, {ref: c7}) : null;
};
function t9(e14) {
  return (e14 == null ? void 0 : e14.animationName) || "none";
}
Presence.displayName = "Presence";

// ../../node_modules/@radix-ui/react-focus-scope/dist/index.module.js
var o8 = __toModule(require("react"));
var c3 = {bubbles: false, cancelable: true};
var FocusScope = /* @__PURE__ */ o8.forwardRef((i6, f7) => {
  const {trapped: l7 = false, onMountAutoFocus: m8, onUnmountAutoFocus: p8, ...v6} = i6, [E4, F4] = o8.useState(null), S3 = useCallbackRef(m8), b5 = useCallbackRef(p8), T4 = o8.useRef(null), y5 = useComposedRefs(f7, (e14) => F4(e14)), L3 = l7, h5 = l7, x6 = o8.useRef({paused: false, pause() {
    this.paused = true;
  }, resume() {
    this.paused = false;
  }}).current;
  o8.useEffect(() => {
    if (h5) {
      let e14 = function(e15) {
        if (x6.paused || !E4)
          return;
        const t15 = e15.target;
        E4.contains(t15) ? T4.current = t15 : a3(T4.current, {select: true});
      }, t14 = function(e15) {
        !x6.paused && E4 && (E4.contains(e15.relatedTarget) || a3(T4.current, {select: true}));
      };
      return document.addEventListener("focusin", e14), document.addEventListener("focusout", t14), () => {
        document.removeEventListener("focusin", e14), document.removeEventListener("focusout", t14);
      };
    }
  }, [h5, E4, x6.paused]), o8.useEffect(() => {
    if (E4) {
      d4.add(x6);
      const e14 = document.activeElement;
      E4.addEventListener("focusScope.autoFocusOnMount", S3), E4.addEventListener("focusScope.autoFocusOnUnmount", b5);
      const t14 = new Event("focusScope.autoFocusOnMount", c3);
      return E4.dispatchEvent(t14), t14.defaultPrevented || (!function(e15, {select: t15 = false} = {}) {
        const n5 = document.activeElement;
        for (const o13 of e15)
          if (a3(o13, {select: t15}), document.activeElement !== n5)
            return;
      }(r8(E4), {select: true}), document.activeElement === e14 && a3(E4)), () => {
        E4.removeEventListener("focusScope.autoFocusOnMount", S3), setTimeout(() => {
          const t15 = new Event("focusScope.autoFocusOnUnmount", c3);
          E4.dispatchEvent(t15), t15.defaultPrevented || a3(e14 != null ? e14 : document.body, {select: true}), E4.removeEventListener("focusScope.autoFocusOnUnmount", b5), d4.remove(x6);
        }, 0);
      };
    }
  }, [E4, S3, b5, x6]);
  const N3 = o8.useCallback((e14) => {
    if (!L3 && !h5)
      return;
    if (x6.paused)
      return;
    const t14 = e14.key === "Tab" && !e14.altKey && !e14.ctrlKey && !e14.metaKey, n5 = document.activeElement;
    if (t14 && n5) {
      const t15 = e14.currentTarget, [o13, u6] = function(e15) {
        const t16 = r8(e15), n6 = s4(t16, e15), o14 = s4(t16.reverse(), e15);
        return [n6, o14];
      }(t15);
      o13 && u6 ? e14.shiftKey || n5 !== u6 ? e14.shiftKey && n5 === o13 && (e14.preventDefault(), L3 && a3(u6, {select: true})) : (e14.preventDefault(), L3 && a3(o13, {select: true})) : n5 === t15 && e14.preventDefault();
    }
  }, [L3, h5, x6.paused]);
  return o8.createElement(Primitive, _extends({tabIndex: -1}, v6, {ref: y5, onKeyDown: N3}));
});
function r8(e14) {
  const t14 = [], n5 = document.createTreeWalker(e14, NodeFilter.SHOW_ELEMENT, {acceptNode: (e15) => {
    const t15 = e15.tagName === "INPUT" && e15.type === "hidden";
    return e15.disabled || e15.hidden || t15 ? NodeFilter.FILTER_SKIP : e15.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  }});
  for (; n5.nextNode(); )
    t14.push(n5.currentNode);
  return t14;
}
function s4(e14, t14) {
  for (const n5 of e14)
    if (!i3(n5, {upTo: t14}))
      return n5;
}
function i3(e14, {upTo: t14}) {
  if (getComputedStyle(e14).visibility === "hidden")
    return true;
  for (; e14; ) {
    if (t14 !== void 0 && e14 === t14)
      return false;
    if (getComputedStyle(e14).display === "none")
      return true;
    e14 = e14.parentElement;
  }
  return false;
}
function a3(e14, {select: t14 = false} = {}) {
  if (e14 && e14.focus) {
    const n5 = document.activeElement;
    e14.focus({preventScroll: true}), e14 !== n5 && function(e15) {
      return e15 instanceof HTMLInputElement && "select" in e15;
    }(e14) && t14 && e14.select();
  }
}
var d4 = function() {
  let e14 = [];
  return {add(t14) {
    const n5 = e14[0];
    t14 !== n5 && (n5 == null || n5.pause()), e14 = f4(e14, t14), e14.unshift(t14);
  }, remove(t14) {
    var n5;
    e14 = f4(e14, t14), (n5 = e14[0]) === null || n5 === void 0 || n5.resume();
  }};
}();
function f4(e14, t14) {
  const n5 = [...e14], o13 = n5.indexOf(t14);
  return o13 !== -1 && n5.splice(o13, 1), n5;
}

// ../../node_modules/@radix-ui/react-use-escape-keydown/dist/index.module.js
var t10 = __toModule(require("react"));
function useEscapeKeydown(n5) {
  const o13 = useCallbackRef(n5);
  t10.useEffect(() => {
    const e14 = (e15) => {
      e15.key === "Escape" && o13(e15);
    };
    return document.addEventListener("keydown", e14), () => document.removeEventListener("keydown", e14);
  }, [o13]);
}

// ../../node_modules/@radix-ui/react-use-body-pointer-events/dist/index.module.js
var t11;
var o9 = 0;
function useBodyPointerEvents({disabled: n5}) {
  useLayoutEffect2(() => {
    if (n5)
      return o9 === 0 && (t11 = document.body.style.pointerEvents), document.body.style.pointerEvents = "none", o9++, () => {
        o9--, o9 === 0 && (document.body.style.pointerEvents = t11);
      };
  }, [n5]);
}

// ../../node_modules/@radix-ui/react-dismissable-layer/dist/index.module.js
var u3 = __toModule(require("react"));
var [s5, a4] = E2();
var [c4, l5] = C2();
var [d5, m3] = E2("TotalLayerCountWithDisabledOutsidePointerEventsProvider");
var [f5, p5] = C2("RunningLayerCountWithDisabledOutsidePointerEventsProvider");
var DismissableLayer = /* @__PURE__ */ u3.forwardRef((e14, t14) => {
  const n5 = l5() === 0, r11 = /* @__PURE__ */ u3.createElement(v3, _extends({}, e14, {ref: t14}));
  return n5 ? /* @__PURE__ */ u3.createElement(s5, null, /* @__PURE__ */ u3.createElement(d5, null, r11)) : r11;
});
var v3 = /* @__PURE__ */ u3.forwardRef((s9, d8) => {
  const {disableOutsidePointerEvents: v6 = false, onEscapeKeyDown: E4, onPointerDownOutside: C6, onFocusOutside: b5, onInteractOutside: w5, onDismiss: L3, ...P3} = s9, y5 = a4(), D4 = l5() + 1, x6 = D4 === y5, O4 = m3(v6), g5 = p5() + (v6 ? 1 : 0), h5 = g5 < O4;
  useBodyPointerEvents({disabled: v6}), useEscapeKeydown((e14) => {
    x6 && (E4 == null || E4(e14), e14.defaultPrevented || L3 == null || L3());
  });
  const {onPointerDownCapture: R4} = function(e14) {
    const n5 = useCallbackRef(e14), r11 = u3.useRef(false);
    return u3.useEffect(() => {
      const e15 = (e16) => {
        const t14 = e16.target;
        if (t14 && !r11.current) {
          const r12 = new CustomEvent("dismissableLayer.pointerDownOutside", {bubbles: false, cancelable: true, detail: {originalEvent: e16}});
          t14.addEventListener("dismissableLayer.pointerDownOutside", n5, {once: true}), t14.dispatchEvent(r12);
        }
        r11.current = false;
      };
      return document.addEventListener("pointerdown", e15), () => document.removeEventListener("pointerdown", e15);
    }, [n5]), {onPointerDownCapture: () => r11.current = true};
  }((e14) => {
    h5 || (C6 == null || C6(e14), w5 == null || w5(e14), e14.defaultPrevented || L3 == null || L3());
  }), {onBlurCapture: F4, onFocusCapture: B3} = function(e14) {
    const n5 = useCallbackRef(e14), r11 = u3.useRef(false);
    return u3.useEffect(() => {
      const e15 = (e16) => {
        const t14 = e16.target;
        if (t14 && !r11.current) {
          const r12 = new CustomEvent("dismissableLayer.focusOutside", {bubbles: false, cancelable: true, detail: {originalEvent: e16}});
          t14.addEventListener("dismissableLayer.focusOutside", n5, {once: true}), t14.dispatchEvent(r12);
        }
      };
      return document.addEventListener("focusin", e15), () => document.removeEventListener("focusin", e15);
    }, [n5]), {onFocusCapture: () => r11.current = true, onBlurCapture: () => r11.current = false};
  }((e14) => {
    b5 == null || b5(e14), w5 == null || w5(e14), e14.defaultPrevented || L3 == null || L3();
  }), T4 = O4 > 0 && !h5;
  return u3.createElement(c4, {runningCount: D4}, /* @__PURE__ */ u3.createElement(f5, {runningCount: g5}, /* @__PURE__ */ u3.createElement(Primitive, _extends({}, P3, {ref: d8, style: {pointerEvents: T4 ? "auto" : void 0, ...P3.style}, onPointerDownCapture: composeEventHandlers(s9.onPointerDownCapture, R4), onBlurCapture: composeEventHandlers(s9.onBlurCapture, F4), onFocusCapture: composeEventHandlers(s9.onFocusCapture, B3)}))));
});
function E2(e14) {
  const t14 = /* @__PURE__ */ u3.createContext({total: 0, setTotal: () => {
  }}), n5 = ({children: e15}) => {
    const [n6, r11] = u3.useState(0), o13 = u3.useMemo(() => ({total: n6, setTotal: r11}), [n6, r11]);
    return u3.createElement(t14.Provider, {value: o13}, e15);
  };
  return [n5, function(e15 = true) {
    const {total: n6, setTotal: r11} = u3.useContext(t14);
    return u3.useLayoutEffect(() => {
      if (e15)
        return r11((e16) => e16 + 1), () => r11((e16) => e16 - 1);
    }, [e15, r11]), n6;
  }];
}
function C2(e14) {
  const t14 = /* @__PURE__ */ u3.createContext(0), n5 = (e15) => {
    const {children: n6, runningCount: r11} = e15;
    return u3.createElement(t14.Provider, {value: r11}, n6);
  };
  return [n5, function() {
    return u3.useContext(t14) || 0;
  }];
}

// ../../node_modules/aria-hidden/dist/es2015/index.js
var getDefaultParent = function(originalTarget) {
  if (typeof document === "undefined") {
    return null;
  }
  var sampleTarget = Array.isArray(originalTarget) ? originalTarget[0] : originalTarget;
  return sampleTarget.ownerDocument.body;
};
var counterMap = new WeakMap();
var uncontrolledNodes = new WeakMap();
var markerMap = {};
var lockCount = 0;
var hideOthers = function(originalTarget, parentNode, markerName) {
  if (parentNode === void 0) {
    parentNode = getDefaultParent(originalTarget);
  }
  if (markerName === void 0) {
    markerName = "data-aria-hidden";
  }
  var targets = Array.isArray(originalTarget) ? originalTarget : [originalTarget];
  if (!markerMap[markerName]) {
    markerMap[markerName] = new WeakMap();
  }
  var markerCounter = markerMap[markerName];
  var hiddenNodes = [];
  var elementsToKeep = new Set();
  var keep = function(el) {
    if (!el || elementsToKeep.has(el)) {
      return;
    }
    elementsToKeep.add(el);
    keep(el.parentNode);
  };
  targets.forEach(keep);
  var deep = function(parent) {
    if (!parent || targets.indexOf(parent) >= 0) {
      return;
    }
    Array.prototype.forEach.call(parent.children, function(node) {
      if (elementsToKeep.has(node)) {
        deep(node);
      } else {
        var attr = node.getAttribute("aria-hidden");
        var alreadyHidden = attr !== null && attr !== "false";
        var counterValue = (counterMap.get(node) || 0) + 1;
        var markerValue = (markerCounter.get(node) || 0) + 1;
        counterMap.set(node, counterValue);
        markerCounter.set(node, markerValue);
        hiddenNodes.push(node);
        if (counterValue === 1 && alreadyHidden) {
          uncontrolledNodes.set(node, true);
        }
        if (markerValue === 1) {
          node.setAttribute(markerName, "true");
        }
        if (!alreadyHidden) {
          node.setAttribute("aria-hidden", "true");
        }
      }
    });
  };
  deep(parentNode);
  elementsToKeep.clear();
  lockCount++;
  return function() {
    hiddenNodes.forEach(function(node) {
      var counterValue = counterMap.get(node) - 1;
      var markerValue = markerCounter.get(node) - 1;
      counterMap.set(node, counterValue);
      markerCounter.set(node, markerValue);
      if (!counterValue) {
        if (!uncontrolledNodes.has(node)) {
          node.removeAttribute("aria-hidden");
        }
        uncontrolledNodes.delete(node);
      }
      if (!markerValue) {
        node.removeAttribute(markerName);
      }
    });
    lockCount--;
    if (!lockCount) {
      counterMap = new WeakMap();
      counterMap = new WeakMap();
      uncontrolledNodes = new WeakMap();
      markerMap = {};
    }
  };
};

// ../../node_modules/react-remove-scroll/node_modules/tslib/modules/index.js
var import_tslib = __toModule(require_tslib());
var {
  __extends,
  __assign,
  __rest,
  __decorate,
  __param,
  __metadata,
  __awaiter,
  __generator,
  __exportStar,
  __createBinding,
  __values,
  __read,
  __spread,
  __spreadArrays,
  __await,
  __asyncGenerator,
  __asyncDelegator,
  __asyncValues,
  __makeTemplateObject,
  __importStar,
  __importDefault,
  __classPrivateFieldGet,
  __classPrivateFieldSet
} = import_tslib.default;

// ../../node_modules/react-remove-scroll/dist/es2015/Combination.js
var React13 = __toModule(require("react"));

// ../../node_modules/react-remove-scroll/dist/es2015/UI.js
var React9 = __toModule(require("react"));

// ../../node_modules/react-remove-scroll-bar/dist/es2015/constants.js
var zeroRightClassName = "right-scroll-bar-position";
var fullWidthClassName = "width-before-scroll-bar";
var noScrollbarsClassName = "with-scroll-bars-hidden";
var removedBarSizeVariable = "--removed-body-scroll-bar-size";

// ../../node_modules/use-sidecar/node_modules/tslib/modules/index.js
var import_tslib2 = __toModule(require_tslib2());
var {
  __extends: __extends2,
  __assign: __assign2,
  __rest: __rest2,
  __decorate: __decorate2,
  __param: __param2,
  __metadata: __metadata2,
  __awaiter: __awaiter2,
  __generator: __generator2,
  __exportStar: __exportStar2,
  __createBinding: __createBinding2,
  __values: __values2,
  __read: __read2,
  __spread: __spread2,
  __spreadArrays: __spreadArrays2,
  __await: __await2,
  __asyncGenerator: __asyncGenerator2,
  __asyncDelegator: __asyncDelegator2,
  __asyncValues: __asyncValues2,
  __makeTemplateObject: __makeTemplateObject2,
  __importStar: __importStar2,
  __importDefault: __importDefault2,
  __classPrivateFieldGet: __classPrivateFieldGet2,
  __classPrivateFieldSet: __classPrivateFieldSet2
} = import_tslib2.default;

// ../../node_modules/use-sidecar/dist/es2015/medium.js
function ItoI(a6) {
  return a6;
}
function innerCreateMedium(defaults, middleware) {
  if (middleware === void 0) {
    middleware = ItoI;
  }
  var buffer = [];
  var assigned = false;
  var medium = {
    read: function() {
      if (assigned) {
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      }
      if (buffer.length) {
        return buffer[buffer.length - 1];
      }
      return defaults;
    },
    useMedium: function(data) {
      var item = middleware(data, assigned);
      buffer.push(item);
      return function() {
        buffer = buffer.filter(function(x6) {
          return x6 !== item;
        });
      };
    },
    assignSyncMedium: function(cb) {
      assigned = true;
      while (buffer.length) {
        var cbs = buffer;
        buffer = [];
        cbs.forEach(cb);
      }
      buffer = {
        push: function(x6) {
          return cb(x6);
        },
        filter: function() {
          return buffer;
        }
      };
    },
    assignMedium: function(cb) {
      assigned = true;
      var pendingQueue = [];
      if (buffer.length) {
        var cbs = buffer;
        buffer = [];
        cbs.forEach(cb);
        pendingQueue = buffer;
      }
      var executeQueue = function() {
        var cbs2 = pendingQueue;
        pendingQueue = [];
        cbs2.forEach(cb);
      };
      var cycle = function() {
        return Promise.resolve().then(executeQueue);
      };
      cycle();
      buffer = {
        push: function(x6) {
          pendingQueue.push(x6);
          cycle();
        },
        filter: function(filter2) {
          pendingQueue = pendingQueue.filter(filter2);
          return buffer;
        }
      };
    }
  };
  return medium;
}
function createSidecarMedium(options) {
  if (options === void 0) {
    options = {};
  }
  var medium = innerCreateMedium(null);
  medium.options = __assign2({async: true, ssr: false}, options);
  return medium;
}

// ../../node_modules/use-sidecar/dist/es2015/exports.js
var React8 = __toModule(require("react"));
var SideCar = function(_a) {
  var sideCar = _a.sideCar, rest = __rest2(_a, ["sideCar"]);
  if (!sideCar) {
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  }
  var Target = sideCar.read();
  if (!Target) {
    throw new Error("Sidecar medium not found");
  }
  return React8.createElement(Target, __assign2({}, rest));
};
SideCar.isSideCarExport = true;
function exportSidecar(medium, exported) {
  medium.useMedium(exported);
  return SideCar;
}

// ../../node_modules/react-remove-scroll/dist/es2015/medium.js
var effectCar = createSidecarMedium();

// ../../node_modules/use-callback-ref/dist/es2015/assignRef.js
function assignRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
  return ref;
}

// ../../node_modules/use-callback-ref/dist/es2015/useRef.js
var import_react5 = __toModule(require("react"));
function useCallbackRef2(initialValue, callback) {
  var ref = (0, import_react5.useState)(function() {
    return {
      value: initialValue,
      callback,
      facade: {
        get current() {
          return ref.value;
        },
        set current(value) {
          var last = ref.value;
          if (last !== value) {
            ref.value = value;
            ref.callback(value, last);
          }
        }
      }
    };
  })[0];
  ref.callback = callback;
  return ref.facade;
}

// ../../node_modules/use-callback-ref/dist/es2015/useMergeRef.js
function useMergeRefs(refs, defaultValue) {
  return useCallbackRef2(defaultValue, function(newValue) {
    return refs.forEach(function(ref) {
      return assignRef(ref, newValue);
    });
  });
}

// ../../node_modules/react-remove-scroll/dist/es2015/UI.js
var nothing = function() {
  return;
};
var RemoveScroll = React9.forwardRef(function(props, parentRef) {
  var ref = React9.useRef(null);
  var _a = React9.useState({
    onScrollCapture: nothing,
    onWheelCapture: nothing,
    onTouchMoveCapture: nothing
  }), callbacks = _a[0], setCallbacks = _a[1];
  var forwardProps = props.forwardProps, children = props.children, className = props.className, removeScrollBar = props.removeScrollBar, enabled = props.enabled, shards = props.shards, sideCar = props.sideCar, noIsolation = props.noIsolation, inert = props.inert, allowPinchZoom = props.allowPinchZoom, _b = props.as, Container = _b === void 0 ? "div" : _b, rest = __rest(props, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noIsolation", "inert", "allowPinchZoom", "as"]);
  var SideCar2 = sideCar;
  var containerRef = useMergeRefs([
    ref,
    parentRef
  ]);
  var containerProps = __assign({}, rest, callbacks);
  return React9.createElement(React9.Fragment, null, enabled && React9.createElement(SideCar2, {sideCar: effectCar, removeScrollBar, shards, noIsolation, inert, setCallbacks, allowPinchZoom: !!allowPinchZoom, lockRef: ref}), forwardProps ? React9.cloneElement(React9.Children.only(children), __assign({}, containerProps, {ref: containerRef})) : React9.createElement(Container, __assign({}, containerProps, {className, ref: containerRef}), children));
});
RemoveScroll.defaultProps = {
  enabled: true,
  removeScrollBar: true,
  inert: false
};
RemoveScroll.classNames = {
  fullWidth: fullWidthClassName,
  zeroRight: zeroRightClassName
};

// ../../node_modules/react-remove-scroll/dist/es2015/SideEffect.js
var React12 = __toModule(require("react"));

// ../../node_modules/react-remove-scroll-bar/dist/es2015/component.js
var React11 = __toModule(require("react"));

// ../../node_modules/react-style-singleton/dist/es2015/hook.js
var React10 = __toModule(require("react"));

// ../../node_modules/get-nonce/dist/es2015/index.js
var currentNonce;
var getNonce = function() {
  if (currentNonce) {
    return currentNonce;
  }
  if (typeof __webpack_nonce__ !== "undefined") {
    return __webpack_nonce__;
  }
  return void 0;
};

// ../../node_modules/react-style-singleton/dist/es2015/singleton.js
function makeStyleTag() {
  if (!document)
    return null;
  var tag = document.createElement("style");
  tag.type = "text/css";
  var nonce = getNonce();
  if (nonce) {
    tag.setAttribute("nonce", nonce);
  }
  return tag;
}
function injectStyles(tag, css2) {
  if (tag.styleSheet) {
    tag.styleSheet.cssText = css2;
  } else {
    tag.appendChild(document.createTextNode(css2));
  }
}
function insertStyleTag(tag) {
  var head = document.head || document.getElementsByTagName("head")[0];
  head.appendChild(tag);
}
var stylesheetSingleton = function() {
  var counter = 0;
  var stylesheet = null;
  return {
    add: function(style2) {
      if (counter == 0) {
        if (stylesheet = makeStyleTag()) {
          injectStyles(stylesheet, style2);
          insertStyleTag(stylesheet);
        }
      }
      counter++;
    },
    remove: function() {
      counter--;
      if (!counter && stylesheet) {
        stylesheet.parentNode && stylesheet.parentNode.removeChild(stylesheet);
        stylesheet = null;
      }
    }
  };
};

// ../../node_modules/react-style-singleton/dist/es2015/hook.js
var styleHookSingleton = function() {
  var sheet = stylesheetSingleton();
  return function(styles) {
    React10.useEffect(function() {
      sheet.add(styles);
      return function() {
        sheet.remove();
      };
    }, []);
  };
};

// ../../node_modules/react-style-singleton/dist/es2015/component.js
var styleSingleton = function() {
  var useStyle = styleHookSingleton();
  var Sheet = function(_a) {
    var styles = _a.styles;
    useStyle(styles);
    return null;
  };
  return Sheet;
};

// ../../node_modules/react-remove-scroll-bar/dist/es2015/utils.js
var zeroGap = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
};
var parse = function(x6) {
  return parseInt(x6 || "", 10) || 0;
};
var getOffset = function(gapMode) {
  var cs = window.getComputedStyle(document.body);
  var left = cs[gapMode === "padding" ? "paddingLeft" : "marginLeft"];
  var top = cs[gapMode === "padding" ? "paddingTop" : "marginTop"];
  var right = cs[gapMode === "padding" ? "paddingRight" : "marginRight"];
  return [
    parse(left),
    parse(top),
    parse(right)
  ];
};
var getGapWidth = function(gapMode) {
  if (gapMode === void 0) {
    gapMode = "margin";
  }
  if (typeof window === "undefined") {
    return zeroGap;
  }
  var offsets = getOffset(gapMode);
  var documentWidth = document.documentElement.clientWidth;
  var windowWidth = window.innerWidth;
  return {
    left: offsets[0],
    top: offsets[1],
    right: offsets[2],
    gap: Math.max(0, windowWidth - documentWidth + offsets[2] - offsets[0])
  };
};

// ../../node_modules/react-remove-scroll-bar/dist/es2015/component.js
var Style = styleSingleton();
var getStyles = function(_a, allowRelative, gapMode, important) {
  var left = _a.left, top = _a.top, right = _a.right, gap = _a.gap;
  if (gapMode === void 0) {
    gapMode = "margin";
  }
  return "\n  ." + noScrollbarsClassName + " {\n   overflow: hidden " + important + ";\n   padding-right: " + gap + "px " + important + ";\n  }\n  body {\n    overflow: hidden " + important + ";\n    " + [
    allowRelative && "position: relative " + important + ";",
    gapMode === "margin" && "\n    padding-left: " + left + "px;\n    padding-top: " + top + "px;\n    padding-right: " + right + "px;\n    margin-left:0;\n    margin-top:0;\n    margin-right: " + gap + "px " + important + ";\n    ",
    gapMode === "padding" && "padding-right: " + gap + "px " + important + ";"
  ].filter(Boolean).join("") + "\n  }\n  \n  ." + zeroRightClassName + " {\n    right: " + gap + "px " + important + ";\n  }\n  \n  ." + fullWidthClassName + " {\n    margin-right: " + gap + "px " + important + ";\n  }\n  \n  ." + zeroRightClassName + " ." + zeroRightClassName + " {\n    right: 0 " + important + ";\n  }\n  \n  ." + fullWidthClassName + " ." + fullWidthClassName + " {\n    margin-right: 0 " + important + ";\n  }\n  \n  body {\n    " + removedBarSizeVariable + ": " + gap + "px;\n  }\n";
};
var RemoveScrollBar = function(props) {
  var _a = React11.useState(getGapWidth(props.gapMode)), gap = _a[0], setGap = _a[1];
  React11.useEffect(function() {
    setGap(getGapWidth(props.gapMode));
  }, [props.gapMode]);
  var noRelative = props.noRelative, noImportant = props.noImportant, _b = props.gapMode, gapMode = _b === void 0 ? "margin" : _b;
  return React11.createElement(Style, {styles: getStyles(gap, !noRelative, gapMode, !noImportant ? "!important" : "")});
};

// ../../node_modules/react-remove-scroll/dist/es2015/handleScroll.js
var elementCouldBeVScrolled = function(node) {
  var styles = window.getComputedStyle(node);
  return styles.overflowY !== "hidden" && !(styles.overflowY === styles.overflowX && styles.overflowY === "visible");
};
var elementCouldBeHScrolled = function(node) {
  var styles = window.getComputedStyle(node);
  if (node.type === "range") {
    return true;
  }
  return styles.overflowX !== "hidden" && !(styles.overflowY === styles.overflowX && styles.overflowX === "visible");
};
var locationCouldBeScrolled = function(axis, node) {
  var current = node;
  do {
    if (typeof ShadowRoot !== "undefined" && current instanceof ShadowRoot) {
      current = current.host;
    }
    var isScrollable = elementCouldBeScrolled(axis, current);
    if (isScrollable) {
      var _a = getScrollVariables(axis, current), s9 = _a[1], d8 = _a[2];
      if (s9 > d8) {
        return true;
      }
    }
    current = current.parentNode;
  } while (current && current !== document.body);
  return false;
};
var getVScrollVariables = function(_a) {
  var scrollTop = _a.scrollTop, scrollHeight = _a.scrollHeight, clientHeight = _a.clientHeight;
  return [scrollTop, scrollHeight, clientHeight];
};
var getHScrollVariables = function(_a) {
  var scrollLeft = _a.scrollLeft, scrollWidth = _a.scrollWidth, clientWidth = _a.clientWidth;
  return [scrollLeft, scrollWidth, clientWidth];
};
var elementCouldBeScrolled = function(axis, node) {
  return axis === "v" ? elementCouldBeVScrolled(node) : elementCouldBeHScrolled(node);
};
var getScrollVariables = function(axis, node) {
  return axis === "v" ? getVScrollVariables(node) : getHScrollVariables(node);
};
var handleScroll = function(axis, endTarget, event, sourceDelta, noOverscroll) {
  var delta = sourceDelta;
  var target = event.target;
  var targetInLock = endTarget.contains(target);
  var shouldCancelScroll = false;
  var isDeltaPositive = delta > 0;
  var availableScroll = 0;
  var availableScrollTop = 0;
  do {
    var _a = getScrollVariables(axis, target), position = _a[0], scroll_1 = _a[1], capacity = _a[2];
    var elementScroll = scroll_1 - capacity - position;
    if (position || elementScroll) {
      if (elementCouldBeScrolled(axis, target)) {
        availableScroll += elementScroll;
        availableScrollTop += position;
      }
    }
    target = target.parentNode;
  } while (!targetInLock && target !== document.body || targetInLock && (endTarget.contains(target) || endTarget === target));
  if (isDeltaPositive && (noOverscroll && availableScroll === 0 || !noOverscroll && delta > availableScroll)) {
    shouldCancelScroll = true;
  } else if (!isDeltaPositive && (noOverscroll && availableScrollTop === 0 || !noOverscroll && -delta > availableScrollTop)) {
    shouldCancelScroll = true;
  }
  return shouldCancelScroll;
};

// ../../node_modules/react-remove-scroll/dist/es2015/aggresiveCapture.js
var passiveSupported = false;
if (typeof window !== "undefined") {
  try {
    options = Object.defineProperty({}, "passive", {
      get: function() {
        passiveSupported = true;
        return true;
      }
    });
    window.addEventListener("test", options, options);
    window.removeEventListener("test", options, options);
  } catch (err) {
    passiveSupported = false;
  }
}
var options;
var nonPassive = passiveSupported ? {passive: false} : false;

// ../../node_modules/react-remove-scroll/dist/es2015/SideEffect.js
var getTouchXY = function(event) {
  return "changedTouches" in event ? [event.changedTouches[0].clientX, event.changedTouches[0].clientY] : [0, 0];
};
var getDeltaXY = function(event) {
  return [event.deltaX, event.deltaY];
};
var extractRef = function(ref) {
  return ref && "current" in ref ? ref.current : ref;
};
var deltaCompare = function(x6, y5) {
  return x6[0] === y5[0] && x6[1] === y5[1];
};
var generateStyle = function(id) {
  return "\n  .block-interactivity-" + id + " {pointer-events: none;}\n  .allow-interactivity-" + id + " {pointer-events: all;}\n";
};
var idCounter = 0;
var lockStack = [];
function RemoveScrollSideCar(props) {
  var shouldPreventQueue = React12.useRef([]);
  var touchStartRef = React12.useRef([0, 0]);
  var activeAxis = React12.useRef();
  var id = React12.useState(idCounter++)[0];
  var Style2 = React12.useState(function() {
    return styleSingleton();
  })[0];
  var lastProps = React12.useRef(props);
  React12.useEffect(function() {
    lastProps.current = props;
  }, [props]);
  React12.useEffect(function() {
    if (props.inert) {
      document.body.classList.add("block-interactivity-" + id);
      var allow_1 = [
        props.lockRef.current
      ].concat((props.shards || []).map(extractRef)).filter(Boolean);
      allow_1.forEach(function(el) {
        return el.classList.add("allow-interactivity-" + id);
      });
      return function() {
        document.body.classList.remove("block-interactivity-" + id);
        allow_1.forEach(function(el) {
          return el.classList.remove("allow-interactivity-" + id);
        });
      };
    }
    return;
  }, [props.inert, props.lockRef.current, props.shards]);
  var shouldCancelEvent = React12.useCallback(function(event, parent) {
    if ("touches" in event && event.touches.length === 2) {
      return !lastProps.current.allowPinchZoom;
    }
    var touch = getTouchXY(event);
    var touchStart = touchStartRef.current;
    var deltaX = "deltaX" in event ? event.deltaX : touchStart[0] - touch[0];
    var deltaY = "deltaY" in event ? event.deltaY : touchStart[1] - touch[1];
    var currentAxis;
    var target = event.target;
    var moveDirection = Math.abs(deltaX) > Math.abs(deltaY) ? "h" : "v";
    var canBeScrolledInMainDirection = locationCouldBeScrolled(moveDirection, target);
    if (!canBeScrolledInMainDirection) {
      return true;
    }
    if (canBeScrolledInMainDirection) {
      currentAxis = moveDirection;
    } else {
      currentAxis = moveDirection === "v" ? "h" : "v";
      canBeScrolledInMainDirection = locationCouldBeScrolled(moveDirection, target);
    }
    if (!canBeScrolledInMainDirection) {
      return false;
    }
    if (!activeAxis.current && "changedTouches" in event && (deltaX || deltaY)) {
      activeAxis.current = currentAxis;
    }
    if (!currentAxis) {
      return true;
    }
    var cancelingAxis = activeAxis.current || currentAxis;
    return handleScroll(cancelingAxis, parent, event, cancelingAxis === "h" ? deltaX : deltaY, true);
  }, []);
  var shouldPrevent = React12.useCallback(function(_event) {
    var event = _event;
    if (!lockStack.length || lockStack[lockStack.length - 1] !== Style2) {
      return;
    }
    var delta = "deltaY" in event ? getDeltaXY(event) : getTouchXY(event);
    var sourceEvent = shouldPreventQueue.current.filter(function(e14) {
      return e14.name === event.type && e14.target === event.target && deltaCompare(e14.delta, delta);
    })[0];
    if (sourceEvent && sourceEvent.should) {
      event.preventDefault();
      return;
    }
    if (!sourceEvent) {
      var shardNodes = (lastProps.current.shards || []).map(extractRef).filter(Boolean).filter(function(node) {
        return node.contains(event.target);
      });
      var shouldStop = shardNodes.length > 0 ? shouldCancelEvent(event, shardNodes[0]) : !lastProps.current.noIsolation;
      if (shouldStop) {
        event.preventDefault();
      }
    }
  }, []);
  var shouldCancel = React12.useCallback(function(name, delta, target, should) {
    var event = {name, delta, target, should};
    shouldPreventQueue.current.push(event);
    setTimeout(function() {
      shouldPreventQueue.current = shouldPreventQueue.current.filter(function(e14) {
        return e14 !== event;
      });
    }, 1);
  }, []);
  var scrollTouchStart = React12.useCallback(function(event) {
    touchStartRef.current = getTouchXY(event);
    activeAxis.current = void 0;
  }, []);
  var scrollWheel = React12.useCallback(function(event) {
    shouldCancel(event.type, getDeltaXY(event), event.target, shouldCancelEvent(event, props.lockRef.current));
  }, []);
  var scrollTouchMove = React12.useCallback(function(event) {
    shouldCancel(event.type, getTouchXY(event), event.target, shouldCancelEvent(event, props.lockRef.current));
  }, []);
  React12.useEffect(function() {
    lockStack.push(Style2);
    props.setCallbacks({
      onScrollCapture: scrollWheel,
      onWheelCapture: scrollWheel,
      onTouchMoveCapture: scrollTouchMove
    });
    document.addEventListener("wheel", shouldPrevent, nonPassive);
    document.addEventListener("touchmove", shouldPrevent, nonPassive);
    document.addEventListener("touchstart", scrollTouchStart, nonPassive);
    return function() {
      lockStack = lockStack.filter(function(inst) {
        return inst !== Style2;
      });
      document.removeEventListener("wheel", shouldPrevent, nonPassive);
      document.removeEventListener("touchmove", shouldPrevent, nonPassive);
      document.removeEventListener("touchstart", scrollTouchStart, nonPassive);
    };
  }, []);
  var removeScrollBar = props.removeScrollBar, inert = props.inert;
  return React12.createElement(React12.Fragment, null, inert ? React12.createElement(Style2, {styles: generateStyle(id)}) : null, removeScrollBar ? React12.createElement(RemoveScrollBar, {gapMode: "margin"}) : null);
}

// ../../node_modules/react-remove-scroll/dist/es2015/sidecar.js
var sidecar_default = exportSidecar(effectCar, RemoveScrollSideCar);

// ../../node_modules/react-remove-scroll/dist/es2015/Combination.js
var ReactRemoveScroll = React13.forwardRef(function(props, ref) {
  return React13.createElement(RemoveScroll, __assign({}, props, {ref, sideCar: sidecar_default}));
});
ReactRemoveScroll.classNames = RemoveScroll.classNames;
var Combination_default = ReactRemoveScroll;

// ../../node_modules/@radix-ui/react-menu/dist/index.module.js
var E3 = __toModule(require("react"));
var M2 = ["Enter", " "];
var y2 = ["ArrowUp", "PageDown", "End"];
var R2 = ["ArrowDown", "PageUp", "Home", ...y2];
var I2 = {ltr: [...M2, "ArrowRight"], rtl: [...M2, "ArrowLeft"]};
var P2 = {ltr: ["ArrowLeft"], rtl: ["ArrowRight"]};
var [k2, D2] = createContext4("Menu");
var Menu = (e14) => {
  const {open: t14 = false, children: o13, onOpenChange: u6} = e14, [a6, c7] = E3.useState(null), l7 = E3.useRef(false), s9 = useCallbackRef(u6), d8 = useDirection(a6, e14.dir);
  return E3.useEffect(() => {
    const e15 = () => l7.current = true, t15 = () => l7.current = false;
    return document.addEventListener("keydown", e15, {capture: true}), document.addEventListener("pointerdown", t15, {capture: true}), document.addEventListener("pointermove", t15, {capture: true}), () => {
      document.removeEventListener("keydown", e15, {capture: true}), document.removeEventListener("pointerdown", t15, {capture: true}), document.removeEventListener("pointermove", t15, {capture: true});
    };
  }, []), /* @__PURE__ */ E3.createElement(Root2, null, /* @__PURE__ */ E3.createElement(k2, {isSubmenu: false, isUsingKeyboardRef: l7, dir: d8, open: t14, onOpenChange: s9, content: a6, onContentChange: c7, onRootClose: E3.useCallback(() => s9(false), [s9])}, o13));
};
var MenuSub = (t14) => {
  const {children: r11, open: o13 = false, onOpenChange: u6} = t14, a6 = D2("MenuSub"), [c7, l7] = E3.useState(null), [s9, d8] = E3.useState(null), m8 = useCallbackRef(u6);
  return E3.useEffect(() => (a6.open === false && m8(false), () => m8(false)), [a6.open, m8]), /* @__PURE__ */ E3.createElement(Root2, null, /* @__PURE__ */ E3.createElement(k2, {isSubmenu: true, isUsingKeyboardRef: a6.isUsingKeyboardRef, dir: a6.dir, open: o13, onOpenChange: m8, content: s9, onContentChange: d8, onRootClose: a6.onRootClose, contentId: useId(), trigger: c7, onTriggerChange: l7, triggerId: useId()}, r11));
};
var [S2, T2, O2] = createCollection();
var [A2, L2] = createContext4("MenuContent");
var MenuContent = /* @__PURE__ */ E3.forwardRef((e14, t14) => {
  const {forceMount: n5, ...r11} = e14, o13 = D2("MenuContent");
  return E3.createElement(Presence, {present: n5 || o13.open}, /* @__PURE__ */ E3.createElement(S2, null, o13.isSubmenu ? /* @__PURE__ */ E3.createElement(F3, _extends({}, r11, {ref: t14})) : /* @__PURE__ */ E3.createElement(K2, _extends({}, r11, {ref: t14}))));
});
var K2 = /* @__PURE__ */ E3.forwardRef((e14, t14) => {
  const n5 = D2("MenuContent"), r11 = E3.useRef(null), o13 = useComposedRefs(t14, r11);
  return E3.useEffect(() => {
    const e15 = r11.current;
    if (e15)
      return hideOthers(e15);
  }, []), /* @__PURE__ */ E3.createElement(G2, _extends({}, e14, {ref: o13, onDismiss: () => n5.onOpenChange(false)}));
});
var F3 = /* @__PURE__ */ E3.forwardRef((e14, t14) => {
  const n5 = D2("MenuContent"), r11 = E3.useRef(null), o13 = useComposedRefs(t14, r11);
  return n5.isSubmenu ? /* @__PURE__ */ E3.createElement(G2, _extends({id: n5.contentId, "aria-labelledby": n5.triggerId}, e14, {ref: o13, align: "start", side: n5.dir === "rtl" ? "left" : "right", portalled: true, disableOutsidePointerEvents: false, disableOutsideScroll: false, trapFocus: false, onOpenAutoFocus: (e15) => {
    var t15;
    n5.isUsingKeyboardRef.current && ((t15 = r11.current) === null || t15 === void 0 || t15.focus()), e15.preventDefault();
  }, onCloseAutoFocus: (e15) => e15.preventDefault(), onFocusOutside: composeEventHandlers(e14.onFocusOutside, (e15) => {
    e15.target !== n5.trigger && n5.onOpenChange(false);
  }), onEscapeKeyDown: composeEventHandlers(e14.onEscapeKeyDown, n5.onRootClose), onKeyDown: composeEventHandlers(e14.onKeyDown, (e15) => {
    const t15 = e15.currentTarget.contains(e15.target), r12 = P2[n5.dir].includes(e15.key);
    var o14;
    t15 && r12 && (n5.onOpenChange(false), (o14 = n5.trigger) === null || o14 === void 0 || o14.focus());
  })})) : null;
});
var G2 = /* @__PURE__ */ E3.forwardRef((e14, n5) => {
  const {loop: r11 = false, trapFocus: a6, onOpenAutoFocus: l7, onCloseAutoFocus: s9, disableOutsidePointerEvents: d8, onEscapeKeyDown: p8, onPointerDownOutside: g5, onFocusOutside: h5, onInteractOutside: b5, onDismiss: M3, disableOutsideScroll: I4, portalled: P3, ...k4} = e14, S3 = D2("MenuContent"), {getItems: T4} = O2(), [L3, K3] = E3.useState(null), F4 = E3.useRef(null), G3 = useComposedRefs(n5, F4, S3.onContentChange), U3 = E3.useRef(false), V3 = E3.useRef(0), N3 = E3.useRef(""), X2 = E3.useRef(0), B3 = E3.useRef(null), z3 = E3.useRef("right"), W2 = E3.useRef(0), j2 = P3 ? Portal : E3.Fragment, q2 = I4 ? Combination_default : E3.Fragment, J2 = (e15) => {
    var t14, n6;
    const r12 = N3.current + e15, o13 = T4().filter((e16) => !e16.disabled), u6 = document.activeElement, a7 = (t14 = o13.find((e16) => e16.ref.current === u6)) === null || t14 === void 0 ? void 0 : t14.textValue, c7 = function(e16, t15, n7) {
      const r13 = t15.length > 1 && Array.from(t15).every((e17) => e17 === t15[0]) ? t15[0] : t15, o14 = n7 ? e16.indexOf(n7) : -1;
      let u7 = (a8 = e16, c8 = Math.max(o14, 0), a8.map((e17, t16) => a8[(c8 + t16) % a8.length]));
      var a8, c8;
      r13.length === 1 && (u7 = u7.filter((e17) => e17 !== n7));
      const i7 = u7.find((e17) => e17.toLowerCase().startsWith(r13.toLowerCase()));
      return i7 !== n7 ? i7 : void 0;
    }(o13.map((e16) => e16.textValue), r12, a7), i6 = (n6 = o13.find((e16) => e16.textValue === c7)) === null || n6 === void 0 ? void 0 : n6.ref.current;
    !function e16(t15) {
      N3.current = t15, window.clearTimeout(V3.current), t15 !== "" && (V3.current = window.setTimeout(() => e16(""), 1e3));
    }(r12), i6 && setTimeout(() => i6.focus());
  };
  E3.useEffect(() => () => window.clearTimeout(V3.current), []), useFocusGuards();
  const Q = E3.useCallback((e15) => {
    var t14, n6;
    return z3.current === ((t14 = B3.current) === null || t14 === void 0 ? void 0 : t14.side) && function(e16, t15) {
      if (!t15)
        return false;
      return function(e17, t16) {
        const {x: n7, y: r12} = e17;
        let o13 = false;
        for (let e18 = 0, u6 = t16.length - 1; e18 < t16.length; u6 = e18++) {
          const a7 = t16[e18].x, c7 = t16[e18].y, i6 = t16[u6].x, l8 = t16[u6].y;
          c7 > r12 != l8 > r12 && n7 < (i6 - a7) * (r12 - c7) / (l8 - c7) + a7 && (o13 = !o13);
        }
        return o13;
      }({x: e16.clientX, y: e16.clientY}, t15);
    }(e15, (n6 = B3.current) === null || n6 === void 0 ? void 0 : n6.area);
  }, []);
  return E3.createElement(j2, null, /* @__PURE__ */ E3.createElement(q2, null, /* @__PURE__ */ E3.createElement(A2, {searchRef: N3, onItemEnter: E3.useCallback((e15) => {
    Q(e15) && e15.preventDefault();
  }, [Q]), onItemLeave: E3.useCallback((e15) => {
    var t14;
    Q(e15) || ((t14 = F4.current) === null || t14 === void 0 || t14.focus(), K3(null));
  }, [Q]), onTriggerLeave: E3.useCallback((e15) => {
    Q(e15) && e15.preventDefault();
  }, [Q]), pointerGraceTimerRef: X2, onPointerGraceIntentChange: E3.useCallback((e15) => {
    B3.current = e15;
  }, [])}, /* @__PURE__ */ E3.createElement(FocusScope, {as: Slot, trapped: a6 && S3.open, onMountAutoFocus: composeEventHandlers(l7, (e15) => {
    var t14;
    e15.preventDefault(), (t14 = F4.current) === null || t14 === void 0 || t14.focus();
  }), onUnmountAutoFocus: (e15) => {
    !d8 && U3.current ? e15.preventDefault() : s9 == null || s9(e15);
  }}, /* @__PURE__ */ E3.createElement(DismissableLayer, {as: Slot, disableOutsidePointerEvents: d8, onEscapeKeyDown: composeEventHandlers(p8, () => {
    U3.current = false;
  }), onPointerDownOutside: composeEventHandlers(g5, (e15) => {
    const t14 = e15.detail.originalEvent, n6 = t14.button === 0 && t14.ctrlKey === false;
    U3.current = n6;
  }, {checkForDefaultPrevented: false}), onFocusOutside: composeEventHandlers(h5, (e15) => {
    a6 && e15.preventDefault();
  }, {checkForDefaultPrevented: false}), onInteractOutside: b5, onDismiss: M3}, /* @__PURE__ */ E3.createElement(RovingFocusGroup, {as: Slot, dir: S3.dir, orientation: "vertical", loop: r11, currentTabStopId: L3, onCurrentTabStopIdChange: K3, onEntryFocus: (e15) => {
    S3.isUsingKeyboardRef.current || e15.preventDefault();
  }}, /* @__PURE__ */ E3.createElement(Content, _extends({role: "menu", dir: S3.dir, "data-state": Y2(S3.open)}, k4, {ref: G3, style: {outline: "none", ...k4.style}, onKeyDown: composeEventHandlers(k4.onKeyDown, (e15) => {
    const t14 = e15.target, n6 = e15.currentTarget.contains(t14), r12 = e15.ctrlKey || e15.altKey || e15.metaKey;
    n6 && !r12 && e15.key.length === 1 && J2(e15.key), e15.key === "Tab" && e15.preventDefault();
    const o13 = F4.current;
    if (e15.target !== o13)
      return;
    if (!R2.includes(e15.key))
      return;
    e15.preventDefault();
    const u6 = T4().filter((e16) => !e16.disabled).map((e16) => e16.ref.current);
    y2.includes(e15.key) && u6.reverse(), function(e16) {
      const t15 = document.activeElement;
      for (const n7 of e16) {
        if (n7 === t15)
          return;
        if (n7.focus(), document.activeElement !== t15)
          return;
      }
    }(u6);
  }), onBlur: composeEventHandlers(e14.onBlur, (e15) => {
    e15.currentTarget.contains(e15.target) || (window.clearTimeout(V3.current), N3.current = "");
  }), onPointerMove: composeEventHandlers(e14.onPointerMove, H2((e15) => {
    const t14 = e15.target, n6 = W2.current !== e15.clientX;
    if (e15.currentTarget.contains(t14) && n6) {
      const t15 = e15.clientX > W2.current ? "right" : "left";
      z3.current = t15, W2.current = e15.clientX;
    }
  }))}))))))));
});
var U2 = "div";
var MenuItem = /* @__PURE__ */ E3.forwardRef((e14, t14) => {
  const {disabled: n5 = false, onSelect: r11, ...o13} = e14, u6 = E3.useRef(null), a6 = D2("MenuItem"), c7 = L2("MenuItem"), i6 = useComposedRefs(t14, u6), l7 = () => {
    const e15 = u6.current;
    if (!n5 && e15) {
      const t15 = new Event("menu.itemSelect", {bubbles: true, cancelable: true});
      if (e15.addEventListener("menu.itemSelect", (e16) => r11 == null ? void 0 : r11(e16), {once: true}), e15.dispatchEvent(t15), t15.defaultPrevented)
        return;
      a6.onRootClose();
    }
  };
  return E3.createElement(V2, _extends({}, o13, {ref: i6, disabled: n5, onPointerUp: composeEventHandlers(e14.onPointerUp, l7), onKeyDown: composeEventHandlers(e14.onKeyDown, (e15) => {
    const t15 = c7.searchRef.current !== "";
    n5 || t15 && e15.key === " " || M2.includes(e15.key) && (e15.key === " " && e15.preventDefault(), l7());
  })}));
});
var MenuSubTrigger = /* @__PURE__ */ E3.forwardRef((e14, t14) => {
  const n5 = D2("MenuSubTrigger"), r11 = L2("MenuSubTrigger"), u6 = E3.useRef(null), {pointerGraceTimerRef: a6, onPointerGraceIntentChange: c7} = r11, i6 = E3.useCallback(() => {
    u6.current && window.clearTimeout(u6.current), u6.current = null;
  }, []);
  return E3.useEffect(() => i6, [i6]), E3.useEffect(() => {
    const e15 = a6.current;
    return () => {
      window.clearTimeout(e15), c7(null);
    };
  }, [a6, c7]), n5.isSubmenu ? /* @__PURE__ */ E3.createElement(MenuAnchor, {as: Slot}, /* @__PURE__ */ E3.createElement(V2, _extends({id: n5.triggerId, "aria-haspopup": "menu", "aria-expanded": n5.open, "aria-controls": n5.contentId, "data-state": Y2(n5.open)}, e14, {ref: composeRefs(t14, n5.onTriggerChange), onPointerUp: composeEventHandlers(e14.onPointerUp, (l7 = (t15) => {
    r11.onItemEnter(t15), t15.defaultPrevented || e14.disabled || n5.open || n5.onOpenChange(true);
  }, (e15) => e15.pointerType !== "mouse" ? l7(e15) : void 0)), onPointerMove: composeEventHandlers(e14.onPointerMove, H2((t15) => {
    r11.onItemEnter(t15), t15.defaultPrevented || e14.disabled || n5.open || u6.current || (r11.onPointerGraceIntentChange(null), u6.current = window.setTimeout(() => {
      n5.onOpenChange(true), i6();
    }, 100));
  })), onPointerLeave: composeEventHandlers(e14.onPointerLeave, H2((e15) => {
    var t15;
    i6();
    const o13 = (t15 = n5.content) === null || t15 === void 0 ? void 0 : t15.getBoundingClientRect();
    if (o13) {
      var u7;
      const t16 = (u7 = n5.content) === null || u7 === void 0 ? void 0 : u7.dataset.side, c8 = t16 === "right", i7 = c8 ? -5 : 5, l8 = o13[c8 ? "left" : "right"], s9 = o13[c8 ? "right" : "left"];
      r11.onPointerGraceIntentChange({area: [{x: e15.clientX + i7, y: e15.clientY}, {x: l8, y: o13.top}, {x: s9, y: o13.top}, {x: s9, y: o13.bottom}, {x: l8, y: o13.bottom}], side: t16}), window.clearTimeout(a6.current), a6.current = window.setTimeout(() => r11.onPointerGraceIntentChange(null), 300);
    } else {
      if (r11.onTriggerLeave(e15), e15.defaultPrevented)
        return;
      r11.onPointerGraceIntentChange(null);
    }
  })), onKeyDown: composeEventHandlers(e14.onKeyDown, (t15) => {
    const o13 = r11.searchRef.current !== "";
    var u7;
    e14.disabled || o13 && t15.key === " " || I2[n5.dir].includes(t15.key) && (n5.onOpenChange(true), (u7 = n5.content) === null || u7 === void 0 || u7.focus());
  })}))) : null;
  var l7;
});
var V2 = /* @__PURE__ */ E3.forwardRef((e14, t14) => {
  const {as: n5 = U2, disabled: r11 = false, textValue: o13, ...u6} = e14, c7 = E3.useRef(null), i6 = useComposedRefs(t14, c7), l7 = L2("MenuItem"), [s9, d8] = E3.useState("");
  return E3.useEffect(() => {
    const e15 = c7.current;
    var t15;
    e15 && d8(((t15 = e15.textContent) !== null && t15 !== void 0 ? t15 : "").trim());
  }, [u6.children]), /* @__PURE__ */ E3.createElement(T2, {disabled: r11, textValue: o13 != null ? o13 : s9}, /* @__PURE__ */ E3.createElement(RovingFocusItem, _extends({role: "menuitem", "aria-disabled": r11 || void 0, "data-disabled": r11 ? "" : void 0, focusable: !r11}, u6, {as: n5, ref: i6, onPointerMove: composeEventHandlers(e14.onPointerMove, H2((e15) => {
    if (r11)
      l7.onItemLeave(e15);
    else if (l7.onItemEnter(e15), !e15.defaultPrevented) {
      e15.currentTarget.focus();
    }
  })), onPointerLeave: composeEventHandlers(e14.onPointerLeave, H2((e15) => l7.onItemLeave(e15)))})));
});
var MenuCheckboxItem = /* @__PURE__ */ E3.forwardRef((e14, t14) => {
  const {checked: n5 = false, onCheckedChange: r11, ...o13} = e14;
  return E3.createElement(B2.Provider, {value: n5}, /* @__PURE__ */ E3.createElement(MenuItem, _extends({role: "menuitemcheckbox", "aria-checked": n5}, o13, {ref: t14, "data-state": z2(n5), onSelect: composeEventHandlers(o13.onSelect, () => r11 == null ? void 0 : r11(!n5), {checkForDefaultPrevented: false})})));
});
var N2 = /* @__PURE__ */ E3.createContext({});
var MenuRadioGroup = /* @__PURE__ */ E3.forwardRef((e14, t14) => {
  const {value: r11, onValueChange: o13, ...u6} = e14, a6 = useCallbackRef(o13), c7 = E3.useMemo(() => ({value: r11, onValueChange: a6}), [r11, a6]);
  return E3.createElement(N2.Provider, {value: c7}, /* @__PURE__ */ E3.createElement(MenuGroup, _extends({}, u6, {ref: t14})));
});
var MenuRadioItem = /* @__PURE__ */ E3.forwardRef((e14, t14) => {
  const {value: n5, ...r11} = e14, o13 = E3.useContext(N2), u6 = n5 === o13.value;
  return E3.createElement(B2.Provider, {value: u6}, /* @__PURE__ */ E3.createElement(MenuItem, _extends({role: "menuitemradio", "aria-checked": u6}, r11, {ref: t14, "data-state": z2(u6), onSelect: composeEventHandlers(r11.onSelect, () => {
    var e15;
    return (e15 = o13.onValueChange) === null || e15 === void 0 ? void 0 : e15.call(o13, n5);
  }, {checkForDefaultPrevented: false})})));
});
var X = "span";
var B2 = /* @__PURE__ */ E3.createContext(false);
var MenuItemIndicator = /* @__PURE__ */ E3.forwardRef((e14, t14) => {
  const {as: n5 = X, forceMount: r11, ...o13} = e14, u6 = E3.useContext(B2);
  return E3.createElement(Presence, {present: r11 || u6}, /* @__PURE__ */ E3.createElement(Primitive, _extends({}, o13, {as: n5, ref: t14, "data-state": z2(u6)})));
});
var MenuAnchor = extendPrimitive(Anchor, {displayName: "MenuAnchor"});
var MenuGroup = extendPrimitive(Primitive, {defaultProps: {role: "group"}, displayName: "MenuGroup"});
var MenuLabel = extendPrimitive(Primitive, {displayName: "MenuLabel"});
var MenuSeparator = extendPrimitive(Primitive, {defaultProps: {role: "separator", "aria-orientation": "horizontal"}, displayName: "MenuSeparator "});
var MenuArrow = extendPrimitive(Arrow3, {displayName: "MenuArrow"});
function Y2(e14) {
  return e14 ? "open" : "closed";
}
function z2(e14) {
  return e14 ? "checked" : "unchecked";
}
function H2(e14) {
  return (t14) => t14.pointerType === "mouse" ? e14(t14) : void 0;
}
var Root3 = Menu;
var Sub = MenuSub;
var Anchor2 = MenuAnchor;
var SubTrigger = MenuSubTrigger;
var Content2 = MenuContent;
var Group = MenuGroup;
var Label = MenuLabel;
var Item = MenuItem;
var CheckboxItem = MenuCheckboxItem;
var RadioGroup = MenuRadioGroup;
var RadioItem = MenuRadioItem;
var ItemIndicator = MenuItemIndicator;
var Separator = MenuSeparator;
var Arrow4 = MenuArrow;

// ../../node_modules/@radix-ui/react-context-menu/dist/index.module.js
var i5 = __toModule(require("react"));
var [c5, x3] = createContext4("ContextMenu");
var ContextMenu = (n5) => {
  const {children: o13, onOpenChange: r11, dir: a6} = n5, [u6, x6] = i5.useState(false), s9 = i5.useContext(p6), m8 = useCallbackRef(r11), C6 = i5.useCallback((e14) => {
    x6(e14), m8(e14);
  }, [m8]);
  return s9 ? /* @__PURE__ */ i5.createElement(c5, {isRootMenu: false, open: u6, onOpenChange: C6}, /* @__PURE__ */ i5.createElement(Sub, {open: u6, onOpenChange: C6}, o13)) : /* @__PURE__ */ i5.createElement(c5, {isRootMenu: true, open: u6, onOpenChange: C6}, /* @__PURE__ */ i5.createElement(Root3, {dir: a6, open: u6, onOpenChange: C6}, o13));
};
var s6 = "span";
var ContextMenuTrigger = /* @__PURE__ */ i5.forwardRef((e14, o13) => {
  const {as: r11 = s6, ...c7} = e14, m8 = x3("ContextMenuTrigger"), l7 = i5.useRef({x: 0, y: 0}), d8 = i5.useRef({getBoundingClientRect: () => DOMRect.fromRect({width: 0, height: 0, ...l7.current})}), M3 = i5.useRef(0), f7 = i5.useCallback(() => window.clearTimeout(M3.current), []), g5 = (e15) => {
    l7.current = {x: e15.clientX, y: e15.clientY}, m8.onOpenChange(true);
  };
  return i5.useEffect(() => f7, [f7]), /* @__PURE__ */ i5.createElement(p6.Provider, {value: false}, /* @__PURE__ */ i5.createElement(Anchor2, {virtualRef: d8}), /* @__PURE__ */ i5.createElement(Primitive, _extends({}, c7, {as: r11, ref: o13, style: {WebkitTouchCallout: "none", ...c7.style}, onContextMenu: composeEventHandlers(e14.onContextMenu, (e15) => {
    f7(), e15.preventDefault(), g5(e15);
  }), onPointerDown: composeEventHandlers(e14.onPointerDown, C3((e15) => {
    f7(), M3.current = window.setTimeout(() => g5(e15), 700);
  })), onPointerMove: composeEventHandlers(e14.onPointerMove, C3(f7)), onPointerCancel: composeEventHandlers(e14.onPointerCancel, C3(f7)), onPointerUp: composeEventHandlers(e14.onPointerUp, C3(f7))})));
});
var p6 = /* @__PURE__ */ i5.createContext(false);
var ContextMenuContent = /* @__PURE__ */ i5.forwardRef((e14, n5) => {
  const o13 = x3("ContextMenuContent"), r11 = {...e14, style: {...e14.style, "--radix-context-menu-content-transform-origin": "var(--radix-popper-transform-origin)"}};
  return i5.createElement(p6.Provider, {value: true}, o13.isRootMenu ? /* @__PURE__ */ i5.createElement(m4, _extends({}, r11, {ref: n5})) : /* @__PURE__ */ i5.createElement(Content2, _extends({}, r11, {ref: n5})));
});
var m4 = /* @__PURE__ */ i5.forwardRef((e14, n5) => {
  const {disableOutsidePointerEvents: o13 = true, ...r11} = e14, a6 = x3("ContextMenuContent");
  return i5.createElement(Content2, _extends({}, r11, {ref: n5, disableOutsidePointerEvents: !!a6.open && o13, trapFocus: true, disableOutsideScroll: true, portalled: true, side: "right", sideOffset: 2, align: "start"}));
});
var ContextMenuGroup = extendPrimitive(Group, {displayName: "ContextMenuGroup"});
var ContextMenuLabel = extendPrimitive(Label, {displayName: "ContextMenuLabel"});
var ContextMenuTriggerItem = extendPrimitive(SubTrigger, {displayName: "ContextMenuTriggerItem"});
var ContextMenuItem = extendPrimitive(Item, {displayName: "ContextMenuItem"});
var ContextMenuCheckboxItem = extendPrimitive(CheckboxItem, {displayName: "ContextMenuCheckboxItem"});
var ContextMenuRadioGroup = extendPrimitive(RadioGroup, {displayName: "ContextMenuRadioGroup"});
var ContextMenuRadioItem = extendPrimitive(RadioItem, {displayName: "ContextMenuRadioItem"});
var ContextMenuItemIndicator = extendPrimitive(ItemIndicator, {displayName: "ContextMenuItemIndicator"});
var ContextMenuSeparator = extendPrimitive(Separator, {displayName: "ContextMenuSeparator"});
var ContextMenuArrow = extendPrimitive(Arrow4, {displayName: "ContextMenuArrow"});
function C3(e14) {
  return (t14) => t14.pointerType !== "mouse" ? e14(t14) : void 0;
}
var Root4 = ContextMenu;
var Trigger = ContextMenuTrigger;
var Content3 = ContextMenuContent;
var Item2 = ContextMenuItem;
var TriggerItem = ContextMenuTriggerItem;
var Separator2 = ContextMenuSeparator;
var Arrow5 = ContextMenuArrow;

// src/components/kbd.tsx
var React14 = __toModule(require("react"));
var import_core9 = __toModule(require_cjs());
function commandKey() {
  return import_core9.Utils.isDarwin() ? "\u2318" : "Ctrl";
}
function Kbd({
  variant,
  children
}) {
  if (import_core9.Utils.isMobile())
    return null;
  return /* @__PURE__ */ React14.createElement(StyledKbd, {
    variant
  }, children.replaceAll("#", commandKey()).split("").map((k4, i6) => /* @__PURE__ */ React14.createElement("span", {
    key: i6
  }, k4)));
}
var StyledKbd = styles_default("kbd", {
  marginLeft: "$3",
  textShadow: "$2",
  textAlign: "center",
  fontSize: "$0",
  fontFamily: "$ui",
  fontWeight: 400,
  gap: "$1",
  display: "flex",
  alignItems: "center",
  "& > span": {
    padding: "$0",
    borderRadius: "$0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  variants: {
    variant: {
      tooltip: {
        "& > span": {
          background: "$overlayContrast",
          boxShadow: "$key",
          width: "20px",
          height: "20px"
        }
      },
      menu: {}
    }
  }
});

// src/components/shared.tsx
var React16 = __toModule(require("react"));

// ../../node_modules/@radix-ui/react-visually-hidden/dist/index.module.js
var r9 = __toModule(require("react"));
var o10 = "span";
var VisuallyHidden = /* @__PURE__ */ r9.forwardRef((i6, a6) => {
  const {as: n5 = o10, ...s9} = i6;
  return r9.createElement(Primitive, _extends({}, s9, {as: n5, ref: a6, style: {...i6.style, position: "absolute", border: 0, width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", wordWrap: "normal"}}));
});
var Root5 = VisuallyHidden;

// ../../node_modules/@radix-ui/react-use-previous/dist/index.module.js
var e13 = __toModule(require("react"));
function usePrevious(r11) {
  const t14 = e13.useRef(r11);
  return e13.useEffect(() => {
    t14.current = r11;
  }, [r11]), t14.current;
}

// ../../node_modules/@radix-ui/react-tooltip/dist/index.module.js
var g3 = __toModule(require("react"));
function x4(e14) {
  return {type: "machine.actions.assign", assign: e14};
}
var y3;
var T3;
var C4 = x4((e14, t14) => {
  var o13;
  return {...e14, id: (o13 = t14.id) !== null && o13 !== void 0 ? o13 : e14.id};
});
var v4 = function(e14, {debug: t14 = false, warnOnUnknownTransitions: o13 = false} = {}) {
  let n5 = e14.initial, r11 = e14.context;
  const i6 = [], a6 = (s9) => {
    var l7, c7;
    const u6 = e14.states[n5], p8 = s9.type, d8 = (l7 = e14.on) === null || l7 === void 0 ? void 0 : l7[p8], m8 = (c7 = u6.on) === null || c7 === void 0 ? void 0 : c7[p8], f7 = d8 != null ? d8 : m8;
    if (f7 === void 0)
      o13 && console.warn(`From state: "${n5}", event "${p8}" has no transition to any state`);
    else {
      const {target: o14, actions: l8 = [], cond: c8 = () => true} = f7, p9 = o14 ? e14.states[o14] : {};
      if (c8(r11, s9)) {
        const e15 = (u6.exit || []).concat(l8, p9.entry || []);
        r11 = function(e16, t15, o15) {
          let n6 = o15;
          return e16 == null || e16.forEach((e17) => {
            typeof e17 == "function" ? e17(n6, t15, a6) : e17.type === "machine.actions.assign" && (n6 = e17.assign(n6, t15));
          }), n6;
        }(e15, s9, r11), o14 && (n5 = o14, t14 && (console.group("event:", s9), console.log("state:", n5), console.log("context:", r11), console.groupEnd()), i6.forEach((e16) => e16({state: n5, context: r11})));
      }
    }
  };
  return {subscribe: function(e15) {
    return i6.push(e15), () => {
      i6.splice(i6.indexOf(e15), 1);
    };
  }, send: a6, getContext: function() {
    return r11;
  }};
}({initial: "closed", context: {id: null, delayed: false}, on: {FOCUS: {target: "open"}}, states: {closed: {entry: [x4((e14) => ({...e14, id: null}))], on: {OPEN: {target: "opening"}}}, opening: {entry: [(e14, t14, o13) => {
  const n5 = t14.delayDuration, r11 = () => o13({type: "DELAY_TIMER_END"});
  n5 === void 0 ? r11() : y3 = window.setTimeout(r11, n5);
}, C4, x4((e14) => ({...e14, delayed: true}))], exit: [() => clearTimeout(y3)], on: {DELAY_TIMER_END: {target: "open"}, CLOSE: {target: "closed"}}}, open: {entry: [C4], exit: [x4((e14) => ({...e14, delayed: false}))], on: {OPEN: {target: "open"}, CLOSE: {target: "closing", cond: (e14, t14) => e14.id === t14.id}}}, closing: {entry: [(e14, t14, o13) => {
  var n5;
  const r11 = (n5 = t14.skipDelayDuration) !== null && n5 !== void 0 ? n5 : 300;
  T3 = window.setTimeout(() => o13({type: "SKIP_DELAY_TIMER_END"}), r11);
}], exit: [() => clearTimeout(T3)], on: {OPEN: {target: "open"}, SKIP_DELAY_TIMER_END: {target: "closed"}}}}});
var [b3, D3] = createContext4("Tooltip");
var Tooltip = (t14) => {
  const {children: o13, open: n5, defaultOpen: i6 = false, onOpenChange: a6, delayDuration: s9 = 700, skipDelayDuration: l7 = 300} = t14, [u6, d8] = g3.useState(null), m8 = useId(), [f7 = false, E4] = useControllableState({prop: n5, defaultProp: i6, onChange: a6}), [x6, y5] = g3.useState(n5 ? "instant-open" : "closed");
  g3.useEffect(() => v4.subscribe(({state: e14, context: t15}) => {
    e14 === "open" && t15.id === m8 ? E4(true) : E4(false);
  }), [m8, E4]), g3.useEffect(() => v4.subscribe(({state: e14, context: t15}) => {
    t15.id === m8 ? y5(e14 === "open" ? t15.delayed ? "delayed-open" : "instant-open" : "closed") : y5("closed");
  }), [m8]);
  const T4 = g3.useCallback(() => v4.send({type: "FOCUS", id: m8}), [m8]), C6 = g3.useCallback(() => v4.send({type: "OPEN", id: m8, delayDuration: s9}), [m8, s9]), D4 = g3.useCallback(() => v4.send({type: "CLOSE", id: m8, skipDelayDuration: l7}), [l7, m8]);
  return g3.useEffect(() => () => D4(), [D4]), useLayoutEffect2(() => {
    n5 === true && v4.send({type: "OPEN", id: m8});
  }, [m8, n5]), /* @__PURE__ */ g3.createElement(Root2, null, /* @__PURE__ */ g3.createElement(b3, {contentId: m8, open: f7, stateAttribute: x6, trigger: u6, onTriggerChange: d8, onFocus: T4, onOpen: C6, onClose: D4}, o13));
};
var w3 = "button";
var TooltipTrigger = /* @__PURE__ */ g3.forwardRef((e14, t14) => {
  const {as: o13 = w3, ...n5} = e14, i6 = D3("TooltipTrigger"), a6 = useComposedRefs(t14, (e15) => i6.onTriggerChange(e15));
  return g3.createElement(Anchor, _extends({type: "button", "aria-describedby": i6.open ? i6.contentId : void 0, "data-state": i6.stateAttribute}, n5, {as: o13, ref: a6, onMouseEnter: composeEventHandlers(e14.onMouseEnter, i6.onOpen), onMouseLeave: composeEventHandlers(e14.onMouseLeave, i6.onClose), onMouseDown: composeEventHandlers(e14.onMouseDown, i6.onClose), onFocus: composeEventHandlers(e14.onFocus, i6.onFocus), onBlur: composeEventHandlers(e14.onBlur, i6.onClose), onKeyDown: composeEventHandlers(e14.onKeyDown, (e15) => {
    e15.key !== "Enter" && e15.key !== " " || i6.onClose();
  })}));
});
var TooltipContent = /* @__PURE__ */ g3.forwardRef((e14, t14) => {
  const {forceMount: o13, ...n5} = e14, r11 = D3("TooltipContent");
  return g3.createElement(Presence, {present: o13 || r11.open}, /* @__PURE__ */ g3.createElement(h2, _extends({ref: t14}, n5)));
});
var h2 = /* @__PURE__ */ g3.forwardRef((e14, i6) => {
  const {children: a6, "aria-label": s9, portalled: l7 = true, ...c7} = e14, p8 = D3("TooltipContent"), d8 = l7 ? Portal : g3.Fragment;
  return useEscapeKeydown(() => p8.onClose()), /* @__PURE__ */ g3.createElement(d8, null, /* @__PURE__ */ g3.createElement(O3, null), /* @__PURE__ */ g3.createElement(Content, _extends({"data-state": p8.stateAttribute}, c7, {ref: i6, style: {...c7.style, "--radix-tooltip-content-transform-origin": "var(--radix-popper-transform-origin)"}}), /* @__PURE__ */ g3.createElement(Slottable, null, a6), /* @__PURE__ */ g3.createElement(Root5, {id: p8.contentId, role: "tooltip"}, s9 || a6)));
});
var TooltipArrow = extendPrimitive(Arrow3, {displayName: "TooltipArrow"});
function O3() {
  const e14 = D3("CheckTriggerMoved"), t14 = useRect(e14.trigger), o13 = t14 == null ? void 0 : t14.left, n5 = usePrevious(o13), r11 = t14 == null ? void 0 : t14.top, i6 = usePrevious(r11), a6 = e14.onClose;
  return g3.useEffect(() => {
    (n5 !== void 0 && n5 !== o13 || i6 !== void 0 && i6 !== r11) && a6();
  }, [a6, n5, i6, o13, r11]), null;
}
var Root6 = Tooltip;
var Trigger2 = TooltipTrigger;
var Content4 = TooltipContent;
var Arrow6 = TooltipArrow;

// src/components/tooltip.tsx
var React15 = __toModule(require("react"));
function Tooltip2({
  children,
  label,
  kbd,
  side = "top"
}) {
  return /* @__PURE__ */ React15.createElement(Root6, null, /* @__PURE__ */ React15.createElement(Trigger2, {
    as: "span"
  }, children), /* @__PURE__ */ React15.createElement(StyledContent, {
    side,
    sideOffset: 8
  }, label, kbd ? /* @__PURE__ */ React15.createElement(Kbd, {
    variant: "tooltip"
  }, kbd) : null, /* @__PURE__ */ React15.createElement(StyledArrow, null)));
}
var StyledContent = styles_default(Content4, {
  borderRadius: 3,
  padding: "$3 $3 $3 $3",
  fontSize: "$1",
  backgroundColor: "$tooltipBg",
  color: "$tooltipText",
  boxShadow: "$3",
  display: "flex",
  alignItems: "center",
  fontFamily: "$ui"
});
var StyledArrow = styles_default(Arrow6, {
  fill: "$tooltipBg",
  margin: "0 8px"
});

// ../../node_modules/@radix-ui/react-dropdown-menu/dist/index.module.js
var d6 = __toModule(require("react"));
var [u4, s7] = createContext4("DropdownMenu");
var DropdownMenu = (e14) => {
  const {children: n5, open: t14, defaultOpen: p8, onOpenChange: a6, dir: i6} = e14, s9 = d6.useContext(m5), [l7 = false, w5] = useControllableState({prop: t14, defaultProp: p8, onChange: a6}), g5 = d6.useCallback(() => w5((e15) => !e15), [w5]);
  return s9 ? /* @__PURE__ */ d6.createElement(u4, {isRootMenu: false, open: l7, onOpenChange: w5, onOpenToggle: g5}, /* @__PURE__ */ d6.createElement(Sub, {open: l7, onOpenChange: w5}, n5)) : /* @__PURE__ */ d6.createElement(c6, {dir: i6, open: l7, onOpenChange: w5, onOpenToggle: g5}, n5);
};
var c6 = (n5) => {
  const {children: r11, dir: t14, open: p8, onOpenChange: a6, onOpenToggle: i6} = n5, s9 = d6.useRef(null);
  return d6.createElement(u4, {isRootMenu: true, triggerId: useId(), triggerRef: s9, contentId: useId(), open: p8, onOpenChange: a6, onOpenToggle: i6}, /* @__PURE__ */ d6.createElement(Root3, {open: p8, onOpenChange: a6, dir: t14}, r11));
};
var l6 = "button";
var DropdownMenuTrigger = /* @__PURE__ */ d6.forwardRef((e14, n5) => {
  const {as: r11 = l6, ...t14} = e14, u6 = s7("DropdownMenuTrigger");
  return u6.isRootMenu ? /* @__PURE__ */ d6.createElement(Anchor2, _extends({type: "button", id: u6.triggerId, "aria-haspopup": "menu", "aria-expanded": !!u6.open || void 0, "aria-controls": u6.open ? u6.contentId : void 0, "data-state": u6.open ? "open" : "closed"}, t14, {as: r11, ref: composeRefs(n5, u6.triggerRef), onMouseDown: composeEventHandlers(e14.onMouseDown, (e15) => {
    e15.button === 0 && e15.ctrlKey === false && u6.onOpenToggle();
  }), onKeyDown: composeEventHandlers(e14.onKeyDown, (e15) => {
    [" ", "Enter", "ArrowDown"].includes(e15.key) && (e15.preventDefault(), u6.onOpenChange(true));
  })})) : null;
});
var m5 = /* @__PURE__ */ d6.createContext(false);
var DropdownMenuContent = /* @__PURE__ */ d6.forwardRef((e14, n5) => {
  const r11 = s7("DropdownMenuContent"), t14 = {...e14, style: {...e14.style, "--radix-dropdown-menu-content-transform-origin": "var(--radix-popper-transform-origin)"}};
  return d6.createElement(m5.Provider, {value: true}, r11.isRootMenu ? /* @__PURE__ */ d6.createElement(w4, _extends({}, t14, {ref: n5})) : /* @__PURE__ */ d6.createElement(Content2, _extends({}, t14, {ref: n5})));
});
var w4 = /* @__PURE__ */ d6.forwardRef((e14, n5) => {
  const {disableOutsidePointerEvents: r11 = true, disableOutsideScroll: t14 = true, portalled: p8 = true, ...u6} = e14, c7 = s7("DropdownMenuContent");
  return c7.isRootMenu ? /* @__PURE__ */ d6.createElement(Content2, _extends({id: c7.contentId, "aria-labelledby": c7.triggerId}, u6, {ref: n5, disableOutsidePointerEvents: r11, disableOutsideScroll: t14, portalled: p8, trapFocus: true, onCloseAutoFocus: composeEventHandlers(e14.onCloseAutoFocus, (e15) => {
    var o13;
    e15.preventDefault(), (o13 = c7.triggerRef.current) === null || o13 === void 0 || o13.focus();
  }), onPointerDownOutside: composeEventHandlers(e14.onPointerDownOutside, (e15) => {
    var o13;
    const n6 = e15.target;
    ((o13 = c7.triggerRef.current) === null || o13 === void 0 ? void 0 : o13.contains(n6)) && e15.preventDefault();
  }, {checkForDefaultPrevented: false})})) : null;
});
var DropdownMenuGroup = extendPrimitive(Group, {displayName: "DropdownMenuGroup"});
var DropdownMenuLabel = extendPrimitive(Label, {displayName: "DropdownMenuLabel"});
var DropdownMenuTriggerItem = extendPrimitive(SubTrigger, {displayName: "DropdownMenuTriggerItem"});
var DropdownMenuItem = extendPrimitive(Item, {displayName: "DropdownMenuItem"});
var DropdownMenuCheckboxItem = extendPrimitive(CheckboxItem, {displayName: "DropdownMenuCheckboxItem"});
var DropdownMenuRadioGroup = extendPrimitive(RadioGroup, {displayName: "DropdownMenuRadioGroup"});
var DropdownMenuRadioItem = extendPrimitive(RadioItem, {displayName: "DropdownMenuRadioItem"});
var DropdownMenuItemIndicator = extendPrimitive(ItemIndicator, {displayName: "DropdownMenuItemIndicator"});
var DropdownMenuSeparator = extendPrimitive(Separator, {displayName: "DropdownMenuSeparator"});
var DropdownMenuArrow = extendPrimitive(Arrow4, {displayName: "DropdownMenuArrow"});
var Root7 = DropdownMenu;
var Trigger3 = DropdownMenuTrigger;
var Content5 = DropdownMenuContent;
var Separator3 = DropdownMenuSeparator;
var Arrow7 = DropdownMenuArrow;

// ../../node_modules/@radix-ui/react-label/dist/index.module.js
var o12 = __toModule(require("react"));
var a5 = /* @__PURE__ */ o12.createContext(void 0);
var useLabelContext = (e14) => {
  const t14 = o12.useContext(a5);
  return o12.useEffect(() => {
    const r11 = t14 == null ? void 0 : t14.ref.current;
    if (r11 && e14)
      return s8(r11, e14);
  }, [t14, e14]), t14 == null ? void 0 : t14.id;
};
function s8(e14, t14) {
  const r11 = (e15) => {
    const r12 = t14.contains(e15.target), o13 = e15.isTrusted === true;
    !r12 && o13 && (t14.click(), t14.focus());
  };
  return e14.addEventListener("click", r11), () => e14.removeEventListener("click", r11);
}

// ../../node_modules/@radix-ui/react-radio-group/dist/index.module.js
var m6 = __toModule(require("react"));
var [v5, h3] = createContext4("Radio");
var R3 = "span";
var k3 = /* @__PURE__ */ m6.forwardRef((r11, t14) => {
  const {as: o13 = R3, forceMount: a6, ...i6} = r11, n5 = h3("RadioIndicator");
  return m6.createElement(Presence, {present: a6 || n5.checked}, /* @__PURE__ */ m6.createElement(Primitive, _extends({"data-state": y4(n5.checked), "data-disabled": n5.disabled ? "" : void 0}, i6, {as: o13, ref: t14})));
});
function y4(e14) {
  return e14 ? "checked" : "unchecked";
}
var I3 = "div";
var [g4, C5] = createContext4("RadioGroup");
var RadioGroup2 = /* @__PURE__ */ m6.forwardRef((e14, r11) => {
  const {as: t14 = I3, name: a6, "aria-labelledby": n5, defaultValue: c7, value: d8, required: l7, orientation: u6, dir: p8 = "ltr", loop: b5 = true, onValueChange: v6, ...h5} = e14, x6 = useLabelContext(), R4 = n5 || x6, [k4, E4] = useControllableState({prop: d8, defaultProp: c7, onChange: v6});
  return m6.createElement(g4, {name: a6, value: k4, required: l7, onValueChange: E4}, /* @__PURE__ */ m6.createElement(RovingFocusGroup, _extends({role: "radiogroup", "aria-labelledby": R4, orientation: u6, dir: p8, loop: b5}, h5, {as: t14, ref: r11})));
});
var RadioGroupIndicator = extendPrimitive(k3, {displayName: "RadioGroupIndicator"});
var Root8 = RadioGroup2;

// ../../node_modules/@radix-ui/react-icons/dist/react-icons.esm.js
var import_react6 = __toModule(require("react"));
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null)
    return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i6;
  for (i6 = 0; i6 < sourceKeys.length; i6++) {
    key = sourceKeys[i6];
    if (excluded.indexOf(key) >= 0)
      continue;
    target[key] = source[key];
  }
  return target;
}
var AlignBottomIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M9 3C9 2.44772 8.55229 2 8 2H7C6.44772 2 6 2.44772 6 3L6 14H1.5C1.22386 14 1 14.2239 1 14.5C1 14.7761 1.22386 15 1.5 15L6 15H9H13.5C13.7761 15 14 14.7761 14 14.5C14 14.2239 13.7761 14 13.5 14H9V3Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var AlignCenterHorizontallyIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M1.99988 6C1.44759 6 0.999877 6.44772 0.999877 7L0.999877 8C0.999877 8.55228 1.44759 9 1.99988 9L6.99988 9L6.99988 13.5C6.99988 13.7761 7.22374 14 7.49988 14C7.77602 14 7.99988 13.7761 7.99988 13.5L7.99988 9L12.9999 9C13.5522 9 13.9999 8.55228 13.9999 8L13.9999 7C13.9999 6.44772 13.5522 6 12.9999 6L7.99988 6L7.99988 1.5C7.99988 1.22386 7.77602 1 7.49988 1C7.22373 1 6.99988 1.22386 6.99988 1.5L6.99988 6L1.99988 6Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var AlignCenterVerticallyIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M6.99988 1C6.44759 1 5.99988 1.44772 5.99988 2V7H1.49988C1.22374 7 0.999878 7.22386 0.999878 7.5C0.999878 7.77614 1.22374 8 1.49988 8H5.99988V13C5.99988 13.5523 6.44759 14 6.99988 14H7.99988C8.55216 14 8.99988 13.5523 8.99988 13V8H13.4999C13.776 8 13.9999 7.77614 13.9999 7.5C13.9999 7.22386 13.776 7 13.4999 7H8.99988V2C8.99988 1.44772 8.55216 1 7.99988 1L6.99988 1Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var AlignLeftIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M0.499995 0.999995C0.223855 0.999995 -5.58458e-07 1.22385 -5.46388e-07 1.49999L-2.18554e-08 13.4999C-9.78492e-09 13.776 0.223855 13.9999 0.499995 13.9999C0.776136 13.9999 0.999991 13.776 0.999991 13.4999L0.999991 8.99993L12 8.99993C12.5523 8.99993 13 8.55222 13 7.99993L13 6.99994C13 6.44766 12.5523 5.99995 12 5.99995L0.999991 5.99995L0.999991 1.49999C0.999991 1.22385 0.776135 0.999995 0.499995 0.999995Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var AlignRightIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M14.4999 1C14.2237 1 13.9999 1.22386 13.9999 1.5L13.9999 6L2.99988 6C2.44759 6 1.99988 6.44772 1.99988 7L1.99988 8C1.99988 8.55228 2.44759 9 2.99988 9L13.9999 9L13.9999 13.5C13.9999 13.7761 14.2237 14 14.4999 14C14.776 14 14.9999 13.7761 14.9999 13.5L14.9999 9L14.9999 6L14.9999 1.5C14.9999 1.22386 14.776 1 14.4999 1Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var AlignTopIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M1.5 0C1.22386 0 1 0.223858 1 0.5C1 0.776142 1.22386 1 1.5 1H6V12C6 12.5523 6.44772 13 7 13H8C8.55228 13 9 12.5523 9 12V1H13.5C13.7761 1 14 0.776142 14 0.5C14 0.223858 13.7761 0 13.5 0H9H6H1.5Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var ArrowDownIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M7.5 2C7.77614 2 8 2.22386 8 2.5L8 11.2929L11.1464 8.14645C11.3417 7.95118 11.6583 7.95118 11.8536 8.14645C12.0488 8.34171 12.0488 8.65829 11.8536 8.85355L7.85355 12.8536C7.75979 12.9473 7.63261 13 7.5 13C7.36739 13 7.24021 12.9473 7.14645 12.8536L3.14645 8.85355C2.95118 8.65829 2.95118 8.34171 3.14645 8.14645C3.34171 7.95118 3.65829 7.95118 3.85355 8.14645L7 11.2929L7 2.5C7 2.22386 7.22386 2 7.5 2Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var ArrowTopRightIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M3.64645 11.3536C3.45118 11.1583 3.45118 10.8417 3.64645 10.6465L10.2929 4L6 4C5.72386 4 5.5 3.77614 5.5 3.5C5.5 3.22386 5.72386 3 6 3L11.5 3C11.6326 3 11.7598 3.05268 11.8536 3.14645C11.9473 3.24022 12 3.36739 12 3.5L12 9.00001C12 9.27615 11.7761 9.50001 11.5 9.50001C11.2239 9.50001 11 9.27615 11 9.00001V4.70711L4.35355 11.3536C4.15829 11.5488 3.84171 11.5488 3.64645 11.3536Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var ArrowUpIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M7.14645 2.14645C7.34171 1.95118 7.65829 1.95118 7.85355 2.14645L11.8536 6.14645C12.0488 6.34171 12.0488 6.65829 11.8536 6.85355C11.6583 7.04882 11.3417 7.04882 11.1464 6.85355L8 3.70711L8 12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5L7 3.70711L3.85355 6.85355C3.65829 7.04882 3.34171 7.04882 3.14645 6.85355C2.95118 6.65829 2.95118 6.34171 3.14645 6.14645L7.14645 2.14645Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var AspectRatioIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M2.5 2H12.5C12.7761 2 13 2.22386 13 2.5V12.5C13 12.7761 12.7761 13 12.5 13H2.5C2.22386 13 2 12.7761 2 12.5V2.5C2 2.22386 2.22386 2 2.5 2ZM1 2.5C1 1.67157 1.67157 1 2.5 1H12.5C13.3284 1 14 1.67157 14 2.5V12.5C14 13.3284 13.3284 14 12.5 14H2.5C1.67157 14 1 13.3284 1 12.5V2.5ZM7.5 4C7.77614 4 8 3.77614 8 3.5C8 3.22386 7.77614 3 7.5 3C7.22386 3 7 3.22386 7 3.5C7 3.77614 7.22386 4 7.5 4ZM8 5.5C8 5.77614 7.77614 6 7.5 6C7.22386 6 7 5.77614 7 5.5C7 5.22386 7.22386 5 7.5 5C7.77614 5 8 5.22386 8 5.5ZM7.5 8C7.77614 8 8 7.77614 8 7.5C8 7.22386 7.77614 7 7.5 7C7.22386 7 7 7.22386 7 7.5C7 7.77614 7.22386 8 7.5 8ZM10 7.5C10 7.77614 9.77614 8 9.5 8C9.22386 8 9 7.77614 9 7.5C9 7.22386 9.22386 7 9.5 7C9.77614 7 10 7.22386 10 7.5ZM11.5 8C11.7761 8 12 7.77614 12 7.5C12 7.22386 11.7761 7 11.5 7C11.2239 7 11 7.22386 11 7.5C11 7.77614 11.2239 8 11.5 8Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var ChevronRightIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var CircleIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M0.877075 7.49991C0.877075 3.84222 3.84222 0.877075 7.49991 0.877075C11.1576 0.877075 14.1227 3.84222 14.1227 7.49991C14.1227 11.1576 11.1576 14.1227 7.49991 14.1227C3.84222 14.1227 0.877075 11.1576 0.877075 7.49991ZM7.49991 1.82708C4.36689 1.82708 1.82708 4.36689 1.82708 7.49991C1.82708 10.6329 4.36689 13.1727 7.49991 13.1727C10.6329 13.1727 13.1727 10.6329 13.1727 7.49991C13.1727 4.36689 10.6329 1.82708 7.49991 1.82708Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var CopyIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M1 9.50006C1 10.3285 1.67157 11.0001 2.5 11.0001H4L4 10.0001H2.5C2.22386 10.0001 2 9.7762 2 9.50006L2 2.50006C2 2.22392 2.22386 2.00006 2.5 2.00006L9.5 2.00006C9.77614 2.00006 10 2.22392 10 2.50006V4.00002H5.5C4.67158 4.00002 4 4.67159 4 5.50002V12.5C4 13.3284 4.67158 14 5.5 14H12.5C13.3284 14 14 13.3284 14 12.5V5.50002C14 4.67159 13.3284 4.00002 12.5 4.00002H11V2.50006C11 1.67163 10.3284 1.00006 9.5 1.00006H2.5C1.67157 1.00006 1 1.67163 1 2.50006V9.50006ZM5 5.50002C5 5.22388 5.22386 5.00002 5.5 5.00002H12.5C12.7761 5.00002 13 5.22388 13 5.50002V12.5C13 12.7762 12.7761 13 12.5 13H5.5C5.22386 13 5 12.7762 5 12.5V5.50002Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var Cross2Icon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var CursorArrowIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M3.29227 0.048984C3.47033 -0.032338 3.67946 -0.00228214 3.8274 0.125891L12.8587 7.95026C13.0134 8.08432 13.0708 8.29916 13.0035 8.49251C12.9362 8.68586 12.7578 8.81866 12.5533 8.82768L9.21887 8.97474L11.1504 13.2187C11.2648 13.47 11.1538 13.7664 10.9026 13.8808L8.75024 14.8613C8.499 14.9758 8.20255 14.8649 8.08802 14.6137L6.15339 10.3703L3.86279 12.7855C3.72196 12.934 3.50487 12.9817 3.31479 12.9059C3.1247 12.8301 3 12.6461 3 12.4414V0.503792C3 0.308048 3.11422 0.130306 3.29227 0.048984ZM4 1.59852V11.1877L5.93799 9.14425C6.05238 9.02363 6.21924 8.96776 6.38319 8.99516C6.54715 9.02256 6.68677 9.12965 6.75573 9.2809L8.79056 13.7441L10.0332 13.178L8.00195 8.71497C7.93313 8.56376 7.94391 8.38824 8.03072 8.24659C8.11753 8.10494 8.26903 8.01566 8.435 8.00834L11.2549 7.88397L4 1.59852Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var DotsHorizontalIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var GroupIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M1.44995 0.949951C1.31734 0.949951 1.19016 1.00263 1.0964 1.0964C1.00263 1.19017 0.949951 1.31735 0.949951 1.44995L0.949966 3.44995C0.949969 3.7261 1.17383 3.94995 1.44997 3.94995C1.72611 3.94995 1.94997 3.72609 1.94997 3.44995L1.94995 1.94995H3.44997C3.72611 1.94995 3.94997 1.72609 3.94997 1.44995C3.94997 1.17381 3.72611 0.949951 3.44997 0.949951H1.44995ZM5.94995 0.949951C5.67381 0.949951 5.44995 1.17381 5.44995 1.44995C5.44995 1.72609 5.67381 1.94995 5.94995 1.94995H8.94995C9.22609 1.94995 9.44995 1.72609 9.44995 1.44995C9.44995 1.17381 9.22609 0.949951 8.94995 0.949951H5.94995ZM5.44995 13.45C5.44995 13.1738 5.67381 12.95 5.94995 12.95H8.94995C9.22609 12.95 9.44995 13.1738 9.44995 13.45C9.44995 13.7261 9.22609 13.95 8.94995 13.95H5.94995C5.67381 13.95 5.44995 13.7261 5.44995 13.45ZM1.94995 5.94995C1.94995 5.67381 1.72609 5.44995 1.44995 5.44995C1.17381 5.44995 0.949951 5.67381 0.949951 5.94995V8.94995C0.949951 9.22609 1.17381 9.44995 1.44995 9.44995C1.72609 9.44995 1.94995 9.22609 1.94995 8.94995V5.94995ZM13.45 5.44995C13.7261 5.44995 13.95 5.67381 13.95 5.94995V8.94995C13.95 9.22609 13.7261 9.44995 13.45 9.44995C13.1738 9.44995 12.95 9.22609 12.95 8.94995V5.94995C12.95 5.67381 13.1738 5.44995 13.45 5.44995ZM11.45 0.949951C11.1738 0.949951 10.95 1.17381 10.95 1.44995C10.95 1.72609 11.1738 1.94995 11.45 1.94995H12.9499V3.44995C12.9499 3.72609 13.1738 3.94995 13.4499 3.94995C13.7261 3.94995 13.9499 3.72609 13.9499 3.44995V1.44995C13.9499 1.17381 13.7252 0.949951 13.449 0.949951H11.45ZM1.44995 10.95C1.72609 10.95 1.94995 11.1738 1.94995 11.45V12.95H3.44997C3.72611 12.95 3.94997 13.1738 3.94997 13.45C3.94997 13.7261 3.72611 13.95 3.44997 13.95H1.44995C1.17381 13.95 0.949951 13.7261 0.949951 13.45V11.45C0.949951 11.1738 1.17381 10.95 1.44995 10.95ZM13.95 11.45C13.95 11.1738 13.7261 10.95 13.45 10.95C13.1738 10.9499 12.95 11.1738 12.95 11.4499L12.9491 12.95H11.45C11.1738 12.95 10.95 13.1738 10.95 13.45C10.95 13.7261 11.1738 13.95 11.45 13.95H13.4499C13.7261 13.95 13.9499 13.7261 13.9499 13.45L13.95 11.45Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var LockClosedIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M5 4.63601C5 3.76031 5.24219 3.1054 5.64323 2.67357C6.03934 2.24705 6.64582 1.9783 7.5014 1.9783C8.35745 1.9783 8.96306 2.24652 9.35823 2.67208C9.75838 3.10299 10 3.75708 10 4.63325V5.99999H5V4.63601ZM4 5.99999V4.63601C4 3.58148 4.29339 2.65754 4.91049 1.99307C5.53252 1.32329 6.42675 0.978302 7.5014 0.978302C8.57583 0.978302 9.46952 1.32233 10.091 1.99162C10.7076 2.65557 11 3.57896 11 4.63325V5.99999H12C12.5523 5.99999 13 6.44771 13 6.99999V13C13 13.5523 12.5523 14 12 14H3C2.44772 14 2 13.5523 2 13V6.99999C2 6.44771 2.44772 5.99999 3 5.99999H4ZM3 6.99999H12V13H3V6.99999Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var LockOpen1Icon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M7.4986 0C6.3257 0 5.36107 0.38943 4.73753 1.19361C4.23745 1.83856 4 2.68242 4 3.63325H5C5 2.84313 5.19691 2.23312 5.5278 1.80636C5.91615 1.30552 6.55152 1 7.4986 1C8.35683 1 8.96336 1.26502 9.35846 1.68623C9.75793 2.11211 10 2.76044 10 3.63601V6H3C2.44772 6 2 6.44772 2 7V13C2 13.5523 2.44772 14 3 14H12C12.5523 14 13 13.5523 13 13V7C13 6.44771 12.5523 6 12 6H11V3.63601C11 2.58135 10.7065 1.66167 10.0878 1.0021C9.46477 0.337871 8.57061 0 7.4986 0ZM3 7H12V13H3V7Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var Pencil1Icon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00189 12.709 2.14646 12.8536C2.29103 12.9981 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.3317 11.3754 6.42166 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.42166 9.28547L11.5 2.20711L12.7929 3.5L5.71455 10.5784L4.21924 11.2192L3.78081 10.7808L4.42166 9.28547Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var PinBottomIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M13.5 13.95C13.7485 13.95 13.95 13.7485 13.95 13.5C13.95 13.2514 13.7485 13.05 13.5 13.05L1.49995 13.05C1.25142 13.05 1.04995 13.2514 1.04995 13.5C1.04995 13.7485 1.25142 13.95 1.49995 13.95L13.5 13.95ZM11.0681 7.5683C11.2439 7.39257 11.2439 7.10764 11.0681 6.93191C10.8924 6.75617 10.6075 6.75617 10.4317 6.93191L7.94993 9.41371L7.94993 1.49998C7.94993 1.25146 7.74846 1.04998 7.49993 1.04998C7.2514 1.04998 7.04993 1.25146 7.04993 1.49998L7.04993 9.41371L4.56813 6.93191C4.39239 6.75617 4.10746 6.75617 3.93173 6.93191C3.75599 7.10764 3.75599 7.39257 3.93173 7.5683L7.18173 10.8183C7.35746 10.994 7.64239 10.994 7.81812 10.8183L11.0681 7.5683Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var PinTopIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M1.50005 1.05005C1.25152 1.05005 1.05005 1.25152 1.05005 1.50005C1.05005 1.74858 1.25152 1.95005 1.50005 1.95005L13.5 1.95005C13.7486 1.95005 13.95 1.74858 13.95 1.50005C13.95 1.25152 13.7486 1.05005 13.5 1.05005H1.50005ZM3.93188 7.43169C3.75614 7.60743 3.75614 7.89236 3.93188 8.06809C4.10761 8.24383 4.39254 8.24383 4.56827 8.06809L7.05007 5.58629V13.5C7.05007 13.7485 7.25155 13.95 7.50007 13.95C7.7486 13.95 7.95007 13.7485 7.95007 13.5L7.95007 5.58629L10.4319 8.06809C10.6076 8.24383 10.8925 8.24383 11.0683 8.06809C11.244 7.89235 11.244 7.60743 11.0683 7.43169L7.81827 4.18169C7.64254 4.00596 7.35761 4.00596 7.18188 4.18169L3.93188 7.43169Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var RotateCounterClockwiseIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M7.59664 2.93628C7.76085 3.06401 8.00012 2.94698 8.00012 2.73895V1.99998C9.98143 2 11.1848 2.3637 11.9105 3.08945C12.6363 3.81522 13 5.0186 13 6.99998C13 7.27613 13.2239 7.49998 13.5 7.49998C13.7761 7.49998 14 7.27613 14 6.99998C14 4.9438 13.6325 3.39719 12.6176 2.38234C11.6028 1.36752 10.0562 0.999999 8.00012 0.999984V0.261266C8.00012 0.0532293 7.76085 -0.0637944 7.59664 0.063928L6.00384 1.30277C5.87516 1.40286 5.87516 1.59735 6.00384 1.69744L7.59664 2.93628ZM9.5 5H2.5C2.22386 5 2 5.22386 2 5.5V12.5C2 12.7761 2.22386 13 2.5 13H9.5C9.77614 13 10 12.7761 10 12.5V5.5C10 5.22386 9.77614 5 9.5 5ZM2.5 4C1.67157 4 1 4.67157 1 5.5V12.5C1 13.3284 1.67157 14 2.5 14H9.5C10.3284 14 11 13.3284 11 12.5V5.5C11 4.67157 10.3284 4 9.5 4H2.5Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var SpaceEvenlyHorizontallyIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M14.4999 0.999992C14.2237 0.999992 13.9999 1.22385 13.9999 1.49999L13.9999 13.4999C13.9999 13.776 14.2237 13.9999 14.4999 13.9999C14.776 13.9999 14.9999 13.776 14.9999 13.4999L14.9999 1.49999C14.9999 1.22385 14.776 0.999992 14.4999 0.999992ZM0.499996 0.999992C0.223856 0.999992 -9.78509e-09 1.22385 -2.18556e-08 1.49999L4.07279e-07 13.4999C3.95208e-07 13.776 0.223855 13.9999 0.499996 13.9999C0.776136 13.9999 0.999992 13.776 0.999992 13.4999L0.999992 1.49999C0.999992 1.22385 0.776136 0.999992 0.499996 0.999992ZM1.99998 6.99994C1.99998 6.44766 2.44769 5.99995 2.99998 5.99995L5.99995 5.99995C6.55223 5.99995 6.99994 6.44766 6.99994 6.99994L6.99994 7.99993C6.99994 8.55221 6.55223 8.99992 5.99995 8.99992L2.99998 8.99992C2.4477 8.99992 1.99998 8.55221 1.99998 7.99993L1.99998 6.99994ZM8.99993 5.99995C8.44765 5.99995 7.99993 6.44766 7.99993 6.99994L7.99993 7.99993C7.99993 8.55221 8.44765 8.99992 8.99993 8.99992L11.9999 8.99992C12.5522 8.99992 12.9999 8.55221 12.9999 7.99993L12.9999 6.99994C12.9999 6.44766 12.5522 5.99995 11.9999 5.99995L8.99993 5.99995Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var SpaceEvenlyVerticallyIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M0.999878 0.5C0.999878 0.223858 1.22374 0 1.49988 0H13.4999C13.776 0 13.9999 0.223858 13.9999 0.5C13.9999 0.776142 13.776 1 13.4999 1H1.49988C1.22374 1 0.999878 0.776142 0.999878 0.5ZM7 2C6.44772 2 6 2.44772 6 3V6C6 6.55228 6.44772 7 7 7H8C8.55228 7 9 6.55228 9 6V3C9 2.44772 8.55228 2 8 2H7ZM7 8C6.44772 8 6 8.44771 6 9V12C6 12.5523 6.44772 13 7 13H8C8.55228 13 9 12.5523 9 12V9C9 8.44772 8.55228 8 8 8H7ZM1.49988 14C1.22374 14 0.999878 14.2239 0.999878 14.5C0.999878 14.7761 1.22374 15 1.49988 15H13.4999C13.776 15 13.9999 14.7761 13.9999 14.5C13.9999 14.2239 13.776 14 13.4999 14H1.49988Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var SquareIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M1 1H1.5H13.5H14V1.5V13.5V14H13.5H1.5H1V13.5V1.5V1ZM2 2V13H13V2H2Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var StretchHorizontallyIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M14.4999 0.999992C14.2237 0.999992 13.9999 1.22385 13.9999 1.49999L13.9999 5.99995L0.999992 5.99995L0.999992 1.49999C0.999992 1.22385 0.776136 0.999992 0.499996 0.999992C0.223856 0.999992 -9.78509e-09 1.22385 -2.18556e-08 1.49999L4.07279e-07 13.4999C3.95208e-07 13.776 0.223855 13.9999 0.499996 13.9999C0.776136 13.9999 0.999992 13.776 0.999992 13.4999L0.999992 8.99992L13.9999 8.99992L13.9999 13.4999C13.9999 13.776 14.2237 13.9999 14.4999 13.9999C14.776 13.9999 14.9999 13.776 14.9999 13.4999L14.9999 1.49999C14.9999 1.22385 14.776 0.999992 14.4999 0.999992Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var StretchVerticallyIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M0.999878 0.5C0.999878 0.223858 1.22374 0 1.49988 0H13.4999C13.776 0 13.9999 0.223858 13.9999 0.5C13.9999 0.776142 13.776 1 13.4999 1H6H1.49988C1.22374 1 0.999878 0.776142 0.999878 0.5ZM9 14V1L6 1V14H1.49988C1.22374 14 0.999878 14.2239 0.999878 14.5C0.999878 14.7761 1.22374 15 1.49988 15H13.4999C13.776 15 13.9999 14.7761 13.9999 14.5C13.9999 14.2239 13.776 14 13.4999 14H9Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var TextIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M3.94993 2.95002L3.94993 4.49998C3.94993 4.74851 3.74845 4.94998 3.49993 4.94998C3.2514 4.94998 3.04993 4.74851 3.04993 4.49998V2.50004C3.04993 2.45246 3.05731 2.40661 3.07099 2.36357C3.12878 2.18175 3.29897 2.05002 3.49993 2.05002H11.4999C11.6553 2.05002 11.7922 2.12872 11.8731 2.24842C11.9216 2.32024 11.9499 2.40682 11.9499 2.50002L11.9499 2.50004V4.49998C11.9499 4.74851 11.7485 4.94998 11.4999 4.94998C11.2514 4.94998 11.0499 4.74851 11.0499 4.49998V2.95002H8.04993V12.05H9.25428C9.50281 12.05 9.70428 12.2515 9.70428 12.5C9.70428 12.7486 9.50281 12.95 9.25428 12.95H5.75428C5.50575 12.95 5.30428 12.7486 5.30428 12.5C5.30428 12.2515 5.50575 12.05 5.75428 12.05H6.94993V2.95002H3.94993Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var ZoomInIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159ZM4.25 6.5C4.25 6.22386 4.47386 6 4.75 6H6V4.75C6 4.47386 6.22386 4.25 6.5 4.25C6.77614 4.25 7 4.47386 7 4.75V6H8.25C8.52614 6 8.75 6.22386 8.75 6.5C8.75 6.77614 8.52614 7 8.25 7H7V8.25C7 8.52614 6.77614 8.75 6.5 8.75C6.22386 8.75 6 8.52614 6 8.25V7H4.75C4.47386 7 4.25 6.77614 4.25 6.5Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});
var ZoomOutIcon = /* @__PURE__ */ (0, import_react6.forwardRef)(function(_ref, forwardedRef) {
  var _ref$color = _ref.color, color = _ref$color === void 0 ? "currentColor" : _ref$color, props = _objectWithoutPropertiesLoose(_ref, ["color"]);
  return (0, import_react6.createElement)("svg", Object.assign({
    width: "15",
    height: "15",
    viewBox: "0 0 15 15",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  }, props, {
    ref: forwardedRef
  }), (0, import_react6.createElement)("path", {
    d: "M6.5 10C8.433 10 10 8.433 10 6.5C10 4.567 8.433 3 6.5 3C4.567 3 3 4.567 3 6.5C3 8.433 4.567 10 6.5 10ZM6.5 11C7.56251 11 8.53901 10.6318 9.30884 10.0159L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L10.0159 9.30884C10.6318 8.53901 11 7.56251 11 6.5C11 4.01472 8.98528 2 6.5 2C4.01472 2 2 4.01472 2 6.5C2 8.98528 4.01472 11 6.5 11ZM4.75 6C4.47386 6 4.25 6.22386 4.25 6.5C4.25 6.77614 4.47386 7 4.75 7H8.25C8.52614 7 8.75 6.77614 8.75 6.5C8.75 6.22386 8.52614 6 8.25 6H4.75Z",
    fill: color,
    fillRule: "evenodd",
    clipRule: "evenodd"
  }));
});

// src/components/shared.tsx
var breakpoints = {"@initial": "mobile", "@sm": "small"};
var IconButton = styles_default("button", {
  position: "relative",
  height: "32px",
  width: "32px",
  backgroundColor: "$panel",
  borderRadius: "4px",
  padding: "0",
  margin: "0",
  display: "grid",
  alignItems: "center",
  justifyContent: "center",
  outline: "none",
  border: "none",
  pointerEvents: "all",
  fontSize: "$0",
  color: "$text",
  cursor: "pointer",
  "& > *": {
    gridRow: 1,
    gridColumn: 1
  },
  "&:disabled": {
    opacity: "0.5"
  },
  "& > span": {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center"
  },
  variants: {
    bp: {
      mobile: {
        backgroundColor: "transparent"
      },
      small: {
        "&:hover:not(:disabled)": {
          backgroundColor: "$hover"
        }
      }
    },
    size: {
      small: {
        height: 32,
        width: 32,
        "& svg:nth-of-type(1)": {
          height: "16px",
          width: "16px"
        }
      },
      medium: {
        height: 44,
        width: 44,
        "& svg:nth-of-type(1)": {
          height: "18px",
          width: "18px"
        }
      },
      large: {
        height: 44,
        width: 44,
        "& svg:nth-of-type(1)": {
          height: "20px",
          width: "20px"
        }
      }
    },
    isActive: {
      true: {
        color: "$selected"
      }
    }
  }
});
var RowButton = styles_default("button", {
  position: "relative",
  display: "flex",
  width: "100%",
  background: "none",
  height: "32px",
  border: "none",
  cursor: "pointer",
  color: "$text",
  outline: "none",
  alignItems: "center",
  fontFamily: "$ui",
  fontWeight: 400,
  fontSize: "$1",
  justifyContent: "space-between",
  padding: "4px 8px 4px 12px",
  borderRadius: 4,
  userSelect: "none",
  "& label": {
    fontWeight: "$1",
    margin: 0,
    padding: 0
  },
  "& svg": {
    position: "relative",
    stroke: "$overlay",
    strokeWidth: 1,
    zIndex: 1
  },
  "&[data-disabled]": {
    opacity: 0.3
  },
  "&:disabled": {
    opacity: 0.3
  },
  variants: {
    bp: {
      mobile: {},
      small: {
        '& *[data-shy="true"]': {
          opacity: 0
        },
        "&:hover:not(:disabled)": {
          backgroundColor: "$hover",
          '& *[data-shy="true"]': {
            opacity: 1
          }
        }
      }
    },
    size: {
      icon: {
        padding: "4px ",
        width: "auto"
      }
    },
    variant: {
      noIcon: {
        padding: "4px 12px"
      },
      pageButton: {
        display: "grid",
        gridTemplateColumns: "24px auto",
        width: "100%",
        paddingLeft: "$1",
        gap: "$3",
        justifyContent: "flex-start",
        [`& > *[data-state="checked"]`]: {
          gridRow: 1,
          gridColumn: 1
        },
        "& > span": {
          gridRow: 1,
          gridColumn: 2,
          width: "100%"
        }
      }
    },
    warn: {
      true: {
        color: "$warn"
      }
    },
    isActive: {
      true: {
        backgroundColor: "$hover"
      }
    }
  }
});
var Group2 = styles_default(Root8, {
  display: "flex"
});
var ShortcutKey = styles_default("span", {
  fontSize: "$0",
  width: "16px",
  height: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "1px 1px 0px rgba(0,0,0,.5)"
});
var IconWrapper = styles_default("div", {
  height: "100%",
  borderRadius: "4px",
  marginRight: "1px",
  display: "grid",
  alignItems: "center",
  justifyContent: "center",
  outline: "none",
  border: "none",
  pointerEvents: "all",
  cursor: "pointer",
  color: "$text",
  "& svg": {
    height: 22,
    width: 22,
    strokeWidth: 1
  },
  "& > *": {
    gridRow: 1,
    gridColumn: 1
  },
  variants: {
    size: {
      small: {
        "& svg": {
          height: "16px",
          width: "16px"
        }
      },
      medium: {
        "& svg": {
          height: "22px",
          width: "22px"
        }
      }
    }
  }
});
var ButtonsRow = styles_default("div", {
  position: "relative",
  display: "flex",
  width: "100%",
  background: "none",
  border: "none",
  cursor: "pointer",
  outline: "none",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: 0
});
var VerticalDivider = styles_default("hr", {
  width: "1px",
  margin: "-2px 3px",
  border: "none",
  backgroundColor: "$brushFill"
});
var FloatingContainer = styles_default("div", {
  backgroundColor: "$panel",
  border: "1px solid $panel",
  borderRadius: "4px",
  boxShadow: "$4",
  display: "flex",
  height: "fit-content",
  padding: "$0",
  pointerEvents: "all",
  position: "relative",
  userSelect: "none",
  zIndex: 200,
  variants: {
    direction: {
      row: {
        flexDirection: "row"
      },
      column: {
        flexDirection: "column"
      }
    },
    elevation: {
      0: {
        boxShadow: "none"
      },
      2: {
        boxShadow: "$2"
      },
      3: {
        boxShadow: "$3"
      },
      4: {
        boxShadow: "$4"
      }
    }
  }
});
var DialogContent = styles_default("div", {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  minWidth: 240,
  maxWidth: "fit-content",
  maxHeight: "85vh",
  marginTop: "-5vh",
  pointerEvents: "all",
  backgroundColor: "$panel",
  border: "1px solid $panel",
  padding: "$0",
  boxShadow: "$4",
  borderRadius: "4px",
  font: "$ui",
  "&:focus": {
    outline: "none"
  }
});
var DialogOverlay = styles_default("div", {
  backgroundColor: "rgba(0, 0, 0, .15)",
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
});
var DialogInputWrapper = styles_default("div", {
  padding: "$4 $2"
});
var DialogTitleRow = styles_default("div", {
  display: "flex",
  padding: "0 0 0 $4",
  alignItems: "center",
  justifyContent: "space-between",
  h3: {
    fontSize: "$1"
  }
});
var MenuContent2 = styles_default("div", {
  position: "relative",
  overflow: "hidden",
  userSelect: "none",
  zIndex: 180,
  minWidth: 180,
  pointerEvents: "all",
  backgroundColor: "$panel",
  border: "1px solid $panel",
  padding: "$0",
  boxShadow: "$4",
  borderRadius: "4px",
  font: "$ui"
});
var Divider = styles_default("div", {
  backgroundColor: "$hover",
  height: 1,
  marginTop: "$2",
  marginRight: "-$2",
  marginBottom: "$2",
  marginLeft: "-$2"
});
var MenuTextInput = styles_default("input", {
  backgroundColor: "$panel",
  border: "none",
  padding: "$4 $3",
  width: "100%",
  outline: "none",
  background: "$input",
  borderRadius: "4px",
  font: "$ui",
  fontSize: "$1"
});
var DropdownMenuDivider = styles_default(Separator3, {
  backgroundColor: "$hover",
  height: 1,
  marginTop: "$2",
  marginRight: "-$2",
  marginBottom: "$2",
  marginLeft: "-$2"
});
var DropdownMenuArrow2 = styles_default(Arrow7, {
  fill: "$panel"
});
function DropdownMenuIconTriggerButton({
  label,
  kbd,
  children,
  disabled = false
}) {
  return /* @__PURE__ */ React16.createElement(Trigger3, {
    as: IconButton,
    bp: breakpoints,
    disabled
  }, /* @__PURE__ */ React16.createElement(Tooltip2, {
    label,
    kbd
  }, children));
}
function ContextMenuRoot({
  onOpenChange,
  children
}) {
  return /* @__PURE__ */ React16.createElement(Root4, {
    dir: "ltr",
    onOpenChange
  }, children);
}
function ContextMenuSubMenu({
  children,
  label
}) {
  return /* @__PURE__ */ React16.createElement(Root4, {
    dir: "ltr"
  }, /* @__PURE__ */ React16.createElement(TriggerItem, {
    as: RowButton,
    bp: breakpoints
  }, /* @__PURE__ */ React16.createElement("span", null, label), /* @__PURE__ */ React16.createElement(IconWrapper, {
    size: "small"
  }, /* @__PURE__ */ React16.createElement(ChevronRightIcon, null))), /* @__PURE__ */ React16.createElement(Content3, {
    as: MenuContent2,
    sideOffset: 2,
    alignOffset: -2
  }, children, /* @__PURE__ */ React16.createElement(ContextMenuArrow2, {
    offset: 13
  })));
}
var ContextMenuDivider = styles_default(Separator2, {
  backgroundColor: "$hover",
  height: 1,
  margin: "$2 -$2"
});
var ContextMenuArrow2 = styles_default(Arrow5, {
  fill: "$panel"
});
function ContextMenuButton({
  onSelect,
  children,
  disabled = false
}) {
  return /* @__PURE__ */ React16.createElement(RowButton, {
    as: Item2,
    bp: breakpoints,
    disabled,
    onSelect
  }, children);
}
function ContextMenuIconButton({
  onSelect,
  children,
  disabled = false
}) {
  return /* @__PURE__ */ React16.createElement(Item2, {
    as: IconButton,
    bp: breakpoints,
    disabled,
    onSelect
  }, children);
}
function CircleIcon2(props) {
  const {size = 16, ...rest} = props;
  return /* @__PURE__ */ React16.createElement("svg", {
    width: 24,
    height: 24,
    ...rest
  }, /* @__PURE__ */ React16.createElement("circle", {
    cx: 12,
    cy: 12,
    r: size / 2
  }));
}

// src/types.ts
var MoveType;
(function(MoveType2) {
  MoveType2["Backward"] = "backward";
  MoveType2["Forward"] = "forward";
  MoveType2["ToFront"] = "toFront";
  MoveType2["ToBack"] = "toBack";
})(MoveType || (MoveType = {}));
var AlignType;
(function(AlignType3) {
  AlignType3["Top"] = "top";
  AlignType3["CenterVertical"] = "centerVertical";
  AlignType3["Bottom"] = "bottom";
  AlignType3["Left"] = "left";
  AlignType3["CenterHorizontal"] = "centerHorizontal";
  AlignType3["Right"] = "right";
})(AlignType || (AlignType = {}));
var StretchType;
(function(StretchType3) {
  StretchType3["Horizontal"] = "horizontal";
  StretchType3["Vertical"] = "vertical";
})(StretchType || (StretchType = {}));
var DistributeType;
(function(DistributeType3) {
  DistributeType3["Horizontal"] = "horizontal";
  DistributeType3["Vertical"] = "vertical";
})(DistributeType || (DistributeType = {}));
var FlipType;
(function(FlipType2) {
  FlipType2["Horizontal"] = "horizontal";
  FlipType2["Vertical"] = "vertical";
})(FlipType || (FlipType = {}));

// src/components/context-menu/context-menu.tsx
var has1SelectedIdsSelector = (s9) => {
  return s9.pageState.selectedIds.length > 0;
};
var has2SelectedIdsSelector = (s9) => {
  return s9.pageState.selectedIds.length > 1;
};
var has3SelectedIdsSelector = (s9) => {
  return s9.pageState.selectedIds.length > 2;
};
var isDebugModeSelector = (s9) => {
  return s9.settings.isDebugMode;
};
var hasGroupSelectedSelector = (s9) => {
  return s9.pageState.selectedIds.some((id) => s9.page.shapes[id].children !== void 0);
};
var ContextMenu2 = React17.memo(({children}) => {
  const {tlstate, useSelector} = useTLDrawContext();
  const hasSelection = useSelector(has1SelectedIdsSelector);
  const hasTwoOrMore = useSelector(has2SelectedIdsSelector);
  const hasThreeOrMore = useSelector(has3SelectedIdsSelector);
  const isDebugMode = useSelector(isDebugModeSelector);
  const hasGroupSelected = useSelector(hasGroupSelectedSelector);
  const rContent = React17.useRef(null);
  const handleFlipHorizontal = React17.useCallback(() => {
    tlstate.flipHorizontal();
  }, [tlstate]);
  const handleFlipVertical = React17.useCallback(() => {
    tlstate.flipVertical();
  }, [tlstate]);
  const handleDuplicate = React17.useCallback(() => {
    tlstate.duplicate();
  }, [tlstate]);
  const handleGroup = React17.useCallback(() => {
    tlstate.group();
  }, [tlstate]);
  const handleMoveToBack = React17.useCallback(() => {
    tlstate.moveToBack();
  }, [tlstate]);
  const handleMoveBackward = React17.useCallback(() => {
    tlstate.moveBackward();
  }, [tlstate]);
  const handleMoveForward = React17.useCallback(() => {
    tlstate.moveForward();
  }, [tlstate]);
  const handleMoveToFront = React17.useCallback(() => {
    tlstate.moveToFront();
  }, [tlstate]);
  const handleDelete = React17.useCallback(() => {
    tlstate.delete();
  }, [tlstate]);
  const handleCopyAsJson = React17.useCallback(() => {
    tlstate.copyAsJson();
  }, [tlstate]);
  const handleCopyAsSvg = React17.useCallback(() => {
    tlstate.copyAsSvg();
  }, [tlstate]);
  const handleUndo = React17.useCallback(() => {
    tlstate.undo();
  }, [tlstate]);
  const handleRedo = React17.useCallback(() => {
    tlstate.redo();
  }, [tlstate]);
  if (import_core10.Utils.isMobile()) {
    return /* @__PURE__ */ React17.createElement(React17.Fragment, null, children);
  }
  return /* @__PURE__ */ React17.createElement(ContextMenuRoot, null, /* @__PURE__ */ React17.createElement(Trigger, null, children), /* @__PURE__ */ React17.createElement(MenuContent2, {
    as: Content3,
    ref: rContent
  }, hasSelection ? /* @__PURE__ */ React17.createElement(React17.Fragment, null, /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleFlipHorizontal
  }, /* @__PURE__ */ React17.createElement("span", null, "Flip Horizontal"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "\u21E7H")), /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleFlipVertical
  }, /* @__PURE__ */ React17.createElement("span", null, "Flip Vertical"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "\u21E7V")), /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleDuplicate
  }, /* @__PURE__ */ React17.createElement("span", null, "Duplicate"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "#D")), /* @__PURE__ */ React17.createElement(ContextMenuDivider, null), hasGroupSelected || hasTwoOrMore && /* @__PURE__ */ React17.createElement(React17.Fragment, null, hasGroupSelected && /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleGroup
  }, /* @__PURE__ */ React17.createElement("span", null, "Ungroup"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "#\u21E7G")), hasTwoOrMore && /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleGroup
  }, /* @__PURE__ */ React17.createElement("span", null, "Group"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "#G"))), /* @__PURE__ */ React17.createElement(ContextMenuSubMenu, {
    label: "Move"
  }, /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleMoveToFront
  }, /* @__PURE__ */ React17.createElement("span", null, "To Front"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "# \u21E7 ]")), /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleMoveForward
  }, /* @__PURE__ */ React17.createElement("span", null, "Forward"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "# ]")), /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleMoveBackward
  }, /* @__PURE__ */ React17.createElement("span", null, "Backward"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "# [")), /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleMoveToBack
  }, /* @__PURE__ */ React17.createElement("span", null, "To Back"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "# \u21E7 ["))), hasTwoOrMore && /* @__PURE__ */ React17.createElement(AlignDistributeSubMenu, {
    hasTwoOrMore,
    hasThreeOrMore
  }), isDebugMode && /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleCopyAsJson
  }, /* @__PURE__ */ React17.createElement("span", null, "Copy Data"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "# \u21E7 C")), /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleCopyAsSvg
  }, /* @__PURE__ */ React17.createElement("span", null, "Copy to SVG"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "# \u21E7 C")), /* @__PURE__ */ React17.createElement(ContextMenuDivider, null), /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleDelete
  }, /* @__PURE__ */ React17.createElement("span", null, "Delete"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "\u232B"))) : /* @__PURE__ */ React17.createElement(React17.Fragment, null, /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleUndo
  }, /* @__PURE__ */ React17.createElement("span", null, "Undo"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "# Z")), /* @__PURE__ */ React17.createElement(ContextMenuButton, {
    onSelect: handleRedo
  }, /* @__PURE__ */ React17.createElement("span", null, "Redo"), /* @__PURE__ */ React17.createElement(Kbd, {
    variant: "menu"
  }, "# \u21E7 Z")))));
});
function AlignDistributeSubMenu({
  hasThreeOrMore
}) {
  const {tlstate} = useTLDrawContext();
  const alignTop = React17.useCallback(() => {
    tlstate.align(AlignType.Top);
  }, [tlstate]);
  const alignCenterVertical = React17.useCallback(() => {
    tlstate.align(AlignType.CenterVertical);
  }, [tlstate]);
  const alignBottom = React17.useCallback(() => {
    tlstate.align(AlignType.Bottom);
  }, [tlstate]);
  const stretchVertically = React17.useCallback(() => {
    tlstate.stretch(StretchType.Vertical);
  }, [tlstate]);
  const distributeVertically = React17.useCallback(() => {
    tlstate.distribute(DistributeType.Vertical);
  }, [tlstate]);
  const alignLeft = React17.useCallback(() => {
    tlstate.align(AlignType.Left);
  }, [tlstate]);
  const alignCenterHorizontal = React17.useCallback(() => {
    tlstate.align(AlignType.CenterHorizontal);
  }, [tlstate]);
  const alignRight = React17.useCallback(() => {
    tlstate.align(AlignType.Right);
  }, [tlstate]);
  const stretchHorizontally = React17.useCallback(() => {
    tlstate.stretch(StretchType.Horizontal);
  }, [tlstate]);
  const distributeHorizontally = React17.useCallback(() => {
    tlstate.distribute(DistributeType.Horizontal);
  }, [tlstate]);
  return /* @__PURE__ */ React17.createElement(ContextMenuRoot, null, /* @__PURE__ */ React17.createElement(TriggerItem, {
    as: RowButton,
    bp: breakpoints
  }, /* @__PURE__ */ React17.createElement("span", null, "Align / Distribute"), /* @__PURE__ */ React17.createElement(IconWrapper, {
    size: "small"
  }, /* @__PURE__ */ React17.createElement(ChevronRightIcon, null))), /* @__PURE__ */ React17.createElement(StyledGrid, {
    as: Content3,
    sideOffset: 2,
    alignOffset: -2,
    selectedStyle: hasThreeOrMore ? "threeOrMore" : "twoOrMore"
  }, /* @__PURE__ */ React17.createElement(ContextMenuIconButton, {
    onSelect: alignLeft
  }, /* @__PURE__ */ React17.createElement(AlignLeftIcon, null)), /* @__PURE__ */ React17.createElement(ContextMenuIconButton, {
    onSelect: alignCenterHorizontal
  }, /* @__PURE__ */ React17.createElement(AlignCenterHorizontallyIcon, null)), /* @__PURE__ */ React17.createElement(ContextMenuIconButton, {
    onSelect: alignRight
  }, /* @__PURE__ */ React17.createElement(AlignRightIcon, null)), /* @__PURE__ */ React17.createElement(ContextMenuIconButton, {
    onSelect: stretchHorizontally
  }, /* @__PURE__ */ React17.createElement(StretchHorizontallyIcon, null)), hasThreeOrMore && /* @__PURE__ */ React17.createElement(ContextMenuIconButton, {
    onSelect: distributeHorizontally
  }, /* @__PURE__ */ React17.createElement(SpaceEvenlyHorizontallyIcon, null)), /* @__PURE__ */ React17.createElement(ContextMenuIconButton, {
    onSelect: alignTop
  }, /* @__PURE__ */ React17.createElement(AlignTopIcon, null)), /* @__PURE__ */ React17.createElement(ContextMenuIconButton, {
    onSelect: alignCenterVertical
  }, /* @__PURE__ */ React17.createElement(AlignCenterVerticallyIcon, null)), /* @__PURE__ */ React17.createElement(ContextMenuIconButton, {
    onSelect: alignBottom
  }, /* @__PURE__ */ React17.createElement(AlignBottomIcon, null)), /* @__PURE__ */ React17.createElement(ContextMenuIconButton, {
    onSelect: stretchVertically
  }, /* @__PURE__ */ React17.createElement(StretchVerticallyIcon, null)), hasThreeOrMore && /* @__PURE__ */ React17.createElement(ContextMenuIconButton, {
    onSelect: distributeVertically
  }, /* @__PURE__ */ React17.createElement(SpaceEvenlyVerticallyIcon, null)), /* @__PURE__ */ React17.createElement(ContextMenuArrow2, {
    offset: 13
  })));
}
var StyledGrid = styles_default(MenuContent2, {
  display: "grid",
  variants: {
    selectedStyle: {
      threeOrMore: {
        gridTemplateColumns: "repeat(5, auto)"
      },
      twoOrMore: {
        gridTemplateColumns: "repeat(4, auto)"
      }
    }
  }
});

// src/components/style-panel/style-panel.tsx
var React29 = __toModule(require("react"));

// src/components/style-panel/shapes-functions.tsx
var React22 = __toModule(require("react"));

// src/components/icons/redo.tsx
var React18 = __toModule(require("react"));
function SvgRedo(props) {
  return /* @__PURE__ */ React18.createElement("svg", {
    viewBox: "0 0 15 15",
    fill: "currentColor",
    xmlns: "http://www.w3.org/2000/svg",
    ...props
  }, /* @__PURE__ */ React18.createElement("path", {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M12.5 2.495a.5.5 0 00-.5.5v2.5H9.5a.5.5 0 100 1h3a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5z"
  }), /* @__PURE__ */ React18.createElement("path", {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M7.697 2.049a5 5 0 104.02 6.613.5.5 0 10-.944-.332 4 4 0 11-.946-4.16l.01.01 2.32 2.18a.5.5 0 00.685-.729l-2.314-2.175A5 5 0 007.697 2.05z"
  }));
}
var redo_default = SvgRedo;

// src/components/icons/trash.tsx
var React19 = __toModule(require("react"));
function SvgTrash(props) {
  return /* @__PURE__ */ React19.createElement("svg", {
    viewBox: "0 0 15 15",
    fill: "currentColor",
    xmlns: "http://www.w3.org/2000/svg",
    ...props
  }, /* @__PURE__ */ React19.createElement("path", {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M2 4.656a.5.5 0 01.5-.5h9.7a.5.5 0 010 1H2.5a.5.5 0 01-.5-.5z"
  }), /* @__PURE__ */ React19.createElement("path", {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M6.272 3a.578.578 0 00-.578.578v.578h3.311v-.578A.578.578 0 008.428 3H6.272zm3.733 1.156v-.578A1.578 1.578 0 008.428 2H6.272a1.578 1.578 0 00-1.578 1.578v.578H3.578a.5.5 0 00-.5.5V12.2a1.578 1.578 0 001.577 1.578h5.39a1.578 1.578 0 001.577-1.578V4.656a.5.5 0 00-.5-.5h-1.117zm-5.927 1V12.2a.578.578 0 00.577.578h5.39a.578.578 0 00.577-.578V5.156H4.078z"
  }), /* @__PURE__ */ React19.createElement("path", {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M6.272 6.85a.5.5 0 01.5.5v3.233a.5.5 0 11-1 0V7.35a.5.5 0 01.5-.5zM8.428 6.85a.5.5 0 01.5.5v3.233a.5.5 0 11-1 0V7.35a.5.5 0 01.5-.5z"
  }));
}
var trash_default = SvgTrash;

// src/components/icons/undo.tsx
var React20 = __toModule(require("react"));
function SvgUndo(props) {
  return /* @__PURE__ */ React20.createElement("svg", {
    viewBox: "0 0 15 15",
    fill: "currentColor",
    xmlns: "http://www.w3.org/2000/svg",
    ...props
  }, /* @__PURE__ */ React20.createElement("path", {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M2.5 2.495a.5.5 0 01.5.5v2.5h2.5a.5.5 0 110 1h-3a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5z"
  }), /* @__PURE__ */ React20.createElement("path", {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M7.303 2.049a5 5 0 11-4.02 6.613.5.5 0 01.944-.332 4 4 0 10.946-4.16l-.01.01-2.32 2.18a.5.5 0 01-.685-.729l2.314-2.175A5 5 0 017.303 2.05z"
  }));
}
var undo_default = SvgUndo;

// src/components/icons/check.tsx
var React21 = __toModule(require("react"));

// src/components/style-panel/shapes-functions.tsx
var isAllLockedSelector = (s9) => {
  const {selectedIds} = s9.pageState;
  return selectedIds.every((id) => s9.page.shapes[id].isLocked);
};
var isAllAspectLockedSelector = (s9) => {
  const {selectedIds} = s9.pageState;
  return selectedIds.every((id) => s9.page.shapes[id].isAspectRatioLocked);
};
var isAllGroupedSelector = (s9) => {
  const selectedShapes = s9.pageState.selectedIds.map((id) => s9.page.shapes[id]);
  return selectedShapes.every((shape) => shape.children !== void 0 || shape.parentId === selectedShapes[0].parentId && selectedShapes[0].parentId !== s9.appState.currentPageId);
};
var hasSelectionSelector = (s9) => s9.pageState.selectedIds.length > 0;
var hasMultipleSelectionSelector = (s9) => s9.pageState.selectedIds.length > 1;
var ShapesFunctions = React22.memo(() => {
  const {tlstate, useSelector} = useTLDrawContext();
  const isAllLocked = useSelector(isAllLockedSelector);
  const isAllAspectLocked = useSelector(isAllAspectLockedSelector);
  const isAllGrouped = useSelector(isAllGroupedSelector);
  const hasSelection = useSelector(hasSelectionSelector);
  const hasMultipleSelection = useSelector(hasMultipleSelectionSelector);
  const handleRotate = React22.useCallback(() => {
    tlstate.rotate();
  }, [tlstate]);
  const handleDuplicate = React22.useCallback(() => {
    tlstate.duplicate();
  }, [tlstate]);
  const handleToggleLocked = React22.useCallback(() => {
    tlstate.toggleLocked();
  }, [tlstate]);
  const handleToggleAspectRatio = React22.useCallback(() => {
    tlstate.toggleAspectRatioLocked();
  }, [tlstate]);
  const handleGroup = React22.useCallback(() => {
    tlstate.group();
  }, [tlstate]);
  const handleMoveToBack = React22.useCallback(() => {
    tlstate.moveToBack();
  }, [tlstate]);
  const handleMoveBackward = React22.useCallback(() => {
    tlstate.moveBackward();
  }, [tlstate]);
  const handleMoveForward = React22.useCallback(() => {
    tlstate.moveForward();
  }, [tlstate]);
  const handleMoveToFront = React22.useCallback(() => {
    tlstate.moveToFront();
  }, [tlstate]);
  const handleDelete = React22.useCallback(() => {
    tlstate.delete();
  }, [tlstate]);
  return /* @__PURE__ */ React22.createElement(React22.Fragment, null, /* @__PURE__ */ React22.createElement(ButtonsRow, null, /* @__PURE__ */ React22.createElement(IconButton, {
    bp: breakpoints,
    disabled: !hasSelection,
    size: "small",
    onClick: handleDuplicate
  }, /* @__PURE__ */ React22.createElement(Tooltip2, {
    label: "Duplicate",
    kbd: `#D`
  }, /* @__PURE__ */ React22.createElement(CopyIcon, null))), /* @__PURE__ */ React22.createElement(IconButton, {
    disabled: !hasSelection,
    size: "small",
    onClick: handleRotate
  }, /* @__PURE__ */ React22.createElement(Tooltip2, {
    label: "Rotate"
  }, /* @__PURE__ */ React22.createElement(RotateCounterClockwiseIcon, null))), /* @__PURE__ */ React22.createElement(IconButton, {
    bp: breakpoints,
    disabled: !hasSelection,
    size: "small",
    onClick: handleToggleLocked
  }, /* @__PURE__ */ React22.createElement(Tooltip2, {
    label: "Toogle Locked",
    kbd: `#L`
  }, isAllLocked ? /* @__PURE__ */ React22.createElement(LockClosedIcon, null) : /* @__PURE__ */ React22.createElement(LockOpen1Icon, {
    opacity: 0.4
  }))), /* @__PURE__ */ React22.createElement(IconButton, {
    bp: breakpoints,
    disabled: !hasSelection,
    size: "small",
    onClick: handleToggleAspectRatio
  }, /* @__PURE__ */ React22.createElement(Tooltip2, {
    label: "Toogle Aspect Ratio Lock"
  }, /* @__PURE__ */ React22.createElement(AspectRatioIcon, {
    opacity: isAllAspectLocked ? 1 : 0.4
  }))), /* @__PURE__ */ React22.createElement(IconButton, {
    bp: breakpoints,
    disabled: !isAllGrouped && !hasMultipleSelection,
    size: "small",
    onClick: handleGroup
  }, /* @__PURE__ */ React22.createElement(Tooltip2, {
    label: "Group",
    kbd: `#G`
  }, /* @__PURE__ */ React22.createElement(GroupIcon, {
    opacity: isAllGrouped ? 1 : 0.4
  })))), /* @__PURE__ */ React22.createElement(ButtonsRow, null, /* @__PURE__ */ React22.createElement(IconButton, {
    bp: breakpoints,
    disabled: !hasSelection,
    size: "small",
    onClick: handleMoveToBack
  }, /* @__PURE__ */ React22.createElement(Tooltip2, {
    label: "Move to Back",
    kbd: `#\u21E7[`
  }, /* @__PURE__ */ React22.createElement(PinBottomIcon, null))), /* @__PURE__ */ React22.createElement(IconButton, {
    bp: breakpoints,
    disabled: !hasSelection,
    size: "small",
    onClick: handleMoveBackward
  }, /* @__PURE__ */ React22.createElement(Tooltip2, {
    label: "Move Backward",
    kbd: `#[`
  }, /* @__PURE__ */ React22.createElement(ArrowDownIcon, null))), /* @__PURE__ */ React22.createElement(IconButton, {
    bp: breakpoints,
    disabled: !hasSelection,
    size: "small",
    onClick: handleMoveForward
  }, /* @__PURE__ */ React22.createElement(Tooltip2, {
    label: "Move Forward",
    kbd: `#]`
  }, /* @__PURE__ */ React22.createElement(ArrowUpIcon, null))), /* @__PURE__ */ React22.createElement(IconButton, {
    bp: breakpoints,
    disabled: !hasSelection,
    size: "small",
    onClick: handleMoveToFront
  }, /* @__PURE__ */ React22.createElement(Tooltip2, {
    label: "More to Front",
    kbd: `#\u21E7]`
  }, /* @__PURE__ */ React22.createElement(PinTopIcon, null))), /* @__PURE__ */ React22.createElement(IconButton, {
    bp: breakpoints,
    disabled: !hasSelection,
    size: "small",
    onClick: handleDelete
  }, /* @__PURE__ */ React22.createElement(Tooltip2, {
    label: "Delete",
    kbd: "\u232B"
  }, /* @__PURE__ */ React22.createElement(trash_default, null)))));
});

// src/components/style-panel/align-distribute.tsx
var React23 = __toModule(require("react"));
var AlignDistribute = React23.memo(({hasTwoOrMore, hasThreeOrMore}) => {
  const {tlstate} = useTLDrawContext();
  const alignTop = React23.useCallback(() => {
    tlstate.align(AlignType.Top);
  }, [tlstate]);
  const alignCenterVertical = React23.useCallback(() => {
    tlstate.align(AlignType.CenterVertical);
  }, [tlstate]);
  const alignBottom = React23.useCallback(() => {
    tlstate.align(AlignType.Bottom);
  }, [tlstate]);
  const stretchVertically = React23.useCallback(() => {
    tlstate.stretch(StretchType.Vertical);
  }, [tlstate]);
  const distributeVertically = React23.useCallback(() => {
    tlstate.distribute(DistributeType.Vertical);
  }, [tlstate]);
  const alignLeft = React23.useCallback(() => {
    tlstate.align(AlignType.Left);
  }, [tlstate]);
  const alignCenterHorizontal = React23.useCallback(() => {
    tlstate.align(AlignType.CenterHorizontal);
  }, [tlstate]);
  const alignRight = React23.useCallback(() => {
    tlstate.align(AlignType.Right);
  }, [tlstate]);
  const stretchHorizontally = React23.useCallback(() => {
    tlstate.stretch(StretchType.Horizontal);
  }, [tlstate]);
  const distributeHorizontally = React23.useCallback(() => {
    tlstate.distribute(DistributeType.Horizontal);
  }, [tlstate]);
  return /* @__PURE__ */ React23.createElement(React23.Fragment, null, /* @__PURE__ */ React23.createElement(ButtonsRow, null, /* @__PURE__ */ React23.createElement(IconButton, {
    bp: breakpoints,
    size: "small",
    disabled: !hasTwoOrMore,
    onClick: alignLeft
  }, /* @__PURE__ */ React23.createElement(AlignLeftIcon, null)), /* @__PURE__ */ React23.createElement(IconButton, {
    bp: breakpoints,
    size: "small",
    disabled: !hasTwoOrMore,
    onClick: alignCenterHorizontal
  }, /* @__PURE__ */ React23.createElement(AlignCenterHorizontallyIcon, null)), /* @__PURE__ */ React23.createElement(IconButton, {
    bp: breakpoints,
    size: "small",
    disabled: !hasTwoOrMore,
    onClick: alignRight
  }, /* @__PURE__ */ React23.createElement(AlignRightIcon, null)), /* @__PURE__ */ React23.createElement(IconButton, {
    bp: breakpoints,
    size: "small",
    disabled: !hasTwoOrMore,
    onClick: stretchHorizontally
  }, /* @__PURE__ */ React23.createElement(StretchHorizontallyIcon, null)), /* @__PURE__ */ React23.createElement(IconButton, {
    bp: breakpoints,
    size: "small",
    disabled: !hasThreeOrMore,
    onClick: distributeHorizontally
  }, /* @__PURE__ */ React23.createElement(SpaceEvenlyHorizontallyIcon, null))), /* @__PURE__ */ React23.createElement(ButtonsRow, null, /* @__PURE__ */ React23.createElement(IconButton, {
    bp: breakpoints,
    size: "small",
    disabled: !hasTwoOrMore,
    onClick: alignTop
  }, /* @__PURE__ */ React23.createElement(AlignTopIcon, null)), /* @__PURE__ */ React23.createElement(IconButton, {
    bp: breakpoints,
    size: "small",
    disabled: !hasTwoOrMore,
    onClick: alignCenterVertical
  }, /* @__PURE__ */ React23.createElement(AlignCenterVerticallyIcon, null)), /* @__PURE__ */ React23.createElement(IconButton, {
    bp: breakpoints,
    size: "small",
    disabled: !hasTwoOrMore,
    onClick: alignBottom
  }, /* @__PURE__ */ React23.createElement(AlignBottomIcon, null)), /* @__PURE__ */ React23.createElement(IconButton, {
    bp: breakpoints,
    size: "small",
    disabled: !hasTwoOrMore,
    onClick: stretchVertically
  }, /* @__PURE__ */ React23.createElement(StretchVerticallyIcon, null)), /* @__PURE__ */ React23.createElement(IconButton, {
    bp: breakpoints,
    size: "small",
    disabled: !hasThreeOrMore,
    onClick: distributeVertically
  }, /* @__PURE__ */ React23.createElement(SpaceEvenlyVerticallyIcon, null))));
});

// src/components/style-panel/quick-color-select.tsx
var React25 = __toModule(require("react"));

// src/components/style-panel/shared.tsx
var React24 = __toModule(require("react"));
var StyleDropdownContent = styles_default("div", {
  display: "grid",
  padding: 4,
  gridTemplateColumns: "repeat(4, 1fr)",
  backgroundColor: "$panel",
  borderRadius: 4,
  border: "1px solid $panel",
  boxShadow: "$4",
  variants: {
    direction: {
      vertical: {
        gridTemplateColumns: "1fr"
      }
    }
  }
});
var StyleDropdownItem = styles_default("button", {
  height: "32px",
  width: "32px",
  backgroundColor: "$panel",
  borderRadius: "4px",
  padding: "0",
  margin: "0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  outline: "none",
  border: "none",
  pointerEvents: "all",
  cursor: "pointer",
  "&:focus": {
    backgroundColor: "$hover"
  },
  "&:hover:not(:disabled)": {
    backgroundColor: "$hover"
  },
  "&:disabled": {
    opacity: "0.5"
  },
  variants: {
    isActive: {
      true: {
        "& svg": {
          fill: "$text",
          stroke: "$text"
        }
      },
      false: {
        "& svg": {
          fill: "$inactive",
          stroke: "$inactive"
        }
      }
    }
  }
});
function BoxIcon({
  fill = "none",
  stroke = "currentColor"
}) {
  return /* @__PURE__ */ React24.createElement("svg", {
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    stroke,
    fill,
    xmlns: "http://www.w3.org/2000/svg"
  }, /* @__PURE__ */ React24.createElement("rect", {
    x: "4",
    y: "4",
    width: "16",
    height: "16",
    rx: "2",
    strokeWidth: "2"
  }));
}
function DashSolidIcon() {
  return /* @__PURE__ */ React24.createElement("svg", {
    width: "24",
    height: "24",
    stroke: "currentColor",
    xmlns: "http://www.w3.org/2000/svg"
  }, /* @__PURE__ */ React24.createElement("circle", {
    cx: 12,
    cy: 12,
    r: 8,
    fill: "none",
    strokeWidth: 2,
    strokeLinecap: "round"
  }));
}
function DashDashedIcon() {
  return /* @__PURE__ */ React24.createElement("svg", {
    width: "24",
    height: "24",
    stroke: "currentColor",
    xmlns: "http://www.w3.org/2000/svg"
  }, /* @__PURE__ */ React24.createElement("circle", {
    cx: 12,
    cy: 12,
    r: 8,
    fill: "none",
    strokeWidth: 2.5,
    strokeLinecap: "round",
    strokeDasharray: 50.26548 * 0.1
  }));
}
var dottedDasharray = `${50.26548 * 0.025} ${50.26548 * 0.1}`;
function DashDottedIcon() {
  return /* @__PURE__ */ React24.createElement("svg", {
    width: "24",
    height: "24",
    stroke: "currentColor",
    xmlns: "http://www.w3.org/2000/svg"
  }, /* @__PURE__ */ React24.createElement("circle", {
    cx: 12,
    cy: 12,
    r: 8,
    fill: "none",
    strokeWidth: 2.5,
    strokeLinecap: "round",
    strokeDasharray: dottedDasharray
  }));
}
function DashDrawIcon() {
  return /* @__PURE__ */ React24.createElement("svg", {
    width: "24",
    height: "24",
    viewBox: "1 1.5 21 22",
    fill: "currentColor",
    stroke: "currentColor",
    xmlns: "http://www.w3.org/2000/svg"
  }, /* @__PURE__ */ React24.createElement("path", {
    d: "M10.0162 19.2768C10.0162 19.2768 9.90679 19.2517 9.6879 19.2017C9.46275 19.1454 9.12816 19.0422 8.68413 18.8921C8.23384 18.7358 7.81482 18.545 7.42707 18.3199C7.03307 18.101 6.62343 17.7883 6.19816 17.3818C5.77289 16.9753 5.33511 16.3718 4.88482 15.5713C4.43453 14.7645 4.1531 13.8545 4.04053 12.8414C3.92795 11.822 4.04991 10.8464 4.40639 9.91451C4.76286 8.98266 5.39452 8.10084 6.30135 7.26906C7.21444 6.44353 8.29325 5.83377 9.5378 5.43976C10.7823 5.05202 11.833 4.92068 12.6898 5.04576C13.5466 5.16459 14.3878 5.43664 15.2133 5.86191C16.0388 6.28718 16.7768 6.8688 17.4272 7.60678C18.0714 8.34475 18.5404 9.21406 18.8344 10.2147C19.1283 11.2153 19.1721 12.2598 18.9657 13.348C18.7593 14.4299 18.2872 15.4337 17.5492 16.3593C16.8112 17.2849 15.9263 18.0072 14.8944 18.5263C13.8624 19.0391 12.9056 19.3174 12.0238 19.3612C11.142 19.405 10.2101 19.2705 9.22823 18.9578C8.24635 18.6451 7.35828 18.151 6.56402 17.4756C5.77601 16.8002 6.08871 16.8658 7.50212 17.6726C8.90927 18.4731 10.1444 18.8484 11.2076 18.7983C12.2645 18.7545 13.2965 18.4825 14.3034 17.9822C15.3102 17.4819 16.1264 16.8221 16.7518 16.0028C17.3772 15.1835 17.7681 14.3111 17.9244 13.3855C18.0808 12.4599 18.0401 11.5781 17.8025 10.74C17.5586 9.902 17.1739 9.15464 16.6486 8.49797C16.1233 7.8413 15.2289 7.27844 13.9656 6.80939C12.7086 6.34034 11.4203 6.20901 10.1007 6.41539C8.78732 6.61552 7.69599 7.06893 6.82669 7.77564C5.96363 8.48859 5.34761 9.26409 4.97863 10.1021C4.60964 10.9402 4.45329 11.8376 4.50958 12.7945C4.56586 13.7513 4.79101 14.6238 5.18501 15.4118C5.57276 16.1998 5.96363 16.8002 6.35764 17.2129C6.75164 17.6257 7.13313 17.9509 7.50212 18.1886C7.87736 18.4325 8.28074 18.642 8.71227 18.8171C9.15005 18.9922 9.47839 19.111 9.69728 19.1736C9.91617 19.2361 10.0256 19.2705 10.0256 19.2768H10.0162Z",
    strokeWidth: "2"
  }));
}
function IsFilledFillIcon() {
  return /* @__PURE__ */ React24.createElement("svg", {
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    stroke: "currentColor",
    xmlns: "http://www.w3.org/2000/svg"
  }, /* @__PURE__ */ React24.createElement("path", {
    d: "M2.6168 11.1303C2.6168 11.1303 2.7023 11.0131 2.8733 10.7788C3.0443 10.5444 3.1298 10.4272 3.1298 10.4272C3.1298 10.4272 3.23333 10.2823 3.4404 9.99236C3.64746 9.70246 3.85889 9.40341 4.0747 9.09521C4.2905 8.78701 4.50606 8.47574 4.72139 8.16141C4.93671 7.84708 5.14338 7.54139 5.3414 7.24432C5.53943 6.94726 5.72068 6.67162 5.88517 6.41742C6.04966 6.16321 6.2116 5.91477 6.37099 5.67211C6.53038 5.42944 6.69528 5.18806 6.86568 4.94796C7.03608 4.70786 7.21694 4.4699 7.40824 4.23409C7.59955 3.99828 7.81063 3.76287 8.0415 3.52787C8.27236 3.29286 8.71114 3.0267 9.35782 2.72937C10.0045 2.43203 10.4713 2.35281 10.7581 2.49169C11.045 2.63057 11.2637 2.84049 11.4141 3.12146C11.5645 3.40243 11.618 3.70079 11.5746 4.01653C11.5312 4.33227 11.4627 4.59891 11.3691 4.81646C11.2756 5.03401 11.0858 5.43918 10.7998 6.03199C10.5139 6.62479 10.2122 7.17617 9.89499 7.68612C9.57773 8.19607 9.25048 8.71529 8.91323 9.24379C8.57598 9.77229 8.24193 10.3038 7.91107 10.8382C7.58021 11.3726 7.2828 11.8729 7.01885 12.339C6.75489 12.8051 6.53711 13.2259 6.36552 13.6014C6.19393 13.977 6.0132 14.3951 5.82332 14.8557C5.63344 15.3163 5.43771 15.617 5.23612 15.7578C5.03453 15.8986 4.80537 15.7993 4.54865 15.4599C4.29193 15.1205 4.11244 14.8722 4.0102 14.7148C3.90796 14.5575 3.97008 14.3802 4.19657 14.183C4.42306 13.9858 4.69016 13.7584 4.99789 13.5009C5.30561 13.2434 5.64245 12.9617 6.00839 12.6559C6.37434 12.35 6.67617 12.0967 6.91389 11.8958C7.15161 11.695 7.39026 11.4926 7.62985 11.2885C7.86944 11.0844 8.15332 10.8467 8.48148 10.5754C8.80965 10.3042 9.23907 9.9577 9.76972 9.53604C10.3004 9.11439 10.867 8.66604 11.4695 8.19102C12.072 7.71599 12.6869 7.22975 13.3142 6.73229C13.9415 6.23483 14.5741 5.73378 15.2121 5.22914C15.85 4.7245 16.4168 4.26953 16.9125 3.86423C17.4081 3.45892 17.7739 3.14715 18.0099 2.92891C18.2459 2.71066 18.5969 2.50912 19.0631 2.32427C19.5292 2.13942 19.8754 2.10947 20.1017 2.23443C20.328 2.35939 20.4959 2.53892 20.6056 2.77302C20.7152 3.00712 20.7455 3.25108 20.6966 3.50489C20.6477 3.75871 20.6108 3.93537 20.5859 4.03487C20.561 4.13437 20.4998 4.32304 20.4023 4.60088C20.3047 4.87872 20.1621 5.17449 19.9745 5.4882C19.7869 5.80191 19.576 6.14669 19.3419 6.52256C19.1078 6.89842 18.9086 7.21331 18.7443 7.46722C18.58 7.72113 18.4142 7.9759 18.2469 8.23153C18.0796 8.48716 17.8836 8.77861 17.6588 9.10588C17.434 9.43316 17.1448 9.84205 16.7912 10.3326C16.4376 10.8231 16.0659 11.342 15.676 11.8893C15.2862 12.4365 14.9001 12.9968 14.5178 13.5701C14.1356 14.1435 13.7682 14.7264 13.4159 15.3191C13.0635 15.9118 12.7579 16.4671 12.4989 16.985C12.24 17.503 12.0533 17.9527 11.9389 18.3342C11.8244 18.7156 11.7224 19.1347 11.6326 19.5912C11.5429 20.0477 11.3788 20.6043 11.1402 21.2609C10.9016 21.9175 10.6425 22.299 10.3629 22.4054C10.0832 22.5118 9.79895 22.5258 9.51015 22.4475C9.22136 22.3692 8.98315 22.2135 8.79554 21.9804C8.60793 21.7473 8.53141 21.5443 8.56597 21.3714C8.60054 21.1985 8.6805 20.9055 8.80586 20.4924C8.93122 20.0794 9.10654 19.7322 9.33182 19.4511C9.55709 19.17 9.8396 18.8347 10.1793 18.4454C10.5191 18.056 10.8588 17.6756 11.1985 17.3041C11.5381 16.9326 11.8676 16.5798 12.1871 16.2457C12.5065 15.9117 12.8481 15.5592 13.2121 15.1882C13.576 14.8173 13.9567 14.4418 14.3542 14.0616C14.7517 13.6814 15.1666 13.3082 15.599 12.9418C16.0313 12.5755 16.437 12.2489 16.8159 11.962C17.1948 11.6752 17.5102 11.4423 17.762 11.2634C18.0138 11.0844 18.3084 10.8902 18.6457 10.6807C18.983 10.4711 19.3744 10.3243 19.82 10.2401C20.2656 10.1559 20.6534 10.2693 20.9834 10.5803C21.3134 10.8913 21.4496 11.2717 21.392 11.7215C21.3344 12.1713 21.1067 12.5051 20.7089 12.7229C20.3112 12.9406 19.9073 12.9526 19.4973 12.7588C19.0873 12.565 18.8402 12.2453 18.7561 11.7997C18.6719 11.3541 18.7853 10.9663 19.0963 10.6363C19.4073 10.3063 19.7877 10.1701 20.2375 10.2277C20.6873 10.2853 21.0211 10.513 21.2388 10.9108C21.4566 11.3086 21.4686 11.7124 21.2748 12.1224C21.081 12.5324 20.8095 12.8344 20.4603 13.0286C20.1111 13.2227 19.8038 13.4005 19.5384 13.5619C19.273 13.7233 18.9732 13.9304 18.6387 14.1834C18.3043 14.4364 17.9499 14.7309 17.5755 15.0671C17.201 15.4032 16.8338 15.7568 16.4739 16.1278C16.114 16.4987 15.762 16.8738 15.418 17.253C15.0741 17.6321 14.7467 17.9939 14.4358 18.3383C14.125 18.6826 13.8006 19.0346 13.4627 19.3941C13.1248 19.7537 12.7843 20.1151 12.4411 20.4784C12.0979 20.8417 11.7811 21.1784 11.4907 21.4885C11.2003 21.7987 11.0097 22.0025 10.9187 22.0998C10.8278 22.1971 10.6425 22.299 10.3629 22.4054C10.0832 22.5118 9.79895 22.5258 9.51015 22.4475C9.22136 22.3692 8.98315 22.2135 8.79554 21.9804C8.60793 21.7473 8.56361 21.2915 8.6626 20.6129C8.76158 19.9344 8.86025 19.4336 8.95861 19.1104C9.05697 18.7873 9.15977 18.4792 9.267 18.186C9.37423 17.8929 9.51059 17.5722 9.67609 17.2241C9.84159 16.8759 10.0617 16.4208 10.3365 15.8586C10.6113 15.2963 10.9173 14.6928 11.2544 14.0481C11.5915 13.4033 11.9371 12.7709 12.2911 12.1509C12.645 11.5309 12.9985 10.928 13.3515 10.3421C13.7045 9.75628 14.043 9.20593 14.3669 8.6911C14.6908 8.17628 14.9637 7.75371 15.1856 7.42339C15.4075 7.09308 15.6064 6.80362 15.7825 6.55501C15.9585 6.3064 16.1337 6.06006 16.3078 5.81598C16.482 5.5719 16.6533 5.33288 16.8217 5.09891C16.9901 4.86494 17.216 4.59736 17.4993 4.29615C17.7826 3.99495 18.1463 3.6271 18.5904 3.1926C19.0345 2.7581 19.3409 2.45855 19.5094 2.29392C19.678 2.1293 19.8754 2.10947 20.1017 2.23443C20.328 2.35939 20.4959 2.53892 20.6056 2.77302C20.7152 3.00712 20.7455 3.25108 20.6966 3.50489C20.6477 3.75871 20.3584 4.05693 19.8288 4.39957C19.2993 4.7422 18.7953 5.11711 18.3168 5.52431C17.8384 5.93151 17.3057 6.40907 16.7189 6.95701C16.1321 7.50495 15.554 8.0585 14.9846 8.61766C14.4151 9.17682 13.8571 9.72936 13.3104 10.2753C12.7637 10.8212 12.2439 11.3334 11.7509 11.8119C11.258 12.2905 10.8516 12.6747 10.5319 12.9645C10.2122 13.2543 9.93102 13.503 9.68844 13.7105C9.44586 13.918 9.20376 14.1242 8.96214 14.329C8.72051 14.5339 8.41222 14.7917 8.03728 15.1027C7.66233 15.4136 7.3052 15.7042 6.96587 15.9744C6.62655 16.2447 6.30615 16.4867 6.00468 16.7005C5.70321 16.9143 5.4028 17.1012 5.10345 17.2611C4.8041 17.421 4.46527 17.4827 4.08697 17.4462C3.70867 17.4098 3.36157 17.209 3.04566 16.8439C2.72975 16.4788 2.5775 16.0785 2.58891 15.6432C2.60033 15.2079 2.70674 14.7684 2.90815 14.3248C3.10956 13.8811 3.29546 13.4939 3.46586 13.163C3.63625 12.832 3.80799 12.5116 3.98107 12.2016C4.15415 11.8916 4.37223 11.4904 4.6353 10.9979C4.89838 10.5055 5.18148 9.97864 5.48461 9.41727C5.78773 8.8559 6.08723 8.30477 6.3831 7.7639C6.67898 7.22302 6.96213 6.69976 7.23257 6.19412C7.50301 5.68847 7.75585 5.24404 7.99109 4.86081C8.22633 4.47759 8.57505 4.04675 9.03725 3.56831C9.49946 3.08987 9.8301 2.7561 10.0292 2.56701C10.2283 2.37791 10.4713 2.35281 10.7581 2.49169C11.045 2.63057 11.2637 2.84049 11.4141 3.12146C11.5645 3.40243 11.618 3.70079 11.5746 4.01653C11.5312 4.33227 11.1439 4.77278 10.4128 5.33807C9.68173 5.90336 9.17886 6.30718 8.90421 6.54953C8.62955 6.79188 8.38273 7.01366 8.16374 7.21485C7.94475 7.41605 7.71551 7.6216 7.47603 7.83151C7.23655 8.04141 6.97229 8.26391 6.68326 8.49901C6.39423 8.7341 6.09233 8.96876 5.77756 9.20297C5.46279 9.43719 5.1469 9.6616 4.8299 9.87622C4.5129 10.0908 4.20211 10.2932 3.89753 10.4834L2.6168 11.1303Z",
    strokeWidth: "0.5",
    strokeLinecap: "round"
  }));
}

// src/components/style-panel/quick-color-select.tsx
var selectColor = (data) => data.appState.selectedStyle.color;
var QuickColorSelect = React25.memo(() => {
  const {theme: theme2} = useTheme();
  const {tlstate, useSelector} = useTLDrawContext();
  const color = useSelector(selectColor);
  const handleColorChange = React25.useCallback((color2) => {
    tlstate.style({color: color2});
  }, [tlstate]);
  return /* @__PURE__ */ React25.createElement(Root7, {
    dir: "ltr"
  }, /* @__PURE__ */ React25.createElement(DropdownMenuIconTriggerButton, {
    label: "Color"
  }, /* @__PURE__ */ React25.createElement(BoxIcon, {
    fill: strokes[theme2][color],
    stroke: strokes[theme2][color]
  })), /* @__PURE__ */ React25.createElement(Content5, {
    sideOffset: 8
  }, /* @__PURE__ */ React25.createElement(DropdownMenuRadioGroup, {
    value: color,
    onValueChange: handleColorChange,
    as: StyleDropdownContent
  }, Object.keys(strokes[theme2]).map((colorStyle) => /* @__PURE__ */ React25.createElement(DropdownMenuRadioItem, {
    as: StyleDropdownItem,
    key: colorStyle,
    title: colorStyle,
    value: colorStyle
  }, /* @__PURE__ */ React25.createElement(BoxIcon, {
    fill: strokes[theme2][colorStyle],
    stroke: strokes[theme2][colorStyle]
  }))))));
});

// src/components/style-panel/quick-size-select.tsx
var React26 = __toModule(require("react"));
var sizes = {
  [SizeStyle.Small]: 6,
  [SizeStyle.Medium]: 12,
  [SizeStyle.Large]: 22
};
var selectSize = (data) => data.appState.selectedStyle.size;
var QuickSizeSelect = React26.memo(() => {
  const {tlstate, useSelector} = useTLDrawContext();
  const size = useSelector(selectSize);
  const changeSizeStyle = React26.useCallback((size2) => {
    tlstate.style({size: size2});
  }, [tlstate]);
  return /* @__PURE__ */ React26.createElement(Root7, {
    dir: "ltr"
  }, /* @__PURE__ */ React26.createElement(DropdownMenuIconTriggerButton, {
    label: "Size"
  }, /* @__PURE__ */ React26.createElement(CircleIcon2, {
    size: sizes[size],
    stroke: "none",
    fill: "currentColor"
  })), /* @__PURE__ */ React26.createElement(Content5, {
    sideOffset: 8
  }, /* @__PURE__ */ React26.createElement(DropdownMenuRadioGroup, {
    as: StyleDropdownContent,
    direction: "vertical",
    value: size,
    onValueChange: changeSizeStyle
  }, Object.keys(SizeStyle).map((sizeStyle) => /* @__PURE__ */ React26.createElement(DropdownMenuRadioItem, {
    key: sizeStyle,
    as: StyleDropdownItem,
    isActive: size === sizeStyle,
    value: sizeStyle
  }, /* @__PURE__ */ React26.createElement(CircleIcon2, {
    size: sizes[sizeStyle]
  }))))));
});

// src/components/style-panel/quick-dash-select.tsx
var React27 = __toModule(require("react"));
var dashes = {
  [DashStyle.Draw]: /* @__PURE__ */ React27.createElement(DashDrawIcon, null),
  [DashStyle.Solid]: /* @__PURE__ */ React27.createElement(DashSolidIcon, null),
  [DashStyle.Dashed]: /* @__PURE__ */ React27.createElement(DashDashedIcon, null),
  [DashStyle.Dotted]: /* @__PURE__ */ React27.createElement(DashDottedIcon, null)
};
var selectDash = (data) => data.appState.selectedStyle.dash;
var QuickDashSelect = React27.memo(() => {
  const {tlstate, useSelector} = useTLDrawContext();
  const dash = useSelector(selectDash);
  const changeDashStyle = React27.useCallback((dash2) => {
    tlstate.style({dash: dash2});
  }, [tlstate]);
  return /* @__PURE__ */ React27.createElement(Root7, {
    dir: "ltr"
  }, /* @__PURE__ */ React27.createElement(DropdownMenuIconTriggerButton, {
    label: "Dash"
  }, dashes[dash]), /* @__PURE__ */ React27.createElement(Content5, {
    sideOffset: 8
  }, /* @__PURE__ */ React27.createElement(DropdownMenuRadioGroup, {
    as: StyleDropdownContent,
    direction: "vertical",
    value: dash,
    onValueChange: changeDashStyle
  }, Object.keys(DashStyle).map((dashStyle) => /* @__PURE__ */ React27.createElement(DropdownMenuRadioItem, {
    as: StyleDropdownItem,
    key: dashStyle,
    isActive: dash === dashStyle,
    value: dashStyle
  }, dashes[dashStyle])))));
});

// src/components/style-panel/quick-fill-select.tsx
var React28 = __toModule(require("react"));

// ../../node_modules/@radix-ui/react-checkbox/dist/index.module.js
var d7 = __toModule(require("react"));
var u5 = "button";
var [p7, m7] = createContext4("Checkbox");
var Checkbox = /* @__PURE__ */ d7.forwardRef((t14, o13) => {
  const {as: a6 = u5, "aria-labelledby": c7, name: m8, checked: b5, defaultChecked: k4, required: C6, disabled: v6, value: y5 = "on", onCheckedChange: E4, ...g5} = t14, [w5, I4] = d7.useState(null), R4 = useComposedRefs(o13, (e14) => I4(e14)), P3 = useLabelContext(w5), q2 = c7 || P3, M3 = d7.useRef(false), O4 = !w5 || Boolean(w5.closest("form")), [S3 = false, j2] = useControllableState({prop: b5, defaultProp: k4, onChange: E4});
  return d7.createElement(p7, {state: S3, disabled: v6}, /* @__PURE__ */ d7.createElement(Primitive, _extends({type: "button", role: "checkbox", "aria-checked": x5(S3) ? "mixed" : S3, "aria-labelledby": q2, "aria-required": C6, "data-state": h4(S3), "data-disabled": v6 ? "" : void 0, disabled: v6, value: y5}, g5, {as: a6, ref: R4, onClick: composeEventHandlers(t14.onClick, (e14) => {
    j2((e15) => !!x5(e15) || !e15), O4 && (M3.current = e14.isPropagationStopped(), M3.current || e14.stopPropagation());
  })})), O4 && /* @__PURE__ */ d7.createElement(f6, {control: w5, bubbles: !M3.current, name: m8, value: y5, checked: S3, required: C6, disabled: v6, style: {transform: "translateX(-100%)"}}));
});
var b4 = "span";
var CheckboxIndicator = /* @__PURE__ */ d7.forwardRef((r11, o13) => {
  const {as: a6 = b4, forceMount: n5, ...i6} = r11, c7 = m7("CheckboxIndicator");
  return d7.createElement(Presence, {present: n5 || x5(c7.state) || c7.state === true}, /* @__PURE__ */ d7.createElement(Primitive, _extends({"data-state": h4(c7.state), "data-disabled": c7.disabled ? "" : void 0}, i6, {as: a6, ref: o13, style: {pointerEvents: "none", ...r11.style}})));
});
var f6 = (e14) => {
  const {control: t14, checked: r11, bubbles: n5 = true, ...i6} = e14, c7 = d7.useRef(null), s9 = usePrevious(r11), u6 = useSize(t14);
  return d7.useEffect(() => {
    const e15 = c7.current, t15 = window.HTMLInputElement.prototype, o13 = Object.getOwnPropertyDescriptor(t15, "checked").set;
    if (s9 !== r11 && o13) {
      const t16 = new Event("click", {bubbles: n5});
      e15.indeterminate = x5(r11), o13.call(e15, !x5(r11) && r11), e15.dispatchEvent(t16);
    }
  }, [s9, r11, n5]), /* @__PURE__ */ d7.createElement("input", _extends({type: "checkbox", defaultChecked: !x5(r11) && r11}, i6, {tabIndex: -1, ref: c7, style: {...e14.style, ...u6, position: "absolute", pointerEvents: "none", opacity: 0, margin: 0}}));
};
function x5(e14) {
  return e14 === "indeterminate";
}
function h4(e14) {
  return x5(e14) ? "indeterminate" : e14 ? "checked" : "unchecked";
}
var Root9 = Checkbox;
var Indicator = CheckboxIndicator;

// src/components/style-panel/quick-fill-select.tsx
var isFilledSelector = (data) => data.appState.selectedStyle.isFilled;
var QuickFillSelect = React28.memo(() => {
  const {tlstate, useSelector} = useTLDrawContext();
  const isFilled = useSelector(isFilledSelector);
  const handleIsFilledChange = React28.useCallback((isFilled2) => {
    tlstate.style({isFilled: isFilled2});
  }, [tlstate]);
  return /* @__PURE__ */ React28.createElement(Root9, {
    dir: "ltr",
    as: IconButton,
    bp: breakpoints,
    checked: isFilled,
    onCheckedChange: handleIsFilledChange
  }, /* @__PURE__ */ React28.createElement(Tooltip2, {
    label: "Fill"
  }, /* @__PURE__ */ React28.createElement(IconWrapper, null, /* @__PURE__ */ React28.createElement(BoxIcon, null), /* @__PURE__ */ React28.createElement(Indicator, null, /* @__PURE__ */ React28.createElement(IsFilledFillIcon, null)))));
});

// src/components/style-panel/style-panel.tsx
var import_core11 = __toModule(require_cjs());
var isStyleOpenSelector = (s9) => s9.appState.isStyleOpen;
function StylePanel() {
  const {tlstate, useSelector} = useTLDrawContext();
  const isOpen = useSelector(isStyleOpenSelector);
  return /* @__PURE__ */ React29.createElement(FloatingContainer, {
    direction: "column"
  }, /* @__PURE__ */ React29.createElement(ButtonsRow, null, /* @__PURE__ */ React29.createElement(QuickColorSelect, null), /* @__PURE__ */ React29.createElement(QuickSizeSelect, null), /* @__PURE__ */ React29.createElement(QuickDashSelect, null), /* @__PURE__ */ React29.createElement(QuickFillSelect, null), /* @__PURE__ */ React29.createElement(IconButton, {
    bp: breakpoints,
    title: "Style",
    size: "small",
    onPointerDown: tlstate.toggleStylePanel
  }, /* @__PURE__ */ React29.createElement(Tooltip2, {
    label: isOpen ? "Close" : "More"
  }, isOpen ? /* @__PURE__ */ React29.createElement(Cross2Icon, null) : /* @__PURE__ */ React29.createElement(DotsHorizontalIcon, null)))), isOpen && /* @__PURE__ */ React29.createElement(SelectedShapeContent, null));
}
var showKbds = !import_core11.Utils.isMobile();
var selectedShapesCountSelector = (s9) => s9.pageState.selectedIds.length;
function SelectedShapeContent() {
  const {tlstate, useSelector} = useTLDrawContext();
  const selectedShapesCount = useSelector(selectedShapesCountSelector);
  const handleCopy = React29.useCallback(() => {
    tlstate.copy();
  }, [tlstate]);
  const handlePaste = React29.useCallback(() => {
    tlstate.paste();
  }, [tlstate]);
  const handleCopyAsSvg = React29.useCallback(() => {
    tlstate.copyAsSvg();
  }, [tlstate]);
  return /* @__PURE__ */ React29.createElement(React29.Fragment, null, /* @__PURE__ */ React29.createElement(Divider, null), /* @__PURE__ */ React29.createElement(ShapesFunctions, null), /* @__PURE__ */ React29.createElement(Divider, null), /* @__PURE__ */ React29.createElement(AlignDistribute, {
    hasTwoOrMore: selectedShapesCount > 1,
    hasThreeOrMore: selectedShapesCount > 2
  }), /* @__PURE__ */ React29.createElement(Divider, null), /* @__PURE__ */ React29.createElement(RowButton, {
    bp: breakpoints,
    disabled: selectedShapesCount === 0,
    onClick: handleCopy
  }, /* @__PURE__ */ React29.createElement("span", null, "Copy"), showKbds && /* @__PURE__ */ React29.createElement(Kbd, {
    variant: "menu"
  }, "#C")), /* @__PURE__ */ React29.createElement(RowButton, {
    bp: breakpoints,
    onClick: handlePaste
  }, /* @__PURE__ */ React29.createElement("span", null, "Paste"), showKbds && /* @__PURE__ */ React29.createElement(Kbd, {
    variant: "menu"
  }, "#V")), /* @__PURE__ */ React29.createElement(RowButton, {
    bp: breakpoints,
    onClick: handleCopyAsSvg
  }, /* @__PURE__ */ React29.createElement("span", null, "Copy to SVG"), showKbds && /* @__PURE__ */ React29.createElement(Kbd, {
    variant: "menu"
  }, "\u21E7#C")));
}

// src/components/tools-panel/tools-panel.tsx
var React35 = __toModule(require("react"));

// src/components/status-bar.tsx
var React30 = __toModule(require("react"));
var activeToolSelector = (s9) => s9.appState.activeTool;
function StatusBar() {
  const {useSelector} = useTLDrawContext();
  const activeTool = useSelector(activeToolSelector);
  return /* @__PURE__ */ React30.createElement(StatusBarContainer, {
    size: {"@sm": "small"}
  }, /* @__PURE__ */ React30.createElement(Section, null, activeTool));
}
var StatusBarContainer = styles_default("div", {
  height: 40,
  userSelect: "none",
  borderTop: "1px solid $border",
  gridArea: "status",
  display: "flex",
  color: "$text",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "$panel",
  gap: 8,
  fontFamily: "$ui",
  fontSize: "$0",
  padding: "0 16px",
  variants: {
    size: {
      small: {
        fontSize: "$1"
      }
    }
  }
});
var Section = styles_default("div", {
  whiteSpace: "nowrap",
  overflow: "hidden"
});

// src/components/tools-panel/shared.tsx
var React31 = __toModule(require("react"));
var ToolButton = styles_default("button", {
  position: "relative",
  height: "32px",
  width: "32px",
  color: "$text",
  backgroundColor: "$panel",
  borderRadius: "4px",
  padding: "0",
  margin: "0",
  display: "grid",
  alignItems: "center",
  justifyContent: "center",
  outline: "none",
  border: "none",
  pointerEvents: "all",
  fontSize: "$0",
  cursor: "pointer",
  "& > *": {
    gridRow: 1,
    gridColumn: 1
  },
  "&:disabled": {
    opacity: "0.5"
  },
  "& > span": {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center"
  }
});
var PrimaryToolButton = styles_default(ToolButton, {
  variants: {
    bp: {
      mobile: {
        height: 44,
        width: 44,
        "& svg:nth-of-type(1)": {
          height: "20px",
          width: "20px"
        }
      },
      small: {
        "&:hover:not(:disabled)": {
          backgroundColor: "$hover"
        }
      },
      medium: {},
      large: {}
    },
    isActive: {
      true: {
        color: "$selected"
      }
    }
  }
});
var SecondaryToolButton = styles_default(ToolButton, {
  variants: {
    bp: {
      mobile: {
        height: 44,
        width: 44,
        "& svg:nth-of-type(1)": {
          height: "18px",
          width: "18px"
        }
      },
      small: {
        "&:hover:not(:disabled)": {
          backgroundColor: "$hover"
        }
      },
      medium: {},
      large: {}
    },
    isActive: {
      true: {
        color: "$selected"
      }
    }
  }
});
var TertiaryToolButton = styles_default(ToolButton, {
  variants: {
    bp: {
      mobile: {
        height: 32,
        width: 44,
        "& svg:nth-of-type(1)": {
          height: "16px",
          width: "16px"
        }
      },
      small: {
        height: 40,
        width: 40,
        "& svg:nth-of-type(1)": {
          height: "18px",
          width: "18px"
        },
        "&:hover:not(:disabled)": {
          backgroundColor: "$hover"
        }
      },
      medium: {},
      large: {}
    }
  }
});
function PrimaryButton({
  label,
  kbd,
  onClick,
  onDoubleClick,
  isActive,
  children
}) {
  return /* @__PURE__ */ React31.createElement(Tooltip2, {
    label: label[0].toUpperCase() + label.slice(1),
    kbd
  }, /* @__PURE__ */ React31.createElement(PrimaryToolButton, {
    name: label,
    bp: {
      "@initial": "mobile",
      "@sm": "small",
      "@md": "medium",
      "@lg": "large"
    },
    onClick,
    onDoubleClick,
    isActive
  }, children));
}
function SecondaryButton({
  label,
  kbd,
  onClick,
  onDoubleClick,
  isActive,
  children
}) {
  return /* @__PURE__ */ React31.createElement(Tooltip2, {
    label: label[0].toUpperCase() + label.slice(1),
    kbd
  }, /* @__PURE__ */ React31.createElement(SecondaryToolButton, {
    name: label,
    bp: {
      "@initial": "mobile",
      "@sm": "small",
      "@md": "medium",
      "@lg": "large"
    },
    onClick,
    onDoubleClick,
    isActive
  }, children));
}
function TertiaryButton({
  label,
  kbd,
  onClick,
  onDoubleClick,
  children
}) {
  return /* @__PURE__ */ React31.createElement(Tooltip2, {
    label: label[0].toUpperCase() + label.slice(1),
    kbd
  }, /* @__PURE__ */ React31.createElement(TertiaryToolButton, {
    name: label,
    bp: {
      "@initial": "mobile",
      "@sm": "small",
      "@md": "medium",
      "@lg": "large"
    },
    onClick,
    onDoubleClick
  }, children));
}
var TertiaryButtonsContainer = styles_default(FloatingContainer, {
  boxShadow: "$3",
  variants: {
    bp: {
      mobile: {
        alignItems: "center",
        flexDirection: "column"
      },
      small: {
        alignItems: "center",
        flexDirection: "row"
      }
    }
  }
});

// src/components/tools-panel/undo-redo.tsx
var React32 = __toModule(require("react"));
var UndoRedo = React32.memo(() => {
  const {tlstate} = useTLDrawContext();
  const handleDelete = React32.useCallback(() => {
    tlstate.delete();
  }, [tlstate]);
  const handleClear = React32.useCallback(() => {
    tlstate.clear();
  }, [tlstate]);
  return /* @__PURE__ */ React32.createElement(TertiaryButtonsContainer, {
    bp: {"@initial": "mobile", "@sm": "small"}
  }, /* @__PURE__ */ React32.createElement(TertiaryButton, {
    label: "Undo",
    kbd: "#Z",
    onClick: tlstate.undo
  }, /* @__PURE__ */ React32.createElement(undo_default, null)), /* @__PURE__ */ React32.createElement(TertiaryButton, {
    label: "Redo",
    kbd: "#\u21E7",
    onClick: tlstate.redo
  }, /* @__PURE__ */ React32.createElement(redo_default, null)), /* @__PURE__ */ React32.createElement(TertiaryButton, {
    label: "Delete",
    kbd: "\u232B",
    onClick: handleDelete,
    onDoubleClick: handleClear
  }, /* @__PURE__ */ React32.createElement(trash_default, null)));
});

// src/components/tools-panel/zoom.tsx
var React33 = __toModule(require("react"));
var Zoom = React33.memo(() => {
  const {tlstate} = useTLDrawContext();
  return /* @__PURE__ */ React33.createElement(TertiaryButtonsContainer, {
    bp: {"@initial": "mobile", "@sm": "small"}
  }, /* @__PURE__ */ React33.createElement(TertiaryButton, {
    label: "Zoom Out",
    kbd: `#\u2212`,
    onClick: tlstate.zoomOut
  }, /* @__PURE__ */ React33.createElement(ZoomOutIcon, null)), /* @__PURE__ */ React33.createElement(TertiaryButton, {
    label: "Zoom In",
    kbd: `#+`,
    onClick: tlstate.zoomIn
  }, /* @__PURE__ */ React33.createElement(ZoomInIcon, null)), /* @__PURE__ */ React33.createElement(ZoomCounter, null));
});
var zoomSelector = (s9) => s9.pageState.camera.zoom;
function ZoomCounter() {
  const {tlstate, useSelector} = useTLDrawContext();
  const zoom = useSelector(zoomSelector);
  return /* @__PURE__ */ React33.createElement(TertiaryButton, {
    label: "Reset Zoom",
    kbd: "\u21E70",
    onClick: tlstate.zoomToActual,
    onDoubleClick: tlstate.zoomToFit
  }, Math.round(zoom * 100), "%");
}

// src/components/tools-panel/back-to-content.tsx
var React34 = __toModule(require("react"));
var isEmptyCanvasSelector = (s9) => Object.keys(s9.page.shapes).length > 0 && s9.appState.isEmptyCanvas;
var BackToContent = React34.memo(() => {
  const {tlstate, useSelector} = useTLDrawContext();
  const isEmptyCanvas = useSelector(isEmptyCanvasSelector);
  if (!isEmptyCanvas)
    return null;
  return /* @__PURE__ */ React34.createElement(BackToContentButton, null, /* @__PURE__ */ React34.createElement(RowButton, {
    onClick: tlstate.zoomToContent
  }, "Back to content"));
});
var BackToContentButton = styles_default(FloatingContainer, {
  pointerEvents: "all",
  width: "fit-content",
  gridRow: 1,
  flexGrow: 2,
  display: "block"
});

// src/components/tools-panel/tools-panel.tsx
var activeToolSelector2 = (s9) => s9.appState.activeTool;
var isToolLockedSelector = (s9) => s9.appState.isToolLocked;
var isDebugModeSelector2 = (s9) => s9.settings.isDebugMode;
var ToolsPanel = React35.memo(() => {
  const {tlstate, useSelector} = useTLDrawContext();
  const activeTool = useSelector(activeToolSelector2);
  const isToolLocked = useSelector(isToolLockedSelector);
  const isDebugMode = useSelector(isDebugModeSelector2);
  const selectSelectTool = React35.useCallback(() => {
    tlstate.selectTool("select");
  }, [tlstate]);
  const selectDrawTool = React35.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Draw);
  }, [tlstate]);
  const selectRectangleTool = React35.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Rectangle);
  }, [tlstate]);
  const selectEllipseTool = React35.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Ellipse);
  }, [tlstate]);
  const selectArrowTool = React35.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Arrow);
  }, [tlstate]);
  const selectTextTool = React35.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Text);
  }, [tlstate]);
  return /* @__PURE__ */ React35.createElement(ToolsPanelContainer, null, /* @__PURE__ */ React35.createElement(LeftWrap, {
    size: {"@initial": "mobile", "@sm": "small"}
  }, /* @__PURE__ */ React35.createElement(Zoom, null), /* @__PURE__ */ React35.createElement(FloatingContainer, null, /* @__PURE__ */ React35.createElement(SecondaryButton, {
    label: "Select",
    kbd: "1",
    onClick: selectSelectTool,
    isActive: activeTool === "select"
  }, /* @__PURE__ */ React35.createElement(CursorArrowIcon, null)))), /* @__PURE__ */ React35.createElement(CenterWrap, null, /* @__PURE__ */ React35.createElement(BackToContent, null), /* @__PURE__ */ React35.createElement(FloatingContainer, null, /* @__PURE__ */ React35.createElement(PrimaryButton, {
    kbd: "2",
    label: TLDrawShapeType.Draw,
    onClick: selectDrawTool,
    isActive: activeTool === TLDrawShapeType.Draw
  }, /* @__PURE__ */ React35.createElement(Pencil1Icon, null)), /* @__PURE__ */ React35.createElement(PrimaryButton, {
    kbd: "3",
    label: TLDrawShapeType.Rectangle,
    onClick: selectRectangleTool,
    isActive: activeTool === TLDrawShapeType.Rectangle
  }, /* @__PURE__ */ React35.createElement(SquareIcon, null)), /* @__PURE__ */ React35.createElement(PrimaryButton, {
    kbd: "4",
    label: TLDrawShapeType.Draw,
    onClick: selectEllipseTool,
    isActive: activeTool === TLDrawShapeType.Ellipse
  }, /* @__PURE__ */ React35.createElement(CircleIcon, null)), /* @__PURE__ */ React35.createElement(PrimaryButton, {
    kbd: "5",
    label: TLDrawShapeType.Arrow,
    onClick: selectArrowTool,
    isActive: activeTool === TLDrawShapeType.Arrow
  }, /* @__PURE__ */ React35.createElement(ArrowTopRightIcon, null)), /* @__PURE__ */ React35.createElement(PrimaryButton, {
    kbd: "6",
    label: TLDrawShapeType.Text,
    onClick: selectTextTool,
    isActive: activeTool === TLDrawShapeType.Text
  }, /* @__PURE__ */ React35.createElement(TextIcon, null)))), /* @__PURE__ */ React35.createElement(RightWrap, {
    size: {"@initial": "mobile", "@sm": "small"}
  }, /* @__PURE__ */ React35.createElement(FloatingContainer, null, /* @__PURE__ */ React35.createElement(SecondaryButton, {
    kbd: "7",
    label: "Lock Tool",
    onClick: tlstate.toggleToolLock,
    isActive: isToolLocked
  }, isToolLocked ? /* @__PURE__ */ React35.createElement(LockClosedIcon, null) : /* @__PURE__ */ React35.createElement(LockOpen1Icon, null))), /* @__PURE__ */ React35.createElement(UndoRedo, null)), /* @__PURE__ */ React35.createElement(StatusWrap, null, isDebugMode && /* @__PURE__ */ React35.createElement(StatusBar, null)));
});
var ToolsPanelContainer = styles_default("div", {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  padding: "0",
  alignItems: "flex-end",
  zIndex: 200,
  gridGap: "$4",
  gridRowGap: "$4",
  pointerEvents: "none",
  "& > div > *": {
    pointerEvents: "all"
  }
});
var CenterWrap = styles_default("div", {
  gridRow: 1,
  gridColumn: 2,
  display: "flex",
  width: "fit-content",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: 12
});
var LeftWrap = styles_default("div", {
  gridRow: 1,
  gridColumn: 1,
  display: "flex",
  paddingLeft: "$3",
  variants: {
    size: {
      mobile: {
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        "& > *:nth-of-type(1)": {
          marginBottom: "8px"
        }
      },
      small: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        "& > *:nth-of-type(1)": {
          marginBottom: "0px"
        }
      }
    }
  }
});
var RightWrap = styles_default("div", {
  gridRow: 1,
  gridColumn: 3,
  display: "flex",
  paddingRight: "$3",
  variants: {
    size: {
      mobile: {
        flexDirection: "column-reverse",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        "& > *:nth-of-type(2)": {
          marginBottom: "8px"
        }
      },
      small: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        "& > *:nth-of-type(2)": {
          marginBottom: "0px"
        }
      }
    }
  }
});
var StatusWrap = styles_default("div", {
  gridRow: 2,
  gridColumn: "1 / span 3"
});

// ../../node_modules/zustand/esm/index.js
var import_react7 = __toModule(require("react"));
function create$1(createState) {
  let state;
  const listeners = new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (nextState !== state) {
      const previousState = state;
      state = replace ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const subscribeWithSelector = (listener, selector = getState, equalityFn = Object.is) => {
    let currentSlice = selector(state);
    function listenerToAdd() {
      const nextSlice = selector(state);
      if (!equalityFn(currentSlice, nextSlice)) {
        const previousSlice = currentSlice;
        listener(currentSlice = nextSlice, previousSlice);
      }
    }
    listeners.add(listenerToAdd);
    return () => listeners.delete(listenerToAdd);
  };
  const subscribe = (listener, selector, equalityFn) => {
    if (selector || equalityFn) {
      return subscribeWithSelector(listener, selector, equalityFn);
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const destroy = () => listeners.clear();
  const api = {setState, getState, subscribe, destroy};
  state = createState(setState, getState, api);
  return api;
}
var isSSR = typeof window === "undefined" || !window.navigator || /ServerSideRendering|^Deno\//.test(window.navigator.userAgent);
var useIsomorphicLayoutEffect = isSSR ? import_react7.useEffect : import_react7.useLayoutEffect;
function create(createState) {
  const api = typeof createState === "function" ? create$1(createState) : createState;
  const useStore = (selector = api.getState, equalityFn = Object.is) => {
    const [, forceUpdate] = (0, import_react7.useReducer)((c7) => c7 + 1, 0);
    const state = api.getState();
    const stateRef = (0, import_react7.useRef)(state);
    const selectorRef = (0, import_react7.useRef)(selector);
    const equalityFnRef = (0, import_react7.useRef)(equalityFn);
    const erroredRef = (0, import_react7.useRef)(false);
    const currentSliceRef = (0, import_react7.useRef)();
    if (currentSliceRef.current === void 0) {
      currentSliceRef.current = selector(state);
    }
    let newStateSlice;
    let hasNewStateSlice = false;
    if (stateRef.current !== state || selectorRef.current !== selector || equalityFnRef.current !== equalityFn || erroredRef.current) {
      newStateSlice = selector(state);
      hasNewStateSlice = !equalityFn(currentSliceRef.current, newStateSlice);
    }
    useIsomorphicLayoutEffect(() => {
      if (hasNewStateSlice) {
        currentSliceRef.current = newStateSlice;
      }
      stateRef.current = state;
      selectorRef.current = selector;
      equalityFnRef.current = equalityFn;
      erroredRef.current = false;
    });
    const stateBeforeSubscriptionRef = (0, import_react7.useRef)(state);
    useIsomorphicLayoutEffect(() => {
      const listener = () => {
        try {
          const nextState = api.getState();
          const nextStateSlice = selectorRef.current(nextState);
          if (!equalityFnRef.current(currentSliceRef.current, nextStateSlice)) {
            stateRef.current = nextState;
            currentSliceRef.current = nextStateSlice;
            forceUpdate();
          }
        } catch (error) {
          erroredRef.current = true;
          forceUpdate();
        }
      };
      const unsubscribe = api.subscribe(listener);
      if (api.getState() !== stateBeforeSubscriptionRef.current) {
        listener();
      }
      return unsubscribe;
    }, []);
    return hasNewStateSlice ? newStateSlice : currentSliceRef.current;
  };
  Object.assign(useStore, api);
  useStore[Symbol.iterator] = function() {
    console.warn("[useStore, api] = create() is deprecated and will be removed in v4");
    const items = [useStore, api];
    return {
      next() {
        const done = items.length <= 0;
        return {value: items.shift(), done};
      }
    };
  };
  return useStore;
}
var esm_default = create;

// src/state/tlstate.ts
var import_core27 = __toModule(require_cjs());
var import_core28 = __toModule(require_cjs());

// src/state/command/align/align.command.ts
var import_core13 = __toModule(require_cjs());

// src/state/tldr.ts
var import_core12 = __toModule(require_cjs());
var TLDR = class {
  static getShapeUtils(shape) {
    return getShapeUtils(typeof shape === "string" ? {type: shape} : shape);
  }
  static getSelectedShapes(data) {
    return data.pageState.selectedIds.map((id) => data.page.shapes[id]);
  }
  static screenToWorld(data, point) {
    const {camera} = data.pageState;
    return import_core12.Vec.sub(import_core12.Vec.div(point, camera.zoom), camera.point);
  }
  static getViewport(data) {
    const [minX, minY] = this.screenToWorld(data, [0, 0]);
    const [maxX, maxY] = this.screenToWorld(data, [
      window.innerWidth,
      window.innerHeight
    ]);
    return {
      minX,
      minY,
      maxX,
      maxY,
      height: maxX - minX,
      width: maxY - minY
    };
  }
  static getCameraZoom(zoom) {
    return import_core12.Utils.clamp(zoom, 0.1, 5);
  }
  static getCurrentCamera(data) {
    return data.pageState.camera;
  }
  static getPage(data) {
    return data.page;
  }
  static getPageState(data) {
    return data.pageState;
  }
  static getSelectedIds(data) {
    return data.pageState.selectedIds;
  }
  static getShapes(data) {
    return Object.values(data.page.shapes);
  }
  static getCamera(data) {
    return data.pageState.camera;
  }
  static getShape(data, shapeId) {
    return data.page.shapes[shapeId];
  }
  static getBounds(shape) {
    return getShapeUtils(shape).getBounds(shape);
  }
  static getRotatedBounds(shape) {
    return getShapeUtils(shape).getRotatedBounds(shape);
  }
  static getSelectedBounds(data) {
    return import_core12.Utils.getCommonBounds(this.getSelectedShapes(data).map((shape) => getShapeUtils(shape).getBounds(shape)));
  }
  static getParentId(data, id) {
    const shape = data.page.shapes[id];
    return shape.parentId;
  }
  static getPointedId(data, id) {
    const shape = data.page.shapes[id];
    if (!shape)
      return id;
    return shape.parentId === data.pageState.currentParentId || shape.parentId === data.page.id ? id : this.getPointedId(data, shape.parentId);
  }
  static getDrilledPointedId(data, id) {
    const shape = data.page.shapes[id];
    const {currentParentId, pointedId} = data.pageState;
    return shape.parentId === data.page.id || shape.parentId === pointedId || shape.parentId === currentParentId ? id : this.getDrilledPointedId(data, shape.parentId);
  }
  static getTopParentId(data, id) {
    const shape = data.page.shapes[id];
    if (shape.parentId === shape.id) {
      throw Error(`Shape has the same id as its parent! ${shape.id}`);
    }
    return shape.parentId === data.page.id || shape.parentId === data.pageState.currentParentId ? id : this.getTopParentId(data, shape.parentId);
  }
  static getDocumentBranch(data, id) {
    const shape = data.page.shapes[id];
    if (shape.children === void 0)
      return [id];
    return [
      id,
      ...shape.children.flatMap((childId) => this.getDocumentBranch(data, childId))
    ];
  }
  static getSelectedBranchSnapshot(data, fn) {
    const page = this.getPage(data);
    const copies = this.getSelectedIds(data).flatMap((id) => this.getDocumentBranch(data, id).map((id2) => page.shapes[id2])).filter((shape) => !shape.isLocked).map(import_core12.Utils.deepClone);
    if (fn !== void 0) {
      return copies.map((shape) => ({id: shape.id, ...fn(shape)}));
    }
    return copies;
  }
  static getSelectedShapeSnapshot(data, fn) {
    const copies = this.getSelectedShapes(data).filter((shape) => !shape.isLocked).map(import_core12.Utils.deepClone);
    if (fn !== void 0) {
      return copies.map((shape) => ({id: shape.id, ...fn(shape)}));
    }
    return copies;
  }
  static getAllEffectedShapeIds(data, ids) {
    const visited = new Set(ids);
    ids.forEach((id) => {
      const shape = data.page.shapes[id];
      function collectDescendants(shape2) {
        if (shape2.children === void 0)
          return;
        shape2.children.filter((childId) => !visited.has(childId)).forEach((childId) => {
          visited.add(childId);
          collectDescendants(data.page.shapes[childId]);
        });
      }
      collectDescendants(shape);
      function collectAscendants(shape2) {
        const parentId = shape2.parentId;
        if (parentId === data.page.id)
          return;
        if (visited.has(parentId))
          return;
        visited.add(parentId);
        collectAscendants(data.page.shapes[parentId]);
      }
      collectAscendants(shape);
      visited.forEach((id2) => {
        Object.values(data.page.bindings).filter((binding) => binding.fromId === id2 || binding.toId === id2).forEach((binding) => visited.add(binding.fromId === id2 ? binding.toId : binding.fromId));
      });
    });
    return Array.from(visited.values());
  }
  static recursivelyUpdateChildren(data, id, beforeShapes = {}, afterShapes = {}) {
    const shape = data.page.shapes[id];
    if (shape.children !== void 0) {
      const deltas = this.getShapeUtils(shape).updateChildren(shape, shape.children.map((childId) => data.page.shapes[childId]));
      if (deltas) {
        return deltas.reduce((cData, delta) => {
          const deltaShape = cData.page.shapes[delta.id];
          if (!beforeShapes[deltaShape.id]) {
            beforeShapes[deltaShape.id] = deltaShape;
          }
          cData.page.shapes[deltaShape.id] = this.getShapeUtils(deltaShape).mutate(deltaShape, delta);
          afterShapes[deltaShape.id] = cData.page.shapes[deltaShape.id];
          if (deltaShape.children !== void 0) {
            this.recursivelyUpdateChildren(cData, deltaShape.id, beforeShapes, afterShapes);
          }
          return cData;
        }, data);
      }
    }
    return data;
  }
  static recursivelyUpdateParents(data, id, beforeShapes = {}, afterShapes = {}) {
    const shape = data.page.shapes[id];
    if (shape.parentId !== data.page.id) {
      const parent = data.page.shapes[shape.parentId];
      const delta = this.getShapeUtils(shape).onChildrenChange(parent, parent.children.map((childId) => data.page.shapes[childId]));
      if (delta) {
        if (!beforeShapes[parent.id]) {
          beforeShapes[parent.id] = parent;
        }
        data.page.shapes[parent.id] = this.getShapeUtils(parent).mutate(parent, delta);
        afterShapes[parent.id] = data.page.shapes[parent.id];
      }
      if (parent.parentId !== data.page.id) {
        return this.recursivelyUpdateParents(data, parent.parentId, beforeShapes, afterShapes);
      }
    }
    return data;
  }
  static updateBindings(data, id, beforeShapes = {}, afterShapes = {}) {
    return Object.values(data.page.bindings).filter((binding) => binding.fromId === id || binding.toId === id).reduce((cData, binding) => {
      if (!beforeShapes[binding.id]) {
        beforeShapes[binding.fromId] = import_core12.Utils.deepClone(cData.page.shapes[binding.fromId]);
      }
      if (!beforeShapes[binding.toId]) {
        beforeShapes[binding.toId] = import_core12.Utils.deepClone(cData.page.shapes[binding.toId]);
      }
      this.onBindingChange(cData, cData.page.shapes[binding.fromId], binding, cData.page.shapes[binding.toId]);
      afterShapes[binding.fromId] = import_core12.Utils.deepClone(cData.page.shapes[binding.fromId]);
      afterShapes[binding.toId] = import_core12.Utils.deepClone(cData.page.shapes[binding.toId]);
      return cData;
    }, data);
  }
  static getChildIndexAbove(data, id) {
    const page = this.getPage(data);
    const shape = page.shapes[id];
    const siblings = (shape.parentId === page.id ? Object.values(page.shapes) : page.shapes[shape.parentId].children.map((childId) => page.shapes[childId])).sort((a6, b5) => a6.childIndex - b5.childIndex);
    const index = siblings.indexOf(shape);
    const nextSibling = siblings[index + 1];
    if (!nextSibling)
      return shape.childIndex + 1;
    return (shape.childIndex + nextSibling.childIndex) / 2;
  }
  static setSelectedIds(data, ids) {
    data.pageState.selectedIds = ids;
  }
  static deselectAll(data) {
    this.setSelectedIds(data, []);
  }
  static mutateShapes(data, ids, fn) {
    const beforeShapes = {};
    const afterShapes = {};
    ids.forEach((id, i6) => {
      const shape = data.page.shapes[id];
      const change = fn(shape, i6);
      beforeShapes[id] = Object.fromEntries(Object.keys(change).map((key) => [key, shape[key]]));
      afterShapes[id] = change;
      data.page.shapes[id] = this.getShapeUtils(shape).mutate(shape, change);
    });
    const dataWithChildrenChanges = ids.reduce((cData, id) => {
      return this.recursivelyUpdateChildren(cData, id, beforeShapes, afterShapes);
    }, data);
    const dataWithParentChanges = ids.reduce((cData, id) => {
      return this.recursivelyUpdateParents(cData, id, beforeShapes, afterShapes);
    }, dataWithChildrenChanges);
    const dataWithBindingChanges = ids.reduce((cData, id) => {
      return this.updateBindings(cData, id, beforeShapes, afterShapes);
    }, dataWithParentChanges);
    return {
      before: beforeShapes,
      after: afterShapes,
      data: dataWithBindingChanges
    };
  }
  static createShapes(data, shapes) {
    const page = this.getPage(data);
    const shapeIds = shapes.map((shape) => shape.id);
    this.setSelectedIds(data, shapeIds);
    shapes.forEach((shape) => {
      const newShape = {...shape};
      page.shapes[shape.id] = newShape;
    });
    shapes.forEach((shape) => {
      if (shape.parentId === data.page.id)
        return;
      const parent = page.shapes[shape.parentId];
      this.mutate(data, parent, {
        children: parent.children.includes(shape.id) ? parent.children : [...parent.children, shape.id]
      });
    });
  }
  static onSessionComplete(data, shape) {
    const delta = getShapeUtils(shape).onSessionComplete(shape);
    if (!delta)
      return shape;
    return this.mutate(data, shape, delta);
  }
  static onChildrenChange(data, shape) {
    const delta = getShapeUtils(shape).onChildrenChange(shape, shape.children.map((id) => data.page.shapes[id]));
    if (!delta)
      return shape;
    return this.mutate(data, shape, delta);
  }
  static onBindingChange(data, shape, binding, otherShape) {
    const delta = getShapeUtils(shape).onBindingChange(shape, binding, otherShape, getShapeUtils(otherShape).getBounds(otherShape));
    if (!delta)
      return shape;
    return this.mutate(data, shape, delta);
  }
  static transform(data, shape, bounds, info) {
    return this.mutate(data, shape, getShapeUtils(shape).transform(shape, bounds, info));
  }
  static transformSingle(data, shape, bounds, info) {
    return this.mutate(data, shape, getShapeUtils(shape).transformSingle(shape, bounds, info));
  }
  static mutate(data, shape, props) {
    let next = getShapeUtils(shape).mutate(shape, props);
    if ("children" in props) {
      next = this.onChildrenChange(data, next);
    }
    data.page.shapes[next.id] = next;
    return next;
  }
  static updateParents(data, changedShapeIds) {
    if (changedShapeIds.length === 0)
      return;
    const {shapes} = this.getPage(data);
    const parentToUpdateIds = Array.from(new Set(changedShapeIds.map((id) => shapes[id].parentId).values())).filter((id) => id !== data.page.id);
    for (const parentId of parentToUpdateIds) {
      const parent = shapes[parentId];
      if (!parent.children) {
        throw Error("A shape is parented to a shape without a children array.");
      }
      this.onChildrenChange(data, parent);
    }
    this.updateParents(data, parentToUpdateIds);
  }
  static getSelectedStyle(data) {
    const {
      page,
      pageState,
      appState: {currentStyle}
    } = data;
    if (pageState.selectedIds.length === 0) {
      return currentStyle;
    }
    const shapeStyles = data.pageState.selectedIds.map((id) => page.shapes[id].style);
    const commonStyle = {};
    const overrides = new Set([]);
    for (const shapeStyle of shapeStyles) {
      ;
      Object.keys(currentStyle).forEach((key) => {
        if (overrides.has(key))
          return;
        if (commonStyle[key] === void 0) {
          commonStyle[key] = shapeStyle[key];
        } else {
          if (commonStyle[key] === shapeStyle[key])
            return;
          commonStyle[key] = currentStyle[key];
          overrides.add(key);
        }
      });
    }
    return commonStyle;
  }
  static getBinding(data, id) {
    return this.getPage(data).bindings[id];
  }
  static getBindings(data) {
    const page = this.getPage(data);
    return Object.values(page.bindings);
  }
  static getBindingsWithShapeIds(data, ids) {
    return Array.from(new Set(this.getBindings(data).filter((binding) => {
      return ids.includes(binding.toId) || ids.includes(binding.fromId);
    })).values());
  }
  static createBindings(data, bindings) {
    const page = this.getPage(data);
    bindings.forEach((binding) => page.bindings[binding.id] = binding);
  }
  static deleteBindings(data, ids) {
    if (ids.length === 0)
      return;
    const page = this.getPage(data);
    ids.forEach((id) => delete page.bindings[id]);
  }
  static assertShapeHasProperty(shape, prop) {
    if (shape[prop] === void 0) {
      throw new Error();
    }
  }
};

// src/state/command/align/align.command.ts
function align(data, ids, type) {
  const initialShapes = ids.map((id) => TLDR.getShape(data, id));
  const boundsForShapes = initialShapes.map((shape) => {
    return {
      id: shape.id,
      point: [...shape.point],
      bounds: TLDR.getShapeUtils(shape).getBounds(shape)
    };
  });
  const commonBounds = import_core13.Utils.getCommonBounds(boundsForShapes.map(({bounds}) => bounds));
  const midX = commonBounds.minX + commonBounds.width / 2;
  const midY = commonBounds.minY + commonBounds.height / 2;
  const deltaMap = Object.fromEntries(boundsForShapes.map(({id, point, bounds}) => {
    return [
      id,
      {
        prev: point,
        next: {
          [AlignType.CenterVertical]: [point[0], midY - bounds.height / 2],
          [AlignType.CenterHorizontal]: [midX - bounds.width / 2, point[1]],
          [AlignType.Top]: [point[0], commonBounds.minY],
          [AlignType.Bottom]: [point[0], commonBounds.maxY - bounds.height],
          [AlignType.Left]: [commonBounds.minX, point[1]],
          [AlignType.Right]: [commonBounds.maxX - bounds.width, point[1]]
        }[type]
      }
    ];
  }));
  const {before, after} = TLDR.mutateShapes(data, ids, (shape) => {
    if (!deltaMap[shape.id])
      return shape;
    return {point: deltaMap[shape.id].next};
  });
  return {
    id: "align_shapes",
    before: {
      page: {
        shapes: {
          ...before
        }
      }
    },
    after: {
      page: {
        shapes: {
          ...after
        }
      }
    }
  };
}

// src/state/command/create/create.command.ts
function create2(data, shapes) {
  return {
    id: "toggle_shapes",
    before: {
      page: {
        shapes: Object.fromEntries(shapes.map((shape) => [shape.id, void 0]))
      },
      pageState: {
        selectedIds: [...data.pageState.selectedIds]
      }
    },
    after: {
      page: {
        shapes: Object.fromEntries(shapes.map((shape) => [shape.id, shape]))
      },
      pageState: {
        selectedIds: shapes.map((shape) => shape.id)
      }
    }
  };
}

// src/state/command/delete/delete.command.ts
function deleteShapes(data, ids) {
  return {
    id: "toggle_shapes",
    before: {
      page: {
        shapes: Object.fromEntries(ids.map((id) => [id, data.page.shapes[id]]))
      },
      pageState: {
        selectedIds: [...data.pageState.selectedIds],
        hoveredId: void 0
      }
    },
    after: {
      page: {
        shapes: Object.fromEntries(ids.map((id) => [id, void 0]))
      },
      pageState: {
        selectedIds: [],
        hoveredId: void 0
      }
    }
  };
}

// src/state/command/distribute/distribute.command.ts
var import_core14 = __toModule(require_cjs());
function distribute(data, ids, type) {
  const initialShapes = ids.map((id) => data.page.shapes[id]);
  const deltaMap = Object.fromEntries(getDistributions(initialShapes, type).map((d8) => [d8.id, d8]));
  const {before, after} = TLDR.mutateShapes(data, ids, (shape) => {
    if (!deltaMap[shape.id])
      return shape;
    return {point: deltaMap[shape.id].next};
  });
  return {
    id: "distribute_shapes",
    before: {
      page: {
        shapes: {
          ...before
        }
      }
    },
    after: {
      page: {
        shapes: {
          ...after
        }
      }
    }
  };
}
function getDistributions(initialShapes, type) {
  const entries = initialShapes.map((shape) => {
    const utils = TLDR.getShapeUtils(shape);
    return {
      id: shape.id,
      point: [...shape.point],
      bounds: utils.getBounds(shape),
      center: utils.getCenter(shape)
    };
  });
  const len3 = entries.length;
  const commonBounds = import_core14.Utils.getCommonBounds(entries.map(({bounds}) => bounds));
  const results = [];
  switch (type) {
    case DistributeType.Horizontal: {
      const span = entries.reduce((a6, c7) => a6 + c7.bounds.width, 0);
      if (span > commonBounds.width) {
        const left = entries.sort((a6, b5) => a6.bounds.minX - b5.bounds.minX)[0];
        const right = entries.sort((a6, b5) => b5.bounds.maxX - a6.bounds.maxX)[0];
        const entriesToMove = entries.filter((a6) => a6 !== left && a6 !== right).sort((a6, b5) => a6.center[0] - b5.center[0]);
        const step = (right.center[0] - left.center[0]) / (len3 - 1);
        const x6 = left.center[0] + step;
        entriesToMove.forEach(({id, point, bounds}, i6) => {
          results.push({
            id,
            prev: point,
            next: [x6 + step * i6 - bounds.width / 2, bounds.minY]
          });
        });
      } else {
        const entriesToMove = entries.sort((a6, b5) => a6.center[0] - b5.center[0]);
        let x6 = commonBounds.minX;
        const step = (commonBounds.width - span) / (len3 - 1);
        entriesToMove.forEach(({id, point, bounds}, i6) => {
          results.push({id, prev: point, next: [x6, bounds.minY]});
          x6 += bounds.width + step;
        });
      }
      break;
    }
    case DistributeType.Vertical: {
      const span = entries.reduce((a6, c7) => a6 + c7.bounds.height, 0);
      if (span > commonBounds.height) {
        const top = entries.sort((a6, b5) => a6.bounds.minY - b5.bounds.minY)[0];
        const bottom = entries.sort((a6, b5) => b5.bounds.maxY - a6.bounds.maxY)[0];
        const entriesToMove = entries.filter((a6) => a6 !== top && a6 !== bottom).sort((a6, b5) => a6.center[1] - b5.center[1]);
        const step = (bottom.center[1] - top.center[1]) / (len3 - 1);
        const y5 = top.center[1] + step;
        entriesToMove.forEach(({id, point, bounds}, i6) => {
          results.push({
            id,
            prev: point,
            next: [bounds.minX, y5 + step * i6 - bounds.height / 2]
          });
        });
      } else {
        const entriesToMove = entries.sort((a6, b5) => a6.center[1] - b5.center[1]);
        let y5 = commonBounds.minY;
        const step = (commonBounds.height - span) / (len3 - 1);
        entriesToMove.forEach(({id, point, bounds}, i6) => {
          results.push({id, prev: point, next: [bounds.minX, y5]});
          y5 += bounds.height + step;
        });
      }
      break;
    }
  }
  return results;
}

// src/state/command/duplicate/duplicate.command.ts
var import_core15 = __toModule(require_cjs());
function duplicate(data, ids) {
  const delta = import_core15.Vec.div([16, 16], data.pageState.camera.zoom);
  const after = Object.fromEntries(TLDR.getSelectedIds(data).map((id) => data.page.shapes[id]).map((shape) => {
    const id = import_core15.Utils.uniqueId();
    return [
      id,
      {
        ...import_core15.Utils.deepClone(shape),
        id,
        point: import_core15.Vec.round(import_core15.Vec.add(shape.point, delta))
      }
    ];
  }));
  const before = Object.fromEntries(Object.keys(after).map((id) => [id, void 0]));
  return {
    id: "duplicate",
    before: {
      page: {
        shapes: {
          ...before
        }
      },
      pageState: {
        ...data.pageState,
        selectedIds: ids
      }
    },
    after: {
      page: {
        shapes: {
          ...after
        }
      },
      pageState: {
        ...data.pageState,
        selectedIds: Object.keys(after)
      }
    }
  };
}

// src/state/command/move/move.command.ts
function move(data, ids, type) {
  const parentIds = new Set(ids.map((id) => data.page.shapes[id].parentId));
  let result = {before: {}, after: {}};
  let startIndex;
  let startChildIndex;
  let step;
  Array.from(parentIds.values()).forEach((parentId) => {
    const sortedChildren = parentId === data.page.id ? Object.values(data.page.shapes).sort((a6, b5) => a6.childIndex - b5.childIndex) : data.page.shapes[parentId].children.map((childId) => data.page.shapes[childId]).sort((a6, b5) => a6.childIndex - b5.childIndex);
    const sortedChildIds = sortedChildren.map((shape) => shape.id);
    const sortedIndicesToMove = ids.filter((id) => sortedChildIds.includes(id)).map((id) => sortedChildIds.indexOf(id)).sort((a6, b5) => a6 - b5);
    if (sortedIndicesToMove.length === sortedChildIds.length)
      return;
    switch (type) {
      case MoveType.ToBack: {
        for (let i6 = 0; i6 < sortedChildIds.length; i6++) {
          if (sortedIndicesToMove.includes(i6))
            continue;
          startIndex = i6;
          break;
        }
        startChildIndex = sortedChildren[startIndex].childIndex;
        step = startChildIndex / (sortedIndicesToMove.length + 1);
        result = TLDR.mutateShapes(data, sortedIndicesToMove.map((i6) => sortedChildren[i6].id).reverse(), (_shape, i6) => ({
          childIndex: startChildIndex - (i6 + 1) * step
        }));
        break;
      }
      case MoveType.ToFront: {
        for (let i6 = sortedChildIds.length - 1; i6 >= 0; i6--) {
          if (sortedIndicesToMove.includes(i6))
            continue;
          startIndex = i6;
          break;
        }
        startChildIndex = sortedChildren[startIndex].childIndex;
        step = 1;
        result = TLDR.mutateShapes(data, sortedIndicesToMove.map((i6) => sortedChildren[i6].id), (_shape, i6) => ({
          childIndex: startChildIndex + (i6 + 1)
        }));
        break;
      }
      case MoveType.Backward: {
        const indexMap = {};
        for (let i6 = sortedChildIds.length - 1; i6 >= 0; i6--) {
          if (sortedIndicesToMove.includes(i6)) {
            for (let j2 = i6; j2 >= 0; j2--) {
              if (!sortedIndicesToMove.includes(j2)) {
                startChildIndex = j2 === 0 ? sortedChildren[j2].childIndex / 2 : sortedChildren[j2 - 1].childIndex;
                const step2 = (sortedChildren[j2].childIndex - startChildIndex) / (i6 - j2 + 1);
                for (let k4 = 0; k4 < i6 - j2; k4++) {
                  indexMap[sortedChildren[j2 + k4 + 1].id] = startChildIndex + step2 * (k4 + 1);
                }
                break;
              }
            }
          }
        }
        if (Object.values(indexMap).length > 0) {
          result = TLDR.mutateShapes(data, sortedIndicesToMove.map((i6) => sortedChildren[i6].id), (shape) => ({
            childIndex: indexMap[shape.id]
          }));
        }
        break;
      }
      case MoveType.Forward: {
        const indexMap = {};
        for (let i6 = 0; i6 < sortedChildIds.length; i6++) {
          if (sortedIndicesToMove.includes(i6)) {
            for (let j2 = i6; j2 < sortedChildIds.length; j2++) {
              if (!sortedIndicesToMove.includes(j2)) {
                startChildIndex = sortedChildren[j2].childIndex;
                const step2 = j2 === sortedChildIds.length - 1 ? 1 : (sortedChildren[j2 + 1].childIndex - startChildIndex) / (j2 - i6 + 1);
                for (let k4 = 0; k4 < j2 - i6; k4++) {
                  indexMap[sortedChildren[i6 + k4].id] = startChildIndex + step2 * (k4 + 1);
                }
                break;
              }
            }
          }
        }
        if (Object.values(indexMap).length > 0) {
          result = TLDR.mutateShapes(data, sortedIndicesToMove.map((i6) => sortedChildren[i6].id), (shape) => ({
            childIndex: indexMap[shape.id]
          }));
        }
        break;
      }
    }
  });
  return {
    id: "move_shapes",
    before: {
      page: {
        ...data.page,
        shapes: result?.before || {}
      }
    },
    after: {
      page: {
        ...data.page,
        shapes: result?.after || {}
      }
    }
  };
}

// src/state/command/rotate/rotate.command.ts
var import_core16 = __toModule(require_cjs());
var PI2 = Math.PI * 2;
function rotate(data, ids, delta = -PI2 / 4) {
  const initialShapes = ids.map((id) => data.page.shapes[id]);
  const boundsForShapes = initialShapes.map((shape) => {
    const utils = TLDR.getShapeUtils(shape);
    return {
      id: shape.id,
      point: [...shape.point],
      bounds: utils.getBounds(shape),
      center: utils.getCenter(shape),
      rotation: shape.rotation
    };
  });
  const commonBounds = import_core16.Utils.getCommonBounds(boundsForShapes.map(({bounds}) => bounds));
  const commonBoundsCenter = import_core16.Utils.getBoundsCenter(commonBounds);
  const rotations = Object.fromEntries(boundsForShapes.map(({id, point, center, rotation}) => {
    const offset = import_core16.Vec.sub(center, point);
    const nextPoint = import_core16.Vec.sub(import_core16.Vec.rotWith(center, commonBoundsCenter, -(PI2 / 4)), offset);
    const nextRotation = (PI2 + ((rotation || 0) + delta)) % PI2;
    return [id, {point: nextPoint, rotation: nextRotation}];
  }));
  const prevBoundsRotation = data.pageState.boundsRotation;
  const nextBoundsRotation = (PI2 + ((data.pageState.boundsRotation || 0) + delta)) % PI2;
  const {before, after} = TLDR.mutateShapes(data, ids, (shape) => rotations[shape.id]);
  return {
    id: "toggle_shapes",
    before: {
      page: {
        shapes: {
          ...before
        }
      },
      pageState: {
        boundsRotation: prevBoundsRotation
      }
    },
    after: {
      page: {
        shapes: {
          ...after
        }
      },
      pageState: {
        boundsRotation: nextBoundsRotation
      }
    }
  };
}

// src/state/command/stretch/stretch.command.ts
var import_core17 = __toModule(require_cjs());
function stretch(data, ids, type) {
  const initialShapes = ids.map((id) => data.page.shapes[id]);
  const boundsForShapes = initialShapes.map((shape) => TLDR.getBounds(shape));
  const commonBounds = import_core17.Utils.getCommonBounds(boundsForShapes);
  const {before, after} = TLDR.mutateShapes(data, ids, (shape) => {
    const bounds = TLDR.getBounds(shape);
    switch (type) {
      case StretchType.Horizontal: {
        const newBounds = {
          ...bounds,
          minX: commonBounds.minX,
          maxX: commonBounds.maxX,
          width: commonBounds.width
        };
        return TLDR.getShapeUtils(shape).transformSingle(shape, newBounds, {
          type: import_core17.TLBoundsCorner.TopLeft,
          scaleX: newBounds.width / bounds.width,
          scaleY: 1,
          initialShape: shape,
          transformOrigin: [0.5, 0.5]
        });
      }
      case StretchType.Vertical: {
        const newBounds = {
          ...bounds,
          minY: commonBounds.minY,
          maxY: commonBounds.maxY,
          height: commonBounds.height
        };
        return TLDR.getShapeUtils(shape).transformSingle(shape, newBounds, {
          type: import_core17.TLBoundsCorner.TopLeft,
          scaleX: 1,
          scaleY: newBounds.height / bounds.height,
          initialShape: shape,
          transformOrigin: [0.5, 0.5]
        });
      }
    }
  });
  return {
    id: "stretch_shapes",
    before: {
      page: {
        shapes: {
          ...before
        }
      }
    },
    after: {
      page: {
        shapes: {
          ...after
        }
      }
    }
  };
}

// src/state/command/style/style.command.ts
function style(data, ids, changes) {
  const {before, after} = TLDR.mutateShapes(data, ids, (shape) => {
    return {style: {...shape.style, ...changes}};
  });
  return {
    id: "style_shapes",
    before: {
      page: {
        shapes: {
          ...before
        }
      },
      appState: {
        currentStyle: {...data.appState.currentStyle}
      }
    },
    after: {
      page: {
        shapes: {
          ...after
        }
      },
      appState: {
        currentStyle: {...data.appState.currentStyle, ...changes}
      }
    }
  };
}

// src/state/command/toggle/toggle.command.ts
function toggle(data, ids, prop) {
  const initialShapes = ids.map((id) => data.page.shapes[id]);
  const isAllToggled = initialShapes.every((shape) => shape[prop]);
  const {before, after} = TLDR.mutateShapes(data, TLDR.getSelectedIds(data), () => ({
    [prop]: !isAllToggled
  }));
  return {
    id: "toggle_shapes",
    before: {
      page: {
        shapes: {
          ...before
        }
      }
    },
    after: {
      page: {
        shapes: {
          ...after
        }
      }
    }
  };
}

// src/state/command/translate/translate.command.ts
var import_core18 = __toModule(require_cjs());
function translate(data, ids, delta) {
  const {before, after} = TLDR.mutateShapes(data, ids, (shape) => ({
    point: import_core18.Vec.round(import_core18.Vec.add(shape.point, delta))
  }));
  return {
    id: "translate_shapes",
    before: {
      page: {
        ...data.page,
        shapes: {
          ...before
        }
      }
    },
    after: {
      page: {
        ...data.page,
        shapes: {
          ...after
        }
      }
    }
  };
}

// src/state/command/flip/flip.command.ts
var import_core19 = __toModule(require_cjs());
function flip(data, ids, type) {
  const initialShapes = ids.map((id) => data.page.shapes[id]);
  const boundsForShapes = initialShapes.map((shape) => TLDR.getBounds(shape));
  const commonBounds = import_core19.Utils.getCommonBounds(boundsForShapes);
  const {before, after} = TLDR.mutateShapes(data, ids, (shape) => {
    const shapeBounds = TLDR.getBounds(shape);
    switch (type) {
      case FlipType.Horizontal: {
        const newShapeBounds = import_core19.Utils.getRelativeTransformedBoundingBox(commonBounds, commonBounds, shapeBounds, true, false);
        return TLDR.getShapeUtils(shape).transform(shape, newShapeBounds, {
          type: import_core19.TLBoundsCorner.TopLeft,
          scaleX: -1,
          scaleY: 1,
          initialShape: shape,
          transformOrigin: [0.5, 0.5]
        });
      }
      case FlipType.Vertical: {
        const newShapeBounds = import_core19.Utils.getRelativeTransformedBoundingBox(commonBounds, commonBounds, shapeBounds, false, true);
        return TLDR.getShapeUtils(shape).transform(shape, newShapeBounds, {
          type: import_core19.TLBoundsCorner.TopLeft,
          scaleX: 1,
          scaleY: -1,
          initialShape: shape,
          transformOrigin: [0.5, 0.5]
        });
      }
    }
  });
  return {
    id: "flip_shapes",
    before: {
      page: {
        shapes: {
          ...before
        }
      }
    },
    after: {
      page: {
        shapes: {
          ...after
        }
      }
    }
  };
}

// src/state/session/sessions/brush/brush.session.ts
var import_core20 = __toModule(require_cjs());
var BrushSession = class {
  constructor(data, point) {
    this.id = "brush";
    this.start = (data) => {
      return data;
    };
    this.update = (data, point, containMode = false) => {
      const {snapshot, origin} = this;
      const brush = import_core20.Utils.getBoundsFromPoints([origin, point]);
      import_core20.brushUpdater.set(brush);
      const hits = new Set();
      const selectedIds = new Set(snapshot.selectedIds);
      snapshot.shapesToTest.forEach(({id, util, selectId}) => {
        if (selectedIds.has(id))
          return;
        const shape = data.page.shapes[id];
        if (!hits.has(selectId)) {
          if (containMode ? import_core20.Utils.boundsContain(brush, util.getBounds(shape)) : util.hitTestBounds(shape, brush)) {
            hits.add(selectId);
            if (!selectedIds.has(selectId)) {
              selectedIds.add(selectId);
            }
          } else if (selectedIds.has(selectId)) {
            selectedIds.delete(selectId);
          }
        }
      });
      if (selectedIds.size === data.pageState.selectedIds.length && data.pageState.selectedIds.every((id) => selectedIds.has(id))) {
        return data;
      }
      return {
        ...data,
        pageState: {
          ...data.pageState,
          selectedIds: Array.from(selectedIds.values())
        }
      };
    };
    this.origin = import_core20.Vec.round(point);
    this.snapshot = getBrushSnapshot(data);
  }
  cancel(data) {
    return {
      ...data,
      pageState: {
        ...data.pageState,
        selectedIds: this.snapshot.selectedIds
      }
    };
  }
  complete(data) {
    return {
      ...data,
      pageState: {
        ...data.pageState,
        selectedIds: [...data.pageState.selectedIds]
      }
    };
  }
};
function getBrushSnapshot(data) {
  const selectedIds = [...data.pageState.selectedIds];
  const shapesToTest = TLDR.getShapes(data).filter((shape) => !(shape.isHidden || shape.children !== void 0 || selectedIds.includes(shape.id) || selectedIds.includes(shape.parentId))).map((shape) => ({
    id: shape.id,
    util: getShapeUtils(shape),
    bounds: getShapeUtils(shape).getBounds(shape),
    selectId: TLDR.getTopParentId(data, shape.id)
  }));
  return {
    selectedIds,
    shapesToTest
  };
}

// src/state/session/sessions/translate/translate.session.ts
var import_core21 = __toModule(require_cjs());
var TranslateSession = class {
  constructor(data, point) {
    this.id = "translate";
    this.delta = [0, 0];
    this.prev = [0, 0];
    this.isCloning = false;
    this.start = (data) => {
      return data;
    };
    this.update = (data, point, isAligned = false, isCloning = false) => {
      const {clones, initialShapes} = this.snapshot;
      const next = {
        ...data,
        page: {...data.page},
        shapes: {...data.page.shapes},
        pageState: {...data.pageState}
      };
      const delta = import_core21.Vec.sub(point, this.origin);
      if (isAligned) {
        if (Math.abs(delta[0]) < Math.abs(delta[1])) {
          delta[0] = 0;
        } else {
          delta[1] = 0;
        }
      }
      const trueDelta = import_core21.Vec.sub(delta, this.prev);
      this.delta = delta;
      this.prev = delta;
      if (isCloning) {
        if (!this.isCloning) {
          this.isCloning = true;
          next.page.shapes = {
            ...next.page.shapes,
            ...Object.fromEntries(initialShapes.map((shape) => [
              shape.id,
              {...next.page.shapes[shape.id], point: shape.point}
            ]))
          };
          next.page.shapes = {
            ...next.page.shapes,
            ...Object.fromEntries(clones.map((clone) => [
              clone.id,
              {...clone, point: import_core21.Vec.round(import_core21.Vec.add(clone.point, delta))}
            ]))
          };
          next.pageState.selectedIds = clones.map((c7) => c7.id);
        }
        next.page.shapes = {
          ...next.page.shapes,
          ...Object.fromEntries(clones.map((clone) => [
            clone.id,
            {
              ...clone,
              point: import_core21.Vec.round(import_core21.Vec.add(next.page.shapes[clone.id].point, trueDelta))
            }
          ]))
        };
        return next;
      }
      if (this.isCloning) {
        this.isCloning = false;
        clones.forEach((clone) => delete next.page.shapes[clone.id]);
        next.page.shapes = {
          ...next.page.shapes,
          ...Object.fromEntries(initialShapes.map((shape) => [
            shape.id,
            {
              ...next.page.shapes[shape.id],
              point: import_core21.Vec.round(import_core21.Vec.add(shape.point, delta))
            }
          ]))
        };
        next.pageState.selectedIds = initialShapes.map((c7) => c7.id);
      }
      next.page.shapes = {
        ...next.page.shapes,
        ...Object.fromEntries(initialShapes.map((shape) => [
          shape.id,
          {
            ...next.page.shapes[shape.id],
            point: import_core21.Vec.round(import_core21.Vec.add(next.page.shapes[shape.id].point, trueDelta))
          }
        ]))
      };
      return next;
    };
    this.cancel = (data) => {
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            ...Object.fromEntries(this.snapshot.clones.map((clone) => [clone.id, void 0])),
            ...Object.fromEntries(this.snapshot.initialShapes.map((shape) => [
              shape.id,
              {...data.page.shapes[shape.id], point: shape.point}
            ]))
          }
        },
        pageState: {
          ...data.pageState,
          selectedIds: this.snapshot.selectedIds
        }
      };
    };
    this.origin = point;
    this.snapshot = getTranslateSnapshot(data);
  }
  complete(data) {
    return {
      id: "translate",
      before: {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            ...Object.fromEntries(this.snapshot.clones.map((clone) => [clone.id, void 0])),
            ...Object.fromEntries(this.snapshot.initialShapes.map((shape) => [
              shape.id,
              {point: shape.point}
            ]))
          }
        },
        pageState: {
          ...data.pageState,
          selectedIds: this.snapshot.selectedIds
        }
      },
      after: {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            ...Object.fromEntries(this.snapshot.clones.map((clone) => [
              clone.id,
              data.page.shapes[clone.id]
            ])),
            ...Object.fromEntries(this.snapshot.initialShapes.map((shape) => [
              shape.id,
              {point: data.page.shapes[shape.id].point}
            ]))
          }
        },
        pageState: {
          ...data.pageState,
          selectedIds: [...data.pageState.selectedIds]
        }
      }
    };
  }
};
function getTranslateSnapshot(data) {
  const selectedShapes = TLDR.getSelectedShapeSnapshot(data);
  const hasUnlockedShapes = selectedShapes.length > 0;
  const initialParents = Array.from(new Set(selectedShapes.map((s9) => s9.parentId)).values()).filter((id) => id !== data.page.id).map((id) => {
    const shape = TLDR.getShape(data, id);
    return {
      id,
      children: shape.children
    };
  });
  return {
    selectedIds: TLDR.getSelectedIds(data),
    hasUnlockedShapes,
    initialParents,
    initialShapes: selectedShapes.map(({id, point, parentId}) => ({
      id,
      point,
      parentId
    })),
    clones: selectedShapes.filter((shape) => shape.children === void 0).flatMap((shape) => {
      const clone = {
        ...shape,
        id: import_core21.Utils.uniqueId(),
        parentId: shape.parentId,
        childIndex: TLDR.getChildIndexAbove(data, shape.id)
      };
      return clone;
    })
  };
}

// src/state/session/sessions/transform-single/transform-single.session.ts
var import_core22 = __toModule(require_cjs());
var TransformSingleSession = class {
  constructor(data, point, transformType = import_core22.TLBoundsCorner.BottomRight, commandId = "transform_single") {
    this.id = "transform_single";
    this.scaleX = 1;
    this.scaleY = 1;
    this.start = (data) => data;
    this.update = (data, point, isAspectRatioLocked = false) => {
      const {transformType} = this;
      const {initialShapeBounds, initialShape, id} = this.snapshot;
      const shape = data.page.shapes[id];
      const utils = TLDR.getShapeUtils(shape);
      const newBounds = import_core22.Utils.getTransformedBoundingBox(initialShapeBounds, transformType, import_core22.Vec.sub(point, this.origin), shape.rotation, isAspectRatioLocked || shape.isAspectRatioLocked || utils.isAspectRatioLocked);
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            [shape.id]: {
              ...initialShape,
              ...TLDR.getShapeUtils(shape).transformSingle(shape, newBounds, {
                initialShape,
                type: this.transformType,
                scaleX: newBounds.scaleX,
                scaleY: newBounds.scaleY,
                transformOrigin: [0.5, 0.5]
              })
            }
          }
        }
      };
    };
    this.cancel = (data) => {
      const {id, initialShape} = this.snapshot;
      data.page.shapes[id] = initialShape;
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            [id]: initialShape
          }
        }
      };
    };
    this.origin = point;
    this.transformType = transformType;
    this.snapshot = getTransformSingleSnapshot(data, transformType);
    this.commandId = commandId;
  }
  complete(data) {
    if (!this.snapshot.hasUnlockedShape)
      return data;
    return {
      id: this.commandId,
      before: {
        page: {
          shapes: {
            [this.snapshot.id]: this.snapshot.initialShape
          }
        }
      },
      after: {
        page: {
          shapes: {
            [this.snapshot.id]: TLDR.onSessionComplete(data, data.page.shapes[this.snapshot.id])
          }
        }
      }
    };
  }
};
function getTransformSingleSnapshot(data, transformType) {
  const shape = data.page.shapes[data.pageState.selectedIds[0]];
  if (!shape) {
    throw Error("You must have one shape selected.");
  }
  const bounds = TLDR.getBounds(shape);
  return {
    id: shape.id,
    hasUnlockedShape: !shape.isLocked,
    type: transformType,
    initialShape: import_core22.Utils.deepClone(shape),
    initialShapeBounds: bounds
  };
}

// src/state/session/sessions/transform/transform.session.ts
var import_core23 = __toModule(require_cjs());
var TransformSession = class {
  constructor(data, point, transformType = import_core23.TLBoundsCorner.BottomRight) {
    this.id = "transform";
    this.scaleX = 1;
    this.scaleY = 1;
    this.start = (data) => data;
    this.update = (data, point, isAspectRatioLocked = false, _altKey = false) => {
      const {
        transformType,
        snapshot: {shapeBounds, initialBounds, isAllAspectRatioLocked}
      } = this;
      const next = {
        ...data,
        page: {
          ...data.page
        }
      };
      const {shapes} = next.page;
      const newBoundingBox = import_core23.Utils.getTransformedBoundingBox(initialBounds, transformType, import_core23.Vec.vec(this.origin, point), data.pageState.boundsRotation, isAspectRatioLocked || isAllAspectRatioLocked);
      this.scaleX = newBoundingBox.scaleX;
      this.scaleY = newBoundingBox.scaleY;
      next.page.shapes = {
        ...next.page.shapes,
        ...Object.fromEntries(Object.entries(shapeBounds).map(([id, {initialShape, initialShapeBounds, transformOrigin}]) => {
          const newShapeBounds = import_core23.Utils.getRelativeTransformedBoundingBox(newBoundingBox, initialBounds, initialShapeBounds, this.scaleX < 0, this.scaleY < 0);
          const shape = shapes[id];
          return [
            id,
            {
              ...initialShape,
              ...TLDR.transform(next, shape, newShapeBounds, {
                type: this.transformType,
                initialShape,
                scaleX: this.scaleX,
                scaleY: this.scaleY,
                transformOrigin
              })
            }
          ];
        }))
      };
      return next;
    };
    this.cancel = (data) => {
      const {shapeBounds} = this.snapshot;
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            ...Object.fromEntries(Object.entries(shapeBounds).map(([id, {initialShape}]) => [
              id,
              initialShape
            ]))
          }
        }
      };
    };
    this.origin = point;
    this.transformType = transformType;
    this.snapshot = getTransformSnapshot(data, transformType);
  }
  complete(data) {
    const {hasUnlockedShapes, shapeBounds} = this.snapshot;
    if (!hasUnlockedShapes)
      return data;
    return {
      id: "transform",
      before: {
        page: {
          shapes: Object.fromEntries(Object.entries(shapeBounds).map(([id, {initialShape}]) => [
            id,
            initialShape
          ]))
        }
      },
      after: {
        page: {
          shapes: Object.fromEntries(this.snapshot.initialShapes.map((shape) => [
            shape.id,
            TLDR.onSessionComplete(data, data.page.shapes[shape.id])
          ]))
        }
      }
    };
  }
};
function getTransformSnapshot(data, transformType) {
  const initialShapes = TLDR.getSelectedBranchSnapshot(data);
  const hasUnlockedShapes = initialShapes.length > 0;
  const isAllAspectRatioLocked = initialShapes.every((shape) => shape.isAspectRatioLocked || TLDR.getShapeUtils(shape).isAspectRatioLocked);
  const shapesBounds = Object.fromEntries(initialShapes.map((shape) => [shape.id, TLDR.getBounds(shape)]));
  const boundsArr = Object.values(shapesBounds);
  const commonBounds = import_core23.Utils.getCommonBounds(boundsArr);
  const initialInnerBounds = import_core23.Utils.getBoundsFromPoints(boundsArr.map(import_core23.Utils.getBoundsCenter));
  return {
    type: transformType,
    hasUnlockedShapes,
    isAllAspectRatioLocked,
    initialShapes,
    initialBounds: commonBounds,
    shapeBounds: Object.fromEntries(initialShapes.map((shape) => {
      const initialShapeBounds = shapesBounds[shape.id];
      const ic = import_core23.Utils.getBoundsCenter(initialShapeBounds);
      const ix = (ic[0] - initialInnerBounds.minX) / initialInnerBounds.width;
      const iy = (ic[1] - initialInnerBounds.minY) / initialInnerBounds.height;
      return [
        shape.id,
        {
          initialShape: shape,
          initialShapeBounds,
          transformOrigin: [ix, iy]
        }
      ];
    }))
  };
}

// src/state/session/sessions/draw/draw.session.ts
var import_core24 = __toModule(require_cjs());
var DrawSession = class {
  constructor(data, id, point) {
    this.id = "draw";
    this.start = (data) => data;
    this.update = (data, point, pressure, isLocked = false) => {
      const {snapshot} = this;
      if (isLocked) {
        if (!this.isLocked && this.points.length > 1) {
          const bounds = import_core24.Utils.getBoundsFromPoints(this.points);
          if (bounds.width > 8 || bounds.height > 8) {
            this.isLocked = true;
            const returning = [...this.previous];
            const isVertical = bounds.height > 8;
            if (isVertical) {
              this.lockedDirection = "vertical";
              returning[0] = this.origin[0];
            } else {
              this.lockedDirection = "horizontal";
              returning[1] = this.origin[1];
            }
            this.previous = returning;
            this.points.push(import_core24.Vec.sub(returning, this.origin));
          }
        }
      } else if (this.isLocked) {
        this.isLocked = false;
      }
      if (this.isLocked) {
        if (this.lockedDirection === "vertical") {
          point[0] = this.origin[0];
        } else {
          point[1] = this.origin[1];
        }
      }
      const nextPrev = import_core24.Vec.med(this.previous, point);
      this.previous = nextPrev;
      const newPoint = import_core24.Vec.round([
        ...import_core24.Vec.sub(this.previous, this.origin),
        pressure
      ]);
      if (import_core24.Vec.isEqual(this.last, newPoint))
        return data;
      this.last = newPoint;
      this.points.push(newPoint);
      if (this.points.length <= 2)
        return data;
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            [snapshot.id]: {
              ...data.page.shapes[snapshot.id],
              points: [...this.points]
            }
          }
        },
        pageState: {
          ...data.pageState,
          selectedIds: [snapshot.id]
        }
      };
    };
    this.cancel = (data) => {
      const {snapshot} = this;
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            [snapshot.id]: void 0
          }
        },
        pageState: {
          ...data.pageState,
          selectedIds: []
        }
      };
    };
    this.complete = (data) => {
      const {snapshot} = this;
      return {
        id: "create_draw",
        before: {
          page: {
            shapes: {
              [snapshot.id]: void 0
            }
          },
          pageState: {
            selectedIds: []
          }
        },
        after: {
          page: {
            shapes: {
              [snapshot.id]: TLDR.onSessionComplete(data, data.page.shapes[snapshot.id])
            }
          },
          pageState: {
            selectedIds: []
          }
        }
      };
    };
    this.origin = point;
    this.previous = point;
    this.last = point;
    this.snapshot = getDrawSnapshot(data, id);
    this.points = [[0, 0, 0.5]];
  }
};
function getDrawSnapshot(data, shapeId) {
  const {page} = data;
  const {points, point} = import_core24.Utils.deepClone(page.shapes[shapeId]);
  return {
    id: shapeId,
    point,
    points
  };
}

// src/state/session/sessions/rotate/rotate.session.ts
var import_core25 = __toModule(require_cjs());
var PI22 = Math.PI * 2;
var RotateSession = class {
  constructor(data, point) {
    this.id = "rotate";
    this.delta = [0, 0];
    this.prev = 0;
    this.start = (data) => data;
    this.update = (data, point, isLocked = false) => {
      const {commonBoundsCenter, initialShapes} = this.snapshot;
      const next = {
        ...data,
        page: {
          ...data.page
        },
        pageState: {
          ...data.pageState
        }
      };
      const {page, pageState} = next;
      const a1 = import_core25.Vec.angle(commonBoundsCenter, this.origin);
      const a22 = import_core25.Vec.angle(commonBoundsCenter, point);
      let rot = a22 - a1;
      this.prev = rot;
      if (isLocked) {
        rot = import_core25.Utils.clampToRotationToSegments(rot, 24);
      }
      pageState.boundsRotation = (PI22 + (this.snapshot.boundsRotation + rot)) % PI22;
      next.page.shapes = {
        ...next.page.shapes,
        ...Object.fromEntries(initialShapes.map(({id, center, offset, shape: {rotation = 0}}) => {
          const shape = page.shapes[id];
          const nextRotation = isLocked ? import_core25.Utils.clampToRotationToSegments(rotation + rot, 24) : rotation + rot;
          const nextPoint = import_core25.Vec.sub(import_core25.Vec.rotWith(center, commonBoundsCenter, rot), offset);
          return [
            id,
            {
              ...next.page.shapes[id],
              ...TLDR.mutate(data, shape, {
                point: nextPoint,
                rotation: (PI22 + nextRotation) % PI22
              })
            }
          ];
        }))
      };
      return next;
    };
    this.cancel = (data) => {
      const {initialShapes} = this.snapshot;
      for (const {id, shape} of initialShapes) {
        data.page.shapes[id] = {...shape};
      }
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            ...Object.fromEntries(initialShapes.map(({id, shape}) => [
              id,
              TLDR.onSessionComplete(data, shape)
            ]))
          }
        }
      };
    };
    this.origin = point;
    this.snapshot = getRotateSnapshot(data);
  }
  complete(data) {
    const {hasUnlockedShapes, initialShapes} = this.snapshot;
    if (!hasUnlockedShapes)
      return data;
    return {
      id: "rotate",
      before: {
        page: {
          shapes: Object.fromEntries(initialShapes.map(({shape: {id, point, rotation = void 0}}) => {
            return [id, {point, rotation}];
          }))
        }
      },
      after: {
        page: {
          shapes: Object.fromEntries(this.snapshot.initialShapes.map(({shape}) => {
            const {point, rotation} = data.page.shapes[shape.id];
            return [shape.id, {point, rotation}];
          }))
        }
      }
    };
  }
};
function getRotateSnapshot(data) {
  const initialShapes = TLDR.getSelectedBranchSnapshot(data);
  if (initialShapes.length === 0) {
    throw Error("No selected shapes!");
  }
  const hasUnlockedShapes = initialShapes.length > 0;
  const shapesBounds = Object.fromEntries(initialShapes.map((shape) => [shape.id, TLDR.getBounds(shape)]));
  const rotatedBounds = Object.fromEntries(initialShapes.map((shape) => [shape.id, TLDR.getRotatedBounds(shape)]));
  const bounds = import_core25.Utils.getCommonBounds(Object.values(shapesBounds));
  const commonBoundsCenter = import_core25.Utils.getBoundsCenter(bounds);
  return {
    hasUnlockedShapes,
    boundsRotation: data.pageState.boundsRotation || 0,
    commonBoundsCenter,
    initialShapes: initialShapes.filter((shape) => shape.children === void 0).map((shape) => {
      const bounds2 = TLDR.getBounds(shape);
      const center = import_core25.Utils.getBoundsCenter(bounds2);
      const offset = import_core25.Vec.sub(center, shape.point);
      const rotationOffset = import_core25.Vec.sub(center, import_core25.Utils.getBoundsCenter(rotatedBounds[shape.id]));
      return {
        id: shape.id,
        shape: import_core25.Utils.deepClone(shape),
        offset,
        rotationOffset,
        center
      };
    })
  };
}

// src/state/session/sessions/handle/handle.session.ts
var import_core26 = __toModule(require_cjs());
var HandleSession = class {
  constructor(data, handleId, point, commandId = "move_handle") {
    this.id = "transform_single";
    this.delta = [0, 0];
    this.shiftKey = false;
    this.start = (data) => data;
    this.update = (data, point, shiftKey, altKey, metaKey) => {
      const {initialShape, origin} = this;
      const shape = TLDR.getShape(data, initialShape.id);
      TLDR.assertShapeHasProperty(shape, "handles");
      this.shiftKey = shiftKey;
      const delta = import_core26.Vec.vec(origin, point);
      const handles = initialShape.handles;
      const handleId = this.handleId;
      const change = TLDR.getShapeUtils(shape).onHandleChange(shape, {
        [handleId]: {
          ...shape.handles[handleId],
          point: import_core26.Vec.round(import_core26.Vec.add(handles[handleId].point, delta))
        }
      }, {delta, shiftKey, altKey, metaKey});
      if (!change)
        return data;
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            [shape.id]: {
              ...shape,
              ...change
            }
          }
        }
      };
    };
    this.cancel = (data) => {
      const {initialShape} = this;
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            [initialShape.id]: initialShape
          }
        }
      };
    };
    const shapeId = data.pageState.selectedIds[0];
    this.origin = point;
    this.handleId = handleId;
    this.initialShape = TLDR.getShape(data, shapeId);
    this.commandId = commandId;
  }
  complete(data) {
    return {
      id: this.commandId,
      before: {
        page: {
          shapes: {
            [this.initialShape.id]: this.initialShape
          }
        }
      },
      after: {
        page: {
          shapes: {
            [this.initialShape.id]: TLDR.onSessionComplete(data, data.page.shapes[this.initialShape.id])
          }
        }
      }
    };
  }
};

// src/state/session/sessions/text/text.session.ts
var TextSession = class {
  constructor(data, id) {
    this.id = "text";
    this.start = (data) => {
      return {
        ...data,
        pageState: {
          ...data.pageState,
          editingId: this.initialShape.id
        }
      };
    };
    this.update = (data, text) => {
      const {
        initialShape: {id}
      } = this;
      let nextShape = {
        ...data.page.shapes[id],
        text
      };
      nextShape = {
        ...nextShape,
        ...TLDR.getShapeUtils(nextShape).onStyleChange(nextShape)
      };
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            [id]: nextShape
          }
        }
      };
    };
    this.cancel = (data) => {
      const {
        initialShape: {id}
      } = this;
      return {
        ...data,
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            [id]: TLDR.onSessionComplete(data, data.page.shapes[id])
          }
        },
        pageState: {
          ...data.pageState,
          editingId: void 0
        }
      };
    };
    this.initialShape = TLDR.getShape(data, id || TLDR.getSelectedIds(data)[0]);
  }
  complete(data) {
    const {initialShape} = this;
    const shape = data.page.shapes[initialShape.id];
    if (shape.text === initialShape.text)
      return data;
    return {
      id: "text",
      before: {
        page: {
          shapes: {
            [initialShape.id]: initialShape
          }
        },
        pageState: {
          editingId: void 0
        }
      },
      after: {
        page: {
          shapes: {
            [initialShape.id]: TLDR.onSessionComplete(data, data.page.shapes[initialShape.id])
          }
        },
        pageState: {
          editingId: void 0
        }
      }
    };
  }
};

// src/state/tlstate.ts
var initialData = {
  settings: {
    isPenMode: false,
    isDarkMode: false,
    isDebugMode: false,
    isReadonlyMode: false,
    nudgeDistanceLarge: 10,
    nudgeDistanceSmall: 1
  },
  appState: {
    activeToolType: void 0,
    activeTool: "select",
    hoveredId: void 0,
    currentPageId: "page",
    pages: [{id: "page"}],
    currentStyle: defaultStyle,
    selectedStyle: defaultStyle,
    isToolLocked: false,
    isStyleOpen: false,
    isEmptyCanvas: false
  },
  page: {
    id: "page",
    childIndex: 1,
    shapes: {},
    bindings: {}
  },
  pageState: {
    id: "page",
    selectedIds: [],
    camera: {
      point: [0, 0],
      zoom: 1
    }
  }
};
var TLDrawState = class {
  constructor() {
    this.store = esm_default(() => initialData);
    this.history = {
      stack: [],
      pointer: -1
    };
    this.status = {
      current: "idle",
      previous: "idle"
    };
    this.currentDocumentId = "doc";
    this.currentPageId = "page";
    this.pages = {page: initialData.page};
    this.pageStates = {page: initialData.pageState};
    this.getState = this.store.getState;
    this.setState = (data) => {
      const current = this.getState();
      let result = typeof data === "function" ? data(current) : data;
      let next = {...current, ...result};
      if ("page" in result) {
        next.page = {
          ...next.page,
          shapes: Object.fromEntries(Object.entries(next.page.shapes).filter(([_, shape]) => {
            return shape && (shape.parentId === next.page.id || next.page.shapes[shape.parentId]);
          }))
        };
      }
      const newSelectedStyle = TLDR.getSelectedStyle(next);
      if (newSelectedStyle) {
        next = {
          ...next,
          appState: {
            ...current.appState,
            ...next.appState,
            selectedStyle: newSelectedStyle
          }
        };
      }
      this.store.setState(next);
      this.pages[next.page.id] = next.page;
      this.pageStates[next.page.id] = next.pageState;
      return this;
    };
    this.getShape = (id) => {
      return this.getState().page.shapes[id];
    };
    this.getPage = (id = this.currentPageId) => {
      return this.pages[id];
    };
    this.getPageState = (id = this.currentPageId) => {
      return this.pageStates[id];
    };
    this.getAppState = (id = this.currentPageId) => {
      return this.getState().appState;
    };
    this.getPagePoint = (point) => {
      const {camera} = this.getPageState();
      return import_core27.Vec.sub(import_core27.Vec.div(point, camera.zoom), camera.point);
    };
    this.toggleStylePanel = () => {
      this.setState((data) => ({
        appState: {
          ...data.appState,
          isStyleOpen: !data.appState.isStyleOpen
        }
      }));
      return this;
    };
    this.togglePenMode = () => {
      this.setState((data) => ({
        settings: {
          ...data.settings,
          isPenMode: !data.settings.isPenMode
        }
      }));
      return this;
    };
    this.toggleDarkMode = () => {
      this.setState((data) => ({
        settings: {
          ...data.settings,
          isDarkMode: !data.settings.isDarkMode
        }
      }));
      return this;
    };
    this.reset = () => {
      this.setState((data) => ({
        appState: {
          ...data.appState,
          ...initialData.appState
        },
        settings: {
          ...data.appState,
          ...initialData.settings
        }
      }));
      this._onChange?.(this, `reset`);
      return this;
    };
    this.selectTool = (tool) => {
      this.setState((data) => ({
        appState: {
          ...data.appState,
          activeTool: tool,
          activeToolType: tool === "select" ? "select" : TLDR.getShapeUtils({type: tool}).toolType
        }
      }));
      return this;
    };
    this.toggleToolLock = () => {
      this.setState((data) => ({
        appState: {
          ...data.appState,
          isToolLocked: true
        }
      }));
      return this;
    };
    this.zoomIn = () => {
      const i6 = Math.round(this.store.getState().pageState.camera.zoom * 100 / 25);
      const nextZoom = TLDR.getCameraZoom((i6 + 1) * 0.25);
      this.zoomTo(nextZoom);
      return this;
    };
    this.zoomOut = () => {
      const i6 = Math.round(this.store.getState().pageState.camera.zoom * 100 / 25);
      const nextZoom = TLDR.getCameraZoom((i6 - 1) * 0.25);
      this.zoomTo(nextZoom);
      return this;
    };
    this.zoomToFit = () => {
      this.setState((data) => {
        const shapes = Object.values(data.page.shapes);
        if (shapes.length === 0)
          return {pageState: data.pageState};
        const bounds = import_core27.Utils.getCommonBounds(Object.values(shapes).map(TLDR.getBounds));
        const zoom = TLDR.getCameraZoom(bounds.width > bounds.height ? (window.innerWidth - 128) / bounds.width : (window.innerHeight - 128) / bounds.height);
        const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom;
        const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom;
        return {
          pageState: {
            ...data.pageState,
            camera: {
              ...data.pageState.camera,
              point: import_core27.Vec.round(import_core27.Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
              zoom
            }
          }
        };
      });
      return this;
    };
    this.zoomToSelection = () => {
      this.setState((data) => {
        if (TLDR.getSelectedIds(data).length === 0)
          return {pageState: data.pageState};
        const bounds = TLDR.getSelectedBounds(data);
        const zoom = TLDR.getCameraZoom(bounds.width > bounds.height ? (window.innerWidth - 128) / bounds.width : (window.innerHeight - 128) / bounds.height);
        const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom;
        const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom;
        return {
          pageState: {
            ...data.pageState,
            camera: {
              ...data.pageState.camera,
              point: import_core27.Vec.round(import_core27.Vec.add([-bounds.minX, -bounds.minY], [mx, my])),
              zoom
            }
          }
        };
      });
      return this;
    };
    this.resetCamera = () => {
      this.setState((data) => ({
        pageState: {
          ...data.pageState,
          camera: {
            zoom: 1,
            point: import_core27.Vec.round([window.innerWidth / 2, window.innerHeight / 2])
          }
        }
      }));
      return this;
    };
    this.zoomToContent = () => {
      this.setState((data) => {
        const shapes = Object.values(data.page.shapes);
        if (shapes.length === 0)
          return {pageState: data.pageState};
        const bounds = import_core27.Utils.getCommonBounds(Object.values(shapes).map(TLDR.getBounds));
        const {zoom} = data.pageState.camera;
        const mx = (window.innerWidth - bounds.width * zoom) / 2 / zoom;
        const my = (window.innerHeight - bounds.height * zoom) / 2 / zoom;
        return {
          pageState: {
            ...data.pageState,
            camera: {
              ...data.pageState.camera,
              point: import_core27.Vec.round(import_core27.Vec.add([-bounds.minX, -bounds.minY], [mx, my]))
            }
          }
        };
      });
      return this;
    };
    this.zoomToActual = () => {
      this.zoomTo(1);
      return this;
    };
    this.zoom = import_core27.Utils.throttle((delta) => {
      const {zoom} = this.store.getState().pageState.camera;
      const nextZoom = TLDR.getCameraZoom(zoom - delta * zoom);
      this.zoomTo(nextZoom);
      return this;
    }, 16);
    this.pan = (delta) => {
      this.setState((data) => {
        return {
          pageState: {
            ...data.pageState,
            camera: {
              ...data.pageState.camera,
              point: import_core27.Vec.round(import_core27.Vec.sub(data.pageState.camera.point, delta))
            }
          }
        };
      });
      return this;
    };
    this.pinchZoom = (point, delta, zoomDelta) => {
      this.setState((data) => {
        const {camera} = data.pageState;
        const nextPoint = import_core27.Vec.add(camera.point, import_core27.Vec.div(delta, camera.zoom));
        const nextZoom = TLDR.getCameraZoom(camera.zoom - zoomDelta * camera.zoom);
        const p0 = import_core27.Vec.sub(import_core27.Vec.div(point, camera.zoom), nextPoint);
        const p1 = import_core27.Vec.sub(import_core27.Vec.div(point, nextZoom), nextPoint);
        return {
          pageState: {
            ...data.pageState,
            camera: {
              ...data.pageState.camera,
              point: import_core27.Vec.round(import_core27.Vec.add(nextPoint, import_core27.Vec.sub(p1, p0))),
              zoom: nextZoom
            }
          }
        };
      });
      return this;
    };
    this.loadDocument = (document2, onChange) => {
      this._onChange = onChange;
      this.currentDocumentId = document2.id;
      this.pages = import_core27.Utils.deepClone(document2.pages);
      this.pageStates = import_core27.Utils.deepClone(document2.pageStates);
      this.currentPageId = Object.values(this.pages)[0].id;
      this.setState((data) => ({
        page: this.pages[this.currentPageId],
        pageState: this.pageStates[this.currentPageId],
        appState: {
          ...data.appState,
          pageIds: Object.values(this.pages).sort((a6, b5) => (a6.childIndex || 0) - (b5.childIndex || 0)).map((page) => page.id)
        }
      }));
      return this;
    };
    this.undo = () => {
      const {history} = this;
      if (history.pointer <= -1)
        return this;
      const command = history.stack[history.pointer];
      this.setState((data) => import_core27.Utils.deepMerge(data, command.before));
      history.pointer--;
      this._onChange?.(this, `undo:${command.id}`);
      return this;
    };
    this.redo = () => {
      const {history} = this;
      if (history.pointer >= history.stack.length - 1)
        return this;
      history.pointer++;
      const command = history.stack[history.pointer];
      this.setState((data) => import_core27.Utils.deepMerge(data, command.after));
      this._onChange?.(this, `redo:${command.id}`);
      return this;
    };
    this.select = (...ids) => {
      this.setSelectedIds(ids);
      return this;
    };
    this.selectAll = () => {
      this.setState((data) => ({
        appState: {
          ...data.appState,
          activeTool: "select",
          activeToolType: "select"
        },
        pageState: {
          ...data.pageState,
          selectedIds: Object.keys(data.page.shapes)
        }
      }));
      return this;
    };
    this.deselectAll = () => {
      this.setSelectedIds([]);
      return this;
    };
    this.style = (style2, ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(style(data, idsToMutate, style2));
      return this;
    };
    this.align = (type, ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(align(data, idsToMutate, type));
      return this;
    };
    this.distribute = (type, ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(distribute(data, idsToMutate, type));
      return this;
    };
    this.stretch = (type, ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(stretch(data, idsToMutate, type));
      return this;
    };
    this.flipHorizontal = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(flip(data, idsToMutate, FlipType.Horizontal));
      return this;
    };
    this.flipVertical = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(flip(data, idsToMutate, FlipType.Vertical));
      return this;
    };
    this.moveToBack = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(move(data, idsToMutate, MoveType.ToBack));
      return this;
    };
    this.moveBackward = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(move(data, idsToMutate, MoveType.Backward));
      return this;
    };
    this.moveForward = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(move(data, idsToMutate, MoveType.Forward));
      return this;
    };
    this.moveToFront = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(move(data, idsToMutate, MoveType.ToFront));
      return this;
    };
    this.nudge = (delta, isMajor = false, ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(translate(data, idsToMutate, import_core27.Vec.mul(delta, isMajor ? 10 : 1)));
      return this;
    };
    this.duplicate = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(duplicate(data, idsToMutate));
      return this;
    };
    this.toggleHidden = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(toggle(data, idsToMutate, "isHidden"));
      return this;
    };
    this.toggleLocked = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(toggle(data, idsToMutate, "isLocked"));
      return this;
    };
    this.toggleAspectRatioLocked = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(toggle(data, idsToMutate, "isAspectRatioLocked"));
      return this;
    };
    this.rotate = (delta = Math.PI * -0.5, ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      this.do(rotate(data, idsToMutate, delta));
      return this;
    };
    this.group = (ids) => {
      return this;
    };
    this.create = (...shapes) => {
      const data = this.store.getState();
      this.do(create2(data, shapes));
      return this;
    };
    this.delete = (ids) => {
      const data = this.store.getState();
      const idsToMutate = ids ? ids : data.pageState.selectedIds;
      if (idsToMutate.length === 0)
        return this;
      this.do(deleteShapes(data, idsToMutate));
      return this;
    };
    this.clear = () => {
      this.selectAll();
      this.delete();
      return this;
    };
    this.cancel = () => {
      switch (this.status.current) {
        case "idle": {
          this.deselectAll();
          this.selectTool("select");
          break;
        }
        case "brushing": {
          this.cancelSession();
          import_core28.brushUpdater.clear();
          break;
        }
        case "translating": {
          this.cancelSession();
          break;
        }
        case "transforming": {
          this.cancelSession();
          break;
        }
        case "rotating": {
          this.cancelSession();
          break;
        }
        case "creating": {
          this.cancelSession();
          this.delete();
          break;
        }
      }
      return this;
    };
    this.copy = (ids) => {
      const data = this.store.getState();
      const idsToCopy = ids ? ids : data.pageState.selectedIds;
      this.clipboard = idsToCopy.map((id) => {
        const shape = data.page.shapes[id];
        return {
          ...shape,
          id: import_core27.Utils.uniqueId(),
          childIndex: TLDR.getChildIndexAbove(data, id)
        };
      });
      return this;
    };
    this.paste = (string) => {
      const {data} = this;
      if (string) {
        try {
          const jsonShapes = JSON.parse(string);
          this.create(...jsonShapes);
        } catch (e14) {
          const childIndex = Object.values(data.page.shapes).sort((a6, b5) => b5.childIndex - a6.childIndex)[0].childIndex + 1;
          const shape = TLDR.getShapeUtils(TLDrawShapeType.Text).create({
            id: import_core27.Utils.uniqueId(),
            parentId: data.page.id,
            childIndex,
            point: this.getPagePoint([
              window.innerWidth / 2,
              window.innerHeight / 2
            ]),
            style: {...data.appState.currentStyle}
          });
          const boundsCenter = import_core27.Utils.centerBounds(TLDR.getShapeUtils(shape).getBounds(shape), this.getPagePoint([window.innerWidth / 2, window.innerHeight / 2]));
          this.create(TLDR.getShapeUtils(TLDrawShapeType.Text).create({
            id: import_core27.Utils.uniqueId(),
            parentId: data.page.id,
            childIndex,
            point: [boundsCenter.minX, boundsCenter.minY]
          }));
        }
      }
      if (!this.clipboard)
        return this;
      const shapesToPaste = this.clipboard.map((shape) => {
        return {
          ...shape,
          id: import_core27.Utils.uniqueId()
        };
      });
      const commonBounds = import_core27.Utils.getCommonBounds(shapesToPaste.map(TLDR.getBounds));
      const centeredBounds = import_core27.Utils.centerBounds(commonBounds, this.getPagePoint([window.innerWidth / 2, window.innerHeight / 2]));
      let delta = import_core27.Vec.sub(import_core27.Utils.getBoundsCenter(centeredBounds), import_core27.Utils.getBoundsCenter(commonBounds));
      if (import_core27.Vec.isEqual(delta, [0, 0])) {
        delta = [16, 16];
      }
      this.create(...shapesToPaste.map((shape) => ({
        ...shape,
        point: import_core27.Vec.round(import_core27.Vec.add(shape.point, delta))
      })));
      return this;
    };
    this.copyAsSvg = () => {
      return "<svg/>";
    };
    this.copyAsJson = () => {
      return {};
    };
    this.save = () => {
      return this;
    };
    this.startBrushSession = (point) => {
      this.setStatus("brushing");
      this.startSession(new BrushSession(this.store.getState(), point));
      return this;
    };
    this.updateBrushSession = (point, metaKey = false) => {
      this.updateSession(point, metaKey);
      return this;
    };
    this.startTranslateSession = (point) => {
      this.setStatus("translating");
      this.startSession(new TranslateSession(this.store.getState(), point));
      return this;
    };
    this.updateTranslateSession = (point, shiftKey = false, altKey = false) => {
      this.updateSession(point, shiftKey, altKey);
      return this;
    };
    this.startTransformSession = (point, handle, commandId) => {
      const {selectedIds} = this;
      if (selectedIds.length === 0)
        return this;
      this.setStatus("transforming");
      this.pointedBoundsHandle = handle;
      if (this.pointedBoundsHandle === "rotate") {
        this.startSession(new RotateSession(this.store.getState(), point));
      } else if (this.selectedIds.length === 1) {
        this.startSession(new TransformSingleSession(this.store.getState(), point, this.pointedBoundsHandle, commandId));
      } else {
        this.startSession(new TransformSession(this.store.getState(), point, this.pointedBoundsHandle));
      }
      return this;
    };
    this.updateTransformSession = (point, shiftKey = false, altKey = false) => {
      this.updateSession(point, shiftKey, altKey);
      return this;
    };
    this.startTextSession = (id) => {
      this.editingId = id;
      this.setStatus("editing-text");
      this.startSession(new TextSession(this.store.getState(), id));
      return this;
    };
    this.updateTextSession = (text) => {
      this.updateSession(text);
      return this;
    };
    this.startDrawSession = (id, point) => {
      this.setStatus("creating");
      this.startSession(new DrawSession(this.store.getState(), id, point));
      return this;
    };
    this.updateDrawSession = (point, pressure, shiftKey = false) => {
      this.updateSession(point, pressure, shiftKey);
      return this;
    };
    this.startHandleSession = (point, handleId, commandId) => {
      this.startSession(new HandleSession(this.store.getState(), handleId, point, commandId));
      return this;
    };
    this.updateHandleSession = (point, shiftKey = false, altKey = false, metaKey = false) => {
      this.updateSession(point, shiftKey, altKey, metaKey);
      return this;
    };
    this.updateSessionsOnPointerMove = (info) => {
      switch (this.status.current) {
        case "pointingBoundsHandle": {
          if (import_core27.Vec.dist(info.origin, info.point) > 4) {
            this.setStatus("transforming");
            this.startTransformSession(this.getPagePoint(info.origin), this.pointedBoundsHandle);
          }
          break;
        }
        case "pointingHandle": {
          if (import_core27.Vec.dist(info.origin, info.point) > 4) {
            this.setStatus("translatingHandle");
            this.startHandleSession(this.getPagePoint(info.origin), this.pointedHandle);
          }
          break;
        }
        case "pointingBounds": {
          if (import_core27.Vec.dist(info.origin, info.point) > 4) {
            this.setStatus("translating");
            this.startTranslateSession(this.getPagePoint(info.origin));
          }
          break;
        }
        case "brushing": {
          this.updateBrushSession(this.getPagePoint(info.point), info.metaKey);
          break;
        }
        case "translating": {
          this.updateTranslateSession(this.getPagePoint(info.point), info.shiftKey, info.altKey);
          break;
        }
        case "transforming": {
          this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey);
          break;
        }
        case "translatingHandle": {
          this.updateHandleSession(this.getPagePoint(info.point), info.shiftKey, info.altKey);
          break;
        }
        case "creating": {
          switch (this.appState.activeToolType) {
            case "draw": {
              this.updateDrawSession(this.getPagePoint(info.point), info.pressure, info.shiftKey);
              break;
            }
            case "bounds": {
              this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey);
              break;
            }
            case "handle": {
              this.updateHandleSession(this.getPagePoint(info.point), info.shiftKey, info.altKey);
              break;
            }
            case "point": {
              break;
            }
            case "points": {
              break;
            }
          }
          break;
        }
      }
    };
    this.onKeyDown = (key, info) => {
      if (key === "Escape") {
        this.cancel();
        return;
      }
      switch (this.status.current) {
        case "idle": {
          break;
        }
        case "brushing": {
          if (key === "Meta" || key === "Control") {
            this.updateBrushSession(this.getPagePoint(info.point), info.metaKey);
            return;
          }
          break;
        }
        case "translating": {
          if (key === "Escape") {
            this.cancelSession(this.getPagePoint(info.point));
          }
          if (key === "Shift" || key === "Alt") {
            this.updateTranslateSession(this.getPagePoint(info.point), info.shiftKey, info.altKey);
          }
          break;
        }
        case "transforming": {
          if (key === "Escape") {
            this.cancelSession(this.getPagePoint(info.point));
          }
          if (key === "Shift" || key === "Alt") {
            this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey);
          }
          break;
        }
      }
    };
    this.onKeyUp = (key, info) => {
      switch (this.status.current) {
        case "brushing": {
          if (key === "Meta" || key === "Control") {
            this.updateBrushSession(this.getPagePoint(info.point), info.metaKey);
          }
          break;
        }
        case "transforming": {
          if (key === "Shift" || key === "Alt") {
            this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey);
          }
          break;
        }
        case "translating": {
          if (key === "Shift" || key === "Alt") {
            this.updateTransformSession(this.getPagePoint(info.point), info.shiftKey, info.altKey);
          }
          break;
        }
      }
    };
    this.onPinchStart = () => {
      this.setStatus("pinching");
    };
    this.onPinchEnd = () => {
      this.setStatus(this.status.previous);
    };
    this.onPinch = (info, e14) => {
      if (this.status.current !== "pinching")
        return;
      this.pinchZoom(info.origin, info.delta, info.delta[2] / 350);
      this.updateSessionsOnPointerMove(info, e14);
    };
    this.onPan = (info, e14) => {
      if (this.status.current === "pinching")
        return;
      const delta = import_core27.Vec.div(info.delta, this.getPageState().camera.zoom);
      const prev = this.getPageState().camera.point;
      const next = import_core27.Vec.sub(prev, delta);
      if (import_core27.Vec.isEqual(next, prev))
        return;
      this.pan(delta);
      this.updateSessionsOnPointerMove(info, e14);
    };
    this.onZoom = (info, e14) => {
      this.zoom(info.delta[2] / 100);
      this.updateSessionsOnPointerMove(info, e14);
    };
    this.onPointerDown = (info) => {
      switch (this.status.current) {
        case "idle": {
          switch (this.appState.activeTool) {
            case "draw": {
              this.setStatus("creating");
              this.createActiveToolShape(info.point);
              break;
            }
            case "rectangle": {
              this.setStatus("creating");
              this.createActiveToolShape(info.point);
              break;
            }
            case "ellipse": {
              this.setStatus("creating");
              this.createActiveToolShape(info.point);
              break;
            }
            case "arrow": {
              this.setStatus("creating");
              this.createActiveToolShape(info.point);
              break;
            }
          }
        }
      }
    };
    this.onPointerMove = (info, e14) => {
      this.updateSessionsOnPointerMove(info, e14);
    };
    this.onPointerUp = (info) => {
      const data = this.getState();
      switch (this.status.current) {
        case "pointingBounds": {
          if (info.target === "bounds") {
            this.deselectAll();
          } else if (data.pageState.selectedIds.includes(info.target)) {
            if (info.shiftKey) {
              if (this.pointedId !== info.target) {
                this.setSelectedIds(data.pageState.selectedIds.filter((id) => id !== info.target));
              }
            }
          } else if (this.pointedId === info.target) {
            if (info.shiftKey) {
              this.setSelectedIds([...data.pageState.selectedIds, info.target]);
            } else {
              this.setSelectedIds([info.target]);
            }
            this.pointedId = void 0;
          }
          this.setStatus("idle");
          this.pointedId = void 0;
          break;
        }
        case "pointingBoundsHandle": {
          this.setStatus("idle");
          this.pointedBoundsHandle = void 0;
          break;
        }
        case "pointingHandle": {
          this.setStatus("idle");
          this.pointedHandle = void 0;
          break;
        }
        case "translatingHandle": {
          this.completeSession();
          this.pointedHandle = void 0;
          break;
        }
        case "brushing": {
          this.completeSession();
          import_core28.brushUpdater.clear();
          break;
        }
        case "translating": {
          this.completeSession(this.getPagePoint(info.point));
          this.pointedId = void 0;
          break;
        }
        case "transforming": {
          this.completeSession(this.getPagePoint(info.point));
          this.pointedBoundsHandle = void 0;
          break;
        }
        case "creating": {
          this.completeSession(this.getPagePoint(info.point));
          this.pointedHandle = void 0;
        }
      }
    };
    this.onPointCanvas = (info) => {
      switch (this.status.current) {
        case "idle": {
          switch (this.appState.activeTool) {
            case "select": {
              if (!(info.shiftKey || info.metaKey)) {
                this.deselectAll();
              }
              this.startBrushSession(this.getPagePoint(info.point));
              break;
            }
          }
          break;
        }
        case "editing-text": {
          this.completeSession();
          break;
        }
      }
    };
    this.onDoubleClickCanvas = (info) => {
      switch (this.status.current) {
        case "idle": {
          switch (this.appState.activeTool) {
            case "text": {
              this.setStatus("creating");
              this.createActiveToolShape(info.point);
              break;
            }
          }
          break;
        }
      }
    };
    this.onRightPointCanvas = () => {
    };
    this.onDragCanvas = () => {
    };
    this.onReleaseCanvas = () => {
    };
    this.onPointShape = (info) => {
      const data = this.getState();
      switch (this.status.current) {
        case "idle": {
          switch (this.appState.activeTool) {
            case "select": {
              if (info.metaKey) {
                return;
              }
              if (!data.pageState.selectedIds.includes(info.target)) {
                this.pointedId = info.target;
                this.setSelectedIds([info.target], info.shiftKey);
              }
              this.setStatus("pointingBounds");
              break;
            }
          }
          break;
        }
        case "pointingBounds": {
          this.pointedId = info.target;
          break;
        }
      }
    };
    this.onReleaseShape = (info) => {
    };
    this.onDoubleClickShape = (info) => {
      if (this.selectedIds.includes(info.target)) {
        this.setSelectedIds([info.target]);
      }
    };
    this.onRightPointShape = () => {
    };
    this.onDragShape = (info) => {
    };
    this.onHoverShape = (info) => {
      this.setState((data) => ({
        pageState: {...data.pageState, hoveredId: info.target}
      }));
    };
    this.onUnhoverShape = (info) => {
      setTimeout(() => {
        this.setState((data) => data.pageState.hoveredId === info.target ? {
          pageState: {...data.pageState, hoveredId: void 0}
        } : data);
      }, 10);
    };
    this.onPointBounds = (info) => {
      this.setStatus("pointingBounds");
    };
    this.onDoubleClickBounds = () => {
    };
    this.onRightPointBounds = () => {
    };
    this.onDragBounds = (info) => {
    };
    this.onHoverBounds = () => {
    };
    this.onUnhoverBounds = () => {
    };
    this.onReleaseBounds = (info) => {
      switch (this.status.current) {
        case "translating": {
          this.completeSession(this.getPagePoint(info.point));
          break;
        }
        case "brushing": {
          this.completeSession();
          import_core28.brushUpdater.clear();
          break;
        }
      }
    };
    this.onPointBoundsHandle = (info) => {
      this.pointedBoundsHandle = info.target;
      this.setStatus("pointingBoundsHandle");
    };
    this.onDoubleClickBoundsHandle = () => {
    };
    this.onRightPointBoundsHandle = () => {
    };
    this.onDragBoundsHandle = () => {
    };
    this.onHoverBoundsHandle = () => {
    };
    this.onUnhoverBoundsHandle = () => {
    };
    this.onReleaseBoundsHandle = () => {
    };
    this.onPointHandle = (info) => {
      this.pointedHandle = info.target;
      this.setStatus("pointingHandle");
    };
    this.onDoubleClickHandle = () => {
    };
    this.onRightPointHandle = () => {
    };
    this.onDragHandle = () => {
    };
    this.onHoverHandle = () => {
    };
    this.onUnhoverHandle = () => {
    };
    this.onReleaseHandle = () => {
    };
    this.onTextChange = (_id, text) => {
      this.updateTextSession(text);
    };
    this.onTextBlur = (_id) => {
      this.completeSession();
    };
    this.onTextFocus = (_id) => {
    };
    this.onTextKeyDown = (_id, key) => {
    };
    this.onTextKeyUp = (_id, key) => {
    };
    this.onChange = (ids) => {
      const appState = this.getAppState();
      if (appState.isEmptyCanvas && ids.length > 0) {
        this.setState((data) => ({
          appState: {
            ...data.appState,
            isEmptyCanvas: false
          }
        }));
      } else if (!appState.isEmptyCanvas && ids.length <= 0) {
        this.setState((data) => ({
          appState: {
            ...data.appState,
            isEmptyCanvas: true
          }
        }));
      }
    };
    this.onError = (error) => {
    };
    this.onBlurEditingShape = () => {
      this.completeSession();
    };
  }
  setStatus(status) {
    this.status.previous = this.status.current;
    this.status.current = status;
    return this;
  }
  zoomTo(next) {
    this.setState((data) => {
      const {zoom, point} = TLDR.getCurrentCamera(data);
      const center = [window.innerWidth / 2, window.innerHeight / 2];
      const p0 = import_core27.Vec.sub(import_core27.Vec.div(center, zoom), point);
      const p1 = import_core27.Vec.sub(import_core27.Vec.div(center, next), point);
      return {
        pageState: {
          ...data.pageState,
          camera: {
            ...data.pageState.camera,
            point: import_core27.Vec.round(import_core27.Vec.add(point, import_core27.Vec.sub(p1, p0))),
            zoom: next
          }
        }
      };
    });
    return this;
  }
  setCurrentPageId(pageId) {
    if (pageId === this.currentPageId)
      return this;
    this.currentPageId = pageId;
    this.setState({
      page: this.pages[pageId],
      pageState: this.pageStates[pageId]
    });
    return this;
  }
  startSession(session, ...args) {
    this.session = session;
    this.setState((data) => session.start(data, ...args));
    this._onChange?.(this, `session:start_${session.id}`);
    return this;
  }
  updateSession(...args) {
    const {session} = this;
    if (!session)
      return this;
    this.setState((data) => session.update(data, ...args));
    this._onChange?.(this, `session:update:${session.id}`);
    return this;
  }
  cancelSession(...args) {
    const {session} = this;
    if (!session)
      return this;
    this.setState((data) => session.cancel(data, ...args));
    this.setStatus("idle");
    this.session = void 0;
    this._onChange?.(this, `session:cancel:${session.id}`);
    return this;
  }
  completeSession(...args) {
    const {session} = this;
    if (!session)
      return this;
    this.setStatus("idle");
    const result = session.complete(this.store.getState(), ...args);
    if ("after" in result) {
      this.do(result);
    } else {
      this.setState((data) => import_core27.Utils.deepMerge(data, result));
      this._onChange?.(this, `session:complete:${session.id}`);
    }
    const {isToolLocked, activeTool} = this.appState;
    if (!isToolLocked && activeTool !== "draw") {
      this.selectTool("select");
    }
    this.session = void 0;
    return this;
  }
  do(command) {
    const {history} = this;
    if (history.pointer !== history.stack.length - 1) {
      history.stack = history.stack.slice(0, history.pointer + 1);
    }
    history.stack.push(command);
    history.pointer = history.stack.length - 1;
    this.setState((data) => import_core27.Utils.deepMerge(data, history.stack[history.pointer].after));
    this._onChange?.(this, `command:${command.id}`);
    return this;
  }
  setSelectedIds(ids, push = false) {
    this.setState((data) => {
      return {
        pageState: {
          ...data.pageState,
          selectedIds: push ? [...data.pageState.selectedIds, ...ids] : [...ids]
        }
      };
    });
    return this;
  }
  createActiveToolShape(point) {
    const id = import_core27.Utils.uniqueId();
    const pagePoint = import_core27.Vec.round(this.getPagePoint(point));
    this.setState((data) => {
      const {activeTool: activeTool2, activeToolType: activeToolType2} = data.appState;
      if (activeTool2 === "select")
        return data;
      if (!activeToolType2)
        throw Error;
      const utils = TLDR.getShapeUtils({type: activeTool2});
      const shapes = Object.values(data.page.shapes);
      const childIndex = shapes.length === 0 ? 1 : shapes.sort((a6, b5) => b5.childIndex - a6.childIndex)[0].childIndex + 1;
      return {
        page: {
          ...data.page,
          shapes: {
            ...data.page.shapes,
            [id]: utils.create({
              id,
              parentId: data.page.id,
              childIndex,
              point: pagePoint,
              style: {...data.appState.currentStyle}
            })
          }
        },
        pageState: {
          ...data.pageState,
          selectedIds: [id]
        }
      };
    });
    const {activeTool, activeToolType} = this.getAppState();
    switch (activeToolType) {
      case TLDrawToolType.Draw: {
        this.startDrawSession(id, pagePoint);
        break;
      }
      case TLDrawToolType.Bounds: {
        this.startTransformSession(pagePoint, import_core27.TLBoundsCorner.BottomRight, `create_${activeTool}`);
        break;
      }
      case TLDrawToolType.Handle: {
        this.startHandleSession(pagePoint, "end", `create_${activeTool}`);
        break;
      }
      case TLDrawToolType.Text: {
        this.startTextSession();
        break;
      }
      case TLDrawToolType.Point: {
        break;
      }
      case TLDrawToolType.Points: {
        break;
      }
    }
  }
  get document() {
    return {
      id: this.currentDocumentId,
      pages: this.pages,
      pageStates: this.pageStates
    };
  }
  get data() {
    return this.getState();
  }
  get selectedIds() {
    return this.pageState.selectedIds;
  }
  get page() {
    return this.pages[this.currentPageId];
  }
  get pageState() {
    return this.pageStates[this.currentPageId];
  }
  get appState() {
    return this.data.appState;
  }
};

// src/components/tldraw.tsx
var hideBoundsSelector = (s9) => s9.appState.activeTool !== "select" || s9.pageState.selectedIds.length === 1 && s9.pageState.selectedIds.every((id) => s9.page.shapes[id].handles !== void 0);
var pageSelector = (s9) => s9.page;
var pageStateSelector = (s9) => s9.pageState;
function TLDraw({
  document: document2,
  currentPageId,
  onMount,
  onChange: _onChange
}) {
  const [tlstate] = React36.useState(() => new TLDrawState());
  const [context] = React36.useState(() => {
    return {tlstate, useSelector: tlstate.store};
  });
  useKeyboardShortcuts(tlstate);
  const hideBounds = context.useSelector(hideBoundsSelector);
  const page = context.useSelector(pageSelector);
  const pageState = context.useSelector(pageStateSelector);
  React36.useEffect(() => {
    if (!document2)
      return;
    tlstate.loadDocument(document2, _onChange);
  }, [document2, tlstate]);
  React36.useEffect(() => {
    if (!currentPageId)
      return;
    tlstate.setCurrentPageId(currentPageId);
  }, [currentPageId, tlstate]);
  React36.useEffect(() => {
    onMount?.(tlstate);
  }, []);
  return /* @__PURE__ */ React36.createElement(TLDrawContext.Provider, {
    value: context
  }, /* @__PURE__ */ React36.createElement(IdProvider, null, /* @__PURE__ */ React36.createElement(Layout, null, /* @__PURE__ */ React36.createElement(ContextMenu2, null, /* @__PURE__ */ React36.createElement(import_core29.Renderer, {
    page,
    pageState,
    shapeUtils: tldrawShapeUtils,
    hideBounds,
    hideIndicators: !!tlstate.session || hideBounds,
    onPinchStart: tlstate.onPinchStart,
    onPinchEnd: tlstate.onPinchEnd,
    onPinch: tlstate.onPinch,
    onPan: tlstate.onPan,
    onZoom: tlstate.onZoom,
    onPointerDown: tlstate.onPointerDown,
    onPointerMove: tlstate.onPointerMove,
    onPointerUp: tlstate.onPointerUp,
    onPointCanvas: tlstate.onPointCanvas,
    onDoubleClickCanvas: tlstate.onDoubleClickCanvas,
    onRightPointCanvas: tlstate.onRightPointCanvas,
    onDragCanvas: tlstate.onDragCanvas,
    onReleaseCanvas: tlstate.onReleaseCanvas,
    onPointShape: tlstate.onPointShape,
    onDoubleClickShape: tlstate.onDoubleClickShape,
    onRightPointShape: tlstate.onRightPointShape,
    onDragShape: tlstate.onDragShape,
    onHoverShape: tlstate.onHoverShape,
    onUnhoverShape: tlstate.onUnhoverShape,
    onReleaseShape: tlstate.onReleaseShape,
    onPointBounds: tlstate.onPointBounds,
    onDoubleClickBounds: tlstate.onDoubleClickBounds,
    onRightPointBounds: tlstate.onRightPointBounds,
    onDragBounds: tlstate.onDragBounds,
    onHoverBounds: tlstate.onHoverBounds,
    onUnhoverBounds: tlstate.onUnhoverBounds,
    onReleaseBounds: tlstate.onReleaseBounds,
    onPointBoundsHandle: tlstate.onPointBoundsHandle,
    onDoubleClickBoundsHandle: tlstate.onDoubleClickBoundsHandle,
    onRightPointBoundsHandle: tlstate.onRightPointBoundsHandle,
    onDragBoundsHandle: tlstate.onDragBoundsHandle,
    onHoverBoundsHandle: tlstate.onHoverBoundsHandle,
    onUnhoverBoundsHandle: tlstate.onUnhoverBoundsHandle,
    onReleaseBoundsHandle: tlstate.onReleaseBoundsHandle,
    onPointHandle: tlstate.onPointHandle,
    onDoubleClickHandle: tlstate.onDoubleClickHandle,
    onRightPointHandle: tlstate.onRightPointHandle,
    onDragHandle: tlstate.onDragHandle,
    onHoverHandle: tlstate.onHoverHandle,
    onUnhoverHandle: tlstate.onUnhoverHandle,
    onReleaseHandle: tlstate.onReleaseHandle,
    onChange: tlstate.onChange,
    onError: tlstate.onError,
    onBlurEditingShape: tlstate.onBlurEditingShape,
    onTextBlur: tlstate.onTextBlur,
    onTextChange: tlstate.onTextChange,
    onTextKeyDown: tlstate.onTextKeyDown,
    onTextFocus: tlstate.onTextFocus,
    onTextKeyUp: tlstate.onTextKeyUp
  })), /* @__PURE__ */ React36.createElement(Spacer, null), /* @__PURE__ */ React36.createElement(StylePanel, null), /* @__PURE__ */ React36.createElement(ToolsPanel, null))));
}
var Spacer = styles_default("div", {
  flexGrow: 2
});
var Layout = styles_default("main", {
  position: "fixed",
  overflow: "hidden",
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  height: "100%",
  width: "100%",
  padding: "8px 8px 0 8px",
  zIndex: 200,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "flex-start",
  boxSizing: "border-box",
  outline: "none",
  pointerEvents: "none",
  "& > *": {
    pointerEvents: "all"
  },
  "& .tl-container": {
    position: "absolute",
    top: 0,
    left: 0
  }
});
/*!
 * hotkeys-js v3.8.7
 * A simple micro-library for defining and dispatching keyboard shortcuts. It has no dependencies.
 * 
 * Copyright (c) 2021 kenny wong <wowohoo@qq.com>
 * http://jaywcjlove.github.io/hotkeys
 * 
 * Licensed under the MIT license.
 */
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/**
 * String.prototype.replaceAll() polyfill
 * https://gomakethings.com/how-to-replace-a-section-of-a-string-with-another-one-with-vanilla-js/
 * @author Chris Ferdinandi
 * @license MIT
 */
