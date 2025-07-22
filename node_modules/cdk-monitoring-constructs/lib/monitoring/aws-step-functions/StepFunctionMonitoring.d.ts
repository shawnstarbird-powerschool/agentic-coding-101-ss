import { HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { StepFunctionMetricFactoryProps } from "./StepFunctionMetricFactory";
import { BaseMonitoringProps, DurationThreshold, ErrorAlarmFactory, ErrorCountThreshold, ErrorRateThreshold, LatencyAlarmFactory, MetricWithAlarmSupport, MinRunningTaskCountThreshold, Monitoring, MonitoringScope, TaskHealthAlarmFactory } from "../../common";
export interface StepFunctionMonitoringOptions extends BaseMonitoringProps {
    readonly addDurationP50Alarm?: Record<string, DurationThreshold>;
    readonly addDurationP90Alarm?: Record<string, DurationThreshold>;
    readonly addDurationP99Alarm?: Record<string, DurationThreshold>;
    readonly addFailedExecutionCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly addFailedExecutionRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly addAbortedExecutionCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly addThrottledExecutionCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly addTimedOutExecutionCountAlarm?: Record<string, ErrorCountThreshold>;
    /**
     * Add minimum started execution count alarm for the stepfunctions.
     */
    readonly addMinStartedExecutionCountAlarm?: Record<string, MinRunningTaskCountThreshold>;
}
export interface StepFunctionMonitoringProps extends StepFunctionMetricFactoryProps, StepFunctionMonitoringOptions {
}
export declare class StepFunctionMonitoring extends Monitoring {
    readonly title: string;
    readonly stateMachineUrl?: string;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly durationAlarmFactory: LatencyAlarmFactory;
    readonly taskHealthAlarmFactory: TaskHealthAlarmFactory;
    readonly durationAnnotations: HorizontalAnnotation[];
    readonly errorCountAnnotations: HorizontalAnnotation[];
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly p50DurationMetric: MetricWithAlarmSupport;
    readonly p90DurationMetric: MetricWithAlarmSupport;
    readonly p99DurationMetric: MetricWithAlarmSupport;
    readonly startedExecutionsMetric: MetricWithAlarmSupport;
    readonly succeededExecutionsMetric: MetricWithAlarmSupport;
    readonly failedExecutionsMetric: MetricWithAlarmSupport;
    readonly failedExecutionRateMetric: MetricWithAlarmSupport;
    readonly abortedExecutionsMetric: MetricWithAlarmSupport;
    readonly throttledExecutionsMetric: MetricWithAlarmSupport;
    readonly timedOutExecutionsMetrics: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: StepFunctionMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
}
