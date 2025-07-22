import { IWidget, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { ILogGroup } from "aws-cdk-lib/aws-logs";
import { FluentBitMetricFactory, FluentBitMetricFactoryProps } from "./FluentBitMetricFactory";
import { BaseMonitoringProps, Monitoring, MonitoringScope } from "../../common";
export interface FluentBitMonitoringProps extends FluentBitMetricFactoryProps, BaseMonitoringProps {
    /**
     * Log group that contains FluentBit metric logs
     */
    readonly logGroup: ILogGroup;
    /**
     * Metrics for input bytes total, output bytes total and output records total are not shown on default dashboard.
     * If you want to get MetricFilters created to have those metrics present in CloudWatch set this flag to true
     * @default false
     */
    readonly createOptionalMetricFilters?: boolean;
}
export declare class FluentBitMonitoring extends Monitoring {
    protected readonly logGroupName: string;
    protected readonly metricFactory: FluentBitMetricFactory;
    protected readonly storageMetrics: Metric[];
    protected readonly inputMetrics: Metric[];
    protected readonly outputMetrics: Metric[];
    protected readonly filterMetrics: Metric[];
    constructor(scope: MonitoringScope, props: FluentBitMonitoringProps);
    widgets(): IWidget[];
    summaryWidgets(): IWidget[];
    private createTitleWidget;
    private inputMetricsWidget;
    private outputMetricsWidget;
    private filterMetricsWidget;
    private storageMetricsWidget;
    private createMetricWidget;
}
