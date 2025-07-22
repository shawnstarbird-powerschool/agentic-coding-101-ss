import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { SqsQueueMetricFactoryProps } from "./SqsQueueMetricFactory";
import { BaseMonitoringProps, MaxIncomingMessagesCountThreshold, MaxMessageAgeThreshold, MaxMessageCountThreshold, MaxTimeToDrainThreshold, MetricWithAlarmSupport, MinIncomingMessagesCountThreshold, MinMessageCountThreshold, Monitoring, MonitoringScope, QueueAlarmFactory } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface BaseSqsQueueAlarms {
    readonly addQueueMinSizeAlarm?: Record<string, MinMessageCountThreshold>;
    readonly addQueueMaxSizeAlarm?: Record<string, MaxMessageCountThreshold>;
    readonly addQueueMaxMessageAgeAlarm?: Record<string, MaxMessageAgeThreshold>;
    readonly addQueueMaxTimeToDrainMessagesAlarm?: Record<string, MaxTimeToDrainThreshold>;
    readonly addQueueMinIncomingMessagesAlarm?: Record<string, MinIncomingMessagesCountThreshold>;
    readonly addQueueMaxIncomingMessagesAlarm?: Record<string, MaxIncomingMessagesCountThreshold>;
}
export interface SqsQueueMonitoringOptions extends BaseSqsQueueAlarms, BaseMonitoringProps {
}
export interface SqsQueueMonitoringProps extends SqsQueueMetricFactoryProps, SqsQueueMonitoringOptions {
}
export declare class SqsQueueMonitoring extends Monitoring {
    readonly title: string;
    readonly queueUrl?: string;
    readonly queueAlarmFactory: QueueAlarmFactory;
    readonly countAnnotations: HorizontalAnnotation[];
    readonly ageAnnotations: HorizontalAnnotation[];
    readonly timeToDrainAnnotations: HorizontalAnnotation[];
    readonly visibleMessagesMetric: MetricWithAlarmSupport;
    readonly incomingMessagesMetric: MetricWithAlarmSupport;
    readonly deletedMessagesMetric: MetricWithAlarmSupport;
    readonly oldestMessageAgeMetric: MetricWithAlarmSupport;
    readonly messageSizeMetric: MetricWithAlarmSupport;
    readonly productionRateMetric: MetricWithAlarmSupport;
    readonly consumptionRateMetric: MetricWithAlarmSupport;
    readonly timeToDrainMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: SqsQueueMonitoringProps, invokedFromSuper?: boolean);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createMessageCountWidget(width: number, height: number): GraphWidget;
    createMessageAgeWidget(width: number, height: number): GraphWidget;
    createMessageSizeWidget(width: number, height: number): GraphWidget;
    createProducerAndConsumerRateWidget(width: number, height: number): GraphWidget;
    createTimeToDrainWidget(width: number, height: number): GraphWidget;
    protected resolveQueueName(queue: IQueue): string | undefined;
}
