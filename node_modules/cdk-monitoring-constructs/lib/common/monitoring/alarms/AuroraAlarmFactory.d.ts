import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface HighServerlessDatabaseCapacityThreshold extends CustomAlarmThreshold {
    readonly maxServerlessDatabaseCapacity: number;
}
export declare class AuroraAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addMaxServerlessDatabaseCapacity(metric: MetricWithAlarmSupport, props: HighServerlessDatabaseCapacityThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
