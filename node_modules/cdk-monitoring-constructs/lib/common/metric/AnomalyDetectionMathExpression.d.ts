import { Alarm, CreateAlarmOptions, MathExpression, MathExpressionOptions, MathExpressionProps } from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";
/**
 * Captures specific MathExpression for anomaly detection, for which alarm generation is different.
 * Added to overcome certain CDK limitations at the time of writing.
 * @see https://github.com/aws/aws-cdk/issues/10540
 */
export declare class AnomalyDetectionMathExpression extends MathExpression {
    constructor(props: MathExpressionProps);
    with(props: MathExpressionOptions): MathExpression;
    createAlarm(scope: Construct, id: string, props: CreateAlarmOptions): Alarm;
}
