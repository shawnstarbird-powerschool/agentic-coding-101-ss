import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { CloudFrontDistributionMetricFactoryProps } from "./CloudFrontDistributionMetricFactory";
import { AlarmFactory, BaseMonitoringProps, ErrorAlarmFactory, ErrorRateThreshold, HighTpsThreshold, LowTpsThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope, TpsAlarmFactory } from "../../common";
import { MonitoringHeaderWidget, MonitoringNamingStrategy } from "../../dashboard";
export interface CloudFrontDistributionMonitoringOptions extends BaseMonitoringProps {
}
export interface CloudFrontDistributionMonitoringProps extends CloudFrontDistributionMetricFactoryProps, CloudFrontDistributionMonitoringOptions {
    readonly addError4xxRate?: Record<string, ErrorRateThreshold>;
    readonly addFault5xxRate?: Record<string, ErrorRateThreshold>;
    readonly addLowTpsAlarm?: Record<string, LowTpsThreshold>;
    readonly addHighTpsAlarm?: Record<string, HighTpsThreshold>;
}
export declare class CloudFrontDistributionMonitoring extends Monitoring {
    readonly title: string;
    readonly distributionUrl?: string;
    readonly namingStrategy: MonitoringNamingStrategy;
    readonly alarmFactory: AlarmFactory;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly tpsAlarmFactory: TpsAlarmFactory;
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly tpsAnnotations: HorizontalAnnotation[];
    readonly tpsMetric: MetricWithAlarmSupport;
    readonly downloadedBytesMetric: MetricWithAlarmSupport;
    readonly uploadedBytesMetric: MetricWithAlarmSupport;
    readonly error4xxRate: MetricWithAlarmSupport;
    readonly error5xxRate: MetricWithAlarmSupport;
    readonly additionalMetricsEnabled: boolean;
    readonly cacheHitRate: MetricWithAlarmSupport | undefined;
    constructor(scope: MonitoringScope, props: CloudFrontDistributionMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createTpsWidget(width: number, height: number): GraphWidget;
    createCacheWidget(width: number, height: number): GraphWidget;
    createTrafficWidget(width: number, height: number): GraphWidget;
    createErrorRateWidget(width: number, height: number): GraphWidget;
}
