import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { KinesisFirehoseMetricFactoryProps } from "./KinesisFirehoseMetricFactory";
import { BaseMonitoringProps, KinesisAlarmFactory, MetricWithAlarmSupport, Monitoring, MonitoringScope, RecordsThrottledThreshold, FirehoseStreamLimitThreshold } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface KinesisFirehoseMonitoringOptions extends BaseMonitoringProps {
    readonly addRecordsThrottledAlarm?: Record<string, RecordsThrottledThreshold>;
    readonly addIncomingBytesExceedThresholdAlarm?: Record<string, FirehoseStreamLimitThreshold>;
    readonly addIncomingRecordsExceedThresholdAlarm?: Record<string, FirehoseStreamLimitThreshold>;
    readonly addIncomingPutRequestsExceedThresholdAlarm?: Record<string, FirehoseStreamLimitThreshold>;
}
export interface KinesisFirehoseMonitoringProps extends KinesisFirehoseMetricFactoryProps, KinesisFirehoseMonitoringOptions {
}
export declare class KinesisFirehoseMonitoring extends Monitoring {
    readonly title: string;
    readonly streamUrl?: string;
    readonly kinesisAlarmFactory: KinesisAlarmFactory;
    readonly recordCountAnnotations: HorizontalAnnotation[];
    readonly incomingLimitAnnotations: HorizontalAnnotation[];
    readonly incomingBytesMetric: MetricWithAlarmSupport;
    readonly incomingRecordsMetric: MetricWithAlarmSupport;
    readonly throttledRecordsMetric: MetricWithAlarmSupport;
    readonly successfulConversionMetric: MetricWithAlarmSupport;
    readonly failedConversionMetric: MetricWithAlarmSupport;
    readonly putRecordLatency: MetricWithAlarmSupport;
    readonly putRecordBatchLatency: MetricWithAlarmSupport;
    readonly incomingBytesToLimitRate: MetricWithAlarmSupport;
    readonly incomingRecordsToLimitRate: MetricWithAlarmSupport;
    readonly incomingPutRequestsToLimitRate: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: KinesisFirehoseMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createIncomingRecordWidget(width: number, height: number): GraphWidget;
    createLatencyWidget(width: number, height: number): GraphWidget;
    createConversionWidget(width: number, height: number): GraphWidget;
    createLimitWidget(width: number, height: number): GraphWidget;
}
