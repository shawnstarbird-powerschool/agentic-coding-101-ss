import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { RdsInstanceMetricFactoryProps } from "./RdsInstanceMetricFactory";
import { BaseMonitoringProps, ConnectionAlarmFactory, HighConnectionCountThreshold, LowConnectionCountThreshold, MetricWithAlarmSupport, MinUsageCountThreshold, Monitoring, MonitoringScope, UsageAlarmFactory, UsageThreshold } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface RdsInstanceMonitoringOptions extends BaseMonitoringProps {
    readonly addFreeStorageSpaceAlarm?: Record<string, MinUsageCountThreshold>;
    readonly addCpuUsageAlarm?: Record<string, UsageThreshold>;
    readonly addMinConnectionCountAlarm?: Record<string, LowConnectionCountThreshold>;
    readonly addMaxConnectionCountAlarm?: Record<string, HighConnectionCountThreshold>;
}
export interface RdsInstanceMonitoringProps extends RdsInstanceMetricFactoryProps, RdsInstanceMonitoringOptions {
}
export declare class RdsInstanceMonitoring extends Monitoring {
    readonly title: string;
    readonly url?: string;
    readonly usageAlarmFactory: UsageAlarmFactory;
    readonly connectionAlarmFactory: ConnectionAlarmFactory;
    readonly usageAnnotations: HorizontalAnnotation[];
    readonly connectionAnnotations: HorizontalAnnotation[];
    readonly connectionsMetric: MetricWithAlarmSupport;
    readonly freeStorageSpaceMetric: MetricWithAlarmSupport;
    readonly freeableMemoryMetric: MetricWithAlarmSupport;
    readonly cpuUsageMetric: MetricWithAlarmSupport;
    readonly readLatencyMetric: MetricWithAlarmSupport;
    readonly readThroughputMetric: MetricWithAlarmSupport;
    readonly readIopsMetric: MetricWithAlarmSupport;
    readonly writeLatencyMetric: MetricWithAlarmSupport;
    readonly writeThroughputMetric: MetricWithAlarmSupport;
    readonly writeIopsMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: RdsInstanceMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createCpuAndDiskUsageWidget(width: number, height: number): GraphWidget;
    createConnectionsWidget(width: number, height: number): GraphWidget;
    createLatencyWidget(width: number, height: number): GraphWidget;
}
