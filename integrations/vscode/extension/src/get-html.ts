import * as vscode from 'vscode'
import { getNonce } from './util'

/**
 * Get the static html used for the editor webviews. 
 * 
 * IMPORTANT: Notice that how this runs while developing is much different than
 * when deployed, review below to understand the differences.
 */
export function getHtmlForWebview(context: vscode.ExtensionContext, webview: vscode.Webview): string {
  return getDevModeHTML(context, webview);
}

/**
 * In development we're leveraging the create-react-app based tooling to have niceties like
 * live reload while developing the extension. The trick/hack is while the VS Code extension 
 * API requires an html content string to bootstrap the webview, if we provide the create-react-app
 * page source as the content it will load all the right javascript files that handle live reloading
 * and such.
 * 
 * WARNING: This assumes the create-react-app's initial payload is unchanging, this may not be
 * true when we do npm package updates of 'react-scripts' et al. 
 */
function getDevModeHTML(context: vscode.ExtensionContext, webview: vscode.Webview): string {
  const host = 'http://localhost:4000';
  return  `
    <!DOCTYPE html>
    <html lang="en">
    
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      <meta name="theme-color" content="#000000">
      <!--
          manifest.json provides metadata used when your web app is added to the
          homescreen on Android. See https://developers.google.com/web/fundamentals/engage-and-retain/web-app-manifest/
        -->
      <!-- <link rel="manifest" href="${host}/manifest.json"> -->
      <link rel="shortcut icon" href="${host}/favicon.ico">
      <!--
          Notice the use of  in the tags above.
          It will be replaced with the URL of the  folder during the build.
          Only files inside the  folder can be referenced from the HTML.
    
          Unlike "/favicon.ico" or "favicon.ico", "/favicon.ico" will
          work correctly both with client-side routing and a non-root  URL.
          Learn how to configure a non-root public URL by running npm run build.
        -->
      <title>Tldraw Editor</title>
    </head>
    
    <body>
      <noscript>
        You need to enable JavaScript to run this app.
      </noscript>
      <div id="root"></div>
    <script src="${host}/static/js/bundle.js"></script><script src="${host}/static/js/vendors~main.chunk.js"></script><script src="${host}/static/js/main.chunk.js"></script></body>
    
    </html>`;
}

/**
 * WARNING!!!: This is not complete/working except when manually edited, which we've done once to successfully
 * create a sideloadable vscode extension installer.
 * 
 * For production mode we load the code/html from a statically built version of the create-react-app that hosts
 * the tldraw/tldraw component based web app.
 * 
 * TODO: In order to automate making this work, we'll need to somehow provide the extension the URLs of the 
 * build generated javascript/css files, their names change based on hashes of content at build time. I'm 
 * very out of date/rusty on my Typescript/React build tool ecosystem, so I've spun my tires a bit trying
 * to figure out a non hacky way to do this. There is a asset-manifest.json file that includes the file 
 * paths, so 
 *  1) We need a way to fetch those during the build step, 
 *  2) ...or we need to figure out how to detect when we're running in production and read from the 
 *     manifest file synchronously in this function. I suspect there is a chance expecting file access, 
 *     especially synchronous file access will make the extension incompatible with the Github Codespaces
 *     client/server model
 */
function getProductionModeHTML(context: vscode.ExtensionContext, webview: vscode.Webview): string {
  // Local path to script and css for the webview
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'media',
      'tldraw-editor.js'
    )
  )

  const styleResetUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'reset.css')
  )

  const styleMainUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'media',
      'tldraw-editor.css'
    )
  )

  const cssUrl = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'build/static/css',
      'main.c353a27c.chunk.css'
    )
  )

  const jsUrl1 = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'build/static/js',
      '2.fea80d75.chunk.js'
    )
  )

  const jsUrl2 = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'build/static/js',
      'main.f60063b7.chunk.js'
    )
  )

  // Use a nonce to whitelist which scripts can be run
  const nonce = getNonce()

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">

      <!--
      Use a content security policy to only allow loading images from https or from our extension directory,
      and only allow scripts that have a specific nonce.
      -->
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; frame-src http://localhost:8080/; script-src 'nonce-${nonce}';">

      <meta name="viewport" content="width=device-width, initial-scale=1.0">

      <link href="${styleResetUri}" rel="stylesheet" />
      <link href="${styleMainUri}" rel="stylesheet" />

      <title>Tldraw Editor</title>
    </head>
    <body>
      <iframe width="100%" height="100%" src="http://localhost:8080/"></iframe>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
}