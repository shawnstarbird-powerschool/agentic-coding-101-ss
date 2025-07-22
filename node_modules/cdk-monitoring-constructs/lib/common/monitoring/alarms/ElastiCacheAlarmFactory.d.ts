import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface MaxItemsCountThreshold extends CustomAlarmThreshold {
    readonly maxItemsCount: number;
}
export interface MinFreeableMemoryThreshold extends CustomAlarmThreshold {
    readonly minFreeableMemoryInBytes: number;
}
export interface MaxUsedSwapMemoryThreshold extends CustomAlarmThreshold {
    readonly maxUsedSwapMemoryInBytes: number;
}
export declare class ElastiCacheAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addMaxItemsCountAlarm(metric: MetricWithAlarmSupport, props: MaxItemsCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxEvictedItemsCountAlarm(metric: MetricWithAlarmSupport, props: MaxItemsCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMinFreeableMemoryAlarm(metric: MetricWithAlarmSupport, props: MinFreeableMemoryThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxUsedSwapMemoryAlarm(metric: MetricWithAlarmSupport, props: MaxUsedSwapMemoryThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
