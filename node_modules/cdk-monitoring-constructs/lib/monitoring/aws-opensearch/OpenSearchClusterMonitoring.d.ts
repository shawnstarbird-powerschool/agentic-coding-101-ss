import { HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { OpenSearchClusterMetricFactoryProps } from "./OpenSearchClusterMetricFactory";
import { BaseMonitoringProps, LatencyAlarmFactory, LatencyThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope, OpenSearchClusterAlarmFactory, OpenSearchClusterAutomatedSnapshotFailureThreshold, OpenSearchClusterIndexWritesBlockedThreshold, OpenSearchClusterNodesThreshold, OpenSearchClusterStatusCustomization, OpenSearchKmsKeyErrorThreshold, OpenSearchKmsKeyInaccessibleThreshold, UsageAlarmFactory, UsageThreshold } from "../../common";
export interface OpenSearchClusterMonitoringOptions extends BaseMonitoringProps {
    readonly addIndexingLatencyP50Alarm?: Record<string, LatencyThreshold>;
    readonly addIndexingLatencyP90Alarm?: Record<string, LatencyThreshold>;
    readonly addIndexingLatencyP99Alarm?: Record<string, LatencyThreshold>;
    readonly addSearchLatencyP50Alarm?: Record<string, LatencyThreshold>;
    readonly addSearchLatencyP90Alarm?: Record<string, LatencyThreshold>;
    readonly addSearchLatencyP99Alarm?: Record<string, LatencyThreshold>;
    readonly addClusterStatusAlarm?: Record<string, OpenSearchClusterStatusCustomization>;
    readonly addDiskSpaceUsageAlarm?: Record<string, UsageThreshold>;
    readonly addCpuSpaceUsageAlarm?: Record<string, UsageThreshold>;
    readonly addMasterCpuSpaceUsageAlarm?: Record<string, UsageThreshold>;
    readonly addJvmMemoryPressureAlarm?: Record<string, UsageThreshold>;
    readonly addMasterJvmMemoryPressureAlarm?: Record<string, UsageThreshold>;
    readonly addClusterIndexWritesBlockedAlarm?: Record<string, OpenSearchClusterIndexWritesBlockedThreshold>;
    readonly addClusterNodeCountAlarm?: Record<string, OpenSearchClusterNodesThreshold>;
    readonly addClusterAutomatedSnapshotFailureAlarm?: Record<string, OpenSearchClusterAutomatedSnapshotFailureThreshold>;
    readonly addKmsKeyErrorAlarm?: Record<string, OpenSearchKmsKeyErrorThreshold>;
    readonly addKmsKeyInaccessibleAlarm?: Record<string, OpenSearchKmsKeyInaccessibleThreshold>;
}
export interface OpenSearchClusterMonitoringProps extends OpenSearchClusterMetricFactoryProps, OpenSearchClusterMonitoringOptions {
}
export declare class OpenSearchClusterMonitoring extends Monitoring {
    readonly title: string;
    readonly url?: string;
    readonly indexingLatencyAlarmFactory: LatencyAlarmFactory;
    readonly indexingLatencyAnnotations: HorizontalAnnotation[];
    readonly searchLatencyAlarmFactory: LatencyAlarmFactory;
    readonly searchLatencyAnnotations: HorizontalAnnotation[];
    readonly clusterAlarmFactory: OpenSearchClusterAlarmFactory;
    readonly clusterAnnotations: HorizontalAnnotation[];
    readonly nodeAnnotations: HorizontalAnnotation[];
    readonly usageAlarmFactory: UsageAlarmFactory;
    readonly usageAnnotations: HorizontalAnnotation[];
    readonly masterUsageAnnotations: HorizontalAnnotation[];
    readonly tpsMetric: MetricWithAlarmSupport;
    readonly p50IndexingLatencyMetric: MetricWithAlarmSupport;
    readonly p90IndexingLatencyMetric: MetricWithAlarmSupport;
    readonly p99IndexingLatencyMetric: MetricWithAlarmSupport;
    readonly p50SearchLatencyMetric: MetricWithAlarmSupport;
    readonly p90SearchLatencyMetric: MetricWithAlarmSupport;
    readonly p99SearchLatencyMetric: MetricWithAlarmSupport;
    readonly clusterStatusRedMetric: MetricWithAlarmSupport;
    readonly clusterStatusYellowMetric: MetricWithAlarmSupport;
    readonly diskSpaceUsageMetric: MetricWithAlarmSupport;
    readonly cpuUsageMetric: MetricWithAlarmSupport;
    readonly masterCpuUsageMetric: MetricWithAlarmSupport;
    readonly jvmMemoryPressureMetric: MetricWithAlarmSupport;
    readonly masterJvmMemoryPressureMetric: MetricWithAlarmSupport;
    readonly indexWriteBlockedMetric: MetricWithAlarmSupport;
    readonly nodesMetric: MetricWithAlarmSupport;
    readonly automatedSnapshotFailureMetric: MetricWithAlarmSupport;
    readonly kmsKeyErrorMetric: MetricWithAlarmSupport;
    readonly kmsKeyInaccessibleMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: OpenSearchClusterMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
}
