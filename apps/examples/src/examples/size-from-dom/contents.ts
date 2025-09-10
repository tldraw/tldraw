export const contents = `
Have five minutes? Let's try out the tldraw SDK in a React project. If you're new to React, we recommend using a Vite template as a starter. We'll assume your project is already running locally.

Prefer to jump straight to some code? Try this sandbox.

First, install the tldraw package from NPM:

npm install tldraw

Next, in your React project, import the Tldraw component and tldraw's CSS styles. Then render the Tldraw component inside a full screen container:

That's pretty much it! At this point, you should have a complete working single-user canvas. You can draw and write on the canvas, add images and video, zoom and pan, copy and paste, undo and redo, and do just about everything else you'd expect to do on a canvas.

You'll be starting from our default shapes, tools, and user interface, but you can customize all of these things for your project if you wish. For now, let's show off a few more features.
`
	.replace(/\n/g, '')
	.replace(/\s+/g, ' ')
	.split(' ')
