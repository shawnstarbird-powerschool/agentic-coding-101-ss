import { IFunction } from "aws-cdk-lib/aws-lambda";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { MonitoringScope } from "../../common";
export declare class SecretsManagerMetricsPublisher extends Construct {
    private static instances;
    readonly lambda: IFunction;
    private constructor();
    static getInstance(scope: MonitoringScope): SecretsManagerMetricsPublisher;
    addSecret(secret: ISecret): void;
}
