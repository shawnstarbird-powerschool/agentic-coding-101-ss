import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { SyntheticsCanaryMetricFactoryProps } from "./SyntheticsCanaryMetricFactory";
import { BaseMonitoringProps, ErrorAlarmFactory, ErrorCountThreshold, ErrorRateThreshold, LatencyAlarmFactory, LatencyThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common/index";
import { MonitoringHeaderWidget } from "../../dashboard/index";
export interface SyntheticsCanaryMonitoringOptions extends BaseMonitoringProps {
    readonly add4xxErrorCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly add4xxErrorRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly add5xxFaultCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly add5xxFaultRateAlarm?: Record<string, ErrorRateThreshold>;
    readonly addAverageLatencyAlarm?: Record<string, LatencyThreshold>;
}
export interface SyntheticsCanaryMonitoringProps extends SyntheticsCanaryMetricFactoryProps, SyntheticsCanaryMonitoringOptions {
}
/**
 * Monitoring for CloudWatch Synthetics Canaries.
 *
 * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html
 */
export declare class SyntheticsCanaryMonitoring extends Monitoring {
    readonly humanReadableName: string;
    readonly latencyAlarmFactory: LatencyAlarmFactory;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly latencyAnnotations: HorizontalAnnotation[];
    readonly errorCountAnnotations: HorizontalAnnotation[];
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly averageLatencyMetric: MetricWithAlarmSupport;
    readonly errorCountMetric: MetricWithAlarmSupport;
    readonly errorRateMetric: MetricWithAlarmSupport;
    readonly faultCountMetric: MetricWithAlarmSupport;
    readonly faultRateMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: SyntheticsCanaryMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createLatencyWidget(width: number, height: number): GraphWidget;
    createErrorCountWidget(width: number, height: number): GraphWidget;
    createErrorRateWidget(width: number, height: number): GraphWidget;
}
