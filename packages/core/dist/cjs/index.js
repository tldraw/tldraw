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

// ../../node_modules/react-error-boundary/dist/react-error-boundary.umd.js
var require_react_error_boundary_umd = __commonJS({
  "../../node_modules/react-error-boundary/dist/react-error-boundary.umd.js"(exports, module2) {
    (function(global, factory) {
      typeof exports === "object" && typeof module2 !== "undefined" ? factory(exports, require("react")) : typeof define === "function" && define.amd ? define(["exports", "react"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.ReactErrorBoundary = {}, global.React));
    })(exports, function(exports2, React31) {
      "use strict";
      function _interopNamespace(e) {
        if (e && e.__esModule)
          return e;
        var n = Object.create(null);
        if (e) {
          Object.keys(e).forEach(function(k) {
            if (k !== "default") {
              var d = Object.getOwnPropertyDescriptor(e, k);
              Object.defineProperty(n, k, d.get ? d : {
                enumerable: true,
                get: function() {
                  return e[k];
                }
              });
            }
          });
        }
        n["default"] = e;
        return Object.freeze(n);
      }
      var React__namespace = /* @__PURE__ */ _interopNamespace(React31);
      function _setPrototypeOf(o, p) {
        _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf2(o2, p2) {
          o2.__proto__ = p2;
          return o2;
        };
        return _setPrototypeOf(o, p);
      }
      function _inheritsLoose2(subClass, superClass) {
        subClass.prototype = Object.create(superClass.prototype);
        subClass.prototype.constructor = subClass;
        _setPrototypeOf(subClass, superClass);
      }
      var changedArray = function changedArray2(a, b) {
        if (a === void 0) {
          a = [];
        }
        if (b === void 0) {
          b = [];
        }
        return a.length !== b.length || a.some(function(item, index) {
          return !Object.is(item, b[index]);
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
      exports2.ErrorBoundary = ErrorBoundary2;
      exports2.useErrorHandler = useErrorHandler;
      exports2.withErrorBoundary = withErrorBoundary;
      Object.defineProperty(exports2, "__esModule", {value: true});
    });
  }
});

// ../../node_modules/deepmerge/dist/cjs.js
var require_cjs = __commonJS({
  "../../node_modules/deepmerge/dist/cjs.js"(exports, module2) {
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
    function getKeys(target) {
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
        getKeys(target).forEach(function(key) {
          destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
        });
      }
      getKeys(source).forEach(function(key) {
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
    module2.exports = deepmerge_1;
  }
});

// src/index.ts
__markAsModule(exports);
__export(exports, {
  Intersect: () => Intersect,
  Renderer: () => Renderer,
  Svg: () => Svg,
  TLBoundsCorner: () => TLBoundsCorner,
  TLBoundsEdge: () => TLBoundsEdge,
  TLShapeUtil: () => TLShapeUtil,
  Utils: () => Utils,
  Vec: () => Vec,
  brushUpdater: () => brushUpdater,
  inputs: () => inputs
});

// src/renderer/renderer.tsx
var React30 = __toModule(require("react"));

// src/renderer/components/canvas.tsx
var React29 = __toModule(require("react"));
var import_react_error_boundary = __toModule(require_react_error_boundary_umd());

// src/renderer/hooks/useTLContext.tsx
var React = __toModule(require("react"));
var TLContext = React.createContext({});
function useTLContext() {
  const context = React.useContext(TLContext);
  return context;
}

// src/renderer/hooks/useZoomEvents.ts
var import_react2 = __toModule(require("react"));

// src/utils/utils.ts
var import_deepmerge = __toModule(require_cjs());

// ../../node_modules/ismobilejs/esm/isMobile.js
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

// src/types.tsx
var TLBoundsEdge;
(function(TLBoundsEdge2) {
  TLBoundsEdge2["Top"] = "top_edge";
  TLBoundsEdge2["Right"] = "right_edge";
  TLBoundsEdge2["Bottom"] = "bottom_edge";
  TLBoundsEdge2["Left"] = "left_edge";
})(TLBoundsEdge || (TLBoundsEdge = {}));
var TLBoundsCorner;
(function(TLBoundsCorner2) {
  TLBoundsCorner2["TopLeft"] = "top_left_corner";
  TLBoundsCorner2["TopRight"] = "top_right_corner";
  TLBoundsCorner2["BottomRight"] = "bottom_right_corner";
  TLBoundsCorner2["BottomLeft"] = "bottom_left_corner";
})(TLBoundsCorner || (TLBoundsCorner = {}));
var TLShapeUtil = class {
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

// src/utils/vec.tsx
var _Vec = class {
  static clamp(n, min, max) {
    return Math.max(min, typeof max !== "undefined" ? Math.min(n, max) : n);
  }
};
var Vec = _Vec;
Vec.neg = (A) => {
  return [-A[0], -A[1]];
};
Vec.add = (A, B) => {
  return [A[0] + B[0], A[1] + B[1]];
};
Vec.addScalar = (A, n) => {
  return [A[0] + n, A[1] + n];
};
Vec.sub = (A, B) => {
  return [A[0] - B[0], A[1] - B[1]];
};
Vec.subScalar = (A, n) => {
  return [A[0] - n, A[1] - n];
};
Vec.vec = (A, B) => {
  return [B[0] - A[0], B[1] - A[1]];
};
Vec.mul = (A, n) => {
  return [A[0] * n, A[1] * n];
};
Vec.mulV = (A, B) => {
  return [A[0] * B[0], A[1] * B[1]];
};
Vec.div = (A, n) => {
  return [A[0] / n, A[1] / n];
};
Vec.divV = (A, B) => {
  return [A[0] / B[0], A[1] / B[1]];
};
Vec.per = (A) => {
  return [A[1], -A[0]];
};
Vec.dpr = (A, B) => {
  return A[0] * B[0] + A[1] * B[1];
};
Vec.cpr = (A, B) => {
  return A[0] * B[1] - B[0] * A[1];
};
Vec.len2 = (A) => {
  return A[0] * A[0] + A[1] * A[1];
};
Vec.len = (A) => {
  return Math.hypot(A[0], A[1]);
};
Vec.pry = (A, B) => {
  return _Vec.dpr(A, B) / _Vec.len(B);
};
Vec.uni = (A) => {
  return _Vec.div(A, _Vec.len(A));
};
Vec.normalize = (A) => {
  return _Vec.uni(A);
};
Vec.tangent = (A, B) => {
  return _Vec.normalize(_Vec.sub(A, B));
};
Vec.dist2 = (A, B) => {
  return _Vec.len2(_Vec.sub(A, B));
};
Vec.dist = (A, B) => {
  return Math.hypot(A[1] - B[1], A[0] - B[0]);
};
Vec.fastDist = (A, B) => {
  const V = [B[0] - A[0], B[1] - A[1]];
  const aV = [Math.abs(V[0]), Math.abs(V[1])];
  let r = 1 / Math.max(aV[0], aV[1]);
  r = r * (1.29289 - (aV[0] + aV[1]) * r * 0.29289);
  return [V[0] * r, V[1] * r];
};
Vec.ang = (A, B) => {
  return Math.atan2(_Vec.cpr(A, B), _Vec.dpr(A, B));
};
Vec.angle = (A, B) => {
  return Math.atan2(B[1] - A[1], B[0] - A[0]);
};
Vec.med = (A, B) => {
  return _Vec.mul(_Vec.add(A, B), 0.5);
};
Vec.rot = (A, r) => {
  return [A[0] * Math.cos(r) - A[1] * Math.sin(r), A[0] * Math.sin(r) + A[1] * Math.cos(r)];
};
Vec.rotWith = (A, C, r) => {
  if (r === 0)
    return A;
  const s = Math.sin(r);
  const c = Math.cos(r);
  const px = A[0] - C[0];
  const py = A[1] - C[1];
  const nx = px * c - py * s;
  const ny = px * s + py * c;
  return [nx + C[0], ny + C[1]];
};
Vec.isEqual = (A, B) => {
  return A[0] === B[0] && A[1] === B[1];
};
Vec.lrp = (A, B, t) => {
  return _Vec.add(A, _Vec.mul(_Vec.vec(A, B), t));
};
Vec.int = (A, B, from, to, s = 1) => {
  const t = (_Vec.clamp(from, to) - from) / (to - from);
  return _Vec.add(_Vec.mul(A, 1 - t), _Vec.mul(B, s));
};
Vec.ang3 = (p1, pc, p2) => {
  const v1 = _Vec.vec(pc, p1);
  const v2 = _Vec.vec(pc, p2);
  return _Vec.ang(v1, v2);
};
Vec.abs = (A) => {
  return [Math.abs(A[0]), Math.abs(A[1])];
};
Vec.rescale = (a, n) => {
  const l = _Vec.len(a);
  return [n * a[0] / l, n * a[1] / l];
};
Vec.isLeft = (p1, pc, p2) => {
  return (pc[0] - p1[0]) * (p2[1] - p1[1]) - (p2[0] - p1[0]) * (pc[1] - p1[1]);
};
Vec.clockwise = (p1, pc, p2) => {
  return _Vec.isLeft(p1, pc, p2) > 0;
};
Vec.round = (a, d = 5) => {
  return a.map((v) => +v.toPrecision(d));
};
Vec.nearestPointOnLineThroughPoint = (A, u, P) => {
  return _Vec.add(A, _Vec.mul(u, _Vec.pry(_Vec.sub(P, A), u)));
};
Vec.distanceToLineThroughPoint = (A, u, P) => {
  return _Vec.dist(P, _Vec.nearestPointOnLineThroughPoint(A, u, P));
};
Vec.nearestPointOnLineSegment = (A, B, P, clamp = true) => {
  const delta = _Vec.sub(B, A);
  const length = _Vec.len(delta);
  const u = _Vec.div(delta, length);
  const pt = _Vec.add(A, _Vec.mul(u, _Vec.pry(_Vec.sub(P, A), u)));
  if (clamp) {
    const da = _Vec.dist(A, pt);
    const db = _Vec.dist(B, pt);
    if (db < da && da > length)
      return B;
    if (da < db && db > length)
      return A;
  }
  return pt;
};
Vec.distanceToLineSegment = (A, B, P, clamp = true) => {
  return _Vec.dist(P, _Vec.nearestPointOnLineSegment(A, B, P, clamp));
};
Vec.nudge = (A, B, d) => {
  return _Vec.add(A, _Vec.mul(_Vec.uni(_Vec.vec(A, B)), d));
};
Vec.nudgeAtAngle = (A, a, d) => {
  return [Math.cos(a) * d + A[0], Math.sin(a) * d + A[1]];
};
Vec.toPrecision = (a, n = 4) => {
  return [+a[0].toPrecision(n), +a[1].toPrecision(n)];
};
Vec.pointsBetween = (a, b, steps = 6) => {
  return Array.from(Array(steps)).map((_, i) => {
    const t = i / steps;
    return t * t * t;
  }).map((t) => _Vec.round([..._Vec.lrp(a, b, t), (1 - t) / 2]));
};
var vec_default = Vec;

// src/utils/polyfills.ts
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(str, newStr) {
    if (Object.prototype.toString.call(str).toLowerCase() === "[object regexp]") {
      return this.replace(str, newStr);
    }
    return this.replace(new RegExp(str, "g"), newStr);
  };
}

// src/utils/utils.ts
var Utils = class {
  static filterObject(obj, fn) {
    return Object.fromEntries(Object.entries(obj).filter(fn));
  }
  static deepMerge(a, b) {
    return (0, import_deepmerge.default)(a, b, {arrayMerge: (_a, b2) => b2});
  }
  static lerp(y1, y2, mu) {
    mu = Utils.clamp(mu, 0, 1);
    return y1 * (1 - mu) + y2 * mu;
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
    const c2 = h2r(color2) || [0, 0, 0];
    const result = c1.slice();
    for (let i = 0; i < 3; i++) {
      result[i] = Math.round(result[i] + factor * (c2[i] - c1[i]));
    }
    return r2h(result);
  }
  static modulate(value, rangeA, rangeB, clamp = false) {
    const [fromLow, fromHigh] = rangeA;
    const [v0, v1] = rangeB;
    const result = v0 + (value - fromLow) / (fromHigh - fromLow) * (v1 - v0);
    return clamp ? v0 < v1 ? Math.max(Math.min(result, v1), v0) : Math.max(Math.min(result, v0), v1) : result;
  }
  static clamp(n, min, max) {
    return Math.max(min, typeof max !== "undefined" ? Math.min(n, max) : n);
  }
  static compress(s) {
    return s;
  }
  static decompress(s) {
    return s;
  }
  static deepClone(obj) {
    if (obj === null)
      return obj;
    if (Array.isArray(obj)) {
      return [...obj];
    }
    if (typeof obj === "object") {
      const clone = {...obj};
      Object.keys(clone).forEach((key) => clone[key] = typeof obj[key] === "object" ? Utils.deepClone(obj[key]) : obj[key]);
      return clone;
    }
    return obj;
  }
  static rng(seed = "") {
    let x = 0;
    let y = 0;
    let z = 0;
    let w = 0;
    function next() {
      const t = x ^ x << 11;
      x = y;
      y = z;
      z = w;
      w ^= (w >>> 19 ^ t ^ t >>> 8) >>> 0;
      return w / 4294967296;
    }
    for (let k = 0; k < seed.length + 64; k++) {
      x ^= seed.charCodeAt(k) | 0;
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
    const len = aKeys.length;
    if (bKeys.length !== len)
      return false;
    for (let i = 0; i < len; i++) {
      const key = aKeys[i];
      if (objA[key] !== objB[key] || !Object.prototype.hasOwnProperty.call(objB, key)) {
        return false;
      }
    }
    return true;
  }
  static getCircleTangentToPoint(C, r, P, side) {
    const B = vec_default.lrp(C, P, 0.5);
    const r1 = vec_default.dist(C, B);
    const delta = vec_default.sub(B, C);
    const d = vec_default.len(delta);
    if (!(d <= r + r1 && d >= Math.abs(r - r1))) {
      return null;
    }
    const a = (r * r - r1 * r1 + d * d) / (2 * d);
    const n = 1 / d;
    const p = vec_default.add(C, vec_default.mul(delta, a * n));
    const h = Math.sqrt(r * r - a * a);
    const k = vec_default.mul(vec_default.per(delta), h * n);
    return side === 0 ? vec_default.add(p, k) : vec_default.sub(p, k);
  }
  static getOuterTangentsOfCircles(C0, r0, C1, r1) {
    const a0 = vec_default.angle(C0, C1);
    const d = vec_default.dist(C0, C1);
    if (d < Math.abs(r1 - r0)) {
      return null;
    }
    const a1 = Math.acos((r0 - r1) / d);
    const t0 = a0 + a1;
    const t1 = a0 - a1;
    return [
      [C0[0] + r0 * Math.cos(t1), C0[1] + r0 * Math.sin(t1)],
      [C1[0] + r1 * Math.cos(t1), C1[1] + r1 * Math.sin(t1)],
      [C0[0] + r0 * Math.cos(t0), C0[1] + r0 * Math.sin(t0)],
      [C1[0] + r1 * Math.cos(t0), C1[1] + r1 * Math.sin(t0)]
    ];
  }
  static getClosestPointOnCircle(C, r, P) {
    const v = vec_default.sub(C, P);
    return vec_default.sub(C, vec_default.mul(vec_default.div(v, vec_default.len(v)), r));
  }
  static circleFromThreePoints(A, B, C) {
    const [x1, y1] = A;
    const [x2, y2] = B;
    const [x3, y3] = C;
    const a = x1 * (y2 - y3) - y1 * (x2 - x3) + x2 * y3 - x3 * y2;
    const b = (x1 * x1 + y1 * y1) * (y3 - y2) + (x2 * x2 + y2 * y2) * (y1 - y3) + (x3 * x3 + y3 * y3) * (y2 - y1);
    const c = (x1 * x1 + y1 * y1) * (x2 - x3) + (x2 * x2 + y2 * y2) * (x3 - x1) + (x3 * x3 + y3 * y3) * (x1 - x2);
    const x = -b / (2 * a);
    const y = -c / (2 * a);
    return [x, y, Math.hypot(x - x1, y - y1)];
  }
  static perimeterOfEllipse(rx, ry) {
    const h = Math.pow(rx - ry, 2) / Math.pow(rx + ry, 2);
    const p = Math.PI * (rx + ry) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));
    return p;
  }
  static shortAngleDist(a0, a1) {
    const max = Math.PI * 2;
    const da = (a1 - a0) % max;
    return 2 * da % max - da;
  }
  static longAngleDist(a0, a1) {
    return Math.PI * 2 - Utils.shortAngleDist(a0, a1);
  }
  static lerpAngles(a0, a1, t) {
    return a0 + Utils.shortAngleDist(a0, a1) * t;
  }
  static angleDelta(a0, a1) {
    return Utils.shortAngleDist(a0, a1);
  }
  static getSweep(C, A, B) {
    return Utils.angleDelta(vec_default.angle(C, A), vec_default.angle(C, B));
  }
  static rotatePoint(A, B, angle) {
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const px = A[0] - B[0];
    const py = A[1] - B[1];
    const nx = px * c - py * s;
    const ny = px * s + py * c;
    return [nx + B[0], ny + B[1]];
  }
  static clampRadians(r) {
    return (Math.PI * 2 + r) % (Math.PI * 2);
  }
  static clampToRotationToSegments(r, segments) {
    const seg = Math.PI * 2 / segments;
    return Math.floor((Utils.clampRadians(r) + seg / 2) / seg) * seg;
  }
  static isAngleBetween(a, b, c) {
    if (c === a || c === b)
      return true;
    const PI2 = Math.PI * 2;
    const AB = (b - a + PI2) % PI2;
    const AC = (c - a + PI2) % PI2;
    return AB <= Math.PI !== AC > AB;
  }
  static degreesToRadians(d) {
    return d * Math.PI / 180;
  }
  static radiansToDegrees(r) {
    return r * 180 / Math.PI;
  }
  static getArcLength(C, r, A, B) {
    const sweep = Utils.getSweep(C, A, B);
    return r * (2 * Math.PI) * (sweep / (2 * Math.PI));
  }
  static getArcDashOffset(C, r, A, B, step) {
    const del0 = Utils.getSweep(C, A, B);
    const len0 = Utils.getArcLength(C, r, A, B);
    const off0 = del0 < 0 ? len0 : 2 * Math.PI * C[2] - len0;
    return -off0 / 2 + step;
  }
  static getEllipseDashOffset(A, step) {
    const c = 2 * Math.PI * A[2];
    return -c / 2 + -step;
  }
  static getTLBezierCurveSegments(points, tension = 0.4) {
    const len = points.length;
    const cpoints = [...points];
    if (len < 2) {
      throw Error("Curve must have at least two points.");
    }
    for (let i = 1; i < len - 1; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const pdx = p2[0] - p0[0];
      const pdy = p2[1] - p0[1];
      const pd = Math.hypot(pdx, pdy);
      const nx = pdx / pd;
      const ny = pdy / pd;
      const dp = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const dn = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
      cpoints[i] = [
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
    const d1 = Math.hypot(points[len - 1][1] + cpoints[len - 1][1]);
    cpoints[len - 1][0] = (points[len - 1][0] + cpoints[len - 2][2]) / 2;
    cpoints[len - 1][1] = (points[len - 1][1] + cpoints[len - 2][3]) / 2;
    cpoints[len - 1][4] = (cpoints[len - 2][2] - points[len - 1][0]) / -d1;
    cpoints[len - 1][5] = (cpoints[len - 2][3] - points[len - 1][1]) / -d1;
    const results = [];
    for (let i = 1; i < cpoints.length; i++) {
      results.push({
        start: points[i - 1].slice(0, 2),
        tangentStart: cpoints[i - 1].slice(2, 4),
        normalStart: cpoints[i - 1].slice(4, 6),
        pressureStart: 2 + ((i - 1) % 2 === 0 ? 1.5 : 0),
        end: points[i].slice(0, 2),
        tangentEnd: cpoints[i].slice(0, 2),
        normalEnd: cpoints[i].slice(4, 6),
        pressureEnd: 2 + (i % 2 === 0 ? 1.5 : 0)
      });
    }
    return results;
  }
  static computePointOnCurve(t, points) {
    if (t === 0) {
      return points[0];
    }
    const order = points.length - 1;
    if (t === 1) {
      return points[order];
    }
    const mt = 1 - t;
    let p = points;
    if (order === 0) {
      return points[0];
    }
    if (order === 1) {
      return [mt * p[0][0] + t * p[1][0], mt * p[0][1] + t * p[1][1]];
    }
    const mt2 = mt * mt;
    const t2 = t * t;
    let a;
    let b;
    let c;
    let d = 0;
    if (order === 2) {
      p = [p[0], p[1], p[2], [0, 0]];
      a = mt2;
      b = mt * t * 2;
      c = t2;
    } else {
      a = mt2 * mt;
      b = mt2 * t * 3;
      c = mt * t2 * 3;
      d = t * t2;
    }
    return [
      a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0],
      a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]
    ];
  }
  static cubicBezier(tx, x1, y1, x2, y2) {
    const x0 = 0;
    const y0 = 0;
    const x3 = 1;
    const y3 = 1;
    const A = x3 - 3 * x2 + 3 * x1 - x0;
    const B = 3 * x2 - 6 * x1 + 3 * x0;
    const C = 3 * x1 - 3 * x0;
    const D = x0;
    const E = y3 - 3 * y2 + 3 * y1 - y0;
    const F = 3 * y2 - 6 * y1 + 3 * y0;
    const G = 3 * y1 - 3 * y0;
    const H = y0;
    const iterations = 5;
    let i;
    let slope;
    let x;
    let t = tx;
    for (i = 0; i < iterations; i++) {
      x = A * t * t * t + B * t * t + C * t + D;
      slope = 1 / (3 * A * t * t + 2 * B * t + C);
      t -= (x - tx) * slope;
      t = t > 1 ? 1 : t < 0 ? 0 : t;
    }
    return Math.abs(E * t * t * t + F * t * t + G * t * H);
  }
  static getSpline(pts, k = 0.5) {
    let p0;
    let [p1, p2, p3] = pts;
    const results = [];
    for (let i = 1, len = pts.length; i < len; i++) {
      p0 = p1;
      p1 = p2;
      p2 = p3;
      p3 = pts[i + 2] ? pts[i + 2] : p2;
      results.push({
        cp1x: p1[0] + (p2[0] - p0[0]) / 6 * k,
        cp1y: p1[1] + (p2[1] - p0[1]) / 6 * k,
        cp2x: p2[0] - (p3[0] - p1[0]) / 6 * k,
        cp2y: p2[1] - (p3[1] - p1[1]) / 6 * k,
        px: pts[i][0],
        py: pts[i][1]
      });
    }
    return results;
  }
  static getCurvePoints(pts, tension = 0.5, isClosed = false, numOfSegments = 3) {
    const _pts = [...pts];
    const len = pts.length;
    const res = [];
    let t1x, t2x, t1y, t2y, c1, c2, c3, c4, st, st2, st3;
    if (isClosed) {
      _pts.unshift(_pts[len - 1]);
      _pts.push(_pts[0]);
    } else {
      _pts.unshift(_pts[0]);
      _pts.push(_pts[len - 1]);
    }
    for (let i = 1; i < _pts.length - 2; i++) {
      for (let t = 0; t <= numOfSegments; t++) {
        st = t / numOfSegments;
        st2 = Math.pow(st, 2);
        st3 = Math.pow(st, 3);
        c1 = 2 * st3 - 3 * st2 + 1;
        c2 = -(2 * st3) + 3 * st2;
        c3 = st3 - 2 * st2 + st;
        c4 = st3 - st2;
        t1x = (_pts[i + 1][0] - _pts[i - 1][0]) * tension;
        t2x = (_pts[i + 2][0] - _pts[i][0]) * tension;
        t1y = (_pts[i + 1][1] - _pts[i - 1][1]) * tension;
        t2y = (_pts[i + 2][1] - _pts[i][1]) * tension;
        res.push([
          c1 * _pts[i][0] + c2 * _pts[i + 1][0] + c3 * t1x + c4 * t2x,
          c1 * _pts[i][1] + c2 * _pts[i + 1][1] + c3 * t1y + c4 * t2y
        ]);
      }
    }
    res.push(pts[pts.length - 1]);
    return res;
  }
  static simplify(points, tolerance = 1) {
    const len = points.length;
    const a = points[0];
    const b = points[len - 1];
    const [x1, y1] = a;
    const [x2, y2] = b;
    if (len > 2) {
      let distance = 0;
      let index = 0;
      const max = Math.hypot(y2 - y1, x2 - x1);
      for (let i = 1; i < len - 1; i++) {
        const [x0, y0] = points[i];
        const d = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / max;
        if (distance > d)
          continue;
        distance = d;
        index = i;
      }
      if (distance > tolerance) {
        const l0 = Utils.simplify(points.slice(0, index + 1), tolerance);
        const l1 = Utils.simplify(points.slice(index + 1), tolerance);
        return l0.concat(l1.slice(1));
      }
    }
    return [a, b];
  }
  static pointInCircle(A, C, r) {
    return vec_default.dist(A, C) <= r;
  }
  static pointInEllipse(A, C, rx, ry, rotation = 0) {
    rotation = rotation || 0;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const delta = vec_default.sub(A, C);
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
  static pointInBounds(A, b) {
    return !(A[0] < b.minX || A[0] > b.maxX || A[1] < b.minY || A[1] > b.maxY);
  }
  static boundsCollide(a, b) {
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
  }
  static boundsContain(a, b) {
    return a.minX < b.minX && a.minY < b.minY && a.maxY > b.maxY && a.maxX > b.maxX;
  }
  static boundsContained(a, b) {
    return Utils.boundsContain(b, a);
  }
  static boundsAreEqual(a, b) {
    return !(b.maxX !== a.maxX || b.minX !== a.minX || b.maxY !== a.maxY || b.minY !== a.minY);
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
      for (const [x, y] of points) {
        minX = Math.min(x, minX);
        minY = Math.min(y, minY);
        maxX = Math.max(x, maxX);
        maxY = Math.max(y, maxY);
      }
    }
    if (rotation !== 0) {
      return Utils.getBoundsFromPoints(points.map((pt) => vec_default.rotWith(pt, [(minX + maxX) / 2, (minY + maxY) / 2], rotation)));
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
  static getRotatedEllipseBounds(x, y, rx, ry, rotation) {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    const w = Math.hypot(rx * c, ry * s);
    const h = Math.hypot(rx * s, ry * c);
    return {
      minX: x + rx - w,
      minY: y + ry - h,
      maxX: x + rx + w,
      maxY: y + ry + h,
      width: w * 2,
      height: h * 2
    };
  }
  static getExpandedBounds(a, b) {
    const minX = Math.min(a.minX, b.minX);
    const minY = Math.min(a.minY, b.minY);
    const maxX = Math.max(a.maxX, b.maxX);
    const maxY = Math.max(a.maxY, b.maxY);
    const width = Math.abs(maxX - minX);
    const height = Math.abs(maxY - minY);
    return {minX, minY, maxX, maxY, width, height};
  }
  static getCommonBounds(bounds3) {
    if (bounds3.length < 2)
      return bounds3[0];
    let result = bounds3[0];
    for (let i = 1; i < bounds3.length; i++) {
      result = Utils.getExpandedBounds(result, bounds3[i]);
    }
    return result;
  }
  static getRotatedCorners(b, rotation = 0) {
    const center = [b.minX + b.width / 2, b.minY + b.height / 2];
    return [
      [b.minX, b.minY],
      [b.maxX, b.minY],
      [b.maxX, b.maxY],
      [b.minX, b.maxY]
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
      case TLBoundsEdge.Top:
      case TLBoundsCorner.TopLeft:
      case TLBoundsCorner.TopRight: {
        by0 += dy;
        break;
      }
      case TLBoundsEdge.Bottom:
      case TLBoundsCorner.BottomLeft:
      case TLBoundsCorner.BottomRight: {
        by1 += dy;
        break;
      }
    }
    switch (handle) {
      case TLBoundsEdge.Left:
      case TLBoundsCorner.TopLeft:
      case TLBoundsCorner.BottomLeft: {
        bx0 += dx;
        break;
      }
      case TLBoundsEdge.Right:
      case TLBoundsCorner.TopRight:
      case TLBoundsCorner.BottomRight: {
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
        case TLBoundsCorner.TopLeft: {
          if (isTall)
            by0 = by1 + tw;
          else
            bx0 = bx1 + th;
          break;
        }
        case TLBoundsCorner.TopRight: {
          if (isTall)
            by0 = by1 + tw;
          else
            bx1 = bx0 - th;
          break;
        }
        case TLBoundsCorner.BottomRight: {
          if (isTall)
            by1 = by0 - tw;
          else
            bx1 = bx0 - th;
          break;
        }
        case TLBoundsCorner.BottomLeft: {
          if (isTall)
            by1 = by0 - tw;
          else
            bx0 = bx1 + th;
          break;
        }
        case TLBoundsEdge.Bottom:
        case TLBoundsEdge.Top: {
          const m = (bx0 + bx1) / 2;
          const w = bh * ar;
          bx0 = m - w / 2;
          bx1 = m + w / 2;
          break;
        }
        case TLBoundsEdge.Left:
        case TLBoundsEdge.Right: {
          const m = (by0 + by1) / 2;
          const h = bw / ar;
          by0 = m - h / 2;
          by1 = m + h / 2;
          break;
        }
      }
    }
    if (rotation % (Math.PI * 2) !== 0) {
      let cv = [0, 0];
      const c0 = vec_default.med([ax0, ay0], [ax1, ay1]);
      const c1 = vec_default.med([bx0, by0], [bx1, by1]);
      switch (handle) {
        case TLBoundsCorner.TopLeft: {
          cv = vec_default.sub(vec_default.rotWith([bx1, by1], c1, rotation), vec_default.rotWith([ax1, ay1], c0, rotation));
          break;
        }
        case TLBoundsCorner.TopRight: {
          cv = vec_default.sub(vec_default.rotWith([bx0, by1], c1, rotation), vec_default.rotWith([ax0, ay1], c0, rotation));
          break;
        }
        case TLBoundsCorner.BottomRight: {
          cv = vec_default.sub(vec_default.rotWith([bx0, by0], c1, rotation), vec_default.rotWith([ax0, ay0], c0, rotation));
          break;
        }
        case TLBoundsCorner.BottomLeft: {
          cv = vec_default.sub(vec_default.rotWith([bx1, by0], c1, rotation), vec_default.rotWith([ax1, ay0], c0, rotation));
          break;
        }
        case TLBoundsEdge.Top: {
          cv = vec_default.sub(vec_default.rotWith(vec_default.med([bx0, by1], [bx1, by1]), c1, rotation), vec_default.rotWith(vec_default.med([ax0, ay1], [ax1, ay1]), c0, rotation));
          break;
        }
        case TLBoundsEdge.Left: {
          cv = vec_default.sub(vec_default.rotWith(vec_default.med([bx1, by0], [bx1, by1]), c1, rotation), vec_default.rotWith(vec_default.med([ax1, ay0], [ax1, ay1]), c0, rotation));
          break;
        }
        case TLBoundsEdge.Bottom: {
          cv = vec_default.sub(vec_default.rotWith(vec_default.med([bx0, by0], [bx1, by0]), c1, rotation), vec_default.rotWith(vec_default.med([ax0, ay0], [ax1, ay0]), c0, rotation));
          break;
        }
        case TLBoundsEdge.Right: {
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
      case TLBoundsCorner.TopLeft: {
        if (isFlippedX && isFlippedY) {
          anchor = TLBoundsCorner.BottomRight;
        } else if (isFlippedX) {
          anchor = TLBoundsCorner.TopRight;
        } else if (isFlippedY) {
          anchor = TLBoundsCorner.BottomLeft;
        } else {
          anchor = TLBoundsCorner.BottomRight;
        }
        break;
      }
      case TLBoundsCorner.TopRight: {
        if (isFlippedX && isFlippedY) {
          anchor = TLBoundsCorner.BottomLeft;
        } else if (isFlippedX) {
          anchor = TLBoundsCorner.TopLeft;
        } else if (isFlippedY) {
          anchor = TLBoundsCorner.BottomRight;
        } else {
          anchor = TLBoundsCorner.BottomLeft;
        }
        break;
      }
      case TLBoundsCorner.BottomRight: {
        if (isFlippedX && isFlippedY) {
          anchor = TLBoundsCorner.TopLeft;
        } else if (isFlippedX) {
          anchor = TLBoundsCorner.BottomLeft;
        } else if (isFlippedY) {
          anchor = TLBoundsCorner.TopRight;
        } else {
          anchor = TLBoundsCorner.TopLeft;
        }
        break;
      }
      case TLBoundsCorner.BottomLeft: {
        if (isFlippedX && isFlippedY) {
          anchor = TLBoundsCorner.TopRight;
        } else if (isFlippedX) {
          anchor = TLBoundsCorner.BottomRight;
        } else if (isFlippedY) {
          anchor = TLBoundsCorner.TopLeft;
        } else {
          anchor = TLBoundsCorner.TopRight;
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
    const bounds3 = Utils.getBoundsFromPoints(points);
    return [bounds3.width, bounds3.height];
  }
  static getBoundsCenter(bounds3) {
    return [bounds3.minX + bounds3.width / 2, bounds3.minY + bounds3.height / 2];
  }
  static removeDuplicatePoints(points) {
    return points.reduce((acc, pt, i) => {
      if (i === 0 || !vec_default.isEqual(pt, acc[i - 1])) {
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
  static uniqueId(a = "") {
    return a ? ((Number(a) ^ Math.random() * 16) >> Number(a) / 4).toString(16) : `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, Utils.uniqueId);
  }
  static shuffleArr(arr, offset) {
    return arr.map((_, i) => arr[(i + offset) % arr.length]);
  }
  static deepCompareArrays(a, b) {
    if (a?.length !== b?.length)
      return false;
    return Utils.deepCompare(a, b);
  }
  static deepCompare(a, b) {
    return a === b || JSON.stringify(a) === JSON.stringify(b);
  }
  static arrsIntersect(a, b, fn) {
    return a.some((item) => b.includes(fn ? fn(item) : item));
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
    const d = stroke.reduce((acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(` ${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`);
      return acc;
    }, ["M ", `${stroke[0][0]},${stroke[0][1]}`, " Q"]);
    d.push(" Z");
    return d.join("").replaceAll(/(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g, "$1");
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
  static metaKey(e) {
    return Utils.isDarwin() ? e.metaKey : e.ctrlKey;
  }
};

// src/utils/intersect.ts
function getIntersection(message, ...points) {
  const didIntersect = points.length > 0;
  return {didIntersect, message, points};
}
var _Intersect = class {
};
var Intersect = _Intersect;
Intersect.ray = {
  ray(p0, n0, p1, n1) {
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const det = n1[0] * n0[1] - n1[1] * n0[0];
    const u = (dy * n1[0] - dx * n1[1]) / det;
    const v = (dy * n0[0] - dx * n0[1]) / det;
    if (u < 0 || v < 0)
      return getIntersection("miss");
    const m0 = n0[1] / n0[0];
    const m1 = n1[1] / n1[0];
    const b0 = p0[1] - m0 * p0[0];
    const b1 = p1[1] - m1 * p1[0];
    const x = (b1 - b0) / (m0 - m1);
    const y = m0 * x + b0;
    return Number.isFinite(x) ? getIntersection("intersection", [x, y]) : getIntersection("parallel");
  },
  lineSegment(origin, direction, a1, a2) {
    const [x, y] = origin;
    const [dx, dy] = direction;
    const [x1, y1] = a1;
    const [x2, y2] = a2;
    if (dy / dx !== (y2 - y1) / (x2 - x1)) {
      const d = dx * (y2 - y1) - dy * (x2 - x1);
      if (d !== 0) {
        const r = ((y - y1) * (x2 - x1) - (x - x1) * (y2 - y1)) / d;
        const s = ((y - y1) * dx - (x - x1) * dy) / d;
        if (r >= 0 && s >= 0 && s <= 1) {
          return getIntersection("intersection", [x + r * dx, y + r * dy]);
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
    const a2 = Vec.mul(direction, 999999999);
    return _Intersect.lineSegment.ellipse(a1, a2, center, rx, ry, rotation);
  },
  bounds(origin, direction, bounds3) {
    const {minX, minY, width, height} = bounds3;
    return _Intersect.ray.rectangle(origin, direction, [minX, minY], [width, height]);
  }
};
Intersect.lineSegment = {
  ray(a1, a2, origin, direction) {
    return _Intersect.ray.lineSegment(origin, direction, a1, a2);
  },
  lineSegment(a1, a2, b1, b2) {
    const AB = Vec.sub(a1, b1);
    const BV = Vec.sub(b2, b1);
    const AV = Vec.sub(a2, a1);
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
        return getIntersection("intersection", Vec.add(a1, Vec.mul(AV, ua)));
      }
    }
    return getIntersection("no intersection");
  },
  rectangle(a1, a2, point, size) {
    return _Intersect.rectangle.lineSegment(point, size, a1, a2);
  },
  arc(a1, a2, center, radius, start, end) {
    const sa = Vec.angle(center, start);
    const ea = Vec.angle(center, end);
    const ellipseTest = _Intersect.ellipse.lineSegment(center, radius, radius, 0, a1, a2);
    if (!ellipseTest.didIntersect)
      return getIntersection("No intersection");
    const points = ellipseTest.points.filter((point) => Utils.isAngleBetween(sa, ea, Vec.angle(center, point)));
    if (points.length === 0) {
      return getIntersection("No intersection");
    }
    return getIntersection("intersection", ...points);
  },
  circle(a1, a2, c, r) {
    const a = (a2[0] - a1[0]) * (a2[0] - a1[0]) + (a2[1] - a1[1]) * (a2[1] - a1[1]);
    const b = 2 * ((a2[0] - a1[0]) * (a1[0] - c[0]) + (a2[1] - a1[1]) * (a1[1] - c[1]));
    const cc = c[0] * c[0] + c[1] * c[1] + a1[0] * a1[0] + a1[1] * a1[1] - 2 * (c[0] * a1[0] + c[1] * a1[1]) - r * r;
    const deter = b * b - 4 * a * cc;
    if (deter < 0) {
      return getIntersection("outside");
    }
    if (deter === 0) {
      return getIntersection("tangent");
    }
    const e = Math.sqrt(deter);
    const u1 = (-b + e) / (2 * a);
    const u2 = (-b - e) / (2 * a);
    if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
      if (u1 < 0 && u2 < 0 || u1 > 1 && u2 > 1) {
        return getIntersection("outside");
      } else {
        return getIntersection("inside");
      }
    }
    const results = [];
    if (0 <= u1 && u1 <= 1)
      results.push(Vec.lrp(a1, a2, u1));
    if (0 <= u2 && u2 <= 1)
      results.push(Vec.lrp(a1, a2, u2));
    return getIntersection("intersection", ...results);
  },
  ellipse(a1, a2, center, rx, ry, rotation = 0) {
    if (rx === 0 || ry === 0 || Vec.isEqual(a1, a2)) {
      return getIntersection("No intersection");
    }
    rx = rx < 0 ? rx : -rx;
    ry = ry < 0 ? ry : -ry;
    a1 = Vec.sub(Vec.rotWith(a1, center, -rotation), center);
    a2 = Vec.sub(Vec.rotWith(a2, center, -rotation), center);
    const diff = Vec.sub(a2, a1);
    const A = diff[0] * diff[0] / rx / rx + diff[1] * diff[1] / ry / ry;
    const B = 2 * a1[0] * diff[0] / rx / rx + 2 * a1[1] * diff[1] / ry / ry;
    const C = a1[0] * a1[0] / rx / rx + a1[1] * a1[1] / ry / ry - 1;
    const tValues = [];
    const discriminant = B * B - 4 * A * C;
    if (discriminant === 0) {
      tValues.push(-B / 2 / A);
    } else if (discriminant > 0) {
      const root = Math.sqrt(discriminant);
      tValues.push((-B + root) / 2 / A);
      tValues.push((-B - root) / 2 / A);
    }
    const points = tValues.filter((t) => t >= 0 && t <= 1).map((t) => Vec.add(center, Vec.add(a1, Vec.mul(Vec.sub(a2, a1), t)))).map((p) => Vec.rotWith(p, center, rotation));
    return getIntersection("intersection", ...points);
  },
  bounds(a1, a2, bounds3) {
    return _Intersect.bounds.lineSegment(bounds3, a1, a2);
  },
  polyline(a1, a2, points) {
    const intersections = [];
    for (let i = 1; i < points.length + 1; i++) {
      const int = _Intersect.lineSegment.lineSegment(a1, a2, points[i - 1], points[i % points.length]);
      if (int) {
        intersections.push(int);
      }
    }
    return intersections;
  }
};
Intersect.rectangle = {
  ray(point, size, origin, direction) {
    const sideIntersections = Utils.getRectangleSides(point, size).reduce((acc, [message, [a1, a2]]) => {
      const intersection = _Intersect.ray.lineSegment(origin, direction, a1, a2);
      if (intersection) {
        acc.push(getIntersection(message, ...intersection.points));
      }
      return acc;
    }, []);
    return sideIntersections.filter((int) => int.didIntersect);
  },
  lineSegment(point, size, a1, a2) {
    const sideIntersections = Utils.getRectangleSides(point, size).reduce((acc, [message, [b1, b2]]) => {
      const intersection = _Intersect.lineSegment.lineSegment(a1, a2, b1, b2);
      if (intersection) {
        acc.push(getIntersection(message, ...intersection.points));
      }
      return acc;
    }, []);
    return sideIntersections.filter((int) => int.didIntersect);
  },
  rectangle(point1, size1, point2, size2) {
    const sideIntersections = Utils.getRectangleSides(point1, size1).reduce((acc, [message, [a1, a2]]) => {
      const intersections = _Intersect.rectangle.lineSegment(point2, size2, a1, a2);
      acc.push(...intersections.map((int) => getIntersection(`${message} ${int.message}`, ...int.points)));
      return acc;
    }, []);
    return sideIntersections.filter((int) => int.didIntersect);
  },
  arc(point, size, center, radius, start, end) {
    const sideIntersections = Utils.getRectangleSides(point, size).reduce((acc, [message, [a1, a2]]) => {
      const intersection = _Intersect.arc.lineSegment(center, radius, start, end, a1, a2);
      if (intersection) {
        acc.push({...intersection, message});
      }
      return acc;
    }, []);
    return sideIntersections.filter((int) => int.didIntersect);
  },
  circle(point, size, c, r) {
    const sideIntersections = Utils.getRectangleSides(point, size).reduce((acc, [message, [a1, a2]]) => {
      const intersection = _Intersect.lineSegment.circle(a1, a2, c, r);
      if (intersection) {
        acc.push({...intersection, message});
      }
      return acc;
    }, []);
    return sideIntersections.filter((int) => int.didIntersect);
  },
  ellipse(point, size, c, rx, ry, rotation = 0) {
    const sideIntersections = Utils.getRectangleSides(point, size).reduce((acc, [message, [a1, a2]]) => {
      const intersection = _Intersect.lineSegment.ellipse(a1, a2, c, rx, ry, rotation);
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
    const sideIntersections = Utils.getRectangleSides(point, size).reduce((acc, [message, [a1, a2]]) => {
      const intersections = _Intersect.lineSegment.polyline(a1, a2, points);
      if (intersections.length > 0) {
        acc.push(getIntersection(message, ...intersections.flatMap((i) => i.points)));
      }
      return acc;
    }, []);
    return sideIntersections.filter((int) => int.didIntersect);
  }
};
Intersect.arc = {
  lineSegment(center, radius, start, end, a1, a2) {
    return _Intersect.lineSegment.arc(a1, a2, center, radius, start, end);
  },
  rectangle(center, radius, start, end, point, size) {
    return _Intersect.rectangle.arc(point, size, center, radius, start, end);
  },
  bounds(center, radius, start, end, bounds3) {
    const {minX, minY, width, height} = bounds3;
    return _Intersect.arc.rectangle(center, radius, start, end, [minX, minY], [width, height]);
  }
};
Intersect.circle = {
  lineSegment(c, r, a1, a2) {
    return _Intersect.lineSegment.circle(a1, a2, c, r);
  },
  circle(c1, r1, c2, r2) {
    let dx = c2[0] - c1[0], dy = c2[1] - c1[1];
    const d = Math.sqrt(dx * dx + dy * dy), x = (d * d - r2 * r2 + r1 * r1) / (2 * d), y = Math.sqrt(r1 * r1 - x * x);
    dx /= d;
    dy /= d;
    return getIntersection("intersection", [c1[0] + dx * x - dy * y, c1[1] + dy * x + dx * y], [c1[0] + dx * x + dy * y, c1[1] + dy * x - dx * y]);
  },
  rectangle(c, r, point, size) {
    return _Intersect.rectangle.circle(point, size, c, r);
  },
  bounds(c, r, bounds3) {
    const {minX, minY, width, height} = bounds3;
    return _Intersect.circle.rectangle(c, r, [minX, minY], [width, height]);
  }
};
Intersect.ellipse = {
  ray(center, rx, ry, rotation, point, direction) {
    return _Intersect.ray.ellipse(point, direction, center, rx, ry, rotation);
  },
  lineSegment(center, rx, ry, rotation = 0, a1, a2) {
    if (rx === ry) {
      return _Intersect.lineSegment.circle(a1, a2, center, rx);
    }
    return _Intersect.lineSegment.ellipse(a1, a2, center, rx, ry, rotation);
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
  circle(c, rx, ry, rotation, c2, r2) {
    return _Intersect.ellipse.ellipse(c, rx, ry, rotation, c2, r2, r2, 0);
  },
  bounds(c, rx, ry, rotation, bounds3) {
    const {minX, minY, width, height} = bounds3;
    return _Intersect.ellipse.rectangle(c, rx, ry, rotation, [minX, minY], [width, height]);
  }
};
Intersect.bounds = {
  ray(bounds3, origin, direction) {
    const {minX, minY, width, height} = bounds3;
    return _Intersect.ray.rectangle(origin, direction, [minX, minY], [width, height]);
  },
  lineSegment(bounds3, a1, a2) {
    const {minX, minY, width, height} = bounds3;
    return _Intersect.lineSegment.rectangle(a1, a2, [minX, minY], [width, height]);
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
  circle(bounds3, c, r) {
    const {minX, minY, width, height} = bounds3;
    return _Intersect.circle.rectangle(c, r, [minX, minY], [width, height]);
  },
  ellipse(bounds3, c, rx, ry, rotation = 0) {
    const {minX, minY, width, height} = bounds3;
    return _Intersect.ellipse.rectangle(c, rx, ry, rotation, [minX, minY], [width, height]);
  },
  polyline(bounds3, points) {
    return _Intersect.polyline.bounds(points, bounds3);
  }
};
Intersect.polyline = {
  lineSegment(points, a1, a2) {
    return _Intersect.lineSegment.polyline(a1, a2, points);
  },
  rectangle(points, point, size) {
    return _Intersect.rectangle.polyline(point, size, points);
  },
  bounds(points, bounds3) {
    return _Intersect.rectangle.polyline([bounds3.minX, bounds3.minY], [bounds3.width, bounds3.height], points);
  }
};

// src/utils/svg.ts
var _Svg = class {
};
var Svg = _Svg;
Svg.ellipse = (A, r) => {
  return `M ${A[0] - r},${A[1]}
      a ${r},${r} 0 1,0 ${r * 2},0
      a ${r},${r} 0 1,0 -${r * 2},0 `;
};
Svg.moveTo = (v) => {
  return `M ${v[0]},${v[1]} `;
};
Svg.lineTo = (v) => {
  return `L ${v[0]},${v[1]} `;
};
Svg.line = (a, ...pts) => {
  return _Svg.moveTo(a) + pts.map((p) => _Svg.lineTo(p)).join();
};
Svg.hLineTo = (v) => {
  return `H ${v[0]},${v[1]} `;
};
Svg.vLineTo = (v) => {
  return `V ${v[0]},${v[1]} `;
};
Svg.bezierTo = (A, B, C) => {
  return `C ${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]} `;
};
Svg.arcTo = (C, r, A, B) => {
  return [
    _Svg.moveTo(A),
    "A",
    r,
    r,
    0,
    Utils.getSweep(C, A, B) > 0 ? "1" : "0",
    0,
    B[0],
    B[1]
  ].join(" ");
};
Svg.closePath = () => {
  return "Z";
};
Svg.rectTo = (A) => {
  return ["R", A[0], A[1]].join(" ");
};
Svg.getPointAtLength = (path, length) => {
  const point = path.getPointAtLength(length);
  return [point.x, point.y];
};

// src/utils/index.ts
var utils_default = Utils;

// ../../node_modules/react-use-gesture/dist/reactusegesture.esm.js
var import_react = __toModule(require("react"));
function addV(v1, v2) {
  return v1.map(function(v, i) {
    return v + v2[i];
  });
}
function subV(v1, v2) {
  return v1.map(function(v, i) {
    return v - v2[i];
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
  var direction = delta.map(function(v) {
    return alpha * v;
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
  var velocities = delta.map(function(v) {
    return beta * v;
  });
  var direction = delta.map(function(v) {
    return alpha * v;
  });
  var distance = calculateDistance(movement);
  return {
    velocities,
    velocity,
    distance,
    direction
  };
}
function sign(x) {
  if (Math.sign)
    return Math.sign(x);
  return Number(x > 0) - Number(x < 0) || +x;
}
function minMax(value, min, max) {
  return Math.max(min, Math.min(value, max));
}
function rubberband2(distance, constant) {
  return Math.pow(distance, constant * 5);
}
function rubberband(distance, dimension, constant) {
  if (dimension === 0 || Math.abs(dimension) === Infinity)
    return rubberband2(distance, constant);
  return distance * dimension * constant / (dimension + constant * distance);
}
function rubberbandIfOutOfBounds(position, min, max, constant) {
  if (constant === void 0) {
    constant = 0.15;
  }
  if (constant === 0)
    return minMax(position, min, max);
  if (position < min)
    return -rubberband(min - position, max - min, constant) + min;
  if (position > max)
    return +rubberband(position - max, max - min, constant) + max;
  return position;
}
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
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
function _extends() {
  _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
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
function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  subClass.__proto__ = superClass;
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null)
    return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
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
function _unsupportedIterableToArray(o, minLen) {
  if (!o)
    return;
  if (typeof o === "string")
    return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor)
    n = o.constructor.name;
  if (n === "Map" || n === "Set")
    return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
    return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length)
    len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++)
    arr2[i] = arr[i];
  return arr2;
}
function _createForOfIteratorHelperLoose(o, allowArrayLike) {
  var it;
  if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) {
    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
      if (it)
        o = it;
      var i = 0;
      return function() {
        if (i >= o.length)
          return {
            done: true
          };
        return {
          done: false,
          value: o[i++]
        };
      };
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  it = o[Symbol.iterator]();
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
function valueFn(v) {
  if (typeof v === "function") {
    for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      args[_key2 - 1] = arguments[_key2];
    }
    return v.apply(void 0, args);
  } else {
    return v;
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
  } catch (e) {
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
  return Array.from(getEventTouches(event)).map(function(t) {
    return t.identifier;
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
  var _Array$from$filter = Array.from(event.touches).filter(function(t) {
    return pointerIds.includes(t.identifier);
  }), A = _Array$from$filter[0], B = _Array$from$filter[1];
  if (!A || !B)
    throw Error("The event doesn't have two pointers matching the pointerIds");
  var dx = B.clientX - A.clientX;
  var dy = B.clientY - A.clientY;
  var cx = (B.clientX + A.clientX) / 2;
  var cy = (B.clientY + A.clientY) / 2;
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
var InternalCoordinatesOptionsNormalizers = /* @__PURE__ */ _extends({}, InternalGestureOptionsNormalizers, {
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
var InternalDistanceAngleOptionsNormalizers = /* @__PURE__ */ _extends({}, InternalGestureOptionsNormalizers, {
  bounds: function bounds2(_value, _key, _ref2) {
    var _ref2$distanceBounds = _ref2.distanceBounds, distanceBounds = _ref2$distanceBounds === void 0 ? {} : _ref2$distanceBounds, _ref2$angleBounds = _ref2.angleBounds, angleBounds = _ref2$angleBounds === void 0 ? {} : _ref2$angleBounds;
    var _distanceBounds = function _distanceBounds2(state) {
      var D = assignDefault(valueFn(distanceBounds, state), {
        min: -Infinity,
        max: Infinity
      });
      return [D.min, D.max];
    };
    var _angleBounds = function _angleBounds2(state) {
      var A = assignDefault(valueFn(angleBounds, state), {
        min: -Infinity,
        max: Infinity
      });
      return [A.min, A.max];
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
  var domTarget = _ref4.domTarget, eventOptions2 = _ref4.eventOptions, window2 = _ref4.window, enabled3 = _ref4.enabled, rest = _objectWithoutPropertiesLoose(_ref4, ["domTarget", "eventOptions", "window", "enabled"]);
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
  var domTarget = _ref6.domTarget, eventOptions2 = _ref6.eventOptions, window2 = _ref6.window, enabled3 = _ref6.enabled, rest = _objectWithoutPropertiesLoose(_ref6, ["domTarget", "eventOptions", "window", "enabled"]);
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
  return _extends({
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
  var move = getInitial({
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
    move,
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
      var state = _extends({}, _this.controller.state.shared, _this.state, _this.mapStateValues(_this.state), {
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
    var M = this.getInternalMovement(values, this.state);
    var i0 = wasIntentional[0] === false ? getIntentionalDisplacement(M[0], _T[0]) : wasIntentional[0];
    var i1 = wasIntentional[1] === false ? getIntentionalDisplacement(M[1], _T[1]) : wasIntentional[1];
    var intentionalityCheck = this.checkIntentionality([i0, i1], M);
    if (intentionalityCheck._blocked) {
      return _extends({}, intentionalityCheck, {
        _movement: M,
        delta: [0, 0]
      });
    }
    var _intentional = intentionalityCheck._intentional;
    var _movement = M;
    var movement = [_intentional[0] !== false ? M[0] - _intentional[0] : 0, _intentional[1] !== false ? M[1] - _intentional[1] : 0];
    var offset = addV(movement, lastOffset);
    var _rubberband = _active ? rubberband4 : [0, 0];
    movement = computeRubberband(_bounds, addV(movement, _initial), _rubberband);
    return _extends({}, intentionalityCheck, {
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
  var _bounds$ = bounds3[0], X1 = _bounds$[0], X2 = _bounds$[1], _bounds$2 = bounds3[1], Y1 = _bounds$2[0], Y2 = _bounds$2[1];
  return [rubberbandIfOutOfBounds(Vx, X1, X2, Rx), rubberbandIfOutOfBounds(Vy, Y1, Y2, Ry)];
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
  var _state = _extends({}, getInitialState()[stateKey], {
    _active: true,
    args,
    values,
    initial: initial2 != null ? initial2 : values,
    _threshold,
    offset,
    lastOffset: offset,
    startTime
  });
  return _extends({}, _state, {
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
        return _this.nativeRefs[eventKey2](_extends({}, _this.state.shared, {
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
    var _step2$value = _step2.value, eventName = _step2$value[0], eventHandler = _step2$value[1];
    el.addEventListener(eventName, eventHandler, options);
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
    var _step3$value = _step3.value, eventName = _step3$value[0], eventHandler = _step3$value[1];
    el.removeEventListener(eventName, eventHandler, options);
  }
}
function useRecognizers(handlers, config, nativeHandlers) {
  if (nativeHandlers === void 0) {
    nativeHandlers = {};
  }
  var classes = resolveClasses(handlers);
  var controller = import_react.default.useMemo(function() {
    return new Controller(classes);
  }, []);
  controller.config = config;
  controller.handlers = handlers;
  controller.nativeRefs = nativeHandlers;
  import_react.default.useEffect(controller.effect, []);
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
function memoizeOne(resultFn, isEqual2) {
  var lastThis;
  var lastArgs = [];
  var lastResult;
  var calledOnce = false;
  function memoized() {
    for (var _len = arguments.length, newArgs = new Array(_len), _key = 0; _key < _len; _key++) {
      newArgs[_key] = arguments[_key];
    }
    if (calledOnce && lastThis === this && isEqual2(newArgs, lastArgs)) {
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
function equal(a, b) {
  if (a === b)
    return true;
  if (a && b && typeof a == "object" && typeof b == "object") {
    if (a.constructor !== b.constructor)
      return false;
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length !== b.length)
        return false;
      for (i = length; i-- !== 0; ) {
        if (!equal(a[i], b[i]))
          return false;
      }
      return true;
    }
    var it;
    if (typeof Map === "function" && a instanceof Map && b instanceof Map) {
      if (a.size !== b.size)
        return false;
      it = a.entries();
      while (!(i = it.next()).done) {
        if (!b.has(i.value[0]))
          return false;
      }
      it = a.entries();
      while (!(i = it.next()).done) {
        if (!equal(i.value[1], b.get(i.value[0])))
          return false;
      }
      return true;
    }
    if (typeof Set === "function" && a instanceof Set && b instanceof Set) {
      if (a.size !== b.size)
        return false;
      it = a.entries();
      while (!(i = it.next()).done) {
        if (!b.has(i.value[0]))
          return false;
      }
      return true;
    }
    if (a.constructor === RegExp)
      return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf)
      return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString)
      return a.toString() === b.toString();
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length)
      return false;
    for (i = length; i-- !== 0; ) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i]))
        return false;
    }
    if (typeof Element !== "undefined" && a instanceof Element)
      return false;
    for (i = length; i-- !== 0; ) {
      if (keys[i] === "_owner" && a.$$typeof)
        continue;
      if (!equal(a[keys[i]], b[keys[i]]))
        return false;
    }
    return true;
  }
  return a !== a && b !== b;
}
function isEqual(a, b) {
  try {
    return equal(a, b);
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
    var d = values[0], _values$ = values[1], a = _values$ === void 0 ? prev_a : _values$;
    var delta_a = a - prev_a;
    var next_turns = state.turns;
    if (Math.abs(delta_a) > 270)
      next_turns += sign(delta_a);
    return subV([d, a - 360 * next_turns], state.initial);
  };
  _proto.getKinematics = function getKinematics(values, event) {
    var state = this.getMovement(values);
    var turns = (values[1] - state._movement[1] - this.state.initial[1]) / 360;
    var dt = event.timeStamp - this.state.timeStamp;
    var _calculateAllKinemati = calculateAllKinematics(state.movement, state.delta, dt), kinematics = _objectWithoutPropertiesLoose(_calculateAllKinemati, ["distance", "velocity"]);
    return _extends({
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
      _this.updateGestureState(_extends({}, getStartGestureState(_assertThisInitialized(_this), values, event), getGenericPayload(_assertThisInitialized(_this), event, true), {
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
        _this.updateGestureState(_extends({}, getGenericPayload(_assertThisInitialized(_this), event), kinematics, {
          origin
        }));
        _this.fireGestureHandler();
      } catch (e) {
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
      _this.updateGestureState(_extends({}, getGenericPayload(_assertThisInitialized(_this), event), _this.getMovement(_this.state.values), {
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
      _this.updateGestureState(_extends({}, getStartGestureState(_assertThisInitialized(_this), values, event), getGenericPayload(_assertThisInitialized(_this), event, true), {
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
      _this.updateGestureState(_extends({}, getGenericPayload(_assertThisInitialized(_this), event), kinematics, {
        origin: [event.clientX, event.clientY]
      }));
      _this.fireGestureHandler();
    };
    _this.onGestureEnd = function(event) {
      _this.clean();
      if (!_this.state._active)
        return;
      _this.updateGestureState(_extends({}, getGenericPayload(_assertThisInitialized(_this), event), _this.getMovement(_this.state.values), {
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
      var d = prev_d + _delta_d;
      var a = prev_a !== void 0 ? prev_a : 0;
      return {
        values: [d, a],
        origin: [event.clientX, event.clientY],
        delta: [_delta_d, a]
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
      _this.updateGestureState(_extends({}, getStartGestureState(_assertThisInitialized(_this), values, event, _this.state.values), getGenericPayload(_assertThisInitialized(_this), event, true), {
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
      _this.updateGestureState(_extends({}, getGenericPayload(_assertThisInitialized(_this), event), _this.getKinematics(values, event), {
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
  var buildPinchConfig = (0, import_react.useRef)();
  if (!buildPinchConfig.current) {
    buildPinchConfig.current = memoizeOne(_buildPinchConfig, isEqual);
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
        _this.updateGestureState(_extends({}, getStartGestureState(_assertThisInitialized(_this), values, event, _this.state.values), getGenericPayload(_assertThisInitialized(_this), event, true)));
        var movement = _this.getMovement(values);
        var geometry = calculateAllGeometry(movement.delta);
        _this.updateGestureState(movement);
        _this.updateGestureState(geometry);
      } else {
        _this.updateGestureState(_extends({}, getGenericPayload(_assertThisInitialized(_this), event), _this.getKinematics(values, event)));
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
  var buildWheelConfig = (0, import_react.useRef)();
  if (!buildWheelConfig.current) {
    buildWheelConfig.current = memoizeOne(_buildWheelConfig, isEqual);
  }
  return useRecognizers({
    wheel: handler
  }, buildWheelConfig.current(config));
}

// src/inputs.tsx
var DOUBLE_CLICK_DURATION = 250;
var Inputs = class {
  constructor() {
    this.keys = {};
    this.pointerUpTime = 0;
    this.panStart = (e) => {
      const {shiftKey, ctrlKey, metaKey, altKey} = e;
      const info = {
        target: "wheel",
        pointerId: this.pointer?.pointerId || 0,
        origin: this.pointer?.origin || [0, 0],
        delta: [0, 0],
        pressure: 0.5,
        point: Inputs.getPoint(e),
        shiftKey,
        ctrlKey,
        metaKey,
        altKey
      };
      this.pointer = info;
      return info;
    };
    this.pan = (delta, e) => {
      if (!this.pointer || this.pointer.target !== "wheel") {
        return this.panStart(e);
      }
      const {shiftKey, ctrlKey, metaKey, altKey} = e;
      const prev = this.pointer;
      const point = Inputs.getPoint(e);
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
    this.keydown = (e) => {
      const {shiftKey, ctrlKey, metaKey, altKey} = e;
      this.keys[e.key] = true;
      return {
        point: this.pointer?.point || [0, 0],
        origin: this.pointer?.origin || [0, 0],
        key: e.key,
        keys: Object.keys(this.keys),
        shiftKey,
        ctrlKey,
        metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
        altKey
      };
    };
    this.keyup = (e) => {
      const {shiftKey, ctrlKey, metaKey, altKey} = e;
      delete this.keys[e.key];
      return {
        point: this.pointer?.point || [0, 0],
        origin: this.pointer?.origin || [0, 0],
        key: e.key,
        keys: Object.keys(this.keys),
        shiftKey,
        ctrlKey,
        metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
        altKey
      };
    };
  }
  touchStart(e, target) {
    const {shiftKey, ctrlKey, metaKey, altKey} = e;
    e.preventDefault();
    const touch = e.changedTouches[0];
    const info = {
      target,
      pointerId: touch.identifier,
      origin: Inputs.getPoint(touch),
      delta: [0, 0],
      point: Inputs.getPoint(touch),
      pressure: Inputs.getPressure(touch),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey
    };
    this.pointer = info;
    return info;
  }
  touchMove(e, target) {
    const {shiftKey, ctrlKey, metaKey, altKey} = e;
    e.preventDefault();
    const touch = e.changedTouches[0];
    const prev = this.pointer;
    const point = Inputs.getPoint(touch);
    const delta = prev?.point ? Vec.sub(point, prev.point) : [0, 0];
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
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey
    };
    this.pointer = info;
    return info;
  }
  pointerDown(e, target) {
    const {shiftKey, ctrlKey, metaKey, altKey} = e;
    const point = Inputs.getPoint(e);
    const info = {
      target,
      pointerId: e.pointerId,
      origin: point,
      point,
      delta: [0, 0],
      pressure: Inputs.getPressure(e),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey
    };
    this.pointer = info;
    return info;
  }
  pointerEnter(e, target) {
    const {shiftKey, ctrlKey, metaKey, altKey} = e;
    const point = Inputs.getPoint(e);
    const info = {
      target,
      pointerId: e.pointerId,
      origin: point,
      delta: [0, 0],
      point,
      pressure: Inputs.getPressure(e),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey
    };
    this.pointer = info;
    return info;
  }
  pointerMove(e, target) {
    const {shiftKey, ctrlKey, metaKey, altKey} = e;
    const prev = this.pointer;
    const point = Inputs.getPoint(e);
    const delta = prev?.point ? Vec.sub(point, prev.point) : [0, 0];
    const info = {
      origin: point,
      ...prev,
      target,
      pointerId: e.pointerId,
      point,
      delta,
      pressure: Inputs.getPressure(e),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
      altKey
    };
    this.pointer = info;
    return info;
  }
  pointerUp(e, target) {
    const {shiftKey, ctrlKey, metaKey, altKey} = e;
    const prev = this.pointer;
    const point = Inputs.getPoint(e);
    const delta = prev?.point ? Vec.sub(point, prev.point) : [0, 0];
    const info = {
      origin: point,
      ...prev,
      target,
      pointerId: e.pointerId,
      point,
      delta,
      pressure: Inputs.getPressure(e),
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
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
    return Date.now() - this.pointerUpTime < DOUBLE_CLICK_DURATION && Vec.dist(origin, point) < 4;
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
    const delta = Vec.sub(origin, point);
    const info = {
      pointerId: 0,
      target: "pinch",
      origin: prev?.origin || Vec.round(point),
      delta,
      point: Vec.round(point),
      pressure: 0.5,
      shiftKey,
      ctrlKey,
      metaKey: Utils.isDarwin() ? metaKey : ctrlKey,
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
  static getPoint(e) {
    return [Number(e.clientX.toPrecision(5)), Number(e.clientY.toPrecision(5))];
  }
  static getPressure(e) {
    return "pressure" in e ? Number(e.pressure.toPrecision(5)) || 0.5 : 0.5;
  }
  static commandKey() {
    return Utils.isDarwin() ? "\u2318" : "Ctrl";
  }
};
var inputs = new Inputs();

// src/renderer/hooks/useZoomEvents.ts
function useZoomEvents() {
  const rPinchDa = (0, import_react2.useRef)(void 0);
  const rOriginPoint = (0, import_react2.useRef)(void 0);
  const rPinchPoint = (0, import_react2.useRef)(void 0);
  const {callbacks} = useTLContext();
  useWheel(({event: e, delta}) => {
    if (Vec.isEqual(delta, [0, 0]))
      return;
    const info = inputs.pan(delta, e);
    callbacks.onPan?.(info, e);
  }, {
    domTarget: typeof document === "undefined" ? void 0 : document.body,
    eventOptions: {passive: false}
  });
  usePinch(({pinching, da, origin, event: e}) => {
    if (!pinching) {
      const info2 = inputs.pinch(origin, origin);
      callbacks.onPinchEnd?.(info2, e);
      rPinchDa.current = void 0;
      rPinchPoint.current = void 0;
      rOriginPoint.current = void 0;
      return;
    }
    if (rPinchPoint.current === void 0) {
      const info2 = inputs.pinch(origin, origin);
      callbacks.onPinchStart?.(info2, e);
      rPinchDa.current = da;
      rPinchPoint.current = origin;
      rOriginPoint.current = origin;
    }
    const [distanceDelta] = Vec.sub(rPinchDa.current, da);
    const info = inputs.pinch(rPinchPoint.current, origin);
    callbacks.onPinch?.({
      ...info,
      point: origin,
      origin: rOriginPoint.current,
      delta: [...info.delta, distanceDelta]
    }, e);
    rPinchDa.current = da;
    rPinchPoint.current = origin;
  }, {
    domTarget: typeof document === "undefined" ? void 0 : document.body,
    eventOptions: {passive: false}
  });
}

// src/renderer/hooks/useSafariFocusOutFix.tsx
var import_react3 = __toModule(require("react"));
function useSafariFocusOutFix() {
  const {callbacks} = useTLContext();
  (0, import_react3.useEffect)(() => {
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

// src/renderer/hooks/useCanvasEvents.tsx
var React3 = __toModule(require("react"));
function useCanvasEvents() {
  const {callbacks} = useTLContext();
  const onPointerDown = React3.useCallback((e) => {
    if (e.button !== 0)
      return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.button === 0) {
      const info = inputs.pointerDown(e, "canvas");
      callbacks.onPointCanvas?.(info, e);
      callbacks.onPointerDown?.(info, e);
    }
  }, [callbacks]);
  const onPointerMove = React3.useCallback((e) => {
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      const info2 = inputs.pointerMove(e, "canvas");
      callbacks.onDragCanvas?.(info2, e);
    }
    const info = inputs.pointerMove(e, "canvas");
    callbacks.onPointerMove?.(info, e);
  }, [callbacks]);
  const onPointerUp = React3.useCallback((e) => {
    if (e.button !== 0)
      return;
    const isDoubleClick = inputs.isDoubleClick();
    const info = inputs.pointerUp(e, "canvas");
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget?.releasePointerCapture(e.pointerId);
    }
    if (isDoubleClick && !(info.altKey || info.metaKey)) {
      callbacks.onDoubleClickCanvas?.(info, e);
    }
    callbacks.onReleaseCanvas?.(info, e);
    callbacks.onPointerUp?.(info, e);
  }, [callbacks]);
  return {
    onPointerDown,
    onPointerMove,
    onPointerUp
  };
}

// src/renderer/hooks/useShapeEvents.tsx
var React4 = __toModule(require("react"));
function useShapeEvents(id, disable = false) {
  const {rPageState, rScreenBounds, callbacks} = useTLContext();
  const onPointerDown = React4.useCallback((e) => {
    if (e.button !== 0)
      return;
    if (disable)
      return;
    const info = inputs.pointerDown(e, id);
    e.stopPropagation();
    e.currentTarget?.setPointerCapture(e.pointerId);
    if (rScreenBounds.current && Utils.pointInBounds(info.point, rScreenBounds.current) && !rPageState.current.selectedIds.includes(id)) {
      callbacks.onPointBounds?.(inputs.pointerDown(e, "bounds"), e);
      callbacks.onPointShape?.(info, e);
      return;
    }
    callbacks.onPointShape?.(info, e);
    callbacks.onPointerDown?.(info, e);
  }, [callbacks, id, disable]);
  const onPointerUp = React4.useCallback((e) => {
    if (e.button !== 0)
      return;
    if (disable)
      return;
    e.stopPropagation();
    const isDoubleClick = inputs.isDoubleClick();
    const info = inputs.pointerUp(e, id);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget?.releasePointerCapture(e.pointerId);
    }
    if (isDoubleClick && !(info.altKey || info.metaKey)) {
      callbacks.onDoubleClickShape?.(info, e);
    }
    callbacks.onReleaseShape?.(info, e);
    callbacks.onPointerUp?.(info, e);
  }, [callbacks, id, disable]);
  const onPointerMove = React4.useCallback((e) => {
    if (disable)
      return;
    e.stopPropagation();
    if (inputs.pointer && e.pointerId !== inputs.pointer.pointerId)
      return;
    const info = inputs.pointerMove(e, id);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      callbacks.onDragShape?.(info, e);
    }
    callbacks.onPointerMove?.(info, e);
  }, [callbacks, id, disable]);
  const onPointerEnter = React4.useCallback((e) => {
    if (disable)
      return;
    const info = inputs.pointerEnter(e, id);
    callbacks.onHoverShape?.(info, e);
  }, [callbacks, id, disable]);
  const onPointerLeave = React4.useCallback((e) => {
    if (disable)
      return;
    const info = inputs.pointerEnter(e, id);
    callbacks.onUnhoverShape?.(info, e);
  }, [callbacks, id, disable]);
  const onTouchStart = React4.useCallback((e) => {
    e.preventDefault();
  }, []);
  const onTouchEnd = React4.useCallback((e) => {
    e.preventDefault();
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

// src/renderer/hooks/useShapeTree.tsx
var React5 = __toModule(require("react"));
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
    shape.children.map((id) => shapes[id]).sort((a, b) => a.childIndex - b.childIndex).forEach((childShape) => addToShapeTree(childShape, node.children, shapes, selectedIds, info));
  }
}
function useShapeTree(page, pageState, shapeUtils, onChange) {
  const rPreviousCount = React5.useRef(0);
  if (typeof window === "undefined")
    return [];
  const {selectedIds, camera} = pageState;
  const [minX, minY] = Vec.sub(Vec.div([0, 0], camera.zoom), camera.point);
  const [maxX, maxY] = Vec.sub(Vec.div([window.innerWidth, window.innerHeight], camera.zoom), camera.point);
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
  shapesToRender.sort((a, b) => a.childIndex - b.childIndex).forEach((shape) => addToShapeTree(shape, tree, page.shapes, selectedIds, pageState));
  return tree;
}

// src/renderer/hooks/useStyle.tsx
var React6 = __toModule(require("react"));
var styles = new Map();
function makeCssTheme(prefix, theme) {
  return Object.keys(theme).reduce((acc, key) => {
    const value = theme[key];
    if (value) {
      return acc + `${`--${prefix}-${key}`}: ${value};
`;
    }
    return acc;
  }, "");
}
function useTheme(prefix, theme, selector = ":root") {
  React6.useLayoutEffect(() => {
    const style = document.createElement("style");
    const cssTheme = makeCssTheme(prefix, theme);
    style.setAttribute("id", `${prefix}-theme`);
    style.setAttribute("data-selector", selector);
    style.innerHTML = `
        ${selector} {
          ${cssTheme}
        }
      `;
    document.head.appendChild(style);
    return () => {
      if (style && document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [prefix, theme, selector]);
}
function useStyle(uid, rules) {
  React6.useLayoutEffect(() => {
    if (styles.get(uid)) {
      return () => {
      };
    }
    const style = document.createElement("style");
    style.innerHTML = rules;
    style.setAttribute("id", uid);
    document.head.appendChild(style);
    styles.set(uid, style);
    return () => {
      if (style && document.head.contains(style)) {
        document.head.removeChild(style);
        styles.delete(uid);
      }
    };
  }, [uid, rules]);
}
var css = (strings, ...args) => strings.reduce((acc, string, index) => acc + string + (index < args.length ? args[index] : ""), "");
var defaultTheme = {
  brushFill: "rgba(0,0,0,.05)",
  brushStroke: "rgba(0,0,0,.25)",
  selectStroke: "rgb(66, 133, 244)",
  selectFill: "rgba(65, 132, 244, 0.12)",
  background: "rgb(248, 249, 250)",
  foreground: "rgb(51, 51, 51)"
};
var tlcss = css`
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
function useTLTheme(theme) {
  const [tltheme] = React6.useState(() => ({
    ...defaultTheme,
    ...theme
  }));
  useTheme("tl", tltheme);
  useStyle("tl-canvas", tlcss);
}

// src/renderer/hooks/useBoundsHandleEvents.tsx
var React7 = __toModule(require("react"));
function useBoundsHandleEvents(id) {
  const {callbacks} = useTLContext();
  const onPointerDown = React7.useCallback((e) => {
    if (e.button !== 0)
      return;
    e.stopPropagation();
    e.currentTarget?.setPointerCapture(e.pointerId);
    const info = inputs.pointerDown(e, id);
    callbacks.onPointBoundsHandle?.(info, e);
    callbacks.onPointerDown?.(info, e);
  }, [callbacks, id]);
  const onPointerUp = React7.useCallback((e) => {
    if (e.button !== 0)
      return;
    e.stopPropagation();
    const isDoubleClick = inputs.isDoubleClick();
    const info = inputs.pointerUp(e, id);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget?.releasePointerCapture(e.pointerId);
    }
    if (isDoubleClick && !(info.altKey || info.metaKey)) {
      callbacks.onDoubleClickBoundsHandle?.(info, e);
    }
    callbacks.onReleaseBoundsHandle?.(info, e);
    callbacks.onPointerUp?.(info, e);
  }, [callbacks, id]);
  const onPointerMove = React7.useCallback((e) => {
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      callbacks.onDragBoundsHandle?.(inputs.pointerMove(e, id), e);
    }
    const info = inputs.pointerMove(e, id);
    callbacks.onPointerMove?.(info, e);
  }, [callbacks, id]);
  const onPointerEnter = React7.useCallback((e) => {
    callbacks.onHoverBoundsHandle?.(inputs.pointerEnter(e, id), e);
  }, [callbacks, id]);
  const onPointerLeave = React7.useCallback((e) => {
    callbacks.onUnhoverBoundsHandle?.(inputs.pointerEnter(e, id), e);
  }, [callbacks, id]);
  const onTouchStart = React7.useCallback((e) => {
    e.preventDefault();
  }, []);
  const onTouchEnd = React7.useCallback((e) => {
    e.preventDefault();
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

// src/renderer/hooks/useCameraCss.tsx
var React8 = __toModule(require("react"));
function useCameraCss(pageState) {
  const rGroup = React8.useRef(null);
  React8.useEffect(() => {
    document.documentElement.style.setProperty("--tl-zoom", pageState.camera.zoom.toString());
  }, [pageState.camera.zoom]);
  React8.useEffect(() => {
    const {
      zoom,
      point: [x = 0, y = 0]
    } = pageState.camera;
    rGroup.current?.setAttribute("transform", `scale(${zoom}) translate(${x} ${y})`);
  }, [pageState.camera]);
  return rGroup;
}

// src/renderer/hooks/useRenderOnResize.tsx
var React9 = __toModule(require("react"));
function useRenderOnResize() {
  const forceUpdate = React9.useReducer((x) => x + 1, 0)[1];
  React9.useEffect(() => {
    const debouncedUpdate = utils_default.debounce(forceUpdate, 96);
    window.addEventListener("resize", debouncedUpdate);
    return () => {
      window.removeEventListener("resize", debouncedUpdate);
    };
  }, [forceUpdate]);
}

// src/renderer/hooks/useSelection.tsx
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
    bounds3 = selectedShapes.reduce((acc, shape, i) => {
      if (i === 0) {
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

// src/renderer/hooks/useHandleEvents.tsx
var React10 = __toModule(require("react"));
function useHandleEvents(id) {
  const {callbacks} = useTLContext();
  const onPointerDown = React10.useCallback((e) => {
    if (e.button !== 0)
      return;
    e.stopPropagation();
    e.currentTarget?.setPointerCapture(e.pointerId);
    const info = inputs.pointerDown(e, id);
    callbacks.onPointHandle?.(info, e);
    callbacks.onPointerDown?.(info, e);
  }, [callbacks, id]);
  const onPointerUp = React10.useCallback((e) => {
    if (e.button !== 0)
      return;
    e.stopPropagation();
    const isDoubleClick = inputs.isDoubleClick();
    const info = inputs.pointerUp(e, "bounds");
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget?.releasePointerCapture(e.pointerId);
      if (isDoubleClick && !(info.altKey || info.metaKey)) {
        callbacks.onDoubleClickHandle?.(info, e);
      }
      callbacks.onReleaseHandle?.(info, e);
    }
    callbacks.onPointerUp?.(info, e);
  }, [callbacks]);
  const onPointerMove = React10.useCallback((e) => {
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      const info2 = inputs.pointerMove(e, id);
      callbacks.onDragHandle?.(info2, e);
    }
    const info = inputs.pointerMove(e, id);
    callbacks.onPointerMove?.(info, e);
  }, [callbacks, id]);
  const onPointerEnter = React10.useCallback((e) => {
    const info = inputs.pointerEnter(e, id);
    callbacks.onHoverHandle?.(info, e);
  }, [callbacks, id]);
  const onPointerLeave = React10.useCallback((e) => {
    const info = inputs.pointerEnter(e, id);
    callbacks.onUnhoverHandle?.(info, e);
  }, [callbacks, id]);
  const onTouchStart = React10.useCallback((e) => {
    e.preventDefault();
  }, []);
  const onTouchEnd = React10.useCallback((e) => {
    e.preventDefault();
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

// src/renderer/hooks/useHandles.ts
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

// src/renderer/components/error-fallback.tsx
var React11 = __toModule(require("react"));
var ErrorFallback = React11.memo(({error, resetErrorBoundary}) => {
  const {callbacks} = useTLContext();
  React11.useEffect(() => {
    callbacks.onError?.(error);
    console.error(error);
  }, [error, resetErrorBoundary, callbacks]);
  return null;
});

// src/renderer/components/brush/brush.tsx
var React13 = __toModule(require("react"));

// src/renderer/components/brush/BrushUpdater.ts
var React12 = __toModule(require("react"));
var BrushUpdater = class {
  constructor() {
    this.ref = React12.createRef();
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

// src/renderer/components/brush/brush.tsx
var brushUpdater = new BrushUpdater();
var Brush = React13.memo(() => {
  return /* @__PURE__ */ React13.createElement("rect", {
    ref: brushUpdater.ref,
    className: "tl-brush",
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
});

// src/renderer/components/defs.tsx
var React14 = __toModule(require("react"));
function Defs({zoom}) {
  return /* @__PURE__ */ React14.createElement("defs", null, /* @__PURE__ */ React14.createElement("circle", {
    id: "dot",
    className: "tl-counter-scaled tl-dot",
    r: 4
  }), /* @__PURE__ */ React14.createElement("circle", {
    id: "handle-bg",
    className: "tl-handle-bg",
    pointerEvents: "all",
    r: 12
  }), /* @__PURE__ */ React14.createElement("circle", {
    id: "handle",
    className: "tl-counter-scaled tl-handle",
    pointerEvents: "none",
    r: 4
  }), /* @__PURE__ */ React14.createElement("g", {
    id: "cross",
    className: "tl-binding-indicator"
  }, /* @__PURE__ */ React14.createElement("line", {
    x1: -6,
    y1: -6,
    x2: 6,
    y2: 6
  }), /* @__PURE__ */ React14.createElement("line", {
    x1: 6,
    y1: -6,
    x2: -6,
    y2: 6
  })), /* @__PURE__ */ React14.createElement("filter", {
    id: "expand"
  }, /* @__PURE__ */ React14.createElement("feMorphology", {
    operator: "dilate",
    radius: 0.5 / zoom
  })));
}

// src/renderer/components/page.tsx
var React27 = __toModule(require("react"));

// src/renderer/components/shape/shape.tsx
var React17 = __toModule(require("react"));

// src/renderer/components/shape/rendered-shape.tsx
var React15 = __toModule(require("react"));
var RenderedShape = React15.memo(function RenderedShape2({
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

// src/renderer/components/shape/editing-text-shape.tsx
var React16 = __toModule(require("react"));
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
  const ref = React16.useRef(null);
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

// src/renderer/components/shape/shape.tsx
var Shape = React17.memo(({
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
  return /* @__PURE__ */ React17.createElement("g", {
    className: isCurrentParent ? "tl-shape-group tl-current-parent" : "tl-shape-group",
    id: shape.id,
    transform,
    ...events
  }, isEditing && utils.isEditableText ? /* @__PURE__ */ React17.createElement(EditingTextShape, {
    shape,
    isBinding: false,
    isCurrentParent: false,
    isDarkMode,
    isEditing: true,
    utils
  }) : /* @__PURE__ */ React17.createElement(RenderedShape, {
    shape,
    utils,
    isBinding,
    isCurrentParent,
    isDarkMode,
    isEditing
  }));
});

// src/renderer/components/bounds/bounds.tsx
var React22 = __toModule(require("react"));

// src/renderer/components/bounds/center-handle.tsx
var React18 = __toModule(require("react"));
var CenterHandle = React18.memo(({bounds: bounds3, isLocked}) => {
  return /* @__PURE__ */ React18.createElement("rect", {
    className: isLocked ? "tl-bounds-center tl-dashed" : "tl-bounds-center",
    x: -1,
    y: -1,
    width: bounds3.width + 2,
    height: bounds3.height + 2,
    pointerEvents: "none"
  });
});

// src/renderer/components/bounds/rotate-handle.tsx
var React19 = __toModule(require("react"));
var RotateHandle = React19.memo(({bounds: bounds3, size}) => {
  const events = useBoundsHandleEvents("rotate");
  return /* @__PURE__ */ React19.createElement("g", {
    cursor: "grab"
  }, /* @__PURE__ */ React19.createElement("circle", {
    cx: bounds3.width / 2,
    cy: size * -2,
    r: size * 2,
    fill: "transparent",
    stroke: "none",
    pointerEvents: "all",
    ...events
  }), /* @__PURE__ */ React19.createElement("circle", {
    className: "tl-rotate-handle",
    cx: bounds3.width / 2,
    cy: size * -2,
    r: size / 2,
    pointerEvents: "none"
  }));
});

// src/renderer/components/bounds/corner-handle.tsx
var React20 = __toModule(require("react"));
var cornerBgClassnames = {
  [TLBoundsCorner.TopLeft]: "tl-transparent tl-cursor-nwse",
  [TLBoundsCorner.TopRight]: "tl-transparent tl-cursor-nesw",
  [TLBoundsCorner.BottomRight]: "tl-transparent tl-cursor-nwse",
  [TLBoundsCorner.BottomLeft]: "tl-transparent tl-cursor-nesw"
};
var CornerHandle = React20.memo(({
  size,
  corner,
  bounds: bounds3
}) => {
  const events = useBoundsHandleEvents(corner);
  const isTop = corner === TLBoundsCorner.TopLeft || corner === TLBoundsCorner.TopRight;
  const isLeft = corner === TLBoundsCorner.TopLeft || corner === TLBoundsCorner.BottomLeft;
  return /* @__PURE__ */ React20.createElement("g", null, /* @__PURE__ */ React20.createElement("rect", {
    className: cornerBgClassnames[corner],
    x: (isLeft ? -1 : bounds3.width + 1) - size,
    y: (isTop ? -1 : bounds3.height + 1) - size,
    width: size * 2,
    height: size * 2,
    pointerEvents: "all",
    ...events
  }), /* @__PURE__ */ React20.createElement("rect", {
    className: "tl-corner-handle",
    x: (isLeft ? -1 : bounds3.width + 1) - size / 2,
    y: (isTop ? -1 : bounds3.height + 1) - size / 2,
    width: size,
    height: size,
    pointerEvents: "none"
  }));
});

// src/renderer/components/bounds/edge-handle.tsx
var React21 = __toModule(require("react"));
var edgeClassnames = {
  [TLBoundsEdge.Top]: "tl-transparent tl-cursor-ns",
  [TLBoundsEdge.Right]: "tl-transparent tl-cursor-ew",
  [TLBoundsEdge.Bottom]: "tl-transparent tl-cursor-ns",
  [TLBoundsEdge.Left]: "tl-transparent tl-cursor-ew"
};
var EdgeHandle = React21.memo(({size, bounds: bounds3, edge}) => {
  const events = useBoundsHandleEvents(edge);
  const isHorizontal = edge === TLBoundsEdge.Top || edge === TLBoundsEdge.Bottom;
  const isFarEdge = edge === TLBoundsEdge.Right || edge === TLBoundsEdge.Bottom;
  const {height, width} = bounds3;
  return /* @__PURE__ */ React21.createElement("rect", {
    className: edgeClassnames[edge],
    x: isHorizontal ? size / 2 : (isFarEdge ? width + 1 : -1) - size / 2,
    y: isHorizontal ? (isFarEdge ? height + 1 : -1) - size / 2 : size / 2,
    width: isHorizontal ? Math.max(0, width + 1 - size) : size,
    height: isHorizontal ? size : Math.max(0, height + 1 - size),
    ...events
  });
});

// src/renderer/components/bounds/bounds.tsx
function Bounds({zoom, bounds: bounds3, rotation, isLocked}) {
  const size = (Utils.isMobile() ? 10 : 8) / zoom;
  const center = Utils.getBoundsCenter(bounds3);
  return /* @__PURE__ */ React22.createElement("g", {
    pointerEvents: "all",
    transform: `
        rotate(${rotation * (180 / Math.PI)},${center})
        translate(${bounds3.minX},${bounds3.minY})
        rotate(${(bounds3.rotation || 0) * (180 / Math.PI)}, 0, 0)`
  }, /* @__PURE__ */ React22.createElement(CenterHandle, {
    bounds: bounds3,
    isLocked
  }), !isLocked && /* @__PURE__ */ React22.createElement(React22.Fragment, null, /* @__PURE__ */ React22.createElement(EdgeHandle, {
    size,
    bounds: bounds3,
    edge: TLBoundsEdge.Top
  }), /* @__PURE__ */ React22.createElement(EdgeHandle, {
    size,
    bounds: bounds3,
    edge: TLBoundsEdge.Right
  }), /* @__PURE__ */ React22.createElement(EdgeHandle, {
    size,
    bounds: bounds3,
    edge: TLBoundsEdge.Bottom
  }), /* @__PURE__ */ React22.createElement(EdgeHandle, {
    size,
    bounds: bounds3,
    edge: TLBoundsEdge.Left
  }), /* @__PURE__ */ React22.createElement(CornerHandle, {
    size,
    bounds: bounds3,
    corner: TLBoundsCorner.TopLeft
  }), /* @__PURE__ */ React22.createElement(CornerHandle, {
    size,
    bounds: bounds3,
    corner: TLBoundsCorner.TopRight
  }), /* @__PURE__ */ React22.createElement(CornerHandle, {
    size,
    bounds: bounds3,
    corner: TLBoundsCorner.BottomRight
  }), /* @__PURE__ */ React22.createElement(CornerHandle, {
    size,
    bounds: bounds3,
    corner: TLBoundsCorner.BottomLeft
  }), /* @__PURE__ */ React22.createElement(RotateHandle, {
    size,
    bounds: bounds3
  })));
}

// src/renderer/components/bounds/bounds-bg.tsx
var React24 = __toModule(require("react"));

// src/renderer/hooks/useBoundsEvents.tsx
var React23 = __toModule(require("react"));
function useBoundsEvents() {
  const {callbacks} = useTLContext();
  const onPointerDown = React23.useCallback((e) => {
    if (e.button !== 0)
      return;
    e.stopPropagation();
    e.currentTarget?.setPointerCapture(e.pointerId);
    const info = inputs.pointerDown(e, "bounds");
    callbacks.onPointBounds?.(info, e);
    callbacks.onPointerDown?.(info, e);
  }, [callbacks]);
  const onPointerUp = React23.useCallback((e) => {
    if (e.button !== 0)
      return;
    e.stopPropagation();
    const isDoubleClick = inputs.isDoubleClick();
    const info = inputs.pointerUp(e, "bounds");
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget?.releasePointerCapture(e.pointerId);
    }
    if (isDoubleClick && !(info.altKey || info.metaKey)) {
      callbacks.onDoubleClickBounds?.(info, e);
    }
    callbacks.onReleaseBounds?.(info, e);
    callbacks.onPointerUp?.(info, e);
  }, [callbacks]);
  const onPointerMove = React23.useCallback((e) => {
    e.stopPropagation();
    if (inputs.pointer && e.pointerId !== inputs.pointer.pointerId)
      return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      callbacks.onDragBounds?.(inputs.pointerMove(e, "bounds"), e);
    }
    const info = inputs.pointerMove(e, "bounds");
    callbacks.onPointerMove?.(info, e);
  }, [callbacks]);
  const onPointerEnter = React23.useCallback((e) => {
    callbacks.onHoverBounds?.(inputs.pointerEnter(e, "bounds"), e);
  }, [callbacks]);
  const onPointerLeave = React23.useCallback((e) => {
    callbacks.onUnhoverBounds?.(inputs.pointerEnter(e, "bounds"), e);
  }, [callbacks]);
  const onTouchStart = React23.useCallback((e) => {
    e.preventDefault();
  }, []);
  const onTouchEnd = React23.useCallback((e) => {
    e.preventDefault();
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

// src/renderer/components/bounds/bounds-bg.tsx
function BoundsBg({bounds: bounds3, rotation}) {
  const events = useBoundsEvents();
  const {width, height} = bounds3;
  const center = Utils.getBoundsCenter(bounds3);
  return /* @__PURE__ */ React24.createElement("rect", {
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

// src/renderer/components/handles/handles.tsx
var React26 = __toModule(require("react"));

// src/renderer/components/handles/handle.tsx
var React25 = __toModule(require("react"));
var Handle = React25.memo(({id, point, zoom}) => {
  const events = useHandleEvents(id);
  return /* @__PURE__ */ React25.createElement("g", {
    className: "tl-handles",
    transform: `translate(${point})`,
    ...events
  }, /* @__PURE__ */ React25.createElement("circle", {
    id: "handle-bg",
    className: "tl-handle-bg",
    pointerEvents: "all",
    r: 20 / Math.max(1, zoom)
  }), /* @__PURE__ */ React25.createElement("use", {
    href: "#handle"
  }));
});

// src/renderer/components/handles/handles.tsx
var toAngle = 180 / Math.PI;
var Handles = React26.memo(({shape, zoom}) => {
  const {shapeUtils} = useTLContext();
  const center = shapeUtils[shape.type].getCenter(shape);
  if (shape.handles === void 0) {
    return null;
  }
  return /* @__PURE__ */ React26.createElement("g", {
    transform: `rotate(${(shape.rotation || 0) * toAngle},${center})`
  }, Object.values(shape.handles).map((handle) => /* @__PURE__ */ React26.createElement(Handle, {
    key: shape.id + "_" + handle.id,
    id: handle.id,
    point: Vec.add(handle.point, shape.point),
    zoom
  })));
});

// src/renderer/components/page.tsx
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
  return /* @__PURE__ */ React27.createElement(React27.Fragment, null, bounds3 && !hideBounds && /* @__PURE__ */ React27.createElement(BoundsBg, {
    bounds: bounds3,
    rotation
  }), shapeTree.map((node) => /* @__PURE__ */ React27.createElement(ShapeNode, {
    key: node.shape.id,
    ...node
  })), bounds3 && !hideBounds && /* @__PURE__ */ React27.createElement(Bounds, {
    zoom,
    bounds: bounds3,
    isLocked,
    rotation
  }), !hideIndicators && selectedIds.length > 1 && selectedIds.filter(Boolean).map((id) => /* @__PURE__ */ React27.createElement(ShapeIndicator, {
    key: "selected_" + id,
    shape: page.shapes[id],
    variant: "selected"
  })), !hideIndicators && hoveredId && /* @__PURE__ */ React27.createElement(ShapeIndicator, {
    key: "hovered_" + hoveredId,
    shape: page.shapes[hoveredId],
    variant: "hovered"
  }), shapeWithHandles && /* @__PURE__ */ React27.createElement(Handles, {
    shape: shapeWithHandles,
    zoom
  }));
}
var ShapeIndicator = React27.memo(({shape, variant}) => {
  const {shapeUtils} = useTLContext();
  const utils = shapeUtils[shape.type];
  const center = utils.getCenter(shape);
  const rotation = (shape.rotation || 0) * (180 / Math.PI);
  const transform = `rotate(${rotation}, ${center}) translate(${shape.point})`;
  return /* @__PURE__ */ React27.createElement("g", {
    className: variant === "selected" ? "tl-selected" : "tl-hovered",
    transform
  }, shapeUtils[shape.type].renderIndicator(shape));
});
var ShapeNode = React27.memo(({
  shape,
  children,
  isEditing,
  isDarkMode,
  isBinding,
  isCurrentParent
}) => {
  return /* @__PURE__ */ React27.createElement(React27.Fragment, null, /* @__PURE__ */ React27.createElement(Shape, {
    shape,
    isEditing,
    isDarkMode,
    isBinding,
    isCurrentParent
  }), children && children.map((childNode) => /* @__PURE__ */ React27.createElement(ShapeNode, {
    key: childNode.shape.id,
    ...childNode
  })));
});

// src/renderer/hooks/usePreventNavigation.tsx
var React28 = __toModule(require("react"));
function usePreventNavigation(rCanvas) {
  React28.useEffect(() => {
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

// src/renderer/components/canvas.tsx
function resetError() {
  void 0;
}
var Canvas = React29.memo(function Canvas2({
  page,
  pageState,
  hideBounds = false,
  hideIndicators = false
}) {
  const rCanvas = React29.useRef(null);
  const rGroup = useCameraCss(pageState);
  useZoomEvents();
  useSafariFocusOutFix();
  usePreventNavigation(rCanvas);
  const events = useCanvasEvents();
  return /* @__PURE__ */ React29.createElement("div", {
    className: "tl-container"
  }, /* @__PURE__ */ React29.createElement("svg", {
    id: "canvas",
    className: "tl-canvas",
    ref: rCanvas,
    ...events
  }, /* @__PURE__ */ React29.createElement(import_react_error_boundary.ErrorBoundary, {
    FallbackComponent: ErrorFallback,
    onReset: resetError
  }, /* @__PURE__ */ React29.createElement(Defs, {
    zoom: pageState.camera.zoom
  }), /* @__PURE__ */ React29.createElement("g", {
    ref: rGroup,
    id: "tl-shapes"
  }, /* @__PURE__ */ React29.createElement(Page, {
    page,
    pageState,
    hideBounds,
    hideIndicators
  }), /* @__PURE__ */ React29.createElement(Brush, null)))));
});

// src/renderer/renderer.tsx
function Renderer({
  shapeUtils,
  page,
  pageState,
  theme,
  hideIndicators = false,
  hideBounds = false,
  isDarkMode = false,
  isDebugMode = false,
  isPenMode = false,
  ...rest
}) {
  useTLTheme(theme);
  const rScreenBounds = React30.useRef(null);
  const rPageState = React30.useRef(pageState);
  React30.useEffect(() => {
    rPageState.current = pageState;
  }, [pageState]);
  const [context] = React30.useState(() => ({
    callbacks: rest,
    shapeUtils,
    rScreenBounds,
    rPageState
  }));
  return /* @__PURE__ */ React30.createElement(TLContext.Provider, {
    value: context
  }, /* @__PURE__ */ React30.createElement(Canvas, {
    page,
    pageState,
    hideBounds,
    hideIndicators
  }));
}
/**
 * String.prototype.replaceAll() polyfill
 * https://gomakethings.com/how-to-replace-a-section-of-a-string-with-another-one-with-vanilla-js/
 * @author Chris Ferdinandi
 * @license MIT
 */
