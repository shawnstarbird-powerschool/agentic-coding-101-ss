import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { SqsQueueMonitoring, SqsQueueMonitoringProps } from "./SqsQueueMonitoring";
import { MaxIncomingMessagesCountThreshold, MaxMessageAgeThreshold, MaxMessageCountThreshold, MetricWithAlarmSupport, MonitoringScope, QueueAlarmFactory } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface BaseDlqAlarms {
    readonly addDeadLetterQueueMaxSizeAlarm?: Record<string, MaxMessageCountThreshold>;
    readonly addDeadLetterQueueMaxMessageAgeAlarm?: Record<string, MaxMessageAgeThreshold>;
    /**
     * Alarm on the number of messages added to a queue.
     *
     * Note that this corresponds with the NumberOfMessagesSent metric, which does not capture messages sent to the DLQ
     * as a result of a failed processing attempt.
     *
     * @see https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html#sqs-dlq-number-of-messages
     */
    readonly addDeadLetterQueueMaxIncomingMessagesAlarm?: Record<string, MaxIncomingMessagesCountThreshold>;
}
export interface SqsQueueMonitoringWithDlqProps extends SqsQueueMonitoringProps, BaseDlqAlarms {
    readonly deadLetterQueue: IQueue;
    /**
     * Indicates whether the DLQ monitoring should be added to summary dashboard.
     *
     * @default - true
     */
    readonly addDeadLetterQueueToSummaryDashboard?: boolean;
}
export declare class SqsQueueMonitoringWithDlq extends SqsQueueMonitoring {
    protected readonly deadLetterTitle: string;
    protected readonly deadLetterUrl?: string;
    protected readonly addDeadLetterQueueToSummaryDashboard: boolean;
    protected readonly deadLetterQueueAlarmFactory: QueueAlarmFactory;
    protected readonly deadLetterCountAnnotations: HorizontalAnnotation[];
    protected readonly deadLetterAgeAnnotations: HorizontalAnnotation[];
    protected readonly deadLetterQueueVisibleMessagesMetric: MetricWithAlarmSupport;
    protected readonly deadLetterQueueIncomingMessagesMetric: MetricWithAlarmSupport;
    protected readonly deadLetterQueueOldestMessageAgeMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: SqsQueueMonitoringWithDlqProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    protected createDeadLetterTitleWidget(): MonitoringHeaderWidget;
    protected createDeadLetterMessageCountWidget(width: number, height: number): GraphWidget;
    protected createDeadLetterMessageAgeWidget(width: number, height: number): GraphWidget;
}
