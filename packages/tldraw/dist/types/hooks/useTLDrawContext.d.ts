import * as React from 'react';
import type { Data } from '../state/state-types';
import type { UseStore } from 'zustand';
import type { TLDrawState } from '../state';
export interface TLDrawContextType {
    tlstate: TLDrawState;
    useSelector: UseStore<Data>;
}
export declare const TLDrawContext: React.Context<TLDrawContextType>;
export declare function useTLDrawContext(): TLDrawContextType;
