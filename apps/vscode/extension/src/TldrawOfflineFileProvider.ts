import * as vscode from 'vscode'

/**
 * tldraw offline saves documents as `.tldraw` archives — a zipped SQLite database rather than the
 * JSON a `.tldr` file holds — so nothing in this extension can read one. We claim the extension
 * anyway, and open a read-only panel explaining that, because the alternative is VS Code's generic
 * "file is not displayed because it is binary" placeholder, which says nothing about tldraw.
 *
 * This deliberately doesn't reuse `TldrawEditorProvider`: that path reads the file as UTF-8 and
 * hands it to `loadFile`, which would turn the archive's bytes into a corrupt-file error on a
 * mounted canvas.
 */
export class TldrawOfflineFileProvider implements vscode.CustomReadonlyEditorProvider {
	private static readonly viewType = 'tldraw.tldraw-offline'

	public static register(): vscode.Disposable {
		return vscode.window.registerCustomEditorProvider(
			TldrawOfflineFileProvider.viewType,
			new TldrawOfflineFileProvider()
		)
	}

	openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
		return { uri, dispose() {} }
	}

	resolveCustomEditor(_document: vscode.CustomDocument, webviewPanel: vscode.WebviewPanel): void {
		webviewPanel.webview.html = html
	}
}

const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>tldraw</title>
          <style>
            body {
              background-color: var(--vscode-editor-background);
              color: var(--vscode-editor-foreground);
              font-family: var(--vscode-font-family);
              font-size: var(--vscode-font-size);
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .message {
              max-width: 24rem;
              text-align: center;
              line-height: 1.5;
            }
            .message h1 {
              font-size: 1.1rem;
              font-weight: 600;
              margin: 0 0 0.5rem;
            }
            .message p {
              margin: 0;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="message">
            <h1>Can&rsquo;t open .tldraw files yet</h1>
            <p>
              We&rsquo;re working on support for files from
              <a href="https://offline.tldraw.com/">tldraw offline</a>.
            </p>
            <p>
              For now, you can
              <a href="https://tldraw.notion.site/User-manual-tldraw-offline-39a3e4c324c080e7b2eacc5afd078e85#3aa3e4c324c080669967e2cc3ae2c789">export as a .tldr file</a>
              to use it here.
            </p>
          </div>
        </body>
      </html>
    `
