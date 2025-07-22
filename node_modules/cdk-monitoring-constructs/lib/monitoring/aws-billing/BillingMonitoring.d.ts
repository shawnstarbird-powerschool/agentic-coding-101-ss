import { GraphWidget, IMetric, IWidget, SingleValueWidget } from "aws-cdk-lib/aws-cloudwatch";
import { AlarmFactory, AnomalyDetectingAlarmFactory, AnomalyDetectionThreshold, BaseMonitoringProps, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface BillingMonitoringOptions extends BaseMonitoringProps {
    readonly addTotalCostAnomalyAlarm?: Record<string, AnomalyDetectionThreshold>;
}
export interface BillingMonitoringProps extends BillingMonitoringOptions {
}
export declare class BillingMonitoring extends Monitoring {
    readonly title: string;
    readonly alarmFactory: AlarmFactory;
    readonly anomalyDetectingAlarmFactory: AnomalyDetectingAlarmFactory;
    readonly costByServiceMetric: IMetric;
    readonly totalCostMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: BillingMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createChargesByServiceWidget(width: number, height: number): GraphWidget;
    createTotalChargesWidget(width: number, height: number): SingleValueWidget;
}
