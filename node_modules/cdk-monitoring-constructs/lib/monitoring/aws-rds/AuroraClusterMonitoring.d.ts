import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { RdsClusterMetricFactoryProps } from "./RdsClusterMetricFactory";
import { BaseMonitoringProps, ConnectionAlarmFactory, HighConnectionCountThreshold, LowConnectionCountThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope, UsageAlarmFactory, UsageCountThreshold, UsageThreshold } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface AuroraClusterMonitoringOptions extends BaseMonitoringProps {
    readonly addMaxServerlessDatabaseCapacityAlarm?: Record<string, UsageCountThreshold>;
    readonly addCpuUsageAlarm?: Record<string, UsageThreshold>;
    readonly addMinConnectionCountAlarm?: Record<string, LowConnectionCountThreshold>;
    readonly addMaxConnectionCountAlarm?: Record<string, HighConnectionCountThreshold>;
}
export interface AuroraClusterMonitoringProps extends RdsClusterMetricFactoryProps, AuroraClusterMonitoringOptions {
}
export declare class AuroraClusterMonitoring extends Monitoring {
    readonly title: string;
    readonly url?: string;
    readonly usageAlarmFactory: UsageAlarmFactory;
    readonly connectionAlarmFactory: ConnectionAlarmFactory;
    readonly usageAnnotations: HorizontalAnnotation[];
    readonly connectionAnnotations: HorizontalAnnotation[];
    readonly serverlessCapacityAnnotations: HorizontalAnnotation[];
    readonly connectionsMetric: MetricWithAlarmSupport;
    readonly serverlessDatabaseCapacityMetric: MetricWithAlarmSupport;
    readonly cpuUsageMetric: MetricWithAlarmSupport;
    readonly selectLatencyMetric: MetricWithAlarmSupport;
    readonly insertLatencyMetric: MetricWithAlarmSupport;
    readonly updateLatencyMetric: MetricWithAlarmSupport;
    readonly deleteLatencyMetric: MetricWithAlarmSupport;
    readonly commitLatencyMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: AuroraClusterMonitoringProps);
    private isServerlessCluster;
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createCpuUsageWidget(width: number, height: number): GraphWidget;
    createConnectionsWidget(width: number, height: number): GraphWidget;
    createLatencyWidget(width: number, height: number): GraphWidget;
    createServerlessDatabaseCapacityWidget(width: number, height: number): GraphWidget;
}
