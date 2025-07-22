import { GraphWidget, IMetric, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { EC2MetricFactoryProps } from "./EC2MetricFactory";
import { BaseMonitoringProps, Monitoring, MonitoringScope } from "../../common";
import { MonitoringHeaderWidget } from "../../dashboard";
export interface EC2MonitoringOptions extends EC2MetricFactoryProps, BaseMonitoringProps {
}
export interface EC2MonitoringProps extends EC2MonitoringOptions {
}
export declare class EC2Monitoring extends Monitoring {
    readonly family: string;
    readonly title: string;
    readonly cpuUtilisationMetrics: IMetric[];
    readonly diskReadBytesMetrics: IMetric[];
    readonly diskWriteBytesMetrics: IMetric[];
    readonly diskReadOpsMetrics: IMetric[];
    readonly diskWriteOpsMetrics: IMetric[];
    readonly networkInMetrics: IMetric[];
    readonly networkOutMetrics: IMetric[];
    constructor(scope: MonitoringScope, props: EC2MonitoringProps);
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
    createTitleWidget(): MonitoringHeaderWidget;
    createCpuWidget(width: number, height: number): GraphWidget;
    createDiskWidget(width: number, height: number): GraphWidget;
    createDiskOpsWidget(width: number, height: number): GraphWidget;
    createNetworkWidget(width: number, height: number): GraphWidget;
}
