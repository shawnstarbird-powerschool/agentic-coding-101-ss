import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { KinesisDataAnalyticsMetricFactoryProps } from "./KinesisDataAnalyticsMetricFactory";
import { BaseMonitoringProps, FullRestartCountThreshold, KinesisDataAnalyticsAlarmFactory, MaxDowntimeThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface KinesisDataAnalyticsMonitoringOptions extends BaseMonitoringProps {
    readonly addDowntimeAlarm?: Record<string, MaxDowntimeThreshold>;
    readonly addFullRestartCountAlarm?: Record<string, FullRestartCountThreshold>;
}
export interface KinesisDataAnalyticsMonitoringProps extends KinesisDataAnalyticsMetricFactoryProps, KinesisDataAnalyticsMonitoringOptions {
}
export declare class KinesisDataAnalyticsMonitoring extends Monitoring {
    readonly title: string;
    readonly kinesisDataAnalyticsUrl?: string;
    readonly kdaAlarmFactory: KinesisDataAnalyticsAlarmFactory;
    readonly downtimeAnnotations: HorizontalAnnotation[];
    readonly fullRestartAnnotations: HorizontalAnnotation[];
    readonly cpuUtilizationPercentMetric: MetricWithAlarmSupport;
    readonly downtimeMsMetric: MetricWithAlarmSupport;
    readonly fullRestartsCountMetric: MetricWithAlarmSupport;
    readonly heapMemoryUtilizationPercentMetric: MetricWithAlarmSupport;
    readonly kpusCountMetric: MetricWithAlarmSupport;
    readonly lastCheckpointDurationMsMetric: MetricWithAlarmSupport;
    readonly lastCheckpointSizeBytesMetric: MetricWithAlarmSupport;
    readonly numberOfFailedCheckpointsCountMetric: MetricWithAlarmSupport;
    readonly oldGenerationGCCountMetric: MetricWithAlarmSupport;
    readonly oldGenerationGCTimeMsMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: KinesisDataAnalyticsMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createKPUWidget(width: number, height: number): GraphWidget;
    createResourceUtilizationWidget(width: number, height: number): GraphWidget;
    createDownTimeWidget(width: number, height: number): GraphWidget;
    createFullRestartsWidget(width: number, height: number): GraphWidget;
    createNumberOfFailedCheckpointsWidget(width: number, height: number): GraphWidget;
    createLastCheckpointDurationWidget(width: number, height: number): GraphWidget;
    createLastCheckpointSizeWidget(width: number, height: number): GraphWidget;
    createGarbageCollectionWidget(width: number, height: number): GraphWidget;
    private createSummaryWidgetRow;
    private createCheckpointAndGcWidgets;
}
