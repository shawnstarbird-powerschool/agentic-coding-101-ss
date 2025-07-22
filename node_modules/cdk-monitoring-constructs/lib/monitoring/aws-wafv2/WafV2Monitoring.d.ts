import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { WafV2MetricFactoryProps } from "./WafV2MetricFactory";
import { AlarmFactory, BaseMonitoringProps, ErrorAlarmFactory, ErrorCountThreshold, ErrorRateThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface WafV2MonitoringOptions extends BaseMonitoringProps {
}
export interface WafV2MonitoringProps extends WafV2MetricFactoryProps, WafV2MonitoringOptions {
    readonly addBlockedRequestsCountAlarm?: Record<string, ErrorCountThreshold>;
    readonly addBlockedRequestsRateAlarm?: Record<string, ErrorRateThreshold>;
}
/**
 * Monitoring for AWS Web Application Firewall.
 *
 * @see https://docs.aws.amazon.com/waf/latest/developerguide/monitoring-cloudwatch.html
 */
export declare class WafV2Monitoring extends Monitoring {
    readonly humanReadableName: string;
    readonly alarmFactory: AlarmFactory;
    readonly errorAlarmFactory: ErrorAlarmFactory;
    readonly errorCountAnnotations: HorizontalAnnotation[];
    readonly errorRateAnnotations: HorizontalAnnotation[];
    readonly allowedRequestsMetric: MetricWithAlarmSupport;
    readonly blockedRequestsMetric: MetricWithAlarmSupport;
    readonly blockedRequestsRateMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: WafV2MonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createAllowedRequestsWidget(width: number, height: number): GraphWidget;
    createBlockedRequestsWidget(width: number, height: number): GraphWidget;
    createBlockedRequestsRateWidget(width: number, height: number): GraphWidget;
}
