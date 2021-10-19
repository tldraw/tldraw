### VS Code Extension

This folder contains code implementing a VS Code extension for working with tldraw within VS Code. Files are saved locally and thus play well with version control. Target use case is developer documentation.

### Todos

- Get live reloading working while extension developing (debug launched)
  - Watching and rebuilding is working, it's just hot-updating the running editor instances that's failing
  - It currently at least updates every time you open a new editor, currently it's the websocket
    needed for the live reloading logic that is failing to connect.
- Backlog
  - Make sure extension works in Codespaces (when one of us gets into the beta)
  - [Supporting Remote Development and GitHub Codespaces](https://code.visualstudio.com/api/advanced-topics/remote-extensions)


## Test Cases
Here's a list of functionality and behavior we'd like working for an initial beta.

 - Saving
  - Save (Command+S or menu) should work
  - Save As (menu or shortcut)
 - Undo/Redo
  - Should reflect correctly in VS Code menus (can/can't do it based on stack)
 - Create new file using either of these methods
   - Use VS Code's "New File", name the file with a .tldr extension 
   - Use the Tldraw extensions registered command to create a blank .tldr file
 - Opening an
 - The editor should communicate that a file isn't valid when loading it
 - Detect and prevent multiple instances of the editor (For now)

Things we're cutting
 - Distinguishing app state from user state (selection, zoom, pan, etc)

## Running The Extension

- Setup/Run the editor (a create react app that houses the tldraw component)
 - `cd integrations/vscode/editor`
 - `yarn`
 - `yarn start`
- To setup/run the extension 
 - In a new terminal
   - Install dependencies 
     - `yarn`
   - Open just the extension folder in VS Code (necessary to use it's launch.json)
     - `cd integrations/vscode/extension`
     - `code .`
   - Run the extension using F5 (the launch.json setups watching too)
    - This will open a new VS Code window where the extension is installed in memory
    - Open a folder containing some .tldr files. Ex. tldraw/integrations/extension/examples
    - Select a .tldr file to test
    - You'll have to toggle between the extension/editor/debug VS Code instances to change things and see the results 
    - NOTE: Hot reloading doesn't work right now for the editor's create-react-app workflow. I have yet to figure out how to set the websocket host, which currently assumes it's housed on the same host as the page it's loaded in (which for the extension is some weird custom protocol)
     - If you close and reopen a .tldr file, it will load the latest change though

## Publishing/Packaging Extensions

Read instructions here:
https://code.visualstudio.com/api/working-with-extensions/publishing-extension

#### Good References

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
