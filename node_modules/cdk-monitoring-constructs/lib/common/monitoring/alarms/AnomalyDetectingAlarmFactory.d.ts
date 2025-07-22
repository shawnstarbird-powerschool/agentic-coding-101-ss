import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface AnomalyDetectionThreshold extends CustomAlarmThreshold {
    readonly standardDeviationForAlarm: number;
    readonly alarmWhenAboveTheBand: boolean;
    readonly alarmWhenBelowTheBand: boolean;
    readonly additionalDescription?: string;
}
export declare class AnomalyDetectingAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addAlarmWhenOutOfBand(metric: MetricWithAlarmSupport, alarmNameSuffix: string, disambiguator: string, props: AnomalyDetectionThreshold): import("../../alarm").AlarmWithAnnotation;
    private getDefaultDescription;
    private getComparisonOperator;
}
