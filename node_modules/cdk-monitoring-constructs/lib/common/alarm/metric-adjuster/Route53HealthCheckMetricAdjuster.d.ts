import { Construct } from "constructs";
import { IMetricAdjuster } from "./IMetricAdjuster";
import { MetricWithAlarmSupport } from "../../metric";
import { AddAlarmProps } from "../AlarmFactory";
/**
 * Adjusts a metric so that alarms created from it can be used in Route53 Health Checks.
 * The metric will be validated to ensure it satisfies Route53 Health Check alarm requirements, otherwise it will throw an {@link Error}.
 * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-types.html
 */
export declare class Route53HealthCheckMetricAdjuster implements IMetricAdjuster {
    static readonly INSTANCE: Route53HealthCheckMetricAdjuster;
    /** @inheritdoc */
    adjustMetric(metric: MetricWithAlarmSupport, alarmScope: Construct, props: AddAlarmProps): MetricWithAlarmSupport;
}
