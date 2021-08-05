"use strict";

var _helpers = require("./util/helpers");

(0, _helpers.test)('non-standard selector', '.icon.is-$(network)', function (t, tree) {
  var class1 = tree.nodes[0].nodes[0];
  t.deepEqual(class1.value, 'icon');
  t.deepEqual(class1.type, 'class');
  var class2 = tree.nodes[0].nodes[1];
  t.deepEqual(class2.value, 'is-$(network)');
  t.deepEqual(class2.type, 'class');
});
(0, _helpers.test)('at word in selector', 'em@il.com', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[0].value, 'em@il');
  t.deepEqual(tree.nodes[0].nodes[1].value, 'com');
});
(0, _helpers.test)('leading combinator', '> *', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes[0].value, '>');
  t.deepEqual(tree.nodes[0].nodes[1].value, '*');
});
(0, _helpers.test)('sass escapes', '.#{$classname}', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes.map(function (n) {
    return n.type;
  }), ["class"]);
  t.deepEqual(tree.nodes[0].nodes[0].value, "#{$classname}");
});
(0, _helpers.test)('sass escapes (2)', '[lang=#{$locale}]', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes.map(function (n) {
    return n.type;
  }), ["attribute"]);
  t.deepEqual(tree.nodes[0].nodes[0].value, "#{$locale}");
});
(0, _helpers.test)('placeholder', '%foo', function (t, tree) {
  t.deepEqual(tree.nodes[0].nodes.map(function (n) {
    return n.type;
  }), ["tag"]);
  t.deepEqual(tree.nodes[0].nodes[0].value, "%foo");
});