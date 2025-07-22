import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export declare enum UsageType {
    P50 = "P50",
    P70 = "P70",
    P90 = "P90",
    P99 = "P99",
    P999 = "P999",
    P9999 = "P9999",
    P100 = "P100",
    AVERAGE = "Average",
    MAX = "Maximum"
}
export interface UsageThreshold extends CustomAlarmThreshold {
    readonly maxUsagePercent: number;
}
export interface MinUsageCountThreshold extends CustomAlarmThreshold {
    readonly minCount: number;
}
export interface MaxUsageCountThreshold extends CustomAlarmThreshold {
    readonly maxCount: number;
}
/**
 * @deprecated Use MaxUsageCountThreshold instead.
 */
export interface UsageCountThreshold extends CustomAlarmThreshold {
    readonly maxUsageCount: number;
}
export declare class UsageAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addMaxCountAlarm(metric: MetricWithAlarmSupport, props: MaxUsageCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMinCountAlarm(percentMetric: MetricWithAlarmSupport, props: MinUsageCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    /**
     * @deprecated Use {@link addMaxCountAlarm} instead.
     */
    addMaxUsageCountAlarm(metric: MetricWithAlarmSupport, props: UsageCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    /**
     * @deprecated Use {@link addMinCountAlarm} instead.
     */
    addMinUsageCountAlarm(percentMetric: MetricWithAlarmSupport, props: MinUsageCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxCpuUsagePercentAlarm(percentMetric: MetricWithAlarmSupport, props: UsageThreshold, disambiguator?: string, usageType?: UsageType, additionalAlarmNameSuffix?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxMasterCpuUsagePercentAlarm(percentMetric: MetricWithAlarmSupport, props: UsageThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxMemoryUsagePercentAlarm(percentMetric: MetricWithAlarmSupport, props: UsageThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMemoryUsagePercentAlarm(percentMetric: MetricWithAlarmSupport, props: UsageThreshold, usageType: UsageType, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxMasterMemoryUsagePercentAlarm(percentMetric: MetricWithAlarmSupport, props: UsageThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxDiskUsagePercentAlarm(percentMetric: MetricWithAlarmSupport, props: UsageThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxHeapMemoryAfterGCUsagePercentAlarm(percentMetric: MetricWithAlarmSupport, props: UsageThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxFileDescriptorPercentAlarm(percentMetric: MetricWithAlarmSupport, props: UsageThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxThreadCountUsageAlarm(percentMetric: MetricWithAlarmSupport, props: UsageCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
