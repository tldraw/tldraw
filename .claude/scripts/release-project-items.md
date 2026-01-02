# Release project items

This document contains all items from GitHub Projects with names beginning with "Release".

## [Release 11-05-2023](https://github.com/orgs/tldraw/projects/58)

- [x] Exporting an untitled frame should give the export a better name than "png.png" (Fixed in #4918)
- [ ] Exporting a single image gives the export a weird name
- [x] [Shapes get stuck in erasing mode](https://github.com/tldraw/tldraw/issues/4860)
- [x] Touch: Translating shapes can get the wrong offset after panning/pinching (Fixed via interrupt mechanism)
- [x] [Touch: You can draw lines with the draw tool by "walking" with your fingers.](https://github.com/tldraw/tldraw/issues/4857)
- [x] [Editing a frame title pans the camera away from text input](https://github.com/tldraw/tldraw/issues/4859)
- [x] [Touch: it's sometimes possible to create "multitouch zigzags" with the draw tool](https://github.com/tldraw/tldraw/issues/4858)

## [Release 2024-22-10](https://github.com/orgs/tldraw/projects/57)

- [x] Arrow indicator not masked over label (Fixed in #4749)
- [x] [Not copying snapshot link to the clipboard](https://github.com/tldraw/tldraw/issues/4744)
- [x] Keyboard inputs not working on dialogs (Fixed in #4745)
- [x] [Unique tooltip title for label alignment](https://github.com/tldraw/tldraw/issues/4748)
- [x] [We should limit the page name length in the move to page menu](https://github.com/tldraw/tldraw/issues/4746)
- [ ] Editing the title of a frame should not zoom to the frame center, but rather to the header
- [x] LOD not changing when zooming out (Fixed via getEfficientZoomLevel)

## [Release 2024-09-16](https://github.com/orgs/tldraw/projects/56)

- [x] [UX] zoom menu in minimap should dismiss itself after you click an option and the pointer leaves the menu
- [x] [Safari] Panning is choppy when there's a video shape on the screen
- [x] [Flattening frame changes content size](https://github.com/tldraw/tldraw/issues/4527)
- [x] [Bug] Zooming in and out moves the viewport position
- [x] [Safari] Draw shape becomes blurry when selecting it

## [Release 2024-08-06](https://github.com/orgs/tldraw/projects/55)

- [x] [Can't scrub video files in multiplayer project (sometimes)](https://github.com/tldraw/tldraw/issues/4357)
- [x] Copy as SVG does not work when you have a video selected (Fixed - VideoShapeUtil.toSvg works)
- [x] [Double clicking a gif pauses AND enters cropping](https://github.com/tldraw/tldraw/issues/4358)
- [x] [tldraw Embed shapes don't focus the board immediately after double clicking](https://github.com/tldraw/tldraw/issues/4359)

## [Release 2024-07-16](https://github.com/orgs/tldraw/projects/54)

- [x] Homepage icon has some borders (Obsolete - app rewritten)
- [ ] CORS issue when exporting svgs
- [x] [ios] It's really hard to edit existing text
- [x] [ios] Text cursor is not rotated for rotated shapes

## [Release 2024-07-09](https://github.com/orgs/tldraw/projects/53)

- [x] [[android] bookmark border is broken](https://github.com/tldraw/tldraw/issues/4109)
- [x] [macos chrome] bookmark border is bad when there is no metadata
- [x] New bookmarks not loading on staging multiplayer room (ipad) (Fixed via asset prop fix)
- [x] [Input coordinates while viewport following are not set correctly](https://github.com/tldraw/tldraw/issues/4106)
- [x] Issue with `cmd + shift + v` pasting when paste at cursor is turned on (Fixed in #4104)
- [ ] stickies render with solid shadow during export
- [x] Show toast when read access to clipboard denied (Implemented in #4117)
- [x] export as png sometimes makes shapes smaller (Fixed via pHYs parsing fix)
- [ ] show toast when attempting to upload image that is too big

## [Release 2024-06-18](https://github.com/orgs/tldraw/projects/47)

- [x] [chrome macos] edge scrolling broken on right and bottom edge
- [ ] Zooming seems choppy from time to time
- [ ] Flattening is slow and it seems to slow down the whole board
- [ ] Flattening does not work on local boards
- [ ] hard to close draw shapes at different zoom levels
- [x] [android chrome] user following is borked to some extent
- [ ] culled images are still requesting images
- [ ] isAnimated not marking as animated if shared board already
- [ ] user following: border does not reliably switch color as you switch between different users
- [ ] Moving around the minimap with the pen is choppy, maybe we should smooth it

## [Release 2024-05-21](https://github.com/orgs/tldraw/projects/44)

- [ ] Cannot use context menu items on ipad
- [x] [Cannot open context menu of shape with label if it is selected on ios](https://github.com/tldraw/tldraw/issues/3794)
- [x] [[android] keyboard does not open when double-clicking to edit geo shape](https://github.com/tldraw/tldraw/issues/3796)
- [x] [[ipad] Tapping 3 times on the edge of a geo shape leaves the keyboard open and text visually focused but ignoring inputs](https://github.com/tldraw/tldraw/issues/3793)

## [Release 2024-04-30](https://github.com/orgs/tldraw/projects/42)

- [ ] Question mark icon in pages menu
- [ ] Safari renders minimap viewport with too-low contrast
- [ ] Collaborators are blinking in the minimap
- [ ] Sad minimap is sad
- [ ] Android chrome: Cursor chat shouldnt be an option in the context menu
- [ ] Redo doesn't work if you deselect shape
- [ ] Zooming is undoable
- [ ] Initial page viewport is undoable on dotcom
- [x] [ios, safari] coarse pointer controls exposed when using the mouse
- [x] [windows, firefox/chrome] Shows a scribble trail when using touch screen
- [ ] Question mark icon on tool lock button
- [x] [We fetch the readonly slug two times](https://github.com/tldraw/tldraw/issues/3661)
- [x] [infinite nesting of tldraw's breaks sync](https://github.com/tldraw/tldraw/issues/3660)

## [Release 2024-04-16](https://github.com/orgs/tldraw/projects/41)

- [x] [[iPad] double tap will focus text without showing keyboard](https://github.com/tldraw/tldraw/issues/3500)
- [x] [android, stickies] text cursor sometimes does not appear when creating a sticky
- [x] [Duplicating by pressing option [alt] after the drag has started does not work reliably on stickies](https://github.com/tldraw/tldraw/issues/3489)
- [x] ['always snap' mode makes the special sticky snapping not work](https://github.com/tldraw/tldraw/issues/3490)
- [x] [dark mode] default sticky colors for greyscale seem to be the wrong way around (the lighter color sticky is assigned to the darker color swatch)
- [x] [Multiplayer cursors have incorrect offset](https://github.com/tldraw/tldraw/issues/3475)
- [x] [Edge handles are fiddly on touch/mobile](https://github.com/tldraw/tldraw/issues/3479)
- [ ] Problem with text cursor and text selection on rotated stickies
- [x] [Double-clicking board title when editing text doesn't auto-select the title](https://github.com/tldraw/tldraw/issues/3483)
- [x] [Long words in stickies sometimes wrap before the font size shrinks](https://github.com/tldraw/tldraw/issues/3492)
- [x] [Cursor chat is available in the context menu if you right click when using eraser or draw tool](https://github.com/tldraw/tldraw/issues/3491)
- [x] [Can drag a shape that's behind another shape, by dragging where it's label is](https://github.com/tldraw/tldraw/issues/3494)

## [Release 2024-04-10](https://github.com/orgs/tldraw/projects/40)

- [ ] Minimap sometimes does not work
- [x] [mobile] cursor chat doesn't work
- [x] [`kickOutOccludedShapes` doesn't respect frame rotation](https://github.com/tldraw/tldraw/issues/3393)
- [x] [Handle backgrounds are still shown after tap on mobile](https://github.com/tldraw/tldraw/issues/3394)
- [x] [Svg Debug mode is broken](https://github.com/tldraw/tldraw/issues/2907)
- [ ] Cursor chat missing from context menu on desktop
- [x] [Cmd-drag arrow inside frame binds to frame](https://github.com/tldraw/tldraw/issues/3317)
- [x] [[perf, android] dragging an arrow handle around feels sluggish when there are lots of shapes on the page (not just on screen)](https://github.com/tldraw/tldraw/issues/3436)
- [x] [Hide Edit Link on locked shapes](https://github.com/tldraw/tldraw/issues/3308)
- [x] [Error using text shape after 2000 shapes](https://github.com/tldraw/tldraw/issues/3273)
- [x] [Can't edit document title when editing text](https://github.com/tldraw/tldraw/issues/3437)
- [x] [Wrong initial page name in non-English browsers](https://github.com/tldraw/tldraw/issues/3237)
- [x] [Arrow label can overlap its bound shape when it has no arrow head](https://github.com/tldraw/tldraw/issues/3433)
- [x] [windows, firefox] performance is pretty poor with many shapes on canvas
- [x] [[people menu] when there are lots of people, the top an bottom sections shrink and have overflow:scroll](https://github.com/tldraw/tldraw/issues/3651)
- [x] [ios] long-pressing a frame label starts translation instead of opening context menu
- [x] [windows firefox] inconsistent pinch zoom behaviour
- [ ] Long press logic causes a problem when panning around

## [Release 2024-03-12](https://github.com/orgs/tldraw/projects/39)

- [ ] Indicator and draw shape getting out of sync?
- [x] [Safari] Cursor is caret on document name even when you aren't editing
- [ ] Fonts not exporting in SVGs

## [Release 2024-02-29](https://github.com/orgs/tldraw/projects/38)

- [ ] Long document names can overlap da share zone
- [ ] Can export from Object menu when nothing is selected
- [ ] Consider renaming Object in main menu
- [ ] Menu navigation with keyboard inconsistent
- [ ] Show feedback when you're joining a room with a connection issue
- [ ] Keyboard shortcuts scroll issues

## [Release 2024-02-21](https://github.com/orgs/tldraw/projects/37)

- [x] [Shape indexes not maintained when creating frame over shapes](https://github.com/tldraw/tldraw/issues/2892)
- [ ] Collaborator menu looks weird on firefox windows
- [x] [Page rename menu button doesn't work on firefox](https://github.com/tldraw/tldraw/issues/2903)
- [x] [Asset 404s should actually 404](https://github.com/tldraw/tldraw/issues/2898)
- [ ] Minimap drags get interpreted as button press (firefox)
- [x] [Selection foreground hides for what feels like a long time after changing styles](https://github.com/tldraw/tldraw/issues/2900)
- [ ] Checkbox on language menu doesn't update
- [x] [Can get stuck in dragging shape state when not touching the screen](https://github.com/tldraw/tldraw/issues/2899)
- [ ] Page menu ... icons don't show up on iphone
- [ ] Tiny little baby edit menu looks a bit silly on ios
- [ ] Links to project gone in file menu
- [x] [Arrow label snapping shouldn't scale with arrow length](https://github.com/tldraw/tldraw/issues/2901)

## [Release 2024-02-13](https://github.com/orgs/tldraw/projects/36)

- [x] [mobile] Missing bottom margin in the actions menu on mobile when using landscape

## [Release 2024-02-06](https://github.com/orgs/tldraw/projects/35)

- [ ] Pinch zooming is broken on multiple platforms/browsers
- [x] [ux] the 'editing' state in the pages menu is kinda confusing
- [x] [Windows: Grid mode slows down rendering](https://github.com/tldraw/tldraw/issues/2743)
- [x] [Windows Chrome: Grid mode keyboard shortcut doesn't work](https://github.com/tldraw/tldraw/issues/2744)
- [x] [Issues with zero length arrows and labels](https://github.com/tldraw/tldraw/issues/2749)
- [x] [Shouldn't only grab cursor on arrow label when using select tool](https://github.com/tldraw/tldraw/issues/2750)
- [x] [[ios, all browsers] focus mode shortcut doesn't work with cmd, only ctrl](https://github.com/tldraw/tldraw/issues/2745)
- [x] [[ios chrome] Typing in a text shape brings up password manager](https://github.com/tldraw/tldraw/issues/2746)
- [x] [[dotcom] routing is misconfigured, images at root e.g. /twitter-social.png are not viewable from within a browser](https://github.com/tldraw/tldraw/issues/2752)

## [Release 2024-01-24](https://github.com/orgs/tldraw/projects/34)

- [ ] iOS: Crash when exporting/copying as PNG
- [ ] Arrow labels should snap to the center when you move them
- [ ] Dragging the middle handle of an arrow should move the label if the label overlaps with the handle
- [ ] Large stroke width arrows seem to move the text label further along from the end?
- [ ] Empty arrow label when the label is being created
- [ ] Label placed at the end of a circular arrow gets under the arrowhead
- [ ] Rounded label corners intersecting the label's arrow
- [ ] Android Chrome & Mac Firefox: Can't drag middle arrow handle through label
- [ ] Sometimes I want to move a selected arrow by dragging its label
- [x] [Lose keyboard focus after duplicating via top bar](https://github.com/tldraw/tldraw/issues/2616)

## [Release 2024-01-17](https://github.com/orgs/tldraw/projects/32)

- [x] [Need to do a hard reload to get the new styles](https://github.com/tldraw/tldraw/issues/2486)
- [x] [Multiplayer cursor wobble when pinch zooming](https://github.com/tldraw/tldraw/issues/2487)
- [x] [Old dark mode colours (at least background) used in exports](https://github.com/tldraw/tldraw/issues/2493)
- [x] [[iOS, Safari] Strange lines around popover windows on mobile](https://github.com/tldraw/tldraw/issues/2488)
- [ ] Touch: Main menu can feel unresponsive
- [x] [[UX] Clicking/tapping dialog background while the modal is open should dismiss it](https://github.com/tldraw/tldraw/issues/2496)
- [x] [[mobile ux] Improve line snapping](https://github.com/tldraw/tldraw/issues/2553)
- [x] [[iOS] Back to content not scrolling to content?](https://github.com/tldraw/tldraw/issues/2490)
- [x] [[iOS] App is basically not usable since it keeps reloading (Safari layering issue)](https://github.com/tldraw/tldraw/issues/2491)
- [x] [frame clipping in exports is slightly wrong when the frame is rotated](https://github.com/tldraw/tldraw/issues/2489)
- [x] [test issue from project](https://github.com/tldraw/tldraw/issues/2556)

## [Release 2024-01-09](https://github.com/orgs/tldraw/projects/31)

- [ ] When creating text with an apple pencil, it's very easy to accidentally drag instead of tap
- [ ] 'restore this version' button has disappeared from the history snapshot page
- [ ] Website reloads after zooming in and out
- [x] [[windows] Pasting an image from tab↔tab (or browser chrome↔edge) causes a crash](https://github.com/tldraw/tldraw/issues/2437)
- [x] [Mobile: hitarea for rotation gets "lost" after initial interaction](https://github.com/tldraw/tldraw/issues/2455)
- [x] [macos safari] staging.tldraw.com does not load
- [x] [[Android] First 'copy as' is slow](https://github.com/tldraw/tldraw/issues/2433)
- [x] [Safari] Can't open examples.tldraw.com "This operation couldn't be completed. No space left on device"
- [x] [macos Chrome, Safari] cmd+V doesn't work
- [ ] Mobile Android: Text escapes box bounds

## [Release 2023-12-19](https://github.com/orgs/tldraw/projects/30)

- [x] [Left-clicking your selected shape doesn't close context menu](https://github.com/tldraw/tldraw/issues/2357)
- [ ] Page names are cut off in read-only rooms
- [ ] validation error on image upload crashes application
- [x] [Can select shapes by clicking their text label when context menu is open](https://github.com/tldraw/tldraw/issues/2351)
- [x] [The QR code / Share menu link should link to the user's current viewport?](https://github.com/tldraw/brivate/issues/3275)
- [x] [No background on exit pen mode (also icon gap too small)](https://github.com/tldraw/tldraw/issues/2348)
- [x] [firefox] drag-selecting over a tool selects the tool
- [x] [Can't see my own initial in the people menu](https://github.com/tldraw/brivate/issues/3272)
- [ ] Selection group parented by frame when many shapes are out of its bounds
- [x] [Touch: Can resize image shapes by dragging edges](https://github.com/tldraw/tldraw/issues/2349)
- [x] [[macos chrome + ff] Keybindings stop working after clicking the delete button in the toolbar](https://github.com/tldraw/tldraw/issues/2353)
- [ ] Opening staging today in a couple of rarely-used browsers i saw 'can not load assets, try refreshing' which went away after a refresh
- [ ] arrows ignoring some parts of highlighter shape

## [Release 2023-12-12](https://github.com/orgs/tldraw/projects/29)

- [x] [Touch: You shouldn't be able to resize an image from its edge](https://github.com/tldraw/tldraw/issues/2311)
- [x] [No feedback for long-running actions](https://github.com/tldraw/tldraw/issues/2313)
- [x] [Edges of thin shapes should be draggable while cropping](https://github.com/tldraw/tldraw/issues/2314)
- [x] [Can't move selected shapes that are behind a locked shape](https://github.com/tldraw/tldraw/issues/2315)
- [x] [Can't move selected shapes in front of a locked shape by dragging within their bounds](https://github.com/tldraw/tldraw/issues/2316)

## [Release 2023-12-05](https://github.com/orgs/tldraw/projects/27)

- [ ] text label font sizes are different than text shape sizes
- [x] [small spacing in exit pen mode, and back to content buttons?](https://github.com/tldraw/tldraw/issues/2285)
- [x] [we should show an error toast when putContent fails due to schema mismatch (or anything)](https://github.com/tldraw/tldraw/issues/2286)
- [x] [Moving an enclosed rectangle with a bound arrow outside of its enclosing box makes the arrow go weird](https://github.com/tldraw/tldraw/issues/2287)
- [x] [[ipad] first touch on canvas after picking a tool sometimes does nothing](https://github.com/tldraw/tldraw/issues/2288)
- [ ] Arrows pointing to frames weirdly jump when moving the frame
- [ ] Arrows probably shouldn't snap to the middle of frames (or maybe anything bigger than a certain size?). It feels janky
- [x] [Toggling "exactness" with cmd when drawing arrows janks up the start of the arrow](https://github.com/tldraw/tldraw/issues/2289)
- [ ] What if things only bound to the center automatically if you put your cursor near the center
- [x] ['Move to new page' page naming is broken](https://github.com/tldraw/tldraw/issues/2294)
- [ ] When an 'arrowed' frame overlaps the edge of the frame, the arrow goes mini
- [x] ['undo' and 'redo' should refocus the viewport on selected shapes if they are not contained by the screen](https://github.com/tldraw/tldraw/issues/2290)
- [x] [jumpy arrows (sometimes? over multiplayer?) when rotating grouped shapes](https://github.com/tldraw/tldraw/issues/2291)

## [Release 2013-11-14](https://github.com/orgs/tldraw/projects/26)

- [x] [ux] Show a toast when a too-big image is loaded
- [ ] Migrate embed shapes from Excalidraw to tldraw
- [ ] Drawing an arrow inside of a shape binds it to the shape at its center
- [x] [Touch: You shouldn't be able to resize an image by its edge](https://github.com/tldraw/tldraw/issues/2338)
- [ ] My avatar doesn't show my initial
- [ ] Uploading an image makes me zoom out, and the image is massive
- [ ] In multiplayer rooms, images should be rescaled before uploading (we should try to avoid big images on the canvas)
- [ ] Occassional render artifacts when moving image (android, local room)
- [ ] Editor is frozen while you wait for an image to get added to local room
- [x] [ux] Snapping, prioritize shape snaps over grid snaps?
- [ ] Bookmark shape indicator
- [ ] Counter-scale bookmark hyperlink
- [x] [ux] No immediate feedback when adding an image to a shared project
- [ ] No feedback when exporting
- [x] [[Safari] Console error about `device-width`](https://github.com/tldraw/tldraw/issues/2216)
- [x] [feature] Reset image size / scale

## [Release 2023-11-07](https://github.com/orgs/tldraw/projects/25)

- [x] [Indicators out of alignment on vscode plugin](https://github.com/tldraw/tldraw/issues/2154)
- [x] [Text in geo shapes is not centred](https://github.com/tldraw/tldraw/issues/2156)
- [x] [frame labels slow to update pos on rotate](https://github.com/tldraw/tldraw/issues/2157)
- [x] [Can't start a selection box from a locked shape](https://github.com/tldraw/tldraw/issues/2158)
- [x] [[Firefox] Scrollbar for vertical alignment](https://github.com/tldraw/tldraw/issues/2159)
- [x] [[people menu] text alignment is out of sync between your user name and other people's names](https://github.com/tldraw/brivate/issues/3158)
- [x] [Pasting a link shows nothing until whole fetch has finished](https://github.com/tldraw/tldraw/issues/2163)
- [x] [Pinch zooming on trackpad can zoom in/out of wrong place](https://github.com/tldraw/tldraw/issues/2165)
- [x] [Validation error](https://github.com/tldraw/tldraw/issues/2166)
- [x] [Cursor chat: It shouldn't show spelling errors?](https://github.com/tldraw/brivate/issues/3164)
- [ ] put icons back in public folder for one release
- [x] [[UX] clicking 'share' from a non-shared room should land you on the new page with the QR code already open](https://github.com/tldraw/brivate/issues/3159)
- [ ] emojis disappear at certain zoom levels
- [x] [[iphone mini] UI gets cut at the bottom](https://github.com/tldraw/brivate/issues/3161)
- [x] [[android] room taking a while to come back online after reopening phone](https://github.com/tldraw/brivate/issues/3160)
- [x] [Trackpad swiping with two fingers left/right navigates back/forwards](https://github.com/tldraw/tldraw/issues/2155)
- [x] [[Firefox] New lines are not visible in selections](https://github.com/tldraw/tldraw/issues/2153)
- [x] [Shotgun arrows with cloud shapes](https://github.com/tldraw/tldraw/issues/2160)
- [x] [[ux] if image upload fails we don't seem to give any feedback](https://github.com/tldraw/tldraw/issues/2161)
- [x] [Double tapping zoom in/out should zoom two stages](https://github.com/tldraw/tldraw/issues/2162)
- [x] [[PWA Android Chrome] can't install](https://github.com/tldraw/brivate/issues/3162)
- [x] [PWA] Can't use offline
- [x] [No feedback when uploading an image](https://github.com/tldraw/tldraw/issues/2164)
- [x] [Cursor chat: Text wobbles as you type](https://github.com/tldraw/brivate/issues/3163)
- [x] [Error when opening the context menu for the first time](https://github.com/tldraw/tldraw/issues/2170)
- [ ] failed deploys should send a link to the action's output

## [Release 31.10.23](https://github.com/orgs/tldraw/projects/24)

- [ ] Can't paste or drop images
- [x] [[design] People menu spacing](https://github.com/tldraw/brivate/issues/3123)
- [x] [Can't share local project with an image asset](https://github.com/tldraw/brivate/issues/3127)
- [x] [[android] Text label of geo shape moves in jumps](https://github.com/tldraw/tldraw/issues/2131)

## [Release 17-10-2023](https://github.com/orgs/tldraw/projects/23)

- [x] [iPad: Can't long-press to open context menu](https://github.com/tldraw/tldraw/issues/2087)
- [x] [You can ungroup an arrow by bind / unbinding it](https://github.com/tldraw/tldraw/issues/2088)
- [x] [Edit link dialog prevents mouse events from working correctly](https://github.com/tldraw/tldraw/issues/2085)
- [x] [Windows] People menu with lots of people gets unsightly scrollbar
- [x] [You should be able to group an arrow with a shape that it binds to](https://github.com/tldraw/tldraw/issues/2089)
- [x] [Android: Crash when exporting as PNG. Works fine on iOS](https://github.com/tldraw/tldraw/issues/2090)
- [x] [Cropped images overlap outline](https://github.com/tldraw/tldraw/issues/2080)
- [x] [Cloud is extra cloudy](https://github.com/tldraw/tldraw/issues/2084)
- [x] [name file exports with the date/time](https://github.com/tldraw/tldraw/issues/2091)
- [x] [Windows, firefox] shadows on UI menus are freaky
- [x] [Windows] "export as" + "copy as" on frame label doesn't work
- [x] [iOS: Big images not uploading when using the image tool in a local room](https://github.com/tldraw/tldraw/issues/2093)
- [ ] Bouncing shape label when bottom-aligned
- [ ] Firefox Touch: Can't open arrowhead dropdown
- [x] [Frame label truncation at different zoom levels is incosistent](https://github.com/tldraw/tldraw/issues/2094)

## [Release 10-10-2023](https://github.com/orgs/tldraw/projects/22)

- [x] [Palm hits still firing before pen](https://github.com/tldraw/tldraw/issues/2048)
- [x] [Service worker shouldn't show offline room on multiplayer routes](https://github.com/tldraw/tldraw/issues/2047)
- [x] [ipad] tapping on canvas when menus are open doesn't close them
- [x] [ipad] zoom/rotate bug
- [x] [android] can't dismiss any menus by tapping on canvas
- [x] [Distribute keyboard shortcuts not working](https://github.com/tldraw/tldraw/issues/2054)
- [x] [Group border disappears after unlocking](https://github.com/tldraw/tldraw/issues/2049)
- [x] [Google maps share links don't work for embeds](https://github.com/tldraw/tldraw/issues/2050)
- [x] [Ungrouping a group with a locked shape in the group deletes the locked shape](https://github.com/tldraw/tldraw/issues/2045)
- [x] [Pressing enter in a geo shape inserts a newline but doesn't cause the shape to grow](https://github.com/tldraw/tldraw/issues/2046)
- [x] [Erasing inside of a frame or group can produce wrong opacities](https://github.com/tldraw/tldraw/issues/2051)
- [x] [Eraser tool should not lower the opacity of locked shapes](https://github.com/tldraw/tldraw/issues/2058)
- [ ] uploading big images crashes the application
- [ ] Can't snap arrows to straight lines
- [x] [Snapshot link doesn't capture the camera position?](https://github.com/tldraw/tldraw/issues/2052)

## [Release 2023-10-03](https://github.com/orgs/tldraw/projects/21)

- [ ] Image resizing of small images exceeds bounds of shape
- [x] [Arrow intersects only some edges of the x box shape (and checkbox as well)](https://github.com/tldraw/tldraw/issues/1991)
- [ ] Closed draw shapes without fills may be erased by clicking in the middle of the shape
- [x] [Minified react error in the console](https://github.com/tldraw/tldraw/issues/2001)
- [x] [Grouping shapes may change the opacity of shapes in the group](https://github.com/tldraw/tldraw/issues/1992)
- [x] [[Chrome] Changing frame's opacity blurs the header text (also changes letter spacing?)](https://github.com/tldraw/tldraw/issues/1993)
- [x] [Opacity of prior siblings applies to later shapes in frames/groups](https://github.com/tldraw/tldraw/issues/1994)
- [x] [[Chrome] Dotted draw shape rendering issue when zoomed out](https://github.com/tldraw/tldraw/issues/1995)
- [x] [Cloud shape bounds can be wrong](https://github.com/tldraw/tldraw/issues/1996)
- [x] [Geo shapes (maybe others) that contain text no longer grow along the y axis when text overflows](https://github.com/tldraw/tldraw/issues/1998)
- [x] [`NaN` issue when creating an arrow](https://github.com/tldraw/tldraw/issues/2005)
- [x] [Shape sizing is messed up at some browser zoom levels.](https://github.com/tldraw/tldraw/issues/2007)

## [Release 2023-09-05](https://github.com/orgs/tldraw/projects/19)

- [x] [[android, chrome] last draw shape is deleted when panning with style toolbar open](https://github.com/tldraw/tldraw/issues/1893)
- [x] [iPad] Can't exit pen mode
- [ ] When editing an embed, any click will stop editing
- [ ] Arrows visible within the shape even when connected to an object
- [ ] Can't right click locked shapes
- [ ] Choosing a photo shows video options as well
- [x] [Lines are draggable via their 'background'](https://github.com/tldraw/tldraw/issues/1914)
- [x] [QR code not working in share menu](https://github.com/tldraw/brivate/issues/2781)
- [x] [Can't interact with controls on editing video](https://github.com/tldraw/tldraw/issues/1908)
- [x] [nested things in frames aren't clipped correctly in some cases?](https://github.com/tldraw/tldraw/issues/1933)
- [x] [Line handles not touching indicator for draw style lines](https://github.com/tldraw/brivate/issues/2876)
- [x] [Hard to delete highlighter dot with eraser](https://github.com/tldraw/tldraw/issues/1901)
- [x] [can't click frame labels](https://github.com/tldraw/tldraw/issues/1890)
- [x] [multiplayer] updates get slow when there are a bunch of people working at once
- [x] [[Firefox] Selection indicator changes a bit after some time](https://github.com/tldraw/brivate/issues/2736)
- [x] [Can't select single item from selection group](https://github.com/tldraw/tldraw/issues/1906)
- [x] [Arrows 'snap' if you hold the ctrl / cmd key](https://github.com/tldraw/tldraw/issues/1892)
- [x] [Line shapes snap to an imaginary inside box on geo shapes](https://github.com/tldraw/tldraw/issues/1896)
- [x] [Curved arrows penetrating shapes](https://github.com/tldraw/tldraw/issues/1900)
- [x] [Lines not snapping to the left side of geo shapes](https://github.com/tldraw/tldraw/issues/1897)
- [x] [iPad] text selection on notes flickery and unresponsive
- [x] [windows, chrome and firefox] Uploading very big images crashes the application
- [x] [Position changes when inserting some shapes](https://github.com/tldraw/brivate/issues/2737)
- [x] [Should not be able to select on pointer up over the label of a geo shape without label text](https://github.com/tldraw/tldraw/issues/1907)
- [x] [on opening a page for the first time we should center on the content](https://github.com/tldraw/tldraw/issues/1918)
- [ ] Still forcing editing shapes to be on screen after a pan / zoom
- [x] [Pasting image from clipboard into a frame pastes in wrong place](https://github.com/tldraw/tldraw/issues/1857)
- [x] [Can't hover the x lines on an x box shape](https://github.com/tldraw/tldraw/issues/1899)
- [ ] Opening a multiplayer project that I've never seen before should select the hand tool by default
- [x] [iPad] canvas seems to ignore some/many inputs from keyboard trackpad
- [x] [windoes, chrome and firefox] Tooltip obscured beneath pointer when hovering over tools.
- [x] [Draw/highlighter shape can lose selection when dragging it](https://github.com/tldraw/tldraw/issues/1902)
- [ ] Cannot drag images from other browser tabs
- [x] [iPad] undo/redo options are missing when the eraser is selected
- [x] [Error when shift-clicking to draw lines](https://github.com/tldraw/tldraw/issues/1913)
- [x] [Select all on arrow labels after blurring](https://github.com/tldraw/tldraw/issues/1928)
- [ ] Can't right click selection
- [x] [Touch: Can't right click a locked arrow or locked text](https://github.com/tldraw/tldraw/issues/1967)
- [x] [Clicking inside a frame while the label is being edited should cancel edit mode](https://github.com/tldraw/tldraw/issues/1965)
- [x] [[Firefox] Cursor blinks when you hold spacebar](https://github.com/tldraw/tldraw/issues/1926)
- [x] [Highlighter shapes can't be selected by clicking their edge](https://github.com/tldraw/tldraw/issues/1916)
- [x] [[Firefox] touch doesn't work with UI popups](https://github.com/tldraw/tldraw/issues/1921)
- [x] [Lines vibrate when rotated 90 degrees](https://github.com/tldraw/tldraw/issues/1911)
- [x] [Text label is offset from shape with some geo shapes](https://github.com/tldraw/tldraw/issues/1924)
- [ ] Minimap not responding correctly... sometimes? Zoom dependent?
- [ ] Highlighter flickers?
- [ ] Android: Text label outside geo shapes
- [x] [Text wrapping different between mobile and desktop](https://github.com/tldraw/tldraw/issues/1978)
- [x] [Firefox, Mac] Weird clipping of frames
- [x] [Arrows extend inside the x box shape, but only on some sides](https://github.com/tldraw/tldraw/issues/1931)
- [ ] When text is selected & browser is fullscreen, pressing escape exits full screen as well as unfocussing text
- [x] [Firefox, Max] Text is quite blurry when zoomed in completely
- [x] [Touch: When style menu is open, can't brush on canvas](https://github.com/tldraw/tldraw/issues/1970)
- [x] [You can open the style menu even when it's 'disabled'](https://github.com/tldraw/tldraw/issues/1982)
- [x] [Touch: Can see the indicator of shape after drawing](https://github.com/tldraw/tldraw/issues/1984)
- [x] [[Android] Labels bounce when resizing](https://github.com/tldraw/tldraw/issues/1987)

## [Release 2023-07-11](https://github.com/orgs/tldraw/projects/18)

- [x] [Missing tooltip translation key for cloud shape?](https://github.com/tldraw/tldraw/issues/1727)
- [ ] shape culling not working on firefox windows

## [Release 2023-07-04](https://github.com/orgs/tldraw/projects/16)

- [ ] When typing the selection indicator in multiplayer rooms only shows around the first character
- [x] [ipad] when drawing in pen mode, pressing with a finger draws a small dot
- [x] [[mobile layout] You can open the style menu when using laser tool](https://github.com/tldraw/tldraw/issues/1702)
- [x] [ipad] first interaction after selecting draw/eraser tool with pen doesn't work
- [x] [After drawing a text shape rectangle the cursor remains as a crosshair](https://github.com/tldraw/tldraw/issues/1699)
- [ ] Checkbox shape interactions sometimes don't work
- [ ] Firefox coarse pointer issue
- [ ] the highlighter tool should not have a 'lock' option since it is locked by default
- [ ] if you draw a frame around some existing elements it should 'capture' them?

## [Release 2023-06-27](https://github.com/orgs/tldraw/projects/15)

- [ ] Disable spell check in cursor chat
- [ ] Crash while rotating

## [Release 2023-06-13](https://github.com/orgs/tldraw/projects/12)

- [ ] Embed validation error
- [ ] Tools panel is hidden behind the address bar on iPhone
- [x] [Sync issues with shared projects](https://github.com/tldraw/tldraw/issues/1576)

## [Release 2023-06-06](https://github.com/orgs/tldraw/projects/9)

- [x] [Issue with dragging images from other browsers](https://github.com/tldraw/brivate/issues/2004)
- [ ] Highlighter shape gets way bigger when you export it
- [ ] Double-clicking on firefox changes the cursor to pointer
- [ ] Apple pencil should have more streamlining for highlighter
- [ ] Egyptian hieroglyphics not rendering their outline correctly
- [x] [Cannot long-press to unlock a locked shape on ipad](https://github.com/tldraw/tldraw/issues/1534)
- [x] [Make viewport following not undoable](https://github.com/tldraw/tldraw/issues/1532)
- [ ] Default not selected automatically for reduce motion preference
- [ ] When an exported image is too big we don't provide any useful feedback
- [ ] Default not selected automatically for dark mode preference
- [x] [Crash when dragging unusual arrows](https://github.com/tldraw/tldraw/issues/1533)
- [ ] Moving the viewport when editing a shape is a bad experience
- [ ] Deselect on pressing escape when in full screen
- [ ] Select yellow as default color for highlighter (instead of black)
- [ ] Add black color to highlighter (or disable option)
- [ ] "Lock / Unlock" could say "Lock" / "Unlock"
- [ ] Drag to select multiple shapes > press shift > drag to select one of the shapes should deselect it from the group

## [Release 2023-05-25](https://github.com/orgs/tldraw/projects/7)

- [ ] Pasting text on iPad does not work
- [x] [`g` keyboard shortcut still work in readonly rooms](https://github.com/tldraw/brivate/issues/1935)
- [ ] Permanent laser sticks when you leave a tab while lasering
- [ ] Tool Lock button shouldn't be visible for Laser Pointer
- [ ] Crash on windows related to maintenance mode
- [ ] Can't open page dropdown menu
- [ ] double click name on ipad doesn't edit name
- [ ] show following button always when hover is not available
- [x] [name text grows when editing on iphone](https://github.com/tldraw/tldraw/issues/1469)
- [ ] Double tap person to follow not working on ipad
- [ ] Add a "copy url" button to the leave shared room dialog?
- [ ] Add sticky notes vertical alignment?
- [x] ["Copy snapshot link" button closes the Share Menu when in a snapshot room](https://github.com/tldraw/brivate/issues/1940)
- [x] [Improve Copy snapshot link UX (add a spinner while we are creating the snapshot)](https://github.com/tldraw/brivate/issues/1939)
- [ ] Change wording of "Share this project" to "Fork this project" in Snapshot Share Menu
- [ ] Improve icon of "Save this project" in Snapshot Share Menu
- [x] [allow laser pointer in readonly/snapshot rooms](https://github.com/tldraw/brivate/issues/1936)
- [x] [Laser Pointer tool isn't listed in keyboard shortcuts](https://github.com/tldraw/tldraw/issues/1465)
- [x] [Firefox: Preferences don't persist across tabs until refresh](https://github.com/tldraw/tldraw/issues/1464)
- [ ] Viewport-following a person with a different screen refresh rate causes a wobble
- [x] [Snapshots url does not update if you copy it twice (it should)](https://github.com/tldraw/brivate/issues/1942)
- [ ] Android: People Menu border off-balance
- [x] [In snapshot rooms (and possibly also readonly rooms) the the automatically switches from select tool to hand tool](https://github.com/tldraw/brivate/issues/1950)
