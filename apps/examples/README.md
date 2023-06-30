# Examples

This folder contains examples of how to use the tldraw library.

To try them out, first clone the `tldraw/tldraw` repo.

Install dependencies from the root folder:

```bash
yarn
```

Start the development server:

```bash
yarn dev
```

Then you can try individual examples by using different paths listed below. eg: `localhost:5420/basic`. You can explore their source code in the [`src`](src) folder.

| Path | Description |
| ---- | ----------- |
| [`/basic`](src/1-basic/BasicExample.tsx) | A basic example of how to use the library. |
| [`/api`](src/2-api/APIExample.tsx) | Using the Editor API. |
| [`/custom-config`](src/3-custom-config/) | Using your own custom shapes and tools. |
| [`/custom-ui`](src/4-custom-ui/) | Using your own custom UI. |
| [`/exploded`](src/5-exploded/ExplodedExample.tsx) | Using the tldraw component with more fine-grained control. |
| [`/scroll`](src/6-scroll/ScrollExample.tsx) | Using tldraw on a scrollable page. |
| [`/multiple`](src/7-multiple/MultipleExample.tsx) | Using multiple tldraw components on the same page. |
| [`/error-boundary`](src/8-error-boundary/) | Using a custom error fallback for shapes. |
| [`/hide-ui`](src/9-hide-ui/HideUiExample.tsx) | Using tldraw without any UI. |
| [`/custom-components`](src/10-custom-components/CustomComponentsExample.tsx) | Using your own custom components for brushes, scribbles, and snaplines. |
| [`/user-presence`](src/11-user-presence/UserPresenceExample.tsx) | Testing the user presence API. |
| [`/ui-events`](src/12-ui-events/UiEventsExample.tsx) | Listening to UI events. |
| [`/store-events`](src/13-store-events/StoreEventsExample.tsx) | Listening to store events. |
| [`/persistence`](src/14-persistence/PersistenceExample.tsx) | Using local persistence. |
| [`/zones`](src/15-custom-zones/ZonesExample.tsx) | Placing custom UI elements at the top of the default UI. |
| [`/custom-styles`](src/16-custom-styles/) | Using custom style properties on a custom shape. |
| [`/yjs`](src/yjs) | Live collaboration using Yjs. |
