import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { IProject } from "aws-cdk-lib/aws-codebuild";
import { CodeBuildProjectMetricFactoryProps } from "./CodeBuildProjectMetricFactory";
import { BaseMonitoringProps, DurationThreshold, ErrorAlarmFactory, ErrorCountThreshold, ErrorRateThreshold, LatencyAlarmFactory, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface CodeBuildProjectMonitoringOptions extends BaseMonitoringProps {
    readonly addDurationP99Alarm?: Record<string, DurationThreshold>;
    readonly addDurationP90Alarm?: Record<string, DurationThreshold>;
    readonly addDurationP50Alarm?: Record<string, DurationThreshold>;
    readonly addFailedBuildCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly addFailedBuildRateAlarm?: Record<string, ErrorRateThreshold>;
}
/**
 * Monitoring props for CodeBuild projects.
 */
export interface CodeBuildProjectMonitoringProps extends CodeBuildProjectMetricFactoryProps, CodeBuildProjectMonitoringOptions {
}
export declare class CodeBuildProjectMonitoring extends Monitoring {
    readonly title: string;
    readonly projectUrl?: string;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly durationAlarmFactory: LatencyAlarmFactory;
    readonly durationAnnotations: HorizontalAnnotation[];
    readonly errorCountAnnotations: HorizontalAnnotation[];
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly buildCountMetric: MetricWithAlarmSupport;
    readonly succeededBuildCountMetric: MetricWithAlarmSupport;
    readonly failedBuildCountMetric: MetricWithAlarmSupport;
    readonly failedBuildRateMetric: MetricWithAlarmSupport;
    readonly durationP99InSecondsMetric: MetricWithAlarmSupport;
    readonly durationP90InSecondsMetric: MetricWithAlarmSupport;
    readonly durationP50InSecondsMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: CodeBuildProjectMonitoringProps);
    widgets(): IWidget[];
    summaryWidgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createBuildCountsWidget(): GraphWidget;
    createDurationWidget(): GraphWidget;
    createFailedBuildRateWidget(): GraphWidget;
    protected resolveProjectName(project: IProject): string | undefined;
}
