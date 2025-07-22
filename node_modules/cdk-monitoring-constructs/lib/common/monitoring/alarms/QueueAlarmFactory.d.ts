import { Duration } from "aws-cdk-lib";
import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface MinMessageCountThreshold extends CustomAlarmThreshold {
    readonly minMessageCount: number;
}
export interface MaxMessageCountThreshold extends CustomAlarmThreshold {
    readonly maxMessageCount: number;
}
export interface MaxMessageAgeThreshold extends CustomAlarmThreshold {
    readonly maxAgeInSeconds: number;
}
export interface MaxTimeToDrainThreshold extends CustomAlarmThreshold {
    readonly maxTimeToDrain: Duration;
}
export interface MinIncomingMessagesCountThreshold extends CustomAlarmThreshold {
    readonly minIncomingMessagesCount: number;
}
export interface MaxIncomingMessagesCountThreshold extends CustomAlarmThreshold {
    readonly maxIncomingMessagesCount: number;
}
export declare class QueueAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addMinQueueMessageCountAlarm(metric: MetricWithAlarmSupport, props: MinMessageCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxQueueMessageCountAlarm(metric: MetricWithAlarmSupport, props: MaxMessageCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxQueueMessageAgeAlarm(metric: MetricWithAlarmSupport, props: MaxMessageAgeThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxQueueTimeToDrainMessagesAlarm(metric: MetricWithAlarmSupport, props: MaxTimeToDrainThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMinQueueIncomingMessagesCountAlarm(metric: MetricWithAlarmSupport, props: MinIncomingMessagesCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxQueueIncomingMessagesCountAlarm(metric: MetricWithAlarmSupport, props: MaxIncomingMessagesCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
