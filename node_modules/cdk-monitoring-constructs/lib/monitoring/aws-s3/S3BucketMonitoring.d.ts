import { IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { S3BucketMetricFactoryProps } from "./S3BucketMetricFactory";
import { BaseMonitoringProps, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
export interface S3BucketMonitoringOptions extends BaseMonitoringProps {
}
export interface S3BucketMonitoringProps extends S3BucketMetricFactoryProps, S3BucketMonitoringOptions {
}
export declare class S3BucketMonitoring extends Monitoring {
    protected readonly title: string;
    protected readonly url?: string;
    protected readonly bucketSizeBytesMetric: MetricWithAlarmSupport;
    protected readonly numberOfObjectsMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: S3BucketMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    private getBucketName;
}
