import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { ElastiCacheClusterMetricFactoryProps, ElastiCacheClusterType } from "./ElastiCacheClusterMetricFactory";
import { BaseMonitoringProps, ElastiCacheAlarmFactory, MaxItemsCountThreshold, MaxUsedSwapMemoryThreshold, MetricWithAlarmSupport, MinFreeableMemoryThreshold, Monitoring, MonitoringScope, UsageAlarmFactory, UsageThreshold } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface ElastiCacheClusterMonitoringOptions extends BaseMonitoringProps {
    /**
     * Cluster type (needed, since each type has their own specific metrics)
     */
    readonly clusterType: ElastiCacheClusterType;
    /**
     * Add CPU usage alarm (useful for all clusterTypes including Redis)
     */
    readonly addCpuUsageAlarm?: Record<string, UsageThreshold>;
    /**
     * Add Redis engine CPU usage alarm.
     *
     * It is recommended to monitor CPU utilization with `addCpuUsageAlarm`
     * as well for hosts with two vCPUs or less.
     */
    readonly addRedisEngineCpuUsageAlarm?: Record<string, UsageThreshold>;
    /**
     * Add alarm on total number of items
     */
    readonly addMaxItemsCountAlarm?: Record<string, MaxItemsCountThreshold>;
    /**
     * Add alarm on number of evicted items
     */
    readonly addMaxEvictedItemsCountAlarm?: Record<string, MaxItemsCountThreshold>;
    /**
     * Add alarm on amount of freeable memory
     */
    readonly addMinFreeableMemoryAlarm?: Record<string, MinFreeableMemoryThreshold>;
    /**
     * Add alarm on amount of used swap memory
     */
    readonly addMaxUsedSwapMemoryAlarm?: Record<string, MaxUsedSwapMemoryThreshold>;
}
export interface ElastiCacheClusterMonitoringProps extends ElastiCacheClusterMetricFactoryProps, ElastiCacheClusterMonitoringOptions {
}
export declare class ElastiCacheClusterMonitoring extends Monitoring {
    readonly title: string;
    readonly clusterUrl?: string;
    readonly clusterType: ElastiCacheClusterType;
    readonly connectionsMetric: MetricWithAlarmSupport;
    readonly cpuUsageMetric: MetricWithAlarmSupport;
    readonly redisEngineCpuUsageMetric: MetricWithAlarmSupport;
    readonly freeableMemoryMetric: MetricWithAlarmSupport;
    readonly unusedMemoryMetric: MetricWithAlarmSupport;
    readonly swapMemoryMetric: MetricWithAlarmSupport;
    readonly itemsMemoryMetric: MetricWithAlarmSupport;
    readonly itemsCountMetrics: MetricWithAlarmSupport;
    readonly itemsEvictedMetrics: MetricWithAlarmSupport;
    readonly usageAlarmFactory: UsageAlarmFactory;
    readonly elastiCacheAlarmFactory: ElastiCacheAlarmFactory;
    readonly cpuUsageAnnotations: HorizontalAnnotation[];
    readonly redisEngineCpuUsageAnnotations: HorizontalAnnotation[];
    readonly itemsCountAnnotations: HorizontalAnnotation[];
    readonly evictedItemsCountAnnotations: HorizontalAnnotation[];
    readonly memoryUsageAnnotations: HorizontalAnnotation[];
    constructor(scope: MonitoringScope, props: ElastiCacheClusterMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createCpuUsageWidget(width: number, height: number): GraphWidget;
    createRedisEngineCpuUsageWidget(width: number, height: number): GraphWidget;
    createMemoryUsageWidget(width: number, height: number): GraphWidget;
    createItemCountWidget(width: number, height: number): GraphWidget;
    createConnectionsWidget(width: number, height: number): GraphWidget;
}
