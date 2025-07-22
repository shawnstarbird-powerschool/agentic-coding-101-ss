import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface LowMessagesPublishedThreshold extends CustomAlarmThreshold {
    readonly minMessagesPublishedCount: number;
}
export interface HighMessagesPublishedThreshold extends CustomAlarmThreshold {
    readonly maxMessagesPublishedCount: number;
}
export interface NotificationsFailedThreshold extends CustomAlarmThreshold {
    readonly maxNotificationsFailedCount: number;
}
export declare class TopicAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addMinMessagesPublishedAlarm(metric: MetricWithAlarmSupport, props: LowMessagesPublishedThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxMessagesPublishedAlarm(metric: MetricWithAlarmSupport, props: HighMessagesPublishedThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMessageNotificationsFailedAlarm(metric: MetricWithAlarmSupport, props: NotificationsFailedThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
