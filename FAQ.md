# Frequently Asked Questions

This document is meant to be provide answers to frequently asked questions about the [tldraw developer SDK](https://tldraw.dev). For questions related to **[tldraw.com](https://tldraw.com)**, please see our [tldraw.com guides](https://tldraw.notion.site/tldraw-com-1283e4c324c08086b585d438f088580f).

**Need more help?** See the [docs](https://tldraw.dev/docs) for our [guides](https://tldraw.dev/quick-start), [API reference](https://tldraw.dev/reference), and [examples](https://tldraw.dev/examples). You can also [join our Discord](https://discord.tldraw.com/?utm_source=github&utm_medium=social&utm_campaign=sociallink) to chat with the team and other developers.

**Want to help out?** That's great! See the **Contributing** section at the very bottom of this document.

---

### How do I get started?

If you're new to tldraw, your first visit should be our [quick start guide](https://tldraw.dev/quick-start).

### How do I submit a bug?

[Create an issue](https://github.com/tldraw/tldraw/issues) on our GitHub using the Bug template.

### How do I submit a feature request?

[Create an issue](https://github.com/tldraw/tldraw/issues) on our GitHub using the Feature Request template.

### Can I use the tldraw SDK with Vue, Angular, or another framework?

Yes. The SDK's main export (`<Tldraw>`) is a regular React component. To render it in a different framework, you would use your framework's regular method of rendering React components. For example, in Vue you would use a [Vue connector](https://dev.to/amirkian007/how-to-render-react-components-in-vue-1e0f). In Angular, you would use an [Angular wrapper component](https://web-world.medium.com/how-to-use-react-web-components-in-angular-b3ac7e39fd17).

### How do I run code when the editor first mounts?

Use the `Tldraw` component's `onMount` callback. See [this example](https://tldraw.dev/examples/editor-api/api) for more about using the editor API.

```tsx
<Tldraw
	onMount={(editor) => {
		editor.selectAll()
	}}
/>
```

### How do I turn on / off dark mode?

Color theme preferences are stored in the user object. To change the theme at runtime, update the user preferences:

```ts
editor.user.updateUserPreferences({ colorScheme: 'dark' })
editor.user.updateUserPreferences({ colorScheme: 'light' })
editor.user.updateUserPreferences({ colorScheme: 'system' })
```

### How do I turn on / off readonly mode?

You can use the `Editor` API.

### How can I lock or unlock a shape?

### How do I prevent the camera from moving?

---

## Contributing

Want to help with this document? Great! We welcome contributions that add new questions or improve existing answers. You can quickly edit the page [here](https://github.com/tldraw/tldraw/edit/main/FAQ.md)—or you can clone the repository, edit this file, and submit a Pull Reqeust.

Some tips:

- keep answers simple (English is a second language to many readers)
- include short code examples if you can
- provide links to relevant docs, examples, or files

You can use the example format below:

### Example question?

Example answer. [Link](https://tldraw.dev/quick-start).

```ts
// Code example
editor.showCodeExample()
```
