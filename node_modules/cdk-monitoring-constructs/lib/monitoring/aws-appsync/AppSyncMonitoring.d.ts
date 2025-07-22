import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { AppSyncMetricFactory, AppSyncMetricFactoryProps } from "./AppSyncMetricFactory";
import { AlarmFactory, BaseMonitoringProps, ErrorAlarmFactory, ErrorCountThreshold, ErrorRateThreshold, HighTpsThreshold, LatencyAlarmFactory, LatencyThreshold, LowTpsThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope, TpsAlarmFactory } from "../../common";
import { MonitoringHeaderWidget, MonitoringNamingStrategy } from "../../dashboard";
export interface AppSyncMonitoringOptions extends BaseMonitoringProps {
    readonly add4XXErrorCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly add4XXErrorRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly add5XXFaultCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly add5XXFaultRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly addLatencyP50Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyP90Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyP99Alarm?: Record<string, LatencyThreshold>;
    readonly addLowTpsAlarm?: Record<string, LowTpsThreshold>;
    readonly addHighTpsAlarm?: Record<string, HighTpsThreshold>;
}
export interface AppSyncMonitoringProps extends AppSyncMonitoringOptions, AppSyncMetricFactoryProps {
}
export declare class AppSyncMonitoring extends Monitoring {
    readonly title: string;
    readonly namingStrategy: MonitoringNamingStrategy;
    readonly metricFactory: AppSyncMetricFactory;
    readonly alarmFactory: AlarmFactory;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly latencyAlarmFactory: LatencyAlarmFactory;
    readonly tpsAlarmFactory: TpsAlarmFactory;
    readonly tpsAnnotations: HorizontalAnnotation[];
    readonly latencyAnnotations: HorizontalAnnotation[];
    readonly errorCountAnnotations: HorizontalAnnotation[];
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly tpsMetric: MetricWithAlarmSupport;
    readonly p50LatencyMetric: MetricWithAlarmSupport;
    readonly p90LatencyMetric: MetricWithAlarmSupport;
    readonly p99LatencyMetric: MetricWithAlarmSupport;
    readonly fault5xxCountMetric: MetricWithAlarmSupport;
    readonly fault5xxRateMetric: MetricWithAlarmSupport;
    readonly error4xxCountMetric: MetricWithAlarmSupport;
    readonly error4xxRateMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: AppSyncMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createtTitleWidget(): MonitoringHeaderWidget;
    createTpsWidget(width: number, height: number): GraphWidget;
    createLatencyWidget(width: number, height: number): GraphWidget;
    createErrorCountWidget(width: number, height: number): GraphWidget;
    createErrorRateWidget(width: number, height: number): GraphWidget;
}
