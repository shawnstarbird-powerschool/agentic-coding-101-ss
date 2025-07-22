import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface MinProcessedBytesThreshold extends CustomAlarmThreshold {
    /**
     * Threshold for the least number of bytes processed
     */
    readonly minProcessedBytes: number;
}
export declare class ThroughputAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addMinProcessedBytesAlarm(metric: MetricWithAlarmSupport, props: MinProcessedBytesThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
