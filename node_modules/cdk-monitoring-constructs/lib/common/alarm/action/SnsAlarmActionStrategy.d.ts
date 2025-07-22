import { ITopic } from "aws-cdk-lib/aws-sns";
import { AlarmActionStrategyProps, IAlarmActionStrategy } from "./IAlarmActionStrategy";
export declare function notifySns(onAlarmTopic: ITopic, onOkTopic?: ITopic, onInsufficientDataTopic?: ITopic): IAlarmActionStrategy;
export interface SnsAlarmActionStrategyProps {
    /**
     * Target topic used when the alarm is triggered.
     */
    readonly onAlarmTopic: ITopic;
    /**
     * Optional target topic for when the alarm goes into the OK state.
     *
     * @default - no notification sent
     */
    readonly onOkTopic?: ITopic;
    /**
     * Optional target topic for when the alarm goes into the INSUFFICIENT_DATA state.
     *
     * @default - no notification sent
     */
    readonly onInsufficientDataTopic?: ITopic;
}
/**
 * Alarm action strategy that sends a notification to the specified SNS topic.
 */
export declare class SnsAlarmActionStrategy implements IAlarmActionStrategy {
    protected readonly onAlarmTopic: ITopic;
    protected readonly onOkTopic?: ITopic;
    protected readonly onInsufficientDataTopic?: ITopic;
    constructor(props: SnsAlarmActionStrategyProps);
    addAlarmActions(props: AlarmActionStrategyProps): void;
}
