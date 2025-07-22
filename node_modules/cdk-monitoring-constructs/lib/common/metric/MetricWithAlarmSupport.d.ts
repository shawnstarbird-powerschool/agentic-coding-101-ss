import { MathExpression, Metric } from "aws-cdk-lib/aws-cloudwatch";
/**
 * Any metric we can create an alarm on.
 *
 * Cannot be an IMetric, as it does not have support for alarms.
 */
export declare type MetricWithAlarmSupport = Metric | MathExpression;
