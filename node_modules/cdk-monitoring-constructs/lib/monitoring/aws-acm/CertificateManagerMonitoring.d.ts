import { GraphWidget, HorizontalAnnotation, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { CertificateManagerMetricFactoryProps } from "./CertificateManagerMetricFactory";
import { BaseMonitoringProps, DaysToExpiryThreshold, MetricWithAlarmSupport, Monitoring, MonitoringScope } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface CertificateManagerMonitoringOptions extends BaseMonitoringProps {
    readonly addDaysToExpiryAlarm?: Record<string, DaysToExpiryThreshold>;
}
export interface CertificateManagerMonitoringProps extends CertificateManagerMonitoringOptions, CertificateManagerMetricFactoryProps {
}
export declare class CertificateManagerMonitoring extends Monitoring {
    readonly title: string;
    readonly daysToExpiryAnnotations: HorizontalAnnotation[];
    readonly daysToExpiryMetric: MetricWithAlarmSupport;
    constructor(scope: MonitoringScope, props: CertificateManagerMonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createDaysToExpiryWidget(width: number, height: number): GraphWidget;
}
