import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { BaseMonitoringProps, ChangeInSecretCountThreshold, MaxSecretCountThreshold, MetricWithAlarmSupport, MinSecretCountThreshold, Monitoring, MonitoringScope, SecretsManagerAlarmFactory } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface SecretsManagerMonitoringOptions extends BaseMonitoringProps {
    readonly addMinNumberSecretsAlarm?: Record<string, MinSecretCountThreshold>;
    readonly addMaxNumberSecretsAlarm?: Record<string, MaxSecretCountThreshold>;
    readonly addChangeInSecretsAlarm?: Record<string, ChangeInSecretCountThreshold>;
}
export interface SecretsManagerMonitoringProps extends SecretsManagerMonitoringOptions {
}
export declare class SecretsManagerMonitoring extends Monitoring {
    readonly title: string;
    readonly secretsManagerAlarmFactory: SecretsManagerAlarmFactory;
    readonly secretsCountAnnotation: HorizontalAnnotation[];
    readonly secretsCountMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: SecretsManagerMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createSecretsCountWidget(width: number, height: number): GraphWidget;
}
