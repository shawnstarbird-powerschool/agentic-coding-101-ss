import { GraphWidget, HorizontalAnnotation, IWidget, Row } from "aws-cdk-lib/aws-cloudwatch";
import { KinesisDataStreamMetricFactoryProps } from "./KinesisDataStreamMetricFactory";
import { BaseMonitoringProps, KinesisAlarmFactory, MaxIteratorAgeThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope, RecordsFailedThreshold, RecordsThrottledThreshold } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface KinesisDataStreamMonitoringOptions extends BaseMonitoringProps {
    readonly addIteratorMaxAgeAlarm?: Record<string, MaxIteratorAgeThreshold>;
    readonly addPutRecordsThrottledAlarm?: Record<string, RecordsThrottledThreshold>;
    readonly addPutRecordsFailedAlarm?: Record<string, RecordsFailedThreshold>;
    readonly addThrottledRecordsAlarm?: Record<string, RecordsThrottledThreshold>;
    readonly addReadProvisionedThroughputExceededAlarm?: Record<string, RecordsThrottledThreshold>;
    readonly addWriteProvisionedThroughputExceededAlarm?: Record<string, RecordsThrottledThreshold>;
}
export interface KinesisDataStreamMonitoringProps extends KinesisDataStreamMetricFactoryProps, KinesisDataStreamMonitoringOptions {
}
export declare class KinesisDataStreamMonitoring extends Monitoring {
    readonly title: string;
    readonly streamUrl?: string;
    readonly kinesisAlarmFactory: KinesisAlarmFactory;
    readonly ageAnnotations: HorizontalAnnotation[];
    readonly provisionedCapacityAnnotations: HorizontalAnnotation[];
    readonly recordCountAnnotations: HorizontalAnnotation[];
    readonly metricGetRecordSumBytes: MetricWithAlarmSupport;
    readonly metricGetRecordsIteratorAge: MetricWithAlarmSupport;
    readonly metricGetRecordsLatencyAverage: MetricWithAlarmSupport;
    readonly metricGetRecordsSumCount: MetricWithAlarmSupport;
    readonly metricGetRecordsSuccessCount: MetricWithAlarmSupport;
    readonly incomingDataSumBytesMetric: MetricWithAlarmSupport;
    readonly incomingDataSumCountMetric: MetricWithAlarmSupport;
    readonly putRecordSumBytesMetric: MetricWithAlarmSupport;
    readonly putRecordLatencyAverageMetric: MetricWithAlarmSupport;
    readonly putRecordSuccessCountMetric: MetricWithAlarmSupport;
    readonly putRecordsSumBytesMetric: MetricWithAlarmSupport;
    readonly putRecordsLatencyAverageMetric: MetricWithAlarmSupport;
    readonly putRecordsSuccessCountMetric: MetricWithAlarmSupport;
    readonly putRecordsTotalRecordsCountMetric: MetricWithAlarmSupport;
    readonly putRecordsSuccessfulRecordsCountMetric: MetricWithAlarmSupport;
    readonly putRecordsFailedRecordsCountMetric: MetricWithAlarmSupport;
    readonly putRecordsThrottledRecordsCountMetric: MetricWithAlarmSupport;
    readonly readProvisionedThroughputExceededMetric: MetricWithAlarmSupport;
    readonly writeProvisionedThroughputExceededMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: KinesisDataStreamMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    private createFirstAdditionalRow;
    createSecondAdditionalRow(): Row;
    createTitleWidget(): MonitoringHeaderWidget;
    createIncomingDataWidget(width: number, height: number): GraphWidget;
    createIteratorAgeWidget(width: number, height: number): GraphWidget;
    createLatencyWidget(width: number, height: number): GraphWidget;
    createCapacityWidget(width: number, height: number): GraphWidget;
    createRecordSizeWidget(width: number, height: number): GraphWidget;
    createOperationWidget(width: number, height: number): GraphWidget;
    createRecordNumberWidget(width: number, height: number): GraphWidget;
}
