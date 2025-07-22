import { AlarmActionStrategyProps, IAlarmActionStrategy } from "./IAlarmActionStrategy";
export declare function multipleActions(...actions: IAlarmActionStrategy[]): MultipleAlarmActionStrategy;
export declare function isMultipleAlarmActionStrategy(obj?: any): obj is MultipleAlarmActionStrategy;
/**
 * Alarm action strategy that combines multiple actions in the same order as they were given.
 */
export declare class MultipleAlarmActionStrategy implements IAlarmActionStrategy {
    readonly actions: IAlarmActionStrategy[];
    constructor(actions: IAlarmActionStrategy[]);
    addAlarmActions(props: AlarmActionStrategyProps): void;
    /**
     * Returns list of alarm actions where any nested instances of MultipleAlarmActionStrategy
     * are flattened.
     *
     * @returns flattened list of alarm actions.
     */
    flattenedAlarmActions(): IAlarmActionStrategy[];
    private _flattenedAlarmActions;
}
