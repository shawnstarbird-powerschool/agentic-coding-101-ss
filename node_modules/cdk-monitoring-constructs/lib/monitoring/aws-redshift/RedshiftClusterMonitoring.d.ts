import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { RedshiftClusterMetricFactoryProps } from "./RedshiftClusterMetricFactory";
import { BaseMonitoringProps, ConnectionAlarmFactory, DurationThreshold, HighConnectionCountThreshold, LatencyAlarmFactory, LowConnectionCountThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope, UsageAlarmFactory, UsageThreshold } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface RedshiftClusterMonitoringOptions extends BaseMonitoringProps {
    readonly addDiskSpaceUsageAlarm?: Record<string, UsageThreshold>;
    readonly addCpuUsageAlarm?: Record<string, UsageThreshold>;
    readonly addMaxLongQueryDurationAlarm?: Record<string, DurationThreshold>;
    readonly addMinConnectionCountAlarm?: Record<string, LowConnectionCountThreshold>;
    readonly addMaxConnectionCountAlarm?: Record<string, HighConnectionCountThreshold>;
}
export interface RedshiftClusterMonitoringProps extends RedshiftClusterMetricFactoryProps, RedshiftClusterMonitoringOptions {
}
export declare class RedshiftClusterMonitoring extends Monitoring {
    readonly title: string;
    readonly url?: string;
    readonly usageAlarmFactory: UsageAlarmFactory;
    readonly latencyAlarmFactory: LatencyAlarmFactory;
    readonly connectionAlarmFactory: ConnectionAlarmFactory;
    readonly queryDurationAnnotations: HorizontalAnnotation[];
    readonly connectionAnnotations: HorizontalAnnotation[];
    readonly usageAnnotations: HorizontalAnnotation[];
    readonly connectionsMetric: MetricWithAlarmSupport;
    readonly diskSpaceUsageMetric: MetricWithAlarmSupport;
    readonly cpuUsageMetric: MetricWithAlarmSupport;
    readonly shortQueryDurationMetric: MetricWithAlarmSupport;
    readonly mediumQueryDurationMetric: MetricWithAlarmSupport;
    readonly longQueryDurationMetric: MetricWithAlarmSupport;
    readonly readLatencyMetric: MetricWithAlarmSupport;
    readonly writeLatencyMetric: MetricWithAlarmSupport;
    readonly maintenanceModeMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: RedshiftClusterMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createCpuAndDiskUsageWidget(width: number, height: number): GraphWidget;
    createConnectionsWidget(width: number, height: number): GraphWidget;
    createQueryDurationWidget(width: number, height: number): GraphWidget;
    createLatencyWidget(width: number, height: number): GraphWidget;
    createMaintenanceWidget(width: number, height: number): GraphWidget;
}
