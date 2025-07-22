import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface MaxDowntimeThreshold extends CustomAlarmThreshold {
    readonly maxDowntimeInMillis: number;
}
export interface FullRestartCountThreshold extends CustomAlarmThreshold {
    readonly maxFullRestartCount: number;
}
export declare class KinesisDataAnalyticsAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addDowntimeAlarm(metric: MetricWithAlarmSupport, props: MaxDowntimeThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addFullRestartAlarm(metric: MetricWithAlarmSupport, props: FullRestartCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
