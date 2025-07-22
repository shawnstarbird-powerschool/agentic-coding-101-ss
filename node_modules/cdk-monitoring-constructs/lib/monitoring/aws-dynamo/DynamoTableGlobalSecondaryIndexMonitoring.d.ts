import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { DynamoTableGlobalSecondaryIndexMetricFactoryProps } from "./DynamoTableGlobalSecondaryIndexMetricFactory";
import { BaseMonitoringProps, DynamoAlarmFactory, MetricWithAlarmSupport, Monitoring, MonitoringScope, ThrottledEventsThreshold } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface DynamoTableGlobalSecondaryIndexMonitoringProps extends DynamoTableGlobalSecondaryIndexMetricFactoryProps, BaseMonitoringProps {
    readonly addReadThrottledEventsCountAlarm?: Record<string, ThrottledEventsThreshold>;
    readonly addWriteThrottledEventsCountAlarm?: Record<string, ThrottledEventsThreshold>;
}
export declare class DynamoTableGlobalSecondaryIndexMonitoring extends Monitoring {
    protected readonly title: string;
    protected readonly tableUrl?: string;
    protected readonly provisionedReadUnitsMetric: MetricWithAlarmSupport;
    protected readonly provisionedWriteUnitsMetric: MetricWithAlarmSupport;
    protected readonly consumedReadUnitsMetric: MetricWithAlarmSupport;
    protected readonly consumedWriteUnitsMetric: MetricWithAlarmSupport;
    protected readonly indexConsumedWriteUnitsMetric: MetricWithAlarmSupport;
    protected readonly readThrottleCountMetric: MetricWithAlarmSupport;
    protected readonly writeThrottleCountMetric: MetricWithAlarmSupport;
    protected readonly indexThrottleCountMetric: MetricWithAlarmSupport;
    protected readonly gsiAlarmFactory: DynamoAlarmFactory;
    protected readonly throttledEventsAnnotations: HorizontalAnnotation[];
    constructor(scope: MonitoringScope, props: DynamoTableGlobalSecondaryIndexMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    protected createTitleWidget(): MonitoringHeaderWidget;
    protected createReadCapacityWidget(width: number, height: number): GraphWidget;
    protected createWriteCapacityWidget(width: number, height: number): GraphWidget;
    protected createThrottlesWidget(width: number, height: number): GraphWidget;
}
