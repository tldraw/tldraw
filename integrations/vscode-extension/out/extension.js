'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.activate = void 0
const tldraw_editor_1 = require('./tldraw-editor')
function activate(context) {
  // Register our custom editor providers
  context.subscriptions.push(
    tldraw_editor_1.TldrawEditorProvider.register(context)
  )
  // context.subscriptions.push(CatScratchEditorProvider.register(context))
  // context.subscriptions.push(PawDrawEditorProvider.register(context))
}
exports.activate = activate
//# sourceMappingURL=extension.js.map
