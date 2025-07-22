import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface HealthyTaskCountThreshold extends CustomAlarmThreshold {
    readonly minHealthyTasks: number;
}
export interface UnhealthyTaskCountThreshold extends CustomAlarmThreshold {
    readonly maxUnhealthyTasks: number;
}
export interface HealthyTaskPercentThreshold extends CustomAlarmThreshold {
    readonly minHealthyTaskPercent: number;
}
export interface RunningTaskCountThreshold extends CustomAlarmThreshold {
    readonly maxRunningTasks: number;
}
export interface RunningTaskRateThreshold extends CustomAlarmThreshold {
    readonly maxRunningTaskRate: number;
}
export interface MinRunningTaskCountThreshold extends CustomAlarmThreshold {
    readonly minRunningTasks: number;
}
export interface AvailabilityThreshold extends CustomAlarmThreshold {
    readonly minAvailabilityPercent: number;
}
export declare class TaskHealthAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addHealthyTaskCountAlarm(metric: MetricWithAlarmSupport, props: HealthyTaskCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addUnhealthyTaskCountAlarm(metric: MetricWithAlarmSupport, props: UnhealthyTaskCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addHealthyTaskPercentAlarm(metric: MetricWithAlarmSupport, props: HealthyTaskPercentThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addRunningTaskCountAlarm(metric: MetricWithAlarmSupport, props: RunningTaskCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addRunningTaskRateAlarm(metric: MetricWithAlarmSupport, props: RunningTaskRateThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMinRunningTaskCountAlarm(metric: MetricWithAlarmSupport, props: MinRunningTaskCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addAvailabilityAlarm(metric: MetricWithAlarmSupport, props: AvailabilityThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
