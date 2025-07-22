import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { SecretsManagerSecretMetricFactoryProps } from "./SecretsManagerSecretMetricFactory";
import { AlarmFactory, BaseMonitoringProps, DaysSinceUpdateThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface IPublisherConsumer {
    consume(lambdaFunction: IFunction): void;
}
export interface SecretsManagerSecretMonitoringOptions extends BaseMonitoringProps {
    readonly addDaysSinceLastChangeAlarm?: Record<string, DaysSinceUpdateThreshold>;
    readonly addDaysSinceLastRotationAlarm?: Record<string, DaysSinceUpdateThreshold>;
    /**
     * @default - true, if `addDaysSinceLastRotationAlarm` is set, otherwise `false`.
     */
    readonly showLastRotationWidget?: boolean;
    /**
     * Provides access to the underlying metrics publisher Lambda function.
     * This may be useful if you want to monitor the function itself.
     */
    readonly usePublisher?: IPublisherConsumer;
}
/**
 * Monitoring props for Secrets Manager secrets.
 */
export interface SecretsManagerSecretMonitoringProps extends SecretsManagerSecretMetricFactoryProps, SecretsManagerSecretMonitoringOptions {
}
export declare class SecretsManagerSecretMonitoring extends Monitoring {
    readonly title: string;
    readonly showLastRotationWidget: boolean;
    readonly alarmFactory: AlarmFactory;
    readonly daysSinceLastChangeMetric: MetricWithAlarmSupport;
    readonly daysSinceLastChangeAnnotations: HorizontalAnnotation[];
    readonly daysSinceLastRotationMetric: MetricWithAlarmSupport;
    readonly daysSinceLastRotationAnnotations: HorizontalAnnotation[];
    constructor(scope: MonitoringScope, props: SecretsManagerSecretMonitoringProps);
    createDaysSinceLastChangeWidget(): GraphWidget;
    createDaysSinceLastRotationWidget(): GraphWidget;
    createTitleWidget(): MonitoringHeaderWidget;
    widgets(): IWidget[];
    summaryWidgets(): IWidget[];
}
