import { Duration } from "aws-cdk-lib";
import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricStatistic, MetricWithAlarmSupport } from "../../metric";
export declare enum LatencyType {
    P50 = "P50",
    P70 = "P70",
    P90 = "P90",
    P95 = "P95",
    P99 = "P99",
    P999 = "P999",
    P9999 = "P9999",
    P100 = "P100",
    TM50 = "TM50",
    TM70 = "TM70",
    TM90 = "TM90",
    TM95 = "TM95",
    TM99 = "TM99",
    TM999 = "TM999",
    TM9999 = "TM9999",
    TM95_TOP = "TM(95%:100%)",
    TM99_TOP = "TM(99%:100%)",
    TM999_TOP = "TM(99.9%:100%)",
    TM9999_TOP = "TM(99.99%:100%)",
    AVERAGE = "Average",
    MAX = "Maximum"
}
export declare function getLatencyTypeStatistic(latencyType: LatencyType): MetricStatistic.P50 | MetricStatistic.P70 | MetricStatistic.P90 | MetricStatistic.P95 | MetricStatistic.P99 | MetricStatistic.P999 | MetricStatistic.P9999 | MetricStatistic.P100 | MetricStatistic.TM50 | MetricStatistic.TM70 | MetricStatistic.TM90 | MetricStatistic.TM95 | MetricStatistic.TM99 | MetricStatistic.TM999 | MetricStatistic.TM9999 | MetricStatistic.TM95_TOP | MetricStatistic.TM99_TOP | MetricStatistic.TM999_TOP | MetricStatistic.TM9999_TOP | MetricStatistic.MAX | MetricStatistic.AVERAGE;
export declare function getLatencyTypeExpressionId(latencyType: LatencyType): string;
export declare function getLatencyTypeLabel(latencyType: LatencyType): string;
export interface LatencyThreshold extends CustomAlarmThreshold {
    readonly maxLatency: Duration;
}
export interface DurationThreshold extends CustomAlarmThreshold {
    readonly maxDuration: Duration;
}
export declare class LatencyAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addLatencyAlarm(metric: MetricWithAlarmSupport, latencyType: LatencyType, props: LatencyThreshold, disambiguator?: string, additionalAlarmNameSuffix?: string | undefined): import("../../alarm").AlarmWithAnnotation;
    addIntegrationLatencyAlarm(metric: MetricWithAlarmSupport, latencyType: LatencyType, props: LatencyThreshold, disambiguator?: string, additionalAlarmNameSuffix?: string | undefined): import("../../alarm").AlarmWithAnnotation;
    addDurationAlarm(metric: MetricWithAlarmSupport, latencyType: LatencyType, props: DurationThreshold, disambiguator?: string, additionalAlarmNameSuffix?: string | undefined): import("../../alarm").AlarmWithAnnotation;
    addJvmGarbageCollectionDurationAlarm(metric: MetricWithAlarmSupport, latencyType: LatencyType, props: DurationThreshold, disambiguator?: string, additionalAlarmNameSuffix?: string | undefined): import("../../alarm").AlarmWithAnnotation;
}
