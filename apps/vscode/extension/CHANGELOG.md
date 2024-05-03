## 2.0.33

- Improves minimap rendering.

## 2.0.32

- Performance improvements.
- Improves resizing of text.
- Fixes a few issues with the minimap.
- Fixes a few issues with editing text.

## 2.0.31

- Improved minimap.
- Improved "Back to content" button.
- Improved handles on the note shape.

## 2.0.30

- Fixes a bug that prevented opening some files.

## 2.0.29

- Improved note shapes.
- Color improvements for both light and dark mode.
- Bug fixes and performance improvements.

## 2.0.28

- Fix an issue with panning the canvas.

## 2.0.27

- Bug fixes and performance improvements.

## 2.0.26

- Bug fixes and performance improvements.

## 2.0.25

- Translation improvements.
- Bug fixes and performance improvements.

## 2.0.24

- New: You can now use tldraw in Croatian language.
- Small visual improvements.
- Bug fixes.

## 2.0.23

- New: Positional keyboard shortcuts for toolbar. You can now use 1, 2, 3,... to select the first, second, third,... tool in the toolbar.
- New: You can now change the arrow label placement by simply dragging it towards one of the arrow's ends.
- New: You can now snap shapes that are within the frame to the frame's edges and the frame's centre.
- Improves duplication. If you alt drag a shape to duplicate it and use duplication afterwards, the new shape will use the same offset as the one you just created.
- Improves the geo cloud icon.
- Improves dismissing dialogs.
- Improves note shape border radius.
- Improves exporting of images. This should now be significantly faster.
- Updates the colors of the dark mode.

## 2.0.22

- Improves the dark mode appearance.
- Fixes an issue with bookmarks not showing images or descriptions.

## 2.0.21

- Improves translations.
- Fixes an issue with frames. The contents of the frame could become invisible when stacked inside other frames.

## 2.0.20

- Adds edge scrolling functionality. The camera will now move when the pointer is close to the edge of the screen (when resizing, moving, or brush selecting),
- Improves the default font appearance.
- Improves the interactions on top of locked shapes. Dragging selected shapes on top and behind them should now work as expected.
- Fixes an issue with downscaling images that could make the document size grow significantly.
- Fixes the context menu not closing in some cases.
- Fixes page names getting cut off.
- Fixes an issue with loosing focus when deleting from the user interface.
- Fixes the missing padding on some buttons.

## 2.0.19

- Adds fit to content option for frames.
- Fixes an issue with loading older files.
- Fixes an issue with some event handlers not being cleaned up correctly.

## 2.0.18

- Adds the option to remove frames, but keep the children.
- Add the option to add existing shapes when creating a frame. Just create the frame over the shapes and they will get added to the frame.
- Improves the appearance of drawings.
- Improves the way arrows bind inside of shapes.
- Fixes an issue with new pages not being named correctly.

## 2.0.17

- Improved grouping of shapes. You can now group a shape with an arrow bound to it.
- Improved handling of images. We now downscale them, which should improve performance.
- Improved Japanese translations.
- Fixed the background color of culled shapes when using dark mode.
- Fixed a bug with exporting shapes that have the same dimensions as their parent frame shape.

## 2.0.16

- Fixed keyboard shortcuts.
- Fixed edit link button stopping the mouse events from working.
- Fixed a bug with grouping / ungrouping which prevented the actions menu from closing correctly.
- Fixed arrowheads not being correctly localized in the Style panel.
- Fixed a bug where arrows with length 0 could crash the app.

## 2.0.15

- Bug fixes and performance improvements.

## 2.0.14

- Bug fixes and performance improvements. More info:
  https://github.com/tldraw/tldraw/releases/tag/v2.0.0-alpha.17

## 2.0.13

- Bug fixes and performance improvements. More info:
  https://github.com/tldraw/tldraw/releases/tag/v2.0.0-alpha.16

## 2.0.12

- Bug fixes and performance improvements.

## 2.0.11

- Added cloud shape.

## 2.0.10

- Removed the lock option from the highlighter tool.
- Disabled the styles button for the laser tool on small screens.
- Fixed mouse cursor after resizing during text creation. We now revert back to the default cursor.

## 2.0.9

- Stability improvements

## 2.0.8

- New highlighter tool!
- You can now lock shapes.
- Added vertical align setting to Note shapes.
- Added reduce motion user preference.
- Fixed control clicking not working on Mac.
- Improved translations.
- Fixed a problem where arrows might cause the extension to crash.

## 2.0.7

- New laser tool!
- New checkbox shape!
- Add veritcal alignment options to Notes and Geo shapes.
- Change how horizontal alignemnt works.
- Improve exporting and saving to svgs.

## 2.0.6

- Improved appearance of selection for single draw shapes.
- Improve handling of pixel scale when pasting images.
- Fixed a bug where pasted tabs wouldn't get converted into spaces.
- Fixed trailing tab characters in text labels not exporting correctly.
- Fixed empty text shapes sometimes not getting deleted.
- Fix a bug where grid mode couldn’t be enabled.
- Fixed a bug where the pointer location would not update when moving the pointer over an editing shape.
- Fixed a bug where the wrong default language option could be chosen.
- Fixed a minor consistency bug when re-doing a shape update.
- Re-doing a deletion of the current page now correctly navigates back to that page.

## 2.0.5

- Fixed another issue with undo / redo.

## 2.0.4

- Fix issues with undo / redo.
- Fix an issue with extension getting stuck on the loading screen.
- Fix an issue with the extension not saving changes in newly created files.

## 2.0.3

- Fix description in package.json.

## 2.0.2

- Add images to README.

## 2.0.1

- Release!
