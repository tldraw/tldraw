import { TLDrawDocument } from "@tldraw/tldraw";

// This is the content a fresh new .tldr file should have. See App.tsx 
// for how it's used.
const defaultDocument: TLDrawDocument = {
    id: 'doc',
    pages: {
      page: {
        id: 'page',
        name: 'Page 1',
        childIndex: 1,
        shapes: {},
        bindings: {},
      },
    },
    pageStates: {
      page: {
        id: 'page',
        selectedIds: [],
        camera: {
          point: [0, 0],
          zoom: 1,
        },
      },
    },
  };
  export default defaultDocument;
