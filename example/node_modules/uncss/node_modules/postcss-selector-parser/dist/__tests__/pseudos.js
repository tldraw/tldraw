"use strict";

var _helpers = require("./util/helpers");

(0, _helpers.test)('pseudo element (single colon)', 'h1:after', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[0].type, 'tag');
  t.deepEqual(tree.nodes[0].nodes[1].type, 'pseudo');
  t.deepEqual(tree.nodes[0].nodes[1].value, ':after');
});
(0, _helpers.test)('pseudo element (double colon)', 'h1::after', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[0].type, 'tag');
  t.deepEqual(tree.nodes[0].nodes[1].type, 'pseudo');
  t.deepEqual(tree.nodes[0].nodes[1].value, '::after');
});
(0, _helpers.test)('multiple pseudo elements', '*:target::before, a:after', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[0].value, '*');
  t.deepEqual(tree.nodes[0].nodes[1].value, ':target');
  t.deepEqual(tree.nodes[0].nodes[2].value, '::before');
  t.deepEqual(tree.nodes[1].nodes[1].value, ':after');
});
(0, _helpers.test)('negation pseudo element', 'h1:not(.heading)', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[1].value, ':not');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[0].value, 'heading');
});
(0, _helpers.test)('negation pseudo element (2)', 'h1:not(.heading, .title, .content)', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[1].value, ':not');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[0].value, 'heading');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[1].nodes[0].value, 'title');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[2].nodes[0].value, 'content');
});
(0, _helpers.test)('negation pseudo element (3)', 'h1:not(.heading > .title) > h1', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[0].value, 'heading');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[1].value, '>');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[2].value, 'title');
  t.deepEqual(tree.nodes[0].nodes[2].value, '>');
  t.deepEqual(tree.nodes[0].nodes[3].value, 'h1');
});
(0, _helpers.test)('negation pseudo element (4)', 'h1:not(h2:not(h3))', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[1].nodes[0].nodes[0].value, 'h3');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[1].nodes[0].nodes[0].parent.type, 'selector');
});
(0, _helpers.test)('pseudo class in the middle of a selector', 'a:link.external', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[0].type, 'tag');
  t.deepEqual(tree.nodes[0].nodes[0].value, 'a');
  t.deepEqual(tree.nodes[0].nodes[1].type, 'pseudo');
  t.deepEqual(tree.nodes[0].nodes[1].value, ':link');
  t.deepEqual(tree.nodes[0].nodes[2].type, 'class');
  t.deepEqual(tree.nodes[0].nodes[2].value, 'external');
});
(0, _helpers.test)('extra whitespace inside parentheses', 'a:not(   h2   )', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[0].value, 'h2');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[0].spaces.after, '   ');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[0].spaces.before, '   ');
});
(0, _helpers.test)('escaped numbers in class name with pseudo', 'a:before.\\31\\ 0', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[2].type, 'class');
  t.deepEqual(tree.nodes[0].nodes[2].value, '1 0');
  t.deepEqual(tree.nodes[0].nodes[2].raws.value, '\\31\\ 0');
});
(0, _helpers.test)('nested pseudo', '.btn-group>.btn:last-child:not(:first-child)', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[4].value, ':not');
});
(0, _helpers.test)('extraneous non-combinating whitespace', '  h1:after   ,  h2:after   ', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[0].spaces.before, '  ');
  t.deepEqual(tree.nodes[0].nodes[1].value, ':after');
  t.deepEqual(tree.nodes[0].nodes[1].spaces.after, '   ');
  t.deepEqual(tree.nodes[0].nodes[0].spaces.before, '  ');
  t.deepEqual(tree.nodes[1].nodes[1].value, ':after');
  t.deepEqual(tree.nodes[1].nodes[1].spaces.after, '   ');
});
(0, _helpers.test)('negation pseudo element with quotes', 'h1:not(".heading")', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[1].value, ':not');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[0].value, '".heading"');
});
(0, _helpers.test)('negation pseudo element with single quotes', "h1:not('.heading')", function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[1].value, ':not');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[0].value, "'.heading'");
});
(0, _helpers.test)('Issue #116', "svg:not(:root)", function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[1].value, ':not');
  t.deepEqual(tree.nodes[0].nodes[1].nodes[0].nodes[0].value, ':root');
});
(0, _helpers.test)('alone pseudo class', ':root', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[0].type, 'pseudo');
  t.deepEqual(tree.nodes[0].nodes[0].value, ':root');
});
(0, _helpers.test)('non standard pseudo (@custom-selector)', ":--foobar, a", function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[0].value, ':--foobar');
  t.deepEqual(tree.nodes[0].nodes[0].type, 'pseudo');
  t.deepEqual(tree.nodes[1].nodes[0].value, 'a');
  t.deepEqual(tree.nodes[1].nodes[0].type, 'tag');
});
(0, _helpers.test)('non standard pseudo (@custom-selector) (1)', "a, :--foobar", function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[0].value, 'a');
  t.deepEqual(tree.nodes[0].nodes[0].type, 'tag');
  t.deepEqual(tree.nodes[1].nodes[0].value, ':--foobar');
  t.deepEqual(tree.nodes[1].nodes[0].type, 'pseudo');
});