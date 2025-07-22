import { ComparisonOperator } from "aws-cdk-lib/aws-cloudwatch";
import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export interface CustomThreshold extends CustomAlarmThreshold {
    readonly threshold: number;
    readonly comparisonOperator: ComparisonOperator;
    readonly dedupeString?: string;
    readonly additionalDescription?: string;
}
export declare class CustomAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addCustomAlarm(metric: MetricWithAlarmSupport, alarmNameSuffix: string, disambiguator: string, props: CustomThreshold): import("../../alarm").AlarmWithAnnotation;
}
