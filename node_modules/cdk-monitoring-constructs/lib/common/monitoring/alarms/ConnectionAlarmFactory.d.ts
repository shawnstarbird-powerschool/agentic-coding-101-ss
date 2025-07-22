import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface LowConnectionCountThreshold extends CustomAlarmThreshold {
    readonly minConnectionCount: number;
}
export interface HighConnectionCountThreshold extends CustomAlarmThreshold {
    readonly maxConnectionCount: number;
}
export declare class ConnectionAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addMinConnectionCountAlarm(metric: MetricWithAlarmSupport, props: LowConnectionCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxConnectionCountAlarm(metric: MetricWithAlarmSupport, props: HighConnectionCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
