### Image Shape
- scale it
- transform the origin point (new indicator, dot in middle of the rectangle to move background-position)
- Data URLs
- user pastes an image from clipboard
- drags/drops an image
- shape properties
    object-fit
    background-origin, background-repeat
    background-color (transparent, a color, a background-image)
- add it to the toolbar with an icon
- aspect-ratio locked rectangle
- size, we’d need to load the image before knowing the dimensions


----
#### Demo
Some simple demos, go to google, search for say 'dresses', right click one of them, copy, right click in TLDraw, paste, scale it up
It'll either look awful (object-fit:cover) or fine (object-fit: contain)

put an image on your clipboard from google image search or file from desktop, implement paste

----

My hope was that you wanted to develop an image component, I'd like you to do it in my world and then port to main (or vice versa)
In my world I already have APIs for which to upload the image to the central server (PLM)
you need to scale it, need to be able to transform the origin point (new indicator, dot in middle of the rectangle to move background-position
For all I care the POC could have a hardcoded data uri
I'm more interested in the shape than how the data got there
create an ImageShape, on the shape have a url,

For pass one simply create a shape in the dictionary, set the url to a data url, it'll automatically be serialized anyways

It's just part of the document, like the color of a shape is
It's a string
I'll later override it to be Uri | DbImageRef or something
where it'll be { id: 'C12345' }
Company is centric, our IDs start with C
which is some 10 meg+ image in a database mind you

I'll ask my image server, on the fly, for the rasterized version of said image to draw in the actual final react component on the whiteboard
All of this is not your problem, but any solution that's general for tldraw should easily support such real-world cases


Along with supporting user pastes an image from clipboard (easy to get the data uri string for that, can show you how, I already do it), or drags/drops an image in (same-ish code, but less simple)
I have support for all of this stuff already in my application so I know these things intimately
The part I most care about is a new Shape, hooking it up to transform/translate (it's just a rect, reuse the same util)
New indicator dot/interaction to change background origin

New shape properties for this thing that should match up with CSS ones
object-fit
background-origin, background-repeat
background-color (transparent, a color, a background-image)

Like in my system I have customers with actual background images
so you'd easily have an image, but on another image
top image is transparent PNG

If you just support standard CSS properties of above I think that covers <img> in html
srcSet would be nice but not exactly fun or easy

So I would punt on that

And then add it to the toolbar with an icon, and g2g 🙂

Some simple demos, go to google, search for say 'dresses', right click one of them, copy, right click in TLDraw, paste, scale it up
It'll either look awful (object-fit:cover) or fine (object-fit: contain)


Do the same thing with a material swatch and you will absolutely want object-fit:cover

I think it's easy to handle the paste version up front than doing all the gui for doing it through a file input and the like
GUI Interactions can be time consuming

You need a hidden input, a way to trigger it, usually an upload button, etc

Vs just checking the clipboard for an image

Here's the code needed:
```
document.onpaste = this.onDocumentPaste

 @action onDocumentPaste = (e: ClipboardEvent) => {
    const {flexLayout: {activeTab, activeCatalogRoot}} = globalStores

    const items = e.clipboardData.items

    const imageFiles = _.map(items, item => {
      if (item.kind === 'file') {
        return item.getAsFile()
      }
    }).filter(_.identity)

    activeTab?.component !== 'whiteboard' && activeCatalogRoot && activeCatalogRoot.catalog.onPasteImages(imageFiles)
  }
```
obviously some of this is totally app specific
but the key thing is hook to document, check data, get them out as files

```
 readFileImages = async (files: FileList): Promise<Array<FileImage>> => {
    DEBUG_IMAGE_SERVICE && console.debug(`readFileImages`, {files})
    return await Promise.all(
      _.map(files, file => {
        return new Promise<FileImage>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve({image: e.target.result as DataImg, file})
          reader.readAsDataURL(file)
        })
      }))
  }
export type DataPng = string
export type DataJpg = string
export type DataImg = DataJpg | DataPng | string

export interface IHasFile {
  file: File
}

export interface FileImage extends IHasFile {
  image: DataImg
}

interface ImageObject extends IHasFile {
  position: number
  image: DataImg
  isLocal: true
}
```
That's basically everything interesting
That's just to me the happy path, put an image on your clipboard from google image search or file from desktop, implement paste
I think it's pretty easy up until the new indicator interaction


