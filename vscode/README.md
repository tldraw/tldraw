# @tldraw/vscode

This folder contains the source for the tldraw VSCode extension.

## Developing

## 1. Install dependencies

- Run `yarn` from the root folder

## 2. Build @tldraw/tldraw

- Run `yarn build:packages` from the root folder.

## 3. Start the editor

- Run `yarn start:vscode` from the root folder.

## 4. Start the extension

- Open `vscode/extension` in a new VSCode window
- Install dependencies (`yarn`)
- Start the debugger (F5)

## Publishing

To publish, chat with the team on the [Discord channel](https://discord.gg/s4FXZ6fppJ).

- Install `vsce` globally
- Run `vsce login tldraw-org` and sign in

In the `vscode/extension` folder:

- Run `yarn vscode:publish`
