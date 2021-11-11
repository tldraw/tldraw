<div style="text-align: center; transform: scale(.5);">
  <img src="card-repo.png"/>
</div>

# @tldraw/tldraw

This package contains the [TLDraw](https://tldraw.com) editor as a React component named `<TLDraw>`. You can use this package to embed the editor in any React application.

💕 Love this library? Consider [becoming a sponsor](https://github.com/sponsors/steveruizok?frequency=recurring&sponsor=steveruizok).

🙌 Questions? Join the [Discord channel](https://discord.gg/s4FXZ6fppJ) or start a [discussion](https://github.com/tldraw/tldraw/discussions/new).

🎨 Want to build your own TLDraw-ish app instead? Try [@tldraw/core](https://github.com/tldraw/core).

## Installation

Use your package manager of choice to install `@tldraw/tldraw` and its peer dependencies.

```bash
yarn add @tldraw/tldraw
# or
npm i @tldraw/tldraw
```

## Usage

Import the `TLDraw` React component and use it in your app.

```tsx
import { TLDraw } from '@tldraw/tldraw'

function App() {
  return <TLDraw />
}
```

### Persisting the State

You can use the `id` to persist the state in a user's browser storage.

```tsx
import { TLDraw } from '@tldraw/tldraw'

function App() {
  return <TLDraw id="myState" />
}
```

### Controlling the Component through Props

You can control the `TLDraw` component through its props.

```tsx
import { TLDraw, TLDrawDocument } from '@tldraw/tldraw'

function App() {
  const myDocument: TLDrawDocument = {}

  return <TLDraw document={document} />
}
```

### Controlling the Component through the TLDrawState API

You can also control the `TLDraw` component imperatively through the `TLDrawState` API.

```tsx
import { TLDraw, TLDrawState } from '@tldraw/tldraw'

function App() {
  const handleMount = React.useCallback((state: TLDrawState) => {
    state.selectAll()
  }, [])

  return <TLDraw onMount={handleMount} />
}
```

Internally, the `TLDraw` component's user interface uses this API to make changes to the component's state. See the `TLDrawState` section of the [documentation](guides/documentation) for more on this API.

### Responding to Changes

You can respond to changes and user actions using the `onChange` callback. For more specific changes, you can also use the `onPatch`, `onCommand`, or `onPersist` callbacks. See the [documentation](guides/documentation) for more.

```tsx
import { TLDraw, TLDrawState } from '@tldraw/tldraw'

function App() {
  const handleChange = React.useCallback((state: TLDrawState, reason: string) => {
    // Do something with the change
  }, [])

  return <TLDraw onMount={handleMount} />
}
```

## Documentation

See the project's [documentation](/guides/documentation.md).

## Contribution

See the [contributing guide](/CONTRIBUTING.md).

## Development

See the [development guide](/guides/development.md).

## Example

See the `example` folder for examples of how to use the `<TLDraw/>` component.

## Community

### Support

Need help? Please [open an issue](https://github.com/tldraw/tldraw/issues/new) for support.

### Discussion

Want to connect with other devs? Visit the [Discord channel](https://discord.gg/s4FXZ6fppJ).

### License

This project is licensed under MIT.

If you're using the library in a commercial product, please consider [becoming a sponsor](https://github.com/sponsors/steveruizok?frequency=recurring&sponsor=steveruizok).

## Author

- [@steveruizok](https://twitter.com/steveruizok)
