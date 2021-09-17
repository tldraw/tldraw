import { useRef, useEffect, useCallback, useState } from "react";
import "./styles.css";
import { TLDraw, Data, TLDrawState, TLDrawDocument } from "@tldraw/tldraw";
import defaultDocument from "./DefaultDocument";

// Declare the global function made available to VS Code Extension webviews.
// TODO: Figure out where this work around declaration should properly go, 
// or find out if there are vscode type declarations we can tie into to have
// the proper typings for this function. 
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();
// This declares the global variable we inject in webpage the extension 
// that stores the initial text content of the .tldr file
// TODO: Figure out where to declare this more by convention
// declare const initialDocument: string;
declare let initialDocument: string;

function postMessage(type:any,text:any = undefined){
  // Notify extension that something has changed. This ends up being called by
  // the history execute/redo/undo commands, so we put this here.
  if (window.self !== window.top) {
    vscode.postMessage({
      type,
      text
    })
  }
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMount = useCallback((tldr: TLDrawState) => {
    containerRef.current?.focus();
  }, []);

  const handleChange = useCallback((tldr: TLDrawState, data:Data, type: string) => {
    // Only synchronize the extension document state on commands. Changes also come
    // from things sessions which generate a lot of change events, for example when
    // the user is creating a draw stroke.
    if(type.search("command:")=== 0){
      postMessage( 'tldraw-updated', JSON.stringify(tldr.document) );
    } 
  }, []);

  // If the initial document is an empty string, we initialize it to the default 
  // document text content
  const document = initialDocument === "" ? defaultDocument : initialDocument;

  return <div ref={containerRef} className="App">
    <TLDraw document={document} onMount={handleMount} onChange={handleChange}/>
  </div>
}
