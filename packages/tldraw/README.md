<div style="text-align: center; transform: scale(.5);">
  <img src="card-repo.png"/>
</div>

# @tldraw/tldraw

This package contains the [tldraw](https://tldraw.com) editor as a React component named `<Tldraw>`. You can use this package to embed the editor in any React application.

💕 Love this library? Consider [becoming a sponsor](https://github.com/sponsors/steveruizok?frequency=recurring&sponsor=steveruizok).

🙌 Questions? Join the [Discord channel](https://discord.gg/SBBEVCA4PG) or start a [discussion](https://github.com/tldraw/tldraw/discussions/new).

🎨 Want to build your own tldraw-ish app instead? Try the **@tldraw/core** folder instead.

## Installation

Use your package manager of choice to install `@tldraw/tldraw` and its peer dependencies.

```bash
yarn add @tldraw/tldraw
# or
npm i @tldraw/tldraw
```

## Usage

Import the `tldraw` React component and use it in your app.

```tsx
import { Tldraw } from '@tldraw/tldraw'

function App() {
  return <Tldraw />
}
```

### Persisting the State

You can use the `id` to persist the state in a user's browser storage.

```tsx
import { Tldraw } from '@tldraw/tldraw'

function App() {
  return <Tldraw id="myState" />
}
```

### Controlling the Component through Props

You can control the `<Tldraw/>` component through its props.

```tsx
import { Tldraw, TDDocument } from '@tldraw/tldraw'

function App() {
  const myDocument: TDDocument = {}

  return <Tldraw document={document} />
}
```

### Controlling the Component through the tldrawApp API

You can also control the `<Tldraw/>` component imperatively through the `TldrawApp` API.

```tsx
import { Tldraw, tldrawApp } from '@tldraw/tldraw'

function App() {
  const handleMount = React.useCallback((app: TldrawApp) => {
    app.selectAll()
  }, [])

  return <Tldraw onMount={handleMount} />
}
```

Internally, the `<Tldraw/>` component's user interface uses this API to make changes to the component's state. See the `tldrawApp` section of the [documentation](/guides/documentation.md) for more on this API.

### Responding to Changes

You can respond to changes and user actions using the `onChange` callback. For more specific changes, you can also use the `onPatch`, `onCommand`, or `onPersist` callbacks. See the [documentation](/guides/documentation.md) for more.

```tsx
import { Tldraw, TldrawApp } from '@tldraw/tldraw'

function App() {
  const handleChange = React.useCallback((app: TldrawApp, reason: string) => {
    // Do something with the change
  }, [])

  return <Tldraw onMount={handleMount} />
}
```

## Documentation

See the project's [documentation](/guides/documentation.md).

## Contribution

See the [contributing guide](/CONTRIBUTING.md).

## Development

See the [development guide](/guides/development.md).

## Example

See the `example` folder for examples of how to use the `<Tldraw/>` component.

## Community

### Support

Need help? Please [open an issue](https://github.com/tldraw/tldraw/issues/new) for support.

### Discussion

Want to connect with other devs? Visit the [Discord channel](https://discord.gg/SBBEVCA4PG).

### License

This project is licensed under MIT.

If you're using the library in a commercial product, please consider [becoming a sponsor](https://github.com/sponsors/steveruizok?frequency=recurring&sponsor=steveruizok).

## Author

- [@steveruizok](https://twitter.com/steveruizok)
