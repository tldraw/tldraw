import * as vscode from 'vscode'

/**
 * Get the static html used for the editor webviews.
 *
 * IMPORTANT: Notice that how this runs while developing is much different than
 * when deployed, review below to understand the differences.
 */
export function getHtmlForWebview(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  document: vscode.TextDocument
): string {
  // For now we're going to tread badly formed .tldr files as freshly created files.
  // This will happen if say a user creates a new .tldr file using New File or if they
  // have a bad auto-merge that messes up the json of an existing .tldr file
  // We pass null as the initialDocument value if we can't parse as json.
  let documentContent
  try {
    JSON.parse(document.getText())
    documentContent = document.getText()
  } catch (error) {
    documentContent = 'null'
  }

  if(process.env.NODE_ENV === 'production'){
    return getProductionModeHTML(context, webview, documentContent);
  } else {
    return getDevModeHTML(context, webview, documentContent)
  }
  
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
function getDevModeHTML(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  documentContent: string
): string {
  const host = 'http://localhost:5420'
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="${host}/index.css" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TLDraw</title>
  </head>
  <body>
    <div id="root"></div>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <script>currentFile = ${documentContent};</script>
    <script src="${host}/index.js"></script>
  </body>
</html>`
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
function getProductionModeHTML(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  documentContent: string
): string {
  const cssUrl = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'editor/', 'index.css')
  )

  const jsUrl = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'editor/', 'index.js')
  )

  console.log("production mode");

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <link rel="stylesheet" href="${cssUrl}" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>TLDraw</title>
    </head>
    <body>
      <div id="root"></div>
      <noscript>You need to enable JavaScript to run this app.</noscript>
      <script>currentFile = ${documentContent};</script>
      <script src="${jsUrl}""></script>
    </body>
  </html>
  `
}
