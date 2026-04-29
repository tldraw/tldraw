# @tldraw/driver

Imperative API for driving the tldraw editor programmatically. Useful for scripting, automation, REPL usage, and testing.

## Installation

```bash
npm install @tldraw/driver
```

## Quick start

```ts
import { Driver } from '@tldraw/driver'

const driver = new Driver(editor)

// Simulate user interactions
driver.click(100, 200).pointerDown(300, 400).pointerMove(500, 600).pointerUp()

// Keyboard input
driver.keyPress('a')
driver.keyDown('Shift')
driver.keyUp('Shift')

// Clipboard
driver.copy()
driver.paste({ x: 100, y: 100 })

// Selection manipulation
driver.translateSelection(50, 0)
driver.rotateSelection(Math.PI / 4)
driver.resizeSelection({ scaleX: 2 }, 'bottom_right')

// Camera
driver.pan({ x: 100, y: 0 })
driver.wheel(0, -100)

// Cleanup
driver.dispose()
```

## API

### Constructor

#### `new Driver(editor: Editor)`

Wraps an existing `Editor` instance. All methods use only public Editor APIs.

### Input events

All input methods return `this` for fluent chaining. Coordinates are in screen space.

| Method                                        | Description                            |
| --------------------------------------------- | -------------------------------------- |
| `pointerDown(x?, y?, options?, modifiers?)`   | Dispatch a pointer down event          |
| `pointerMove(x?, y?, options?, modifiers?)`   | Dispatch a pointer move event          |
| `pointerUp(x?, y?, options?, modifiers?)`     | Dispatch a pointer up event            |
| `click(x?, y?, options?, modifiers?)`         | Pointer down + up                      |
| `rightClick(x?, y?, options?, modifiers?)`    | Right-click (button 2) down + up       |
| `doubleClick(x?, y?, options?, modifiers?)`   | Double-click sequence                  |
| `keyDown(key, options?)`                      | Dispatch a key down event              |
| `keyUp(key, options?)`                        | Dispatch a key up event                |
| `keyPress(key, options?)`                     | Key down + up                          |
| `keyRepeat(key, options?)`                    | Dispatch a key repeat event            |
| `wheel(dx, dy, options?)`                     | Dispatch a wheel/scroll event          |
| `pinchStart(x?, y?, z, dx, dy, dz, options?)` | Begin a pinch gesture                  |
| `pinchTo(x?, y?, z, dx, dy, dz, options?)`    | Continue a pinch gesture               |
| `pinchEnd(x?, y?, z, dx, dy, dz, options?)`   | End a pinch gesture                    |
| `forceTick(count?)`                           | Emit tick events to advance the editor |

### Clipboard

| Method          | Description                                         |
| --------------- | --------------------------------------------------- |
| `copy(ids?)`    | Copy shapes to the driver's clipboard               |
| `cut(ids?)`     | Cut shapes (copy + delete)                          |
| `paste(point?)` | Paste from the driver's clipboard                   |
| `clipboard`     | The current clipboard content (`TLContent \| null`) |

### Selection manipulation

These methods work in page coordinates and handle the screen-space conversion internally.

| Method                                      | Description                                 |
| ------------------------------------------- | ------------------------------------------- |
| `translateSelection(dx, dy, options?)`      | Move the selection by a page-space delta    |
| `rotateSelection(angle, options?)`          | Rotate the selection by an angle in radians |
| `resizeSelection(scale?, handle, options?)` | Resize the selection via a handle           |

### Queries

| Method                         | Description                                 |
| ------------------------------ | ------------------------------------------- |
| `getViewportPageCenter()`      | Center of the viewport in page coordinates  |
| `getSelectionPageCenter()`     | Center of the selection in page coordinates |
| `getPageCenter(shape)`         | Center of a shape in page coordinates       |
| `getPageRotation(shape)`       | Rotation of a shape in page space (radians) |
| `getPageRotationById(id)`      | Rotation of a shape by ID (radians)         |
| `getArrowsBoundTo(shapeId)`    | All arrows bound to a shape                 |
| `getLastCreatedShape()`        | The most recently created shape             |
| `getLastCreatedShapes(count?)` | The last N created shapes                   |

### Camera

| Method        | Description                           |
| ------------- | ------------------------------------- |
| `pan(offset)` | Pan the camera by a page-space offset |

### Lifecycle

| Method      | Description                                  |
| ----------- | -------------------------------------------- |
| `dispose()` | Remove side-effect handlers. Call when done. |

## License

See [LICENSE.md](../../LICENSE.md).
