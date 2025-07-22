import { HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { StepFunctionLambdaIntegrationMetricFactoryProps } from "./StepFunctionLambdaIntegrationMetricFactory";
import { BaseMonitoringProps, DurationThreshold, ErrorAlarmFactory, ErrorCountThreshold, ErrorRateThreshold, LatencyAlarmFactory, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
export interface StepFunctionLambdaIntegrationMonitoringProps extends StepFunctionLambdaIntegrationMetricFactoryProps, BaseMonitoringProps {
    readonly addDurationP50Alarm?: Record<string, DurationThreshold>;
    readonly addDurationP90Alarm?: Record<string, DurationThreshold>;
    readonly addDurationP99Alarm?: Record<string, DurationThreshold>;
    readonly addFailedFunctionsCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly addFailedFunctionsRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly addTimedOutFunctionsCountAlarm?: Record<string, ErrorCountThreshold>;
}
export declare class StepFunctionLambdaIntegrationMonitoring extends Monitoring {
    readonly title: string;
    readonly functionUrl?: string;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly durationAlarmFactory: LatencyAlarmFactory;
    readonly durationAnnotations: HorizontalAnnotation[];
    readonly errorCountAnnotations: HorizontalAnnotation[];
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly p50DurationMetric: MetricWithAlarmSupport;
    readonly p90DurationMetric: MetricWithAlarmSupport;
    readonly p99DurationMetric: MetricWithAlarmSupport;
    readonly scheduledFunctionsMetric: MetricWithAlarmSupport;
    readonly startedFunctionsMetric: MetricWithAlarmSupport;
    readonly succeededFunctionsMetric: MetricWithAlarmSupport;
    readonly failedFunctionsMetric: MetricWithAlarmSupport;
    readonly failedFunctionRateMetric: MetricWithAlarmSupport;
    readonly timedOutFunctionsMetrics: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: StepFunctionLambdaIntegrationMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    private resolveFunctionName;
}
