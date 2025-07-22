import { DimensionsMap, Metric, MetricOptions } from "aws-cdk-lib/aws-cloudwatch";
import * as elasticsearch from "aws-cdk-lib/aws-elasticsearch";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
export declare type Domain = opensearch.CfnDomain | opensearch.IDomain | elasticsearch.CfnDomain | elasticsearch.IDomain;
/**
 * Backported set of metric functions added in @aws-cdk/aws-elasticsearch@1.65.0.
 * @see https://github.com/aws/aws-cdk/pull/8369
 *
 * TODO: can be removed after upgrade to 1.73.0, which includes bugfixes for the
 * latency p99 metrics.
 * @see https://github.com/aws/aws-cdk/releases/tag/v1.73.0
 */
export declare class OpenSearchBackportedMetrics {
    protected readonly dimensionsMap: DimensionsMap;
    constructor(domain: Domain);
    /**
     * Return the given named metric for this Domain.
     */
    metric(metricName: string, props?: MetricOptions): Metric;
    /**
     * Metric for the time the cluster status is red.
     *
     * @default - maximum over 5 minutes
     */
    metricClusterStatusRed(props?: MetricOptions): Metric;
    /**
     * Metric for the time the cluster status is yellow.
     *
     * @default - maximum over 5 minutes
     */
    metricClusterStatusYellow(props?: MetricOptions): Metric;
    /**
     * Metric for the storage space of nodes in the cluster.
     *
     * @default - minimum over 5 minutes
     */
    metricFreeStorageSpace(props?: MetricOptions): Metric;
    /**
     * Metric for the cluster blocking index writes.
     *
     * @default - maximum over 1 minute
     */
    metricClusterIndexWritesBlocked(props?: MetricOptions): Metric;
    /**
     * Metric for the cluster blocking index writes.
     *
     * @default - maximum over 1 minute
     *
     * @deprecated use metricClusterIndexWritesBlocked instead.
     */
    metricClusterIndexWriteBlocked(props?: MetricOptions): Metric;
    /**
     * Metric for the number of nodes.
     *
     * @default - minimum over 1 hour
     */
    metricNodes(props?: MetricOptions): Metric;
    /**
     * Metric for automated snapshot failures.
     *
     * @default - maximum over 5 minutes
     */
    metricAutomatedSnapshotFailure(props?: MetricOptions): Metric;
    /**
     * Metric for CPU utilization.
     *
     * @default - maximum over 5 minutes
     */
    metricCPUUtilization(props?: MetricOptions): Metric;
    /**
     * Metric for JVM memory pressure.
     *
     * @default - maximum over 5 minutes
     */
    metricJVMMemoryPressure(props?: MetricOptions): Metric;
    /**
     * Metric for master CPU utilization.
     *
     * @default - maximum over 5 minutes
     */
    metricMasterCPUUtilization(props?: MetricOptions): Metric;
    /**
     * Metric for master JVM memory pressure.
     *
     * @default - maximum over 5 minutes
     */
    metricMasterJVMMemoryPressure(props?: MetricOptions): Metric;
    /**
     * Metric for KMS key errors.
     *
     * @default - maximum over 5 minutes
     */
    metricKMSKeyError(props?: MetricOptions): Metric;
    /**
     * Metric for KMS key being inaccessible.
     *
     * @default - maximum over 5 minutes
     */
    metricKMSKeyInaccessible(props?: MetricOptions): Metric;
    /**
     * Metric for number of searchable documents.
     *
     * @default - maximum over 5 minutes
     */
    metricSearchableDocuments(props?: MetricOptions): Metric;
    /**
     * Metric for search latency.
     *
     * @default - p99 over 5 minutes
     */
    metricSearchLatency(props?: MetricOptions): Metric;
    /**
     * Metric for indexing latency.
     *
     * @default - p99 over 5 minutes
     */
    metricIndexingLatency(props?: MetricOptions): Metric;
}
