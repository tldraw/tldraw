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
  - Use the TLDraw extensions registered command to create a blank .tldr file
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

**This stuff needs to be fully automated!!! We're not quite there yet.**

- Make sure you have the vsce command line tool installed
- `npm install -g vsce`
- Build the editor static site
- `cd integrations/vscode/editor`
- `yarn build`
- This will build a static version of the create react app and put it into `integrations/vscode/editor`.
- Bump the package.json version
  - Just do this manually in the file
- Change the code in `integrations/vscode/extension/src/get-html.ts` so it uses the production path. It should look like this:

         //return getDevModeHTML(context, webview, documentContent);
         return getProductionModeHTML(context, webview, documentContent);

- Run script that copies over the latest static file path hashes
  - **TODO**: Find this script. It seems to have gone missing and I can't find it in history
  - The manual version is to look at the latest editor-build/index.html and copy/reference it into get-html.ts
- Compile the extension in production mode
  - `npm run package-web`
- Package up the extension as an extension installer .vsix
  - `vsce package`
  - A file with a name like: `tldraw-0.8.0.vsix` will now be put in the extension root
    - TODO: Make this get build to a proper temp directory like dist
- Before publishing test using the .vsix based installation workflow available in VS Code Desktop
- Use the Web UI to publish the latest extension by uploading the .vsix file
  - https://marketplace.visualstudio.com/manage/publishers/Wardlt
  - Click on the elipse button and choose Update, then select the .vsix we just generated
  - It should take a few minutes to go through some automated validation the VS Code Marketplace does
- Now test it quickly
  - Desktop
  - github.dev
  - Go here and then press '.' https://github.com/tldraw/tldraw/tree/vscode-extension-v1/integrations/vscode/extension/examples
  - Try one of the .tldr files
  - Codespaces
    - Go here: https://github.com/conveyhq/codespaces-test
    - Select Code -> main or go straight there via link: https://seflless-conveyhq-codespaces-test-x76jf9xq7.github.dev/
    - I have a test code space here with a .tldr file already included
- Read more about this topic here: [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

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
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
