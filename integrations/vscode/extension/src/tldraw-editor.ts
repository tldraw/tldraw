import * as vscode from 'vscode'
import { getNonce } from './util'

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
export class TldrawEditorProvider implements vscode.CustomTextEditorProvider {
  private document?: vscode.TextDocument

  private static newTldrawFileId = 1
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
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
      ).with({
        scheme: 'untitled',
      })

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

  private static readonly viewType = 'tldraw.tldr'

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Called when our custom editor is opened.
   *
   *
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    this.document = document

    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
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
          //console.log(JSON.stringify(JSON.parse(e.text),null, "    "));////console.log(`Is it different? ${}`)
          //vscode.window.showInformationMessage('Upated .tdlr file')
          this.updateTextDocument(document, JSON.parse(e.text))
          
          break
        case 'save':
          console.log(`"save" extension <-`)
          if (this.document !== undefined) {
            console.log("document.saved");
            //console.log(document.getText());
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
  private getHtmlForWebview(webview: vscode.Webview): string {
    // Local path to script and css for the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'media',
        'tldraw-editor.js'
      )
    )

    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'reset.css')
    )

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'vscode.css')
    )

    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'media',
        'tldraw-editor.css'
      )
    )

    const cssUrl = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'build/static/css',
        'main.c353a27c.chunk.css'
      )
    )

    const jsUrl1 = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'build/static/js',
        '2.6640e0ac.chunk.js'
      )
    )

    const jsUrl2 = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'build/static/js',
        'main.34325131.chunk.js'
      )
    )

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce()

    const older = /* html */ `
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

				<link href="${styleResetUri}" rel="stylesheet" />
				<link href="${styleVSCodeUri}" rel="stylesheet" />
				<link href="${styleMainUri}" rel="stylesheet" />

				<title>Tldraw Editor</title>
			</head>
			<body>
        <iframe width="100%" height="100%" src="http://localhost:3000/"></iframe>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`
      return older;
    const newer = `<!doctype html>
      <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
            <meta name="theme-color" content="#000000">
            <!-- <link rel="shortcut icon" href="./favicon.ico"> -->
            <title>React App</title>
            <link href="${cssUrl}" rel="stylesheet">
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script>!function(e){function r(r){for(var n,l,a=r[0],f=r[1],i=r[2],p=0,s=[];p<a.length;p++)l=a[p],Object.prototype.hasOwnProperty.call(o,l)&&o[l]&&s.push(o[l][0]),o[l]=0;for(n in f)Object.prototype.hasOwnProperty.call(f,n)&&(e[n]=f[n]);for(c&&c(r);s.length;)s.shift()();return u.push.apply(u,i||[]),t()}function t(){for(var e,r=0;r<u.length;r++){for(var t=u[r],n=!0,a=1;a<t.length;a++){var f=t[a];0!==o[f]&&(n=!1)}n&&(u.splice(r--,1),e=l(l.s=t[0]))}return e}var n={},o={1:0},u=[];function l(r){if(n[r])return n[r].exports;var t=n[r]={i:r,l:!1,exports:{}};return e[r].call(t.exports,t,t.exports,l),t.l=!0,t.exports}l.m=e,l.c=n,l.d=function(e,r,t){l.o(e,r)||Object.defineProperty(e,r,{enumerable:!0,get:t})},l.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},l.t=function(e,r){if(1&r&&(e=l(e)),8&r)return e;if(4&r&&"object"==typeof e&&e&&e.__esModule)return e;var t=Object.create(null);if(l.r(t),Object.defineProperty(t,"default",{enumerable:!0,value:e}),2&r&&"string"!=typeof e)for(var n in e)l.d(t,n,function(r){return e[r]}.bind(null,n));return t},l.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return l.d(r,"a",r),r},l.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},l.p="./";var a=this["webpackJsonptldraw-vscode"]=this["webpackJsonptldraw-vscode"]||[],f=a.push.bind(a);a.push=r,a=a.slice();for(var i=0;i<a.length;i++)r(a[i]);var c=f;t()}([])</script>
            <script src="${jsUrl1}"></script>
            <script src="${jsUrl2}"></script>
        </body>
      </html>`
     return newer;
  }

  /**
   * Try to get a current document as json text.
   */
  private getDocumentAsJson(document: vscode.TextDocument): any {
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
  private updateTextDocument(document: vscode.TextDocument, json: any) {
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
