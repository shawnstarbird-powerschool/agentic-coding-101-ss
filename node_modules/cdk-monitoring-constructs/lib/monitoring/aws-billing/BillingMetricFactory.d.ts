import { IMetric } from "aws-cdk-lib/aws-cloudwatch";
import { MetricWithAlarmSupport } from "../../common";
export declare const BillingRegion = "us-east-1";
export declare const BillingCurrency = "USD";
export declare class BillingMetricFactory {
    metricSearchTopCostByServiceInUsd(): IMetric;
    metricTotalCostInUsd(): MetricWithAlarmSupport;
}
