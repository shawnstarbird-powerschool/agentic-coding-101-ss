import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface LowTpsThreshold extends CustomAlarmThreshold {
    readonly minTps: number;
}
export interface HighTpsThreshold extends CustomAlarmThreshold {
    readonly maxTps: number;
}
export declare class TpsAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addMinTpsAlarm(metric: MetricWithAlarmSupport, props: LowTpsThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxTpsAlarm(metric: MetricWithAlarmSupport, props: HighTpsThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
