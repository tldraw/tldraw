export default class MissingRefError extends Error {
    readonly missingRef: string;
    readonly missingSchema: string;
    constructor(baseId: string, ref: string, msg?: string);
}
