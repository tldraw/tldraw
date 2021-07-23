'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.TldrawEditorProvider = void 0
const vscode = require('vscode')
const nonce_1 = require('./nonce')
/**
 * Provider for .tldr editor.
 *
 * Tldraw editors are used for `.tldr` files, which are just json files.
 * To get started, run this extension and open an empty `.tldr` file in VS Code.
 *
 * This provider demonstrates:
 *
 * - Setting up the initial webview for a custom editor.
 * - Loading scripts and styles in a custom editor.
 * - Synchronizing changes between a text document and the tldraw custom editor.
 */
class TldrawEditorProvider {
  constructor(context) {
    this.context = context
  }
  static register(context) {
    vscode.commands.registerCommand('tldraw.tldr.new', () => {
      vscode.window.showInformationMessage('Created a new .tldr file')
      const workspaceFolders = vscode.workspace.workspaceFolders
      if (!workspaceFolders) {
        vscode.window.showErrorMessage(
          'Creating new Tldraw Editor files currently requires opening a workspace'
        )
        return
      }
      const uri = vscode.Uri.joinPath(
        workspaceFolders[0].uri,
        `new-${TldrawEditorProvider.newTldrawFileId++}.tldr`
      ).with({ scheme: 'untitled' })
      vscode.commands.executeCommand(
        'vscode.openWith',
        uri,
        TldrawEditorProvider.viewType
      )
    })
    const provider = new TldrawEditorProvider(context)
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      TldrawEditorProvider.viewType,
      provider,
      {
        // For this demo extension, we enable `retainContextWhenHidden` which keeps the
        // webview alive even when it is not visible. You should avoid using this setting
        // unless is absolutely required as it does have memory overhead.
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    )
    return providerRegistration
  }
  /**
   * Called when our custom editor is opened.
   *
   *
   */
  async resolveCustomTextEditor(document, webviewPanel, _token) {
    this.document = document
    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview)
    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: 'load',
        text: document.getText(),
      })
    }
    // Hook up event handlers so that we can synchronize the webview with the text document.
    //
    // The text document acts as our model, so we have to sync change in the document to our
    // editor and sync changes in the editor back to the document.
    //
    // Remember that a single text document can also be shared between multiple custom
    // editors (this happens for example when you split a custom editor)
    let firstLoad = true
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          if (firstLoad) {
            console.log(`First load:${firstLoad}`)
            updateWebview()
            firstLoad = false
          } else {
            console.log("don't load")
          }
        }
      }
    )
    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose()
    })
    // Receive message from the webview.
    webviewPanel.webview.onDidReceiveMessage((e) => {
      switch (e.type) {
        case 'update':
          console.log(`"update" extension <-`)
          //console.log(`Is it different? ${}`)
          //vscode.window.showInformationMessage('Upated .tdlr file')
          this.updateTextDocument(document, JSON.parse(e.text))
          break
        case 'save':
          console.log(`"save" extension <-`)
          if (this.document !== undefined) {
            this.document.save()
            // const writeData = Buffer.from(e.text, 'utf8')
            // // I believe saving will automatically synchronize the in memory document
            // // so we don't need to call updateTextDocument here.
            // vscode.workspace.fs.writeFile(this.document?.uri, writeData)
            //vscode.window.showInformationMessage('Saved .tdlr file')
          }
          break
      }
    })
    updateWebview()
  }
  /**
   * Get the static html used for the editor webviews.
   */
  getHtmlForWebview(webview) {
    // Local path to script and css for the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'editor.js')
    )
    // const styleResetUri = webview.asWebviewUri(
    //   vscode.Uri.joinPath(this.context.extensionUri, 'media', 'reset.css')
    // )
    // const styleVSCodeUri = webview.asWebviewUri(
    //   vscode.Uri.joinPath(this.context.extensionUri, 'media', 'vscode.css')
    // )
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'main.css')
    )
    console.log('getHtmlForWebview')
    // Use a nonce to whitelist which scripts can be run
    const nonce = nonce_1.getNonce()
    return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; frame-src http://localhost:3000/; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleMainUri}" rel="stylesheet" />

				<title>Tldraw Editor</title>
			</head>
			<body>
        <div id="container"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`
  }
  /**
   * Try to get a current document as json text.
   */
  getDocumentAsJson(document) {
    const text = document.getText()
    if (text.trim().length === 0) {
      return {}
    }
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(
        'Could not get document as json. Content is not valid json!!!'
      )
    }
  }
  /**
   * Write out the json to a given document.
   */
  updateTextDocument(document, json) {
    const edit = new vscode.WorkspaceEdit()
    // Just replace the entire document every time for this example extension.
    // A more complete extension should compute minimal edits instead.
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      JSON.stringify(json, null, 2)
    )
    return vscode.workspace.applyEdit(edit)
  }
}
exports.TldrawEditorProvider = TldrawEditorProvider
TldrawEditorProvider.newTldrawFileId = 1
TldrawEditorProvider.viewType = 'tldraw.tldr'
//# sourceMappingURL=editor-provider.js.map
