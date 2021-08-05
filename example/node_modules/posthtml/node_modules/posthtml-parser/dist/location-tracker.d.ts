declare type SourceLocation = {
    start: Position;
    end: Position;
};
declare type Position = {
    line: number;
    column: number;
};
declare class LocationTracker {
    private readonly source;
    private lastPosition;
    private lastIndex;
    constructor(source: string);
    getPosition(index: number): Position;
}

export { LocationTracker, Position, SourceLocation };
