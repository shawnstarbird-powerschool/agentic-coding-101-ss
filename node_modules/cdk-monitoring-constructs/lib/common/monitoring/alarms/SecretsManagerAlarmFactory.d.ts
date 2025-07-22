import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface MinSecretCountThreshold extends CustomAlarmThreshold {
    readonly minSecretCount: number;
}
export interface MaxSecretCountThreshold extends CustomAlarmThreshold {
    readonly maxSecretCount: number;
}
export interface ChangeInSecretCountThreshold extends CustomAlarmThreshold {
    readonly requiredSecretCount: number;
    readonly alarmWhenIncreased: boolean;
    readonly alarmWhenDecreased: boolean;
    readonly additionalDescription?: string;
}
export declare class SecretsManagerAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addMinSecretCountAlarm(metric: MetricWithAlarmSupport, props: MinSecretCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addMaxSecretCountAlarm(metric: MetricWithAlarmSupport, props: MaxSecretCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addChangeInSecretCountAlarm(metric: MetricWithAlarmSupport, props: ChangeInSecretCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    private getDefaultDescription;
    private getComparisonOperator;
}
