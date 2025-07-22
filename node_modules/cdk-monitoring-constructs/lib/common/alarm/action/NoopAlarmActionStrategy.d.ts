import { AlarmActionStrategyProps, IAlarmActionStrategy } from "./IAlarmActionStrategy";
export declare function noopAction(): NoopAlarmActionStrategy;
/**
 * Alarm action strategy that does not add any actions.
 */
export declare class NoopAlarmActionStrategy implements IAlarmActionStrategy {
    addAlarmActions(_props: AlarmActionStrategyProps): void;
}
