# @tldraw/vscode

This folder contains the source for the tldraw VS Code extension.

## Developing

## 1. Install dependencies

- Run `yarn` from the root folder

## 2. Build @tldraw/tldraw

- Run `yarn build:packages` from the root folder.

## 3. Start the editor

In the root folder:

- Run `yarn start:vscode`.

This will start the development server for the `vscode/editor` project and open the `vscode/extension` folder in a new window.

In the `vscode/extension` window, open the terminal and run:

- Install dependencies (`yarn`)
- Start the VS Code debugger (Menu > Run > Start Debugging)

Open a `.tldr` file or create a new `.tldr` file from the command palette.

## Publishing

To publish, chat with the team on the [Discord channel](https://discord.gg/SBBEVCA4PG).

- Install `vsce` globally
- Run `vsce login tldraw-org` and sign in

In the `vscode/extension` folder:

- Run `yarn vscode:publish`

#### References

- [VS Code Marketplace Manager](https://marketplace.visualstudio.com/manage/)
- [Web Extensions Guide](https://code.visualstudio.com/api/extension-guides/web-extensions)
  - [Test Your Web Extension](https://code.visualstudio.com/api/extension-guides/web-extensions#test-your-web-extension)
  - [Web Extension Testing](https://code.visualstudio.com/api/extension-guides/web-extensions#web-extension-tests)
  - An example custom editor that does work as a Web Extension
    - https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio
    - https://github.com/hediet/vscode-drawio
- [VS Code Extension API/Landing Page](https://code.visualstudio.com/api)
- [Getting Started](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
- [github.com/microsoft/vscode-extension-samples](https://github.com/microsoft/vscode-extension-samples)
- [Extensions Guide -> Webviews](https://code.visualstudio.com/api/extension-guides/webview)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
