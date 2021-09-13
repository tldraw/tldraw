import { useRef, useEffect, useCallback, useState } from "react";
import "./styles.css";
import { TLDraw, TLDrawState, Data, TLDrawDocument } from "@tldraw/tldraw";

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

// HACK: Look more deeply into how to do this properly.
// vscode/types doesn't include the globally available 'acquireVsCodeApi' function.
// Used this approach to resolve that. 
// https://stackoverflow.com/a/54727230
const vsCodeFunction = Function(`
  // forgive me for my sins
  if (typeof acquireVsCodeApi == 'function') {
    return acquireVsCodeApi();
  } else {
    return undefined;
  }
  `);
const vscode = vsCodeFunction();

function postMessage(type:any,text:any = undefined){
  // Notify extension that something has changed. This ends up being called by
  // the history execute/redo/undo commands, so we put this here.
  //console.log(`"update" (webview <- iframe)`)
  //console.log('post-message');
  
  if (window.self !== window.top) {
    vscode.postMessage({
      type,
      text
    })
  }
}

export default function App() {
  const [initialDocument, setInitialDocument] = useState(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    // const onKeyDown = (event: KeyboardEvent) => {
    //   if(event.key === "s" && event.metaKey=== true){
    //     console.log(event);
    //     postMessage('save');
    //   }
    // };
    // document.addEventListener('keydown', onKeyDown);

    if (window.self !== window.top) {
      window.onmessage = function (e:any) {
        if (e.data.type === 'load') {

          // If the file doesn't parse as JSON initialize it as a new empty file
          // and notify the extension of this new json file content
          // This could caused by the file being empty or a the text malformed JSON
          let json:any = undefined;
          try{
            json = JSON.parse(e.data.text);
          } catch(error){
            console.error(error);
            json = defaultDocument;
            //postMessage( 'update', JSON.stringify(json) );
          }
          setInitialDocument(json);
        }
      }
    }
    return ()=>{
     // document.removeEventListener('keydown', onKeyDown); 
    }
  },[])

  const rTLDrawState = useRef<TLDrawState>();

  const handleMount = useCallback((tldr: TLDrawState) => {
    rTLDrawState.current = tldr;
    containerRef.current?.focus();
  }, []);

  const handleChange = useCallback((tldr: TLDrawState, data:Date, type: string) => {
    if(type.search("command:")=== 0){
      console.log("Action");
      console.log(type);
      postMessage( 'update', JSON.stringify(tldr.document) );
    } else {
      console.log("Change")
      console.log(type);
    }
  }, []);


  return <div ref={containerRef} className="App">
      <div>
        {initialDocument===undefined && vscode !== undefined ? undefined : <TLDraw document={initialDocument} onMount={handleMount} onChange={handleChange} />}
        {/* <TLDraw onMount={handleMount} onChange={handleChange} /> */}
      </div>
    </div>
}
