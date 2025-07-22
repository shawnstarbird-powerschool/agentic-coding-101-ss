import { IResolveContext } from "aws-cdk-lib";
import { ElastiCacheClusterType } from "../../monitoring";
export interface AwsConsoleUrlFactoryProps {
    readonly awsAccountId: string;
    readonly awsAccountRegion: string;
}
export declare class AwsConsoleUrlFactory {
    protected readonly awsAccountId: string;
    protected readonly awsAccountRegion: string;
    constructor(props: AwsConsoleUrlFactoryProps);
    getAwsConsoleUrl(destinationUrl?: string): string | undefined;
    getApiGatewayUrl(restApiId: string): string | undefined;
    getCloudFrontDistributionUrl(distributionId: string): string | undefined;
    getCloudWatchLogGroupUrl(logGroupName: string): string | undefined;
    getCodeBuildProjectUrl(projectName: string): string | undefined;
    getDocumentDbClusterUrl(clusterId: string): string | undefined;
    getDynamoTableUrl(tableName: string): string | undefined;
    getElastiCacheClusterUrl(clusterId: string, clusterType: ElastiCacheClusterType): string | undefined;
    getKinesisAnalyticsUrl(application: string): string | undefined;
    getKinesisDataStreamUrl(streamName: string): string | undefined;
    getKinesisFirehoseDeliveryStreamUrl(streamName: string): string | undefined;
    getLambdaFunctionUrl(functionName: string): string | undefined;
    getOpenSearchClusterUrl(domainName: string): string | undefined;
    getRdsClusterUrl(clusterId: string): string | undefined;
    getRdsInstanceUrl(instanceId: string): string | undefined;
    getRedshiftClusterUrl(clusterId: string): string | undefined;
    getSnsTopicUrl(topicArn: string): string | undefined;
    getStateMachineUrl(stateMachineArn: string): string | undefined;
    getSqsQueueUrl(queueUrl: string): string | undefined;
    getS3BucketUrl(bucketName: string): string | undefined;
    /**
     * Resolves a destination URL within a resolution context.
     * @param context The resolution context.
     * @param destinationUrl The destination URL to resolve since it may contain CDK tokens.
     * @see https://docs.aws.amazon.com/cdk/latest/guide/tokens.html
     */
    protected getResolvedDestinationUrl(context: IResolveContext, destinationUrl: string): string;
}
