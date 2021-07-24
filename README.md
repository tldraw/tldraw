# tldraw

A tiny little drawing app.

Visit [tldraw.com](https://tldraw.com/).

## Author

- [steveruizok](https://twitter.com/steveruizok)
- ...and more!

## Support

To support this project (and gain access to the project while it is in development) you can [sponsor the author](https://github.com/sponsors/steveruizok) on GitHub. Thanks!

## Architecture

This project is formed of three parts:

- **core**: Types, Utils, and the SVG renderer (published as a React component).
- **tldraw**: The tldraw app (published as a React component).
- **site**: The tldraw.com website. The site embeds the app.

### Rendering Shapes

The renderer is designed to accept a **page** (TLPage) containing shape data, a set of **shape utilities** (TLShapeUtil) used to interpret the page's shape data, and a **page state** (TLPageState) with information about selection and camera position.

While the renderer's purpose is to draw shapes to the screen, the renderer does not contain any information about how a shape data should be rendered. Instead, the renderer relies on the corresponding shape utility, calling the class's `render` method with the shape data it needs to render. The `render` method will return SVG elements (in the form of JSX) according to the shape's data. Likewise, when testing whether to render an on-screen shape, the renderer will call the shape utility's `getBounds` method to find its bounding box.

This pattern allows developers to easily modify the appearance or behavior of existing shapes, or to create new shapes that implement the Shape Utility class.

### Handling Events

Along with the page, page state, and shape utilities, the render may also accept many **event props** such as `onPointShape` or `onPan`. These props accept callback functions that the renderer will call when the event occurs. These events allow a developer to implement more complex behavior, such as selection and camera movement, at the application level.
