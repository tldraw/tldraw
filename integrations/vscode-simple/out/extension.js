'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.activate = void 0
const editor_provider_1 = require('./editor-provider')
function activate(context) {
  // Register our custom editor provider
  context.subscriptions.push(
    editor_provider_1.TldrawEditorProvider.register(context)
  )
}
exports.activate = activate
//# sourceMappingURL=extension.js.map
