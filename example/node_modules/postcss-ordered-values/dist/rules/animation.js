"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = normalizeAnimation;

var _postcssValueParser = require("postcss-value-parser");

var _cssnanoUtils = require("cssnano-utils");

var _addSpace = _interopRequireDefault(require("../lib/addSpace"));

var _getValue = _interopRequireDefault(require("../lib/getValue"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// animation: [ none | <keyframes-name> ] || <time> || <single-timing-function> || <time> || <single-animation-iteration-count> || <single-animation-direction> || <single-animation-fill-mode> || <single-animation-play-state>
const isTimingFunction = (value, type) => {
  const functions = ['steps', 'cubic-bezier', 'frames'];
  const keywords = ['ease', 'ease-in', 'ease-in-out', 'ease-out', 'linear', 'step-end', 'step-start'];
  return type === 'function' && functions.includes(value) || keywords.includes(value);
};

const isDirection = value => {
  return ['normal', 'reverse', 'alternate', 'alternate-reverse'].includes(value);
};

const isFillMode = value => {
  return ['none', 'forwards', 'backwards', 'both'].includes(value);
};

const isPlayState = value => {
  return ['running', 'paused'].includes(value);
};

const isTime = value => {
  const quantity = (0, _postcssValueParser.unit)(value);
  return quantity && ['ms', 's'].includes(quantity.unit);
};

const isIterationCount = value => {
  const quantity = (0, _postcssValueParser.unit)(value);
  return value === 'infinite' || quantity && !quantity.unit;
};

function normalizeAnimation(parsed) {
  const args = (0, _cssnanoUtils.getArguments)(parsed);
  const values = args.reduce((list, arg) => {
    const state = {
      name: [],
      duration: [],
      timingFunction: [],
      delay: [],
      iterationCount: [],
      direction: [],
      fillMode: [],
      playState: []
    };
    const stateConditions = [{
      property: 'duration',
      delegate: isTime
    }, {
      property: 'timingFunction',
      delegate: isTimingFunction
    }, {
      property: 'delay',
      delegate: isTime
    }, {
      property: 'iterationCount',
      delegate: isIterationCount
    }, {
      property: 'direction',
      delegate: isDirection
    }, {
      property: 'fillMode',
      delegate: isFillMode
    }, {
      property: 'playState',
      delegate: isPlayState
    }];
    arg.forEach(node => {
      let {
        type,
        value
      } = node;

      if (type === 'space') {
        return;
      }

      value = value.toLowerCase();
      const hasMatch = stateConditions.some(({
        property,
        delegate
      }) => {
        if (delegate(value, type) && !state[property].length) {
          state[property] = [node, (0, _addSpace.default)()];
          return true;
        }
      });

      if (!hasMatch) {
        state.name = [...state.name, node, (0, _addSpace.default)()];
      }
    });
    return [...list, [...state.name, ...state.duration, ...state.timingFunction, ...state.delay, ...state.iterationCount, ...state.direction, ...state.fillMode, ...state.playState]];
  }, []);
  return (0, _getValue.default)(values);
}

module.exports = exports.default;