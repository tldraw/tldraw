"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = minifyUrls;

var _relateurl = _interopRequireDefault(require("relateurl"));

var _srcset = _interopRequireDefault(require("srcset"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Adopts from https://github.com/kangax/html-minifier/blob/51ce10f4daedb1de483ffbcccecc41be1c873da2/src/htmlminifier.js#L209-L221
const tagsHaveUriValuesForAttributes = new Set(['a', 'area', 'link', 'base', 'img', 'object', 'q', 'blockquote', 'ins', 'form', 'input', 'head', 'script']);
const tagsHasHrefAttributes = new Set(['a', 'area', 'link', 'base']);
const attributesOfImgTagHasUriValues = new Set(['src', 'longdesc', 'usemap']);
const attributesOfObjectTagHasUriValues = new Set(['classid', 'codebase', 'data', 'usemap']);

const isUriTypeAttribute = (tag, attr) => {
  return tagsHasHrefAttributes.has(tag) && attr === 'href' || tag === 'img' && attributesOfImgTagHasUriValues.has(attr) || tag === 'object' && attributesOfObjectTagHasUriValues.has(attr) || tag === 'q' && attr === 'cite' || tag === 'blockquote' && attr === 'cite' || (tag === 'ins' || tag === 'del') && attr === 'cite' || tag === 'form' && attr === 'action' || tag === 'input' && (attr === 'src' || attr === 'usemap') || tag === 'head' && attr === 'profile' || tag === 'script' && (attr === 'src' || attr === 'for') ||
  /**
   * https://html.spec.whatwg.org/#attr-source-src
   *
   * Although most of browsers recommend not to use "src" in <source>,
   * but technically it does comply with HTML Standard.
   */
  tag === 'source' && attr === 'src';
};

const isSrcsetAttribute = (tag, attr) => {
  return tag === 'source' && attr === 'srcset' || tag === 'img' && attr === 'srcset' || tag === 'link' && attr === 'imagesrcset';
};

const processModuleOptions = options => {
  // FIXME!
  // relateurl@1.0.0-alpha only supports URL while stable version (0.2.7) only supports string
  // should convert input into URL instance after relateurl@1 is stable
  if (typeof options === 'string') return options;
  if (options instanceof URL) return options.toString();
  return false;
};

const isLinkRelCanonical = ({
  tag,
  attrs
}) => {
  // Return false early for non-"link" tag
  if (tag !== 'link') return false;

  for (const [attrName, attrValue] of Object.entries(attrs)) {
    if (attrName.toLowerCase() === 'rel' && attrValue === 'canonical') return true;
  }

  return false;
};

let relateUrlInstance;
let STORED_URL_BASE;
/** Convert absolute url into relative url */

function minifyUrls(tree, options, moduleOptions) {
  const urlBase = processModuleOptions(moduleOptions); // Invalid configuration, return tree directly

  if (!urlBase) return tree;
  /** Bring up a reusable RelateUrl instances (only once)
   *
   * STORED_URL_BASE is used to invalidate RelateUrl instances,
   * avoiding require.cache acrossing multiple htmlnano instance with different configuration,
   * e.g. unit tests cases.
   */

  if (!relateUrlInstance || STORED_URL_BASE !== urlBase) {
    relateUrlInstance = new _relateurl.default(urlBase);
    STORED_URL_BASE = urlBase;
  }

  tree.walk(node => {
    if (!node.attrs) return node;
    if (!node.tag) return node;
    if (!tagsHaveUriValuesForAttributes.has(node.tag)) return node; // Prevent link[rel=canonical] being processed
    // Can't be excluded by isUriTypeAttribute()

    if (isLinkRelCanonical(node)) return node;

    for (const [attrName, attrValue] of Object.entries(node.attrs)) {
      const attrNameLower = attrName.toLowerCase();

      if (isUriTypeAttribute(node.tag, attrNameLower)) {
        // FIXME!
        // relateurl@1.0.0-alpha only supports URL while stable version (0.2.7) only supports string
        // the WHATWG URL API is very strict while attrValue might not be a valid URL
        // new URL should be used, and relateUrl#relate should be wrapped in try...catch after relateurl@1 is stable
        node.attrs[attrName] = relateUrlInstance.relate(attrValue);
        continue;
      }

      if (isSrcsetAttribute(node.tag, attrNameLower)) {
        try {
          const parsedSrcset = _srcset.default.parse(attrValue);

          node.attrs[attrName] = _srcset.default.stringify(parsedSrcset.map(srcset => {
            srcset.url = relateUrlInstance.relate(srcset.url);
            return srcset;
          }));
        } catch (e) {// srcset will throw an Error for invalid srcset.
        }

        continue;
      }
    }

    return node;
  });
  return tree;
}