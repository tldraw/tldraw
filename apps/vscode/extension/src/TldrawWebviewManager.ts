import { uniqueId } from '@tldraw/tldraw'
import * as vscode from 'vscode'
import { TLDrawDocument } from './TldrawDocument'
import { GlobalStateKeys, WebViewMessageHandler } from './WebViewMessageHandler'

export class TldrawWebviewManager {
	private disposables: vscode.Disposable[] = []
	private webViewMessageHandler: WebViewMessageHandler

	constructor(
		context: vscode.ExtensionContext,
		document: TLDrawDocument,
		webviewPanel: vscode.WebviewPanel
	) {
		let userId = context.globalState.get(GlobalStateKeys.UserId)
		if (!userId) {
			userId = 'user:' + uniqueId()
			context.globalState.update(GlobalStateKeys.UserId, userId)
		}

		const assetSrc = webviewPanel.webview
			.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'editor', '/'))
			.toString()

		this.webViewMessageHandler = new WebViewMessageHandler(
			document,
			webviewPanel,
			context,
			userId,
			assetSrc
		)
		// Listen for messages sent from the extensions webview.
		webviewPanel.webview.onDidReceiveMessage(
			this.webViewMessageHandler.handle,
			undefined,
			this.disposables
		)

		// Configure the webview. For now all we do is enable scripts and also
		// provide the initial webview's html content.
		Object.assign(webviewPanel.webview, {
			options: { enableScripts: true },
			html: this.getHtmlForWebview(assetSrc),
		})

		const showV1FileOpenWarning = context.globalState.get(GlobalStateKeys.ShowV1FileOpenWarning)
		if (showV1FileOpenWarning === undefined) {
			context.globalState.update(GlobalStateKeys.ShowV1FileOpenWarning, true)
		}

		// Clean up disposables when the editor is closed.
		webviewPanel.onDidDispose(this.handleDidDispose)
	}

	private handleDidDispose = () => {
		this.disposables.forEach(({ dispose }) => dispose())
	}

	private getHtmlForWebview = (assetSrc: string): string => {
		return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <link rel="stylesheet" href="${assetSrc}/index.css" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>tldraw</title>
        </head>
        <body>
          <div id="root"></div>
          <noscript>You need to enable JavaScript to run this editor.</noscript>
		  <script>
		    // Plenty of other extensions do this see <https://sourcegraph.com/search?q=context%3Aglobal+%22_defaultStyles%22&patternType=standard&sm=1&groupBy=repo>
		    document.getElementById("_defaultStyles").remove();
		  </script>
          <script src="${assetSrc}/index.js"></script>
        </body>
      </html>
    `
	}
}
