import * as vscode from 'vscode'
import { getNonce } from './util'

/**
 * Get the static html used for the editor webviews. 
 * 
 * IMPORTANT: Notice that how this runs while developing is much different than
 * when deployed, review below to understand the differences.
 */
export function getHtmlForWebview(context: vscode.ExtensionContext, webview: vscode.Webview, document: vscode.TextDocument): string {

  // For now we're going to tread badly formed .tldr files as freshly created files.
  // This will happen if say a user creates a new .tldr file using New File or if they
  // have a bad auto-merge that messes up the json of an existing .tldr file
  // We pass null as the initialDocument value if we can't parse as json.
  let documentContent;
  try{
    JSON.parse(document.getText())
    documentContent = document.getText();
  } catch(error){
    documentContent = "null";
  }

  return getDevModeHTML(context, webview, documentContent);
  // return getProductionModeHTML(context, webview, documentContent);
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
function getDevModeHTML(context: vscode.ExtensionContext, webview: vscode.Webview, documentContent: string): string {
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
      <script>      
      // We inject the initial document into a global so the tldraw component 
      // can load it quickly without having to wait for a message from the extension process 
      const initialDocument = `+
      documentContent
      +`;
      </script>
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
function getProductionModeHTML(context: vscode.ExtensionContext, webview: vscode.Webview, documentContent: string): string {

  // Local path to script and css for the webview
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'media',
      'tldraw-editor.js'
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
      'build',
      './static/js/2.2ec010b5.chunk.js'//Replace Me #1
    )
  )

  const jsUrl2 = webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'build',
      './static/js/main.54cae952.chunk.js'//Replace Me #2
    )
  )

  return `
  <!doctype html>
<html lang="en">
   <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
      <meta name="theme-color" content="#000000">
      <link rel="shortcut icon" href="./favicon.ico">
      <title>React App</title>
      <link href="${cssUrl}" rel="stylesheet">
   </head>
   <body>
      <noscript>You need to enable JavaScript to run this app.</noscript>
      <div id="root"></div>
      <script>!function(e){function r(r){for(var n,l,a=r[0],f=r[1],i=r[2],p=0,s=[];p<a.length;p++)l=a[p],Object.prototype.hasOwnProperty.call(o,l)&&o[l]&&s.push(o[l][0]),o[l]=0;for(n in f)Object.prototype.hasOwnProperty.call(f,n)&&(e[n]=f[n]);for(c&&c(r);s.length;)s.shift()();return u.push.apply(u,i||[]),t()}function t(){for(var e,r=0;r<u.length;r++){for(var t=u[r],n=!0,a=1;a<t.length;a++){var f=t[a];0!==o[f]&&(n=!1)}n&&(u.splice(r--,1),e=l(l.s=t[0]))}return e}var n={},o={1:0},u=[];function l(r){if(n[r])return n[r].exports;var t=n[r]={i:r,l:!1,exports:{}};return e[r].call(t.exports,t,t.exports,l),t.l=!0,t.exports}l.m=e,l.c=n,l.d=function(e,r,t){l.o(e,r)||Object.defineProperty(e,r,{enumerable:!0,get:t})},l.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},l.t=function(e,r){if(1&r&&(e=l(e)),8&r)return e;if(4&r&&"object"==typeof e&&e&&e.__esModule)return e;var t=Object.create(null);if(l.r(t),Object.defineProperty(t,"default",{enumerable:!0,value:e}),2&r&&"string"!=typeof e)for(var n in e)l.d(t,n,function(r){return e[r]}.bind(null,n));return t},l.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return l.d(r,"a",r),r},l.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},l.p="./";var a=this["webpackJsonptldraw-vscode"]=this["webpackJsonptldraw-vscode"]||[],f=a.push.bind(a);a.push=r,a=a.slice();for(var i=0;i<a.length;i++)r(a[i]);var c=f;t()}([])</script>
      <script>
      // We inject the initial document into a global so the tldraw component 
      // can load it quickly without having to wait for a message from the extension process 
      const initialDocument = `+
      documentContent
      +`;
      </script>
      <script src="${jsUrl1}"></script>
      <script src="${jsUrl2}"></script>
   </body>
</html>
  `;
}