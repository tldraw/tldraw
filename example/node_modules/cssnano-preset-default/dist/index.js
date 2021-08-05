"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = defaultPreset;

var _cssDeclarationSorter = _interopRequireDefault(require("css-declaration-sorter"));

var _postcssDiscardComments = _interopRequireDefault(require("postcss-discard-comments"));

var _postcssReduceInitial = _interopRequireDefault(require("postcss-reduce-initial"));

var _postcssMinifyGradients = _interopRequireDefault(require("postcss-minify-gradients"));

var _postcssSvgo = _interopRequireDefault(require("postcss-svgo"));

var _postcssReduceTransforms = _interopRequireDefault(require("postcss-reduce-transforms"));

var _postcssConvertValues = _interopRequireDefault(require("postcss-convert-values"));

var _postcssCalc = _interopRequireDefault(require("postcss-calc"));

var _postcssColormin = _interopRequireDefault(require("postcss-colormin"));

var _postcssOrderedValues = _interopRequireDefault(require("postcss-ordered-values"));

var _postcssMinifySelectors = _interopRequireDefault(require("postcss-minify-selectors"));

var _postcssMinifyParams = _interopRequireDefault(require("postcss-minify-params"));

var _postcssNormalizeCharset = _interopRequireDefault(require("postcss-normalize-charset"));

var _postcssMinifyFontValues = _interopRequireDefault(require("postcss-minify-font-values"));

var _postcssNormalizeUrl = _interopRequireDefault(require("postcss-normalize-url"));

var _postcssMergeLonghand = _interopRequireDefault(require("postcss-merge-longhand"));

var _postcssDiscardDuplicates = _interopRequireDefault(require("postcss-discard-duplicates"));

var _postcssDiscardOverridden = _interopRequireDefault(require("postcss-discard-overridden"));

var _postcssNormalizeRepeatStyle = _interopRequireDefault(require("postcss-normalize-repeat-style"));

var _postcssMergeRules = _interopRequireDefault(require("postcss-merge-rules"));

var _postcssDiscardEmpty = _interopRequireDefault(require("postcss-discard-empty"));

var _postcssUniqueSelectors = _interopRequireDefault(require("postcss-unique-selectors"));

var _postcssNormalizeString = _interopRequireDefault(require("postcss-normalize-string"));

var _postcssNormalizePositions = _interopRequireDefault(require("postcss-normalize-positions"));

var _postcssNormalizeWhitespace = _interopRequireDefault(require("postcss-normalize-whitespace"));

var _postcssNormalizeUnicode = _interopRequireDefault(require("postcss-normalize-unicode"));

var _postcssNormalizeDisplayValues = _interopRequireDefault(require("postcss-normalize-display-values"));

var _postcssNormalizeTimingFunctions = _interopRequireDefault(require("postcss-normalize-timing-functions"));

var _cssnanoUtils = require("cssnano-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @author Ben Briggs
 * @license MIT
 * @module cssnano:preset:default
 * @overview
 *
 * This default preset for cssnano only includes transforms that make no
 * assumptions about your CSS other than what is passed in. In previous
 * iterations of cssnano, assumptions were made about your CSS which caused
 * output to look different in certain use cases, but not others. These
 * transforms have been moved from the defaults to other presets, to make
 * this preset require only minimal configuration.
 */
const defaultOpts = {
  convertValues: {
    length: false
  },
  normalizeCharset: {
    add: false
  },
  cssDeclarationSorter: {
    keepOverrides: true
  }
};

function defaultPreset(opts = {}) {
  const options = Object.assign({}, defaultOpts, opts);
  const plugins = [[_postcssDiscardComments.default, options.discardComments], [_postcssMinifyGradients.default, options.minifyGradients], [_postcssReduceInitial.default, options.reduceInitial], [_postcssSvgo.default, options.svgo], [_postcssNormalizeDisplayValues.default, options.normalizeDisplayValues], [_postcssReduceTransforms.default, options.reduceTransforms], [_postcssColormin.default, options.colormin], [_postcssNormalizeTimingFunctions.default, options.normalizeTimingFunctions], [_postcssCalc.default, options.calc], [_postcssConvertValues.default, options.convertValues], [_postcssOrderedValues.default, options.orderedValues], [_postcssMinifySelectors.default, options.minifySelectors], [_postcssMinifyParams.default, options.minifyParams], [_postcssNormalizeCharset.default, options.normalizeCharset], [_postcssDiscardOverridden.default, options.discardOverridden], [_postcssNormalizeString.default, options.normalizeString], [_postcssNormalizeUnicode.default, options.normalizeUnicode], [_postcssMinifyFontValues.default, options.minifyFontValues], [_postcssNormalizeUrl.default, options.normalizeUrl], [_postcssNormalizeRepeatStyle.default, options.normalizeRepeatStyle], [_postcssNormalizePositions.default, options.normalizePositions], [_postcssNormalizeWhitespace.default, options.normalizeWhitespace], [_postcssMergeLonghand.default, options.mergeLonghand], [_postcssDiscardDuplicates.default, options.discardDuplicates], [_postcssMergeRules.default, options.mergeRules], [_postcssDiscardEmpty.default, options.discardEmpty], [_postcssUniqueSelectors.default, options.uniqueSelectors], [_cssDeclarationSorter.default, options.cssDeclarationSorter], [_cssnanoUtils.rawCache, options.rawCache]];
  return {
    plugins
  };
}

module.exports = exports.default;