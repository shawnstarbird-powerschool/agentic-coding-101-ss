import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { ApiGatewayMetricFactoryProps } from "./ApiGatewayMetricFactory";
import { AlarmFactory, BaseMonitoringProps, ErrorAlarmFactory, ErrorCountThreshold, ErrorRateThreshold, HighTpsThreshold, LatencyAlarmFactory, LatencyThreshold, LatencyType, LowTpsThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope, TpsAlarmFactory } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface ApiGatewayMonitoringOptions extends BaseMonitoringProps {
    readonly add4XXErrorCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly add4XXErrorRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly add5XXFaultCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly add5XXFaultRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly addLatencyP50Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyP70Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyP90Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyP95Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyP99Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyP999Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyP9999Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyP100Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM50Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM70Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM90Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM95Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM99Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM999Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM9999Alarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM95OutlierAlarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM99OutlierAlarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM999OutlierAlarm?: Record<string, LatencyThreshold>;
    readonly addLatencyTM9999OutlierAlarm?: Record<string, LatencyThreshold>;
    readonly addLatencyAverageAlarm?: Record<string, LatencyThreshold>;
    readonly addLowTpsAlarm?: Record<string, LowTpsThreshold>;
    readonly addHighTpsAlarm?: Record<string, HighTpsThreshold>;
    /**
     * You can specify what latency types you want to be rendered in the dashboards.
     * Note: any latency type with an alarm will be also added automatically.
     * If the list is undefined, default values will be shown.
     * If the list is empty, only the latency types with an alarm will be shown (if any).
     * @default - p50, p90, p99 (@see DefaultLatencyTypesToRender)
     */
    readonly latencyTypesToRender?: LatencyType[];
}
export interface ApiGatewayMonitoringProps extends ApiGatewayMetricFactoryProps, ApiGatewayMonitoringOptions {
}
export declare class ApiGatewayMonitoring extends Monitoring {
    readonly title: string;
    readonly alarmFactory: AlarmFactory;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly tpsAlarmFactory: TpsAlarmFactory;
    readonly latencyAlarmFactory: LatencyAlarmFactory;
    readonly tpsAnnotations: HorizontalAnnotation[];
    readonly latencyAnnotations: HorizontalAnnotation[];
    readonly errorCountAnnotations: HorizontalAnnotation[];
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly tpsMetric: MetricWithAlarmSupport;
    readonly error4XXCountMetric: MetricWithAlarmSupport;
    readonly error4XXRateMetric: MetricWithAlarmSupport;
    readonly fault5XXCountMetric: MetricWithAlarmSupport;
    readonly fault5XXRateMetric: MetricWithAlarmSupport;
    readonly latencyMetrics: Record<string, MetricWithAlarmSupport>;
    readonly latencyTypesToRender: string[];
    constructor(scope: MonitoringScope, props: ApiGatewayMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createTpsWidget(width: number, height: number): GraphWidget;
    createLatencyWidget(width: number, height: number): GraphWidget;
    createErrorCountWidget(width: number, height: number): GraphWidget;
    createErrorRateWidget(width: number, height: number): GraphWidget;
}
