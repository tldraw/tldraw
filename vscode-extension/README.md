### VS Code Extension

This folder contains code implementing a VS Code extension for working with tldraw within VS Code. Files are saved locally and thus play well with version control. Target use case is developer documentation.

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

# ------- Original README.md below -------

# Cat Customs - Custom Editor API Samples

![Paw draw editor ](documentation/example.png)

Demonstrates VS Code's [custom editor API](https://code.visualstudio.com/api/extension-guides/custom-editors) using two custom editors:

- Cat Scratch — Uses the finalized custom text editor api to provide a custom editor for `.cscratch` files (which are just json files)
- Paw Draw - Uses the binary custom editor api to provide a custom editor for `.pawdraw` files (which are just png files with a different file extension).

## VS Code API

### `vscode` module

- [`window.registerCustomEditorProvider`](https://code.visualstudio.com/api/references/vscode-api#window.registerCustomEditorProvider)
- [`CustomTextEditor`](https://code.visualstudio.com/api/references/vscode-api#CustomTextEditor)
- [`CustomEditor`](https://code.visualstudio.com/api/references/vscode-api#CustomEditor)

## Running the example

- Open this example in VS Code 1.46+
- `npm install`
- `npm run watch` or `npm run compile`
- `F5` to start debugging

Open the example files from the `exampleFiles` directory.
