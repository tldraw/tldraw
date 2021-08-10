import type { TLDrawShape } from '../../../shape';
import type { Data, Command } from '../../state-types';
export declare function toggle(data: Data, ids: string[], prop: keyof TLDrawShape): Command;
