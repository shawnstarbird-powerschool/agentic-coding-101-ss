import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export declare enum CapacityType {
    READ = "Read",
    WRITE = "Write"
}
export interface ConsumedCapacityThreshold extends CustomAlarmThreshold {
    readonly maxConsumedCapacityUnits: number;
}
export interface ThrottledEventsThreshold extends CustomAlarmThreshold {
    readonly maxThrottledEventsThreshold: number;
}
export declare class DynamoAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addConsumedCapacityAlarm(metric: MetricWithAlarmSupport, capacityType: CapacityType, props: ConsumedCapacityThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addThrottledEventsAlarm(metric: MetricWithAlarmSupport, capacityType: CapacityType, props: ThrottledEventsThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
