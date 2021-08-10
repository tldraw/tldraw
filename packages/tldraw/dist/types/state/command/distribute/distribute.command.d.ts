import { DistributeType } from '../../../types';
import type { Data, Command } from '../../state-types';
export declare function distribute(data: Data, ids: string[], type: DistributeType): Command;
