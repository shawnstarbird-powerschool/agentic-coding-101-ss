import { HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { StepFunctionServiceIntegrationMetricFactoryProps } from "./StepFunctionServiceIntegrationMetricFactory";
import { BaseMonitoringProps, DurationThreshold, ErrorAlarmFactory, ErrorCountThreshold, ErrorRateThreshold, LatencyAlarmFactory, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
export interface StepFunctionServiceIntegrationMonitoringProps extends StepFunctionServiceIntegrationMetricFactoryProps, BaseMonitoringProps {
    readonly addDurationP50Alarm?: Record<string, DurationThreshold>;
    readonly addDurationP90Alarm?: Record<string, DurationThreshold>;
    readonly addDurationP99Alarm?: Record<string, DurationThreshold>;
    readonly addFailedServiceIntegrationsCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly addFailedServiceIntegrationsRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly addTimedOutServiceIntegrationsCountAlarm?: Record<string, ErrorCountThreshold>;
}
export declare class StepFunctionServiceIntegrationMonitoring extends Monitoring {
    readonly title: string;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly durationAlarmFactory: LatencyAlarmFactory;
    readonly durationAnnotations: HorizontalAnnotation[];
    readonly errorCountAnnotations: HorizontalAnnotation[];
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly p50DurationMetric: MetricWithAlarmSupport;
    readonly p90DurationMetric: MetricWithAlarmSupport;
    readonly p99DurationMetric: MetricWithAlarmSupport;
    readonly scheduledServiceIntegrationsMetric: MetricWithAlarmSupport;
    readonly startedServiceIntegrationsMetric: MetricWithAlarmSupport;
    readonly succeededServiceIntegrationsMetric: MetricWithAlarmSupport;
    readonly failedServiceIntegrationsMetric: MetricWithAlarmSupport;
    readonly failedServiceIntegrationRateMetric: MetricWithAlarmSupport;
    readonly timedOutServiceIntegrationsMetrics: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: StepFunctionServiceIntegrationMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
}
