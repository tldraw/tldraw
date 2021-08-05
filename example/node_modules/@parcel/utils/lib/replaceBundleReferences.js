"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.replaceURLReferences = replaceURLReferences;
exports.replaceInlineReferences = replaceInlineReferences;
exports.getURLReplacement = getURLReplacement;

function _stream() {
  const data = require("stream");

  _stream = function () {
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

function _assert() {
  const data = _interopRequireDefault(require("assert"));

  _assert = function () {
    return data;
  };

  return data;
}

function _url() {
  const data = _interopRequireDefault(require("url"));

  _url = function () {
    return data;
  };

  return data;
}

var _ = require("./");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * Replaces references to dependency ids for URL dependencies with:
 *   - in the case of an unresolvable url dependency, the original specifier.
 *     These are external requests that Parcel did not bundle.
 *   - in the case of a reference to another bundle, the relative url to that
 *     bundle from the current bundle.
 */
function replaceURLReferences({
  bundle,
  bundleGraph,
  contents,
  map,
  relative = true
}) {
  let replacements = new Map();
  let urlDependencies = [];
  bundle.traverse(node => {
    if (node.type === 'dependency' && node.value.specifierType === 'url') {
      urlDependencies.push(node.value);
    }
  });

  for (let dependency of urlDependencies) {
    var _dependency$meta$plac, _dependency$meta;

    if (dependency.specifierType !== 'url') {
      continue;
    }

    let placeholder = (_dependency$meta$plac = (_dependency$meta = dependency.meta) === null || _dependency$meta === void 0 ? void 0 : _dependency$meta.placeholder) !== null && _dependency$meta$plac !== void 0 ? _dependency$meta$plac : dependency.id;
    (0, _assert().default)(typeof placeholder === 'string');
    let resolved = bundleGraph.getReferencedBundle(dependency, bundle);

    if (resolved == null) {
      replacements.set(placeholder, {
        from: placeholder,
        to: dependency.specifier
      });
      continue;
    }

    if (!resolved || resolved.bundleBehavior === 'inline') {
      // If a bundle is inline, it should be replaced with inline contents,
      // not a URL.
      continue;
    }

    replacements.set(placeholder, getURLReplacement({
      dependency,
      fromBundle: bundle,
      toBundle: resolved,
      relative
    }));
  }

  return performReplacement(replacements, contents, map);
}
/*
 * Replaces references to dependency ids for inline bundles with the packaged
 * contents of that bundle.
 */


async function replaceInlineReferences({
  bundle,
  bundleGraph,
  contents,
  map,
  getInlineReplacement,
  getInlineBundleContents
}) {
  let replacements = new Map();
  let dependencies = [];
  bundle.traverse(node => {
    if (node.type === 'dependency') {
      dependencies.push(node.value);
    }
  });

  for (let dependency of dependencies) {
    let entryBundle = bundleGraph.getReferencedBundle(dependency, bundle);

    if ((entryBundle === null || entryBundle === void 0 ? void 0 : entryBundle.bundleBehavior) !== 'inline') {
      continue;
    }

    let packagedBundle = await getInlineBundleContents(entryBundle, bundleGraph);
    let packagedContents = (packagedBundle.contents instanceof _stream().Readable ? await (0, _.bufferStream)(packagedBundle.contents) : packagedBundle.contents).toString();
    let inlineType = (0, _nullthrows().default)(entryBundle.getMainEntry()).meta.inlineType;

    if (inlineType == null || inlineType === 'string') {
      replacements.set(dependency.id, getInlineReplacement(dependency, inlineType, packagedContents));
    }
  }

  return performReplacement(replacements, contents, map);
}

function getURLReplacement({
  dependency,
  fromBundle,
  toBundle,
  relative
}) {
  var _dependency$meta$plac2, _dependency$meta2;

  let to;

  let orig = _url().default.parse(dependency.specifier);

  if (relative) {
    to = _url().default.format({
      pathname: (0, _.relativeBundlePath)(fromBundle, toBundle, {
        leadingDotSlash: false
      }),
      hash: orig.hash
    }); // If the resulting path includes a colon character and doesn't start with a ./ or ../
    // we need to add one so that the first part before the colon isn't parsed as a URL protocol.

    if (to.includes(':') && !to.startsWith('./') && !to.startsWith('../')) {
      to = './' + to;
    }
  } else {
    to = (0, _.urlJoin)(toBundle.target.publicUrl, _url().default.format({
      pathname: (0, _nullthrows().default)(toBundle.name),
      hash: orig.hash
    }));
  }

  let placeholder = (_dependency$meta$plac2 = (_dependency$meta2 = dependency.meta) === null || _dependency$meta2 === void 0 ? void 0 : _dependency$meta2.placeholder) !== null && _dependency$meta$plac2 !== void 0 ? _dependency$meta$plac2 : dependency.id;
  (0, _assert().default)(typeof placeholder === 'string');
  return {
    from: placeholder,
    to
  };
}

function performReplacement(replacements, contents, map) {
  let finalContents = contents;

  for (let {
    from,
    to
  } of replacements.values()) {
    // Perform replacement
    finalContents = finalContents.split(from).join(to);
  }

  return {
    contents: finalContents,
    // TODO: Update sourcemap with adjusted contents
    map
  };
}