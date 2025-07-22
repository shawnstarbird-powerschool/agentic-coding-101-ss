import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { DocumentDbMetricFactoryProps } from "./DocumentDbMetricFactory";
import { BaseMonitoringProps, MetricWithAlarmSupport, Monitoring, MonitoringScope, UsageAlarmFactory, UsageThreshold } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface DocumentDbMonitoringOptions extends BaseMonitoringProps {
    readonly addCpuUsageAlarm?: Record<string, UsageThreshold>;
}
export interface DocumentDbMonitoringProps extends DocumentDbMetricFactoryProps, DocumentDbMonitoringOptions {
}
export declare class DocumentDbMonitoring extends Monitoring {
    readonly title: string;
    readonly url?: string;
    readonly usageAlarmFactory: UsageAlarmFactory;
    readonly usageAnnotations: HorizontalAnnotation[];
    readonly cpuUsageMetric: MetricWithAlarmSupport;
    readonly readLatencyMetric: MetricWithAlarmSupport;
    readonly writeLatencyMetric: MetricWithAlarmSupport;
    readonly connectionsMetric: MetricWithAlarmSupport;
    readonly cursorsMetric: MetricWithAlarmSupport;
    readonly transactionsMetric: MetricWithAlarmSupport;
    readonly throttledMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: DocumentDbMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createResourceUsageWidget(width: number, height: number): GraphWidget;
    createConnectionsWidget(width: number, height: number): GraphWidget;
    createTransactionsWidget(width: number, height: number): GraphWidget;
    createLatencyWidget(width: number, height: number): GraphWidget;
}
