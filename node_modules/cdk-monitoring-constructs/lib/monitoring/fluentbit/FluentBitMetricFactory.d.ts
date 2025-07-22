import { ILogGroup } from "aws-cdk-lib/aws-logs";
import { MetricFactory, MonitoringScope } from "../../common";
export interface FluentBitMetricFactoryProps {
    /**
     * Namespace that metrics will be emitted to.
     * @default metric factory default
     */
    readonly namespace?: string;
}
export declare class FluentBitMetricFactory {
    protected readonly metricFactory: MetricFactory;
    protected readonly namespace: string;
    protected readonly scope: MonitoringScope;
    constructor(scope: MonitoringScope, props: FluentBitMetricFactoryProps);
    filterMetrics(logGroup: ILogGroup): import("aws-cdk-lib/aws-cloudwatch").Metric[];
    outputMetrics(logGroup: ILogGroup): import("aws-cdk-lib/aws-cloudwatch").Metric[];
    inputMetrics(logGroup: ILogGroup): import("aws-cdk-lib/aws-cloudwatch").Metric[];
    private pluginMetric;
    storageMetrics(logGroup: ILogGroup): import("aws-cdk-lib/aws-cloudwatch").Metric[];
    metricsWithoutWidgets(logGroup: ILogGroup): void;
}
