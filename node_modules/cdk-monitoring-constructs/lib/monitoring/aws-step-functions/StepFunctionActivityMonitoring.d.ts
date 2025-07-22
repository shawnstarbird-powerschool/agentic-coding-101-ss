import { HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { StepFunctionActivityMetricFactoryProps } from "./StepFunctionActivityMetricFactory";
import { BaseMonitoringProps, DurationThreshold, ErrorAlarmFactory, ErrorCountThreshold, ErrorRateThreshold, LatencyAlarmFactory, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
export interface StepFunctionActivityMonitoringProps extends StepFunctionActivityMetricFactoryProps, BaseMonitoringProps {
    readonly addDurationP50Alarm?: Record<string, DurationThreshold>;
    readonly addDurationP90Alarm?: Record<string, DurationThreshold>;
    readonly addDurationP99Alarm?: Record<string, DurationThreshold>;
    readonly addFailedActivitiesCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly addFailedActivitiesRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly addTimedOutActivitiesCountAlarm?: Record<string, ErrorCountThreshold>;
}
export declare class StepFunctionActivityMonitoring extends Monitoring {
    readonly title: string;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly durationAlarmFactory: LatencyAlarmFactory;
    readonly durationAnnotations: HorizontalAnnotation[];
    readonly errorCountAnnotations: HorizontalAnnotation[];
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly p50DurationMetric: MetricWithAlarmSupport;
    readonly p90DurationMetric: MetricWithAlarmSupport;
    readonly p99DurationMetric: MetricWithAlarmSupport;
    readonly scheduledActivitiesMetric: MetricWithAlarmSupport;
    readonly startedActivitiesMetric: MetricWithAlarmSupport;
    readonly succeededActivitiesMetric: MetricWithAlarmSupport;
    readonly failedActivitiesMetric: MetricWithAlarmSupport;
    readonly failedActivitiesRateMetric: MetricWithAlarmSupport;
    readonly heartbeatTimedOutActivitiesMetrics: MetricWithAlarmSupport;
    readonly timedOutActivitiesMetrics: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: StepFunctionActivityMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
}
