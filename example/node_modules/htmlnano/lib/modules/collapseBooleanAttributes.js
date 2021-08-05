"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = collapseBooleanAttributes;
// Source: https://github.com/kangax/html-minifier/issues/63
const htmlBooleanAttributes = new Set(['allowfullscreen', 'allowpaymentrequest', 'allowtransparency', 'async', 'autofocus', 'autoplay', 'checked', 'compact', 'controls', 'declare', 'default', 'defaultchecked', 'defaultmuted', 'defaultselected', 'defer', 'disabled', 'enabled', 'formnovalidate', 'hidden', 'indeterminate', 'inert', 'ismap', 'itemscope', 'loop', 'multiple', 'muted', 'nohref', 'noresize', 'noshade', 'novalidate', 'nowrap', 'open', 'pauseonexit', 'readonly', 'required', 'reversed', 'scoped', 'seamless', 'selected', 'sortable', 'truespeed', 'typemustmatch', 'visible']);
const amphtmlBooleanAttributes = new Set(['⚡', 'amp', '⚡4ads', 'amp4ads', '⚡4email', 'amp4email', 'amp-custom', 'amp-boilerplate', 'amp4ads-boilerplate', 'amp4email-boilerplate', 'allow-blocked-ranges', 'amp-access-hide', 'amp-access-template', 'amp-keyframes', 'animate', 'arrows', 'data-block-on-consent', 'data-enable-refresh', 'data-multi-size', 'date-template', 'disable-double-tap', 'disable-session-states', 'disableremoteplayback', 'dots', 'expand-single-section', 'expanded', 'fallback', 'first', 'fullscreen', 'inline', 'lightbox', 'noaudio', 'noautoplay', 'noloading', 'once', 'open-after-clear', 'open-after-select', 'open-button', 'placeholder', 'preload', 'reset-on-refresh', 'reset-on-resize', 'resizable', 'rotate-to-fullscreen', 'second', 'standalone', 'stereo', 'submit-error', 'submit-success', 'submitting', 'subscriptions-actions', 'subscriptions-dialog']);

function collapseBooleanAttributes(tree, options, moduleOptions) {
  tree.walk(node => {
    if (!node.attrs) {
      return node;
    }

    if (!node.tag) {
      return node;
    }

    for (const attrName of Object.keys(node.attrs)) {
      if (attrName === 'visible' && node.tag.startsWith('a-')) {
        continue;
      }

      if (htmlBooleanAttributes.has(attrName)) {
        node.attrs[attrName] = true;
      }

      if (moduleOptions.amphtml && amphtmlBooleanAttributes.has(attrName) && node.attrs[attrName] === '') {
        node.attrs[attrName] = true;
      } // collapse crossorigin attributes
      // Specification: https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attributes


      if (attrName.toLowerCase() === 'crossorigin' && (node.attrs[attrName] === 'anonymous' || node.attrs[attrName] === '')) {
        node.attrs[attrName] = true;
      }
    }

    return node;
  });
  return tree;
}