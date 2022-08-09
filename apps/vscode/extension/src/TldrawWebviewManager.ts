import { TDFile } from '@tldraw/tldraw'
import * as vscode from 'vscode'
import { MessageFromExtension, MessageFromWebview } from './types'

/**
 * When a new editor is opened, an instance of this class will
 * be created to configure the webview and handle its events.
 */
export class TldrawWebviewManager {
  private disposables: vscode.Disposable[] = []

  constructor(
    private context: vscode.ExtensionContext,
    private document: vscode.TextDocument,
    private webviewPanel: vscode.WebviewPanel
  ) {
    // Configure the webview. For now all we do is enable scripts and also
    // provide the initial webview's html content.
    Object.assign(webviewPanel.webview, {
      options: { enableScripts: true },
      html: this.getHtmlForWebview(),
    })

    // Listen for changes to the document when saved from VS Code.m
    vscode.workspace.onDidSaveTextDocument(
      this.handleDidSaveTextDocument,
      undefined,
      this.disposables
    )

    // Listen for changes made to the text document by VS Code or by some other app.
    vscode.workspace.onDidChangeTextDocument(
      this.handleDidChangeTextDocument,
      undefined,
      this.disposables
    )

    // Listen for messages sent from the extensions webview.
    webviewPanel.webview.onDidReceiveMessage(
      this.handleMessageFromWebview,
      undefined,
      this.disposables
    )

    // Send the initial document content to bootstrap the Tldraw/Tldraw component.
    webviewPanel.webview.postMessage({
      type: 'openedFile',
      text: document.getText(),
    } as MessageFromExtension)

    // Clean up disposables when the editor is closed.
    webviewPanel.onDidDispose(this.handleDidDispose)
  }

  private handleDidDispose = () => {
    this.disposables.forEach(({ dispose }) => dispose())
  }

  private handleDidSaveTextDocument = () => {
    const { webviewPanel, document } = this
    if (!(webviewPanel && document)) return

    webviewPanel.webview.postMessage({
      type: 'fileSaved',
      text: document.getText(),
    } as MessageFromExtension)
  }

  private handleDidChangeTextDocument = (event: vscode.TextDocumentChangeEvent) => {
    // TODO
    // If we can figure out whether the change came from inside of the
    // editor vs. from some other app, we can update the document to
    // show that external change.
  }

  private handleMessageFromWebview = (e: MessageFromWebview) => {
    const { document } = this
    if (!document) return

    switch (e.type) {
      case 'editorUpdated': {
        // The event will contain the new TDFile as JSON.
        const nextFile = JSON.parse(e.text) as TDFile

        if (document.getText()) {
          try {
            // Parse the contents of the current document.
            const currentFile = JSON.parse(document.getText()) as TDFile

            // Ensure that the current file's pageStates are preserved
            // in the next file, unless the associated pages have been deleted.
            Object.values(currentFile.document.pageStates).forEach((pageState) => {
              if (nextFile.document.pages[pageState.id] !== undefined) {
                nextFile.document.pageStates[pageState.id] = pageState
              }
            })
          } catch (e) {
            console.error('Could not parse the current file to JSON.')
          }
        }

        // Create an edit that replaces the document's current text
        // content (a serialized TDFile) with the next file.
        const edit = new vscode.WorkspaceEdit()

        edit.replace(
          document.uri,
          new vscode.Range(0, 0, document.lineCount, 0),
          JSON.stringify(nextFile, null, 2)
        )

        vscode.workspace.applyEdit(edit)

        break
      }
    }
  }

  private getHtmlForWebview = (): string => {
    const { document, context, webviewPanel } = this

    let documentContent: string

    let cssSrc: string | vscode.Uri
    let jsSrc: string | vscode.Uri
    const assetSrc = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'editor/', 'tldraw-assets.json')
    )

    try {
      JSON.parse(document.getText())
      documentContent = document.getText()
    } catch (error) {
      // For now we're going to tread badly formed .tldr files as freshly created files.
      // This will happen if say a user creates a new .tldr file using New File or if they
      // have a bad auto-merge that messes up the json of an existing .tldr file
      // We pass null as the initialDocument value if we can't parse as json.
      documentContent = 'null'
    }

    if (process.env.NODE_ENV === 'production') {
      cssSrc = webviewPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'editor/', 'index.css')
      )
      jsSrc = webviewPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'editor/', 'index.js')
      )
    } else {
      const localhost = 'http://localhost:5420/'
      cssSrc = `${localhost}index.css`
      jsSrc = `${localhost}index.js`
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <link rel="stylesheet" href="${cssSrc}" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>tldraw</title>
        </head>
        <body>
          <div id="root"></div>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <script>
            var currentFile = ${documentContent};
            var assetSrc = "${assetSrc}";
          </script>
          <script src="${jsSrc}"></script>
        </body>
      </html>
    `
  }
}
