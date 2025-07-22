import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface MaxIteratorAgeThreshold extends CustomAlarmThreshold {
    readonly maxAgeInMillis: number;
}
export interface RecordsThrottledThreshold extends CustomAlarmThreshold {
    readonly maxRecordsThrottledThreshold: number;
}
export interface FirehoseStreamLimitThreshold extends CustomAlarmThreshold {
    /**
     * Threshold value between [0.0, 1.0) for when the alarm should be triggered.
     */
    readonly safetyThresholdLimit: number;
}
export interface RecordsFailedThreshold extends CustomAlarmThreshold {
    readonly maxRecordsFailedThreshold: number;
}
export declare class KinesisAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addIteratorMaxAgeAlarm(metric: MetricWithAlarmSupport, props: MaxIteratorAgeThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addPutRecordsThrottledAlarm(metric: MetricWithAlarmSupport, props: RecordsThrottledThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addPutRecordsFailedAlarm(metric: MetricWithAlarmSupport, props: RecordsFailedThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addFirehoseStreamExceedSafetyThresholdAlarm(metric: MetricWithAlarmSupport, metricName: string, quotaName: string, props: FirehoseStreamLimitThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addProvisionedReadThroughputExceededAlarm(metric: MetricWithAlarmSupport, props: RecordsThrottledThreshold, disambiguator: string): import("../../alarm").AlarmWithAnnotation;
    addProvisionedWriteThroughputExceededAlarm(metric: MetricWithAlarmSupport, props: RecordsThrottledThreshold, disambiguator: string): import("../../alarm").AlarmWithAnnotation;
}
