### VS Code Extension

This folder contains code implementing a VS Code extension for working with tldraw within VS Code. Files are saved locally and thus play well with version control. Target use case is developer documentation.

## Running The Extension

- Open this example in VS Code 1.46+
- `cd integrations/vscode-extension`
- `yarn`
- `yarn run watch` or `yarn run compile`
- Open VS Code so that `integrations/vscode-extension` is the top-level folder. `cd integrations/vscode-extension; code .`
- `F5` to start debugging

Open the example files from the `exampleFiles` directory.

#### Good References

- [VS Code Extension API/Landing Page](https://code.visualstudio.com/api)
- [Getting Started](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
- [github.com/microsoft/vscode-extension-samples](https://github.com/microsoft/vscode-extension-samples)

**Todos**

- Investigate what happens when people have 2 editors instances (say two tabs pointed to same file). We may not be able to support
- Backlog
  - Make sure extension works in Codespaces (when one of us gets into the beta)
  - [Supporting Remote Development and GitHub Codespaces](https://code.visualstudio.com/api/advanced-topics/remote-extensions)

