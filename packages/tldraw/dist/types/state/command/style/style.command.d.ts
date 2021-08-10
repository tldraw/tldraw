import type { ShapeStyles } from '../../../shape';
import type { Command, Data } from '../../state-types';
export declare function style(data: Data, ids: string[], changes: Partial<ShapeStyles>): Command;
