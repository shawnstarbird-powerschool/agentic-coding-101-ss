import { GraphWidget, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { AutoScalingGroupMetricFactoryProps } from "./AutoScalingGroupMetricFactory";
import { BaseMonitoringProps, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface AutoScalingGroupMonitoringOptions extends BaseMonitoringProps {
}
export interface AutoScalingGroupMonitoringProps extends AutoScalingGroupMetricFactoryProps, AutoScalingGroupMonitoringOptions {
}
export declare class AutoScalingGroupMonitoring extends Monitoring {
    readonly title: string;
    readonly groupMinSizeMetric: MetricWithAlarmSupport;
    readonly groupMaxSizeMetric: MetricWithAlarmSupport;
    readonly groupDesiredSizeMetric: MetricWithAlarmSupport;
    readonly instancesInServiceMetric: MetricWithAlarmSupport;
    readonly instancesPendingMetric: MetricWithAlarmSupport;
    readonly instancesStandbyMetric: MetricWithAlarmSupport;
    readonly instancesTerminatingMetric: MetricWithAlarmSupport;
    readonly instancesTotalMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: AutoScalingGroupMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createGroupSizeWidget(width: number, height: number): GraphWidget;
    createGroupStatusWidget(width: number, height: number): GraphWidget;
}
