import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { GlueJobMetricFactoryProps } from "./GlueJobMetricFactory";
import { AlarmFactory, BaseMonitoringProps, ErrorAlarmFactory, ErrorCountThreshold, ErrorRateThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface GlueJobMonitoringOptions extends GlueJobMetricFactoryProps, BaseMonitoringProps {
    readonly addFailedTaskCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly addFailedTaskRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly addKilledTaskCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly addKilledTaskRateAlarm?: Record<string, ErrorRateThreshold>;
}
export interface GlueJobMonitoringProps extends GlueJobMonitoringOptions {
}
export declare class GlueJobMonitoring extends Monitoring {
    readonly title: string;
    readonly alarmFactory: AlarmFactory;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly errorCountAnnotations: HorizontalAnnotation[];
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly bytesReadFromS3Metric: MetricWithAlarmSupport;
    readonly bytesWrittenToS3Metric: MetricWithAlarmSupport;
    readonly cpuUsageMetric: MetricWithAlarmSupport;
    readonly heapMemoryUsageMetric: MetricWithAlarmSupport;
    readonly activeExecutorsMetric: MetricWithAlarmSupport;
    readonly completedStagesMetric: MetricWithAlarmSupport;
    readonly neededExecutorsMetric: MetricWithAlarmSupport;
    readonly failedTaskCountMetric: MetricWithAlarmSupport;
    readonly failedTaskRateMetric: MetricWithAlarmSupport;
    readonly killedTaskCountMetric: MetricWithAlarmSupport;
    readonly killedTaskRateMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: GlueJobMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createJobExecutionWidget(width: number, height: number): GraphWidget;
    createDataMovementWidget(width: number, height: number): GraphWidget;
    createUtilizationWidget(width: number, height: number): GraphWidget;
    createErrorCountWidget(width: number, height: number): GraphWidget;
    createErrorRateWidget(width: number, height: number): GraphWidget;
}
