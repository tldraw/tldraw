"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = mergeScripts;

/* Merge multiple <script> into one */
function mergeScripts(tree) {
  let scriptNodesIndex = {};
  let scriptSrcIndex = 1;
  tree.match({
    tag: 'script'
  }, node => {
    const nodeAttrs = node.attrs || {};

    if (nodeAttrs.src) {
      scriptSrcIndex++;
      return node;
    }

    const scriptType = nodeAttrs.type || 'text/javascript';

    if (scriptType !== 'text/javascript' && scriptType !== 'application/javascript') {
      return node;
    }

    const scriptKey = JSON.stringify({
      id: nodeAttrs.id,
      class: nodeAttrs.class,
      type: scriptType,
      defer: nodeAttrs.defer !== undefined,
      async: nodeAttrs.async !== undefined,
      index: scriptSrcIndex
    });

    if (!scriptNodesIndex[scriptKey]) {
      scriptNodesIndex[scriptKey] = [];
    }

    scriptNodesIndex[scriptKey].push(node);
    return node;
  });

  for (const scriptNodes of Object.values(scriptNodesIndex)) {
    let lastScriptNode = scriptNodes.pop();
    scriptNodes.reverse().forEach(scriptNode => {
      let scriptContent = (scriptNode.content || []).join(' ');
      scriptContent = scriptContent.trim();

      if (scriptContent.slice(-1) !== ';') {
        scriptContent += ';';
      }

      lastScriptNode.content = lastScriptNode.content || [];
      lastScriptNode.content.unshift(scriptContent);
      scriptNode.tag = false;
      scriptNode.content = [];
    });
  }

  return tree;
}