import * as vscode from 'vscode'
import { TLDrawWebviewManager } from './TLDrawWebviewManager'

/**
 * The TLDraw extension's editor uses CustomTextEditorProvider, which means
 * it's underlying model from VS Code's perspective is a text file. We likely
 * will switch to CustomEditorProvider which gives us more control but will require
 * more book keeping on our part.
 */
export class TLDrawEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private static newTLDrawFileId = 1

  private static readonly viewType = 'tldraw.tldr'

  public static register = (context: vscode.ExtensionContext): vscode.Disposable => {
    // Register the 'Create new TLDraw file' command, which creates
    // a temporary .tldr file and opens it in the editor.
    vscode.commands.registerCommand('tldraw.tldr.new', () => {
      const id = TLDrawEditorProvider.newTLDrawFileId++
      const name = id > 1 ? `New Document ${id}.tldr` : `New Document.tldr`

      const workspaceFolders = vscode.workspace.workspaceFolders
      const path = workspaceFolders ? workspaceFolders[0].uri : vscode.Uri.parse('')

      vscode.commands.executeCommand(
        'vscode.openWith',
        vscode.Uri.joinPath(path, name).with({ scheme: 'untitled' }),
        TLDrawEditorProvider.viewType
      )
    })

    // Register our editor provider, indicating to VS Code that we can
    // handle files with the .tldr extension.
    return vscode.window.registerCustomEditorProvider(
      TLDrawEditorProvider.viewType,
      new TLDrawEditorProvider(context),
      {
        webviewOptions: {
          // See https://code.visualstudio.com/api/extension-guides/webview#retaincontextwhenhidden
          retainContextWhenHidden: true,
        },

        // See https://code.visualstudio.com/api/extension-guides/custom-editors#custom-editor-lifecycle
        supportsMultipleEditorsPerDocument: true,
      }
    )
  }

  // When our custom editor is opened, create a TLDrawWebviewManager to
  // configure the webview and set event listeners to handle events.
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    new TLDrawWebviewManager(this.context, document, webviewPanel)
  }
}
