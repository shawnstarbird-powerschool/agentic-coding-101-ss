import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface DaysToExpiryThreshold extends CustomAlarmThreshold {
    readonly minDaysToExpiry: number;
}
export interface MaxAgeThreshold extends CustomAlarmThreshold {
    readonly maxAgeInMillis: number;
}
export interface DaysSinceUpdateThreshold extends CustomAlarmThreshold {
    readonly maxDaysSinceUpdate: number;
}
export declare class AgeAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addDaysToExpiryAlarm(metric: MetricWithAlarmSupport, props: DaysToExpiryThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addIteratorMaxAgeAlarm(metric: MetricWithAlarmSupport, props: MaxAgeThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addDaysSinceUpdateAlarm(metric: MetricWithAlarmSupport, props: DaysSinceUpdateThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
