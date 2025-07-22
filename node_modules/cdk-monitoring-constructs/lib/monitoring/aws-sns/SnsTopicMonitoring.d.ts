import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { SnsTopicMetricFactoryProps } from "./SnsTopicMetricFactory";
import { BaseMonitoringProps, HighMessagesPublishedThreshold, LowMessagesPublishedThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope, NotificationsFailedThreshold, TopicAlarmFactory } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface SnsTopicMonitoringOptions extends BaseMonitoringProps {
    readonly addMessageNotificationsFailedAlarm?: Record<string, NotificationsFailedThreshold>;
    readonly addMinNumberOfMessagesPublishedAlarm?: Record<string, LowMessagesPublishedThreshold>;
    readonly addMaxNumberOfMessagesPublishedAlarm?: Record<string, HighMessagesPublishedThreshold>;
}
export interface SnsTopicMonitoringProps extends SnsTopicMetricFactoryProps, SnsTopicMonitoringOptions {
}
export declare class SnsTopicMonitoring extends Monitoring {
    readonly title: string;
    readonly topicUrl?: string;
    readonly topicAlarmFactory: TopicAlarmFactory;
    readonly failedDeliveryAnnotations: HorizontalAnnotation[];
    readonly incomingMessagesAnnotations: HorizontalAnnotation[];
    readonly incomingMessagesMetric: MetricWithAlarmSupport;
    readonly outgoingMessagesMetric: MetricWithAlarmSupport;
    readonly messageSizeMetric: MetricWithAlarmSupport;
    readonly messagesFailedMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: SnsTopicMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createMessageCountWidget(width: number, height: number): GraphWidget;
    createMessageSizeWidget(width: number, height: number): GraphWidget;
    createMessageFailedWidget(width: number, height: number): GraphWidget;
    private resolveTopicName;
}
