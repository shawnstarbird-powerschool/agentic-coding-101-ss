import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { RdsClusterMetricFactoryProps } from "./RdsClusterMetricFactory";
import { BaseMonitoringProps, ConnectionAlarmFactory, HighConnectionCountThreshold, LowConnectionCountThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope, UsageAlarmFactory, UsageThreshold } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface RdsClusterMonitoringOptions extends BaseMonitoringProps {
    readonly addDiskSpaceUsageAlarm?: Record<string, UsageThreshold>;
    readonly addCpuUsageAlarm?: Record<string, UsageThreshold>;
    readonly addMinConnectionCountAlarm?: Record<string, LowConnectionCountThreshold>;
    readonly addMaxConnectionCountAlarm?: Record<string, HighConnectionCountThreshold>;
}
export interface RdsClusterMonitoringProps extends RdsClusterMetricFactoryProps, RdsClusterMonitoringOptions {
}
export declare class RdsClusterMonitoring extends Monitoring {
    readonly title: string;
    readonly url?: string;
    readonly usageAlarmFactory: UsageAlarmFactory;
    readonly connectionAlarmFactory: ConnectionAlarmFactory;
    readonly usageAnnotations: HorizontalAnnotation[];
    readonly connectionAnnotations: HorizontalAnnotation[];
    readonly connectionsMetric: MetricWithAlarmSupport;
    readonly diskSpaceUsageMetric: MetricWithAlarmSupport;
    readonly cpuUsageMetric: MetricWithAlarmSupport;
    readonly selectLatencyMetric: MetricWithAlarmSupport;
    readonly insertLatencyMetric: MetricWithAlarmSupport;
    readonly updateLatencyMetric: MetricWithAlarmSupport;
    readonly deleteLatencyMetric: MetricWithAlarmSupport;
    readonly commitLatencyMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: RdsClusterMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createCpuAndDiskUsageWidget(width: number, height: number): GraphWidget;
    createConnectionsWidget(width: number, height: number): GraphWidget;
    createLatencyWidget(width: number, height: number): GraphWidget;
}
