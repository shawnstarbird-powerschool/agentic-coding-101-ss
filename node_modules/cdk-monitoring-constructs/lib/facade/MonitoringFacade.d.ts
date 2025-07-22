import { CompositeAlarm, Dashboard, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";
import { MonitoringAspectProps } from "./IMonitoringAspect";
import { AddCompositeAlarmProps, AlarmFactory, AlarmFactoryDefaults, AlarmWithAnnotation, AwsConsoleUrlFactory, MetricFactory, MetricFactoryDefaults, Monitoring, MonitoringScope } from "../common";
import { IDashboardSegment, IWidgetFactory, MonitoringDashboardsOverrideProps } from "../dashboard";
import { IDynamicDashboardSegment } from "../dashboard/DynamicDashboardSegment";
import { IDynamicDashboardFactory } from "../dashboard/IDynamicDashboardFactory";
import { ApiGatewayMonitoringProps, ApiGatewayV2HttpApiMonitoringProps, AppSyncMonitoringProps, AuroraClusterMonitoringProps, AutoScalingGroupMonitoringProps, BillingMonitoringProps, CertificateManagerMonitoringProps, CloudFrontDistributionMonitoringProps, CodeBuildProjectMonitoringProps, CustomMonitoringProps, DocumentDbMonitoringProps, DynamoTableGlobalSecondaryIndexMonitoringProps, DynamoTableMonitoringProps, Ec2ApplicationLoadBalancerMonitoringProps, EC2MonitoringProps, Ec2NetworkLoadBalancerMonitoringProps, Ec2ServiceMonitoringProps, ElastiCacheClusterMonitoringProps, FargateApplicationLoadBalancerMonitoringProps, FargateNetworkLoadBalancerMonitoringProps, FargateServiceMonitoringProps, FluentBitMonitoringProps, GlueJobMonitoringProps, KinesisDataAnalyticsMonitoringProps, KinesisDataStreamMonitoringProps, KinesisFirehoseMonitoringProps, LambdaFunctionMonitoringProps, LogMonitoringProps, NetworkLoadBalancerMonitoringProps, OpenSearchClusterMonitoringProps, QueueProcessingEc2ServiceMonitoringProps, QueueProcessingFargateServiceMonitoringProps, RdsClusterMonitoringProps, RdsInstanceMonitoringProps, RedshiftClusterMonitoringProps, S3BucketMonitoringProps, SecretsManagerMonitoringProps, SecretsManagerSecretMonitoringProps, SimpleEc2ServiceMonitoringProps, SimpleFargateServiceMonitoringProps, SnsTopicMonitoringProps, SqsQueueMonitoringProps, SqsQueueMonitoringWithDlqProps, StepFunctionActivityMonitoringProps, StepFunctionLambdaIntegrationMonitoringProps, StepFunctionMonitoringProps, StepFunctionServiceIntegrationMonitoringProps, SyntheticsCanaryMonitoringProps, WafV2MonitoringProps } from "../monitoring";
export interface MonitoringFacadeProps {
    /**
     * Defaults for metric factory.
     *
     * @default - empty (no preferences)
     */
    readonly metricFactoryDefaults?: MetricFactoryDefaults;
    /**
     * Defaults for alarm factory.
     *
     * @default - actions enabled, facade logical ID used as default alarm name prefix
     */
    readonly alarmFactoryDefaults?: AlarmFactoryDefaults;
    /**
     * Defaults for dashboard factory.
     *
     * @default - An instance of {@link DynamicDashboardFactory}; facade logical ID used as default name
     */
    readonly dashboardFactory?: IDynamicDashboardFactory;
}
/**
 * An implementation of a {@link MonitoringScope}.
 *
 * This is a convenient main entrypoint to monitor resources.
 *
 * Provides methods for retrieving and creating alarms based on added segments that are subclasses of
 * {@link Monitoring}.
 */
export declare class MonitoringFacade extends MonitoringScope {
    protected readonly metricFactoryDefaults: MetricFactoryDefaults;
    protected readonly alarmFactoryDefaults: AlarmFactoryDefaults;
    readonly dashboardFactory?: IDynamicDashboardFactory;
    protected readonly createdSegments: (IDashboardSegment | IDynamicDashboardSegment)[];
    constructor(scope: Construct, id: string, props?: MonitoringFacadeProps);
    createAlarmFactory(alarmNamePrefix: string): AlarmFactory;
    createAwsConsoleUrlFactory(): AwsConsoleUrlFactory;
    createMetricFactory(): MetricFactory;
    createWidgetFactory(): IWidgetFactory;
    /**
     * Adds a dashboard segment which returns dynamic content depending on dashboard type.
     *
     * @param segment dynamic segment to add.
     */
    addDynamicSegment(segment: IDynamicDashboardSegment): this;
    /**
     * Adds a dashboard segment to go on one of the {@link DefaultDashboards}.
     *
     * @param segment segment to add
     * @param overrideProps props to specify which default dashboards this segment is added to.
     */
    addSegment(segment: IDashboardSegment, overrideProps?: MonitoringDashboardsOverrideProps): this;
    /**
     * @deprecated - prefer calling dashboardFactory.getDashboard directly.
     *
     * @returns default detail dashboard
     */
    createdDashboard(): Dashboard | undefined;
    /**
     * @deprecated - prefer calling dashboardFactory.getDashboard directly.
     *
     * @returns default summary dashboard
     */
    createdSummaryDashboard(): Dashboard | undefined;
    /**
     * @deprecated - prefer calling dashboardFactory.getDashboard directly.
     *
     * @returns default alarms dashboard
     */
    createdAlarmDashboard(): Dashboard | undefined;
    /**
     * Returns the created alarms across all added segments that subclass {@link Monitoring}
     * added up until now.
     */
    createdAlarms(): AlarmWithAnnotation[];
    /**
     * Returns a subset of created alarms that are marked by a specific custom tag.
     *
     * @param customTag tag to filter alarms by
     */
    createdAlarmsWithTag(customTag: string): AlarmWithAnnotation[];
    /**
     * Returns a subset of created alarms that are marked by a specific disambiguator.
     *
     * @param disambiguator disambiguator to filter alarms by
     */
    createdAlarmsWithDisambiguator(disambiguator: string): AlarmWithAnnotation[];
    /**
     * Returns the added segments that subclass {@link Monitoring}.
     */
    createdMonitorings(): Monitoring[];
    /**
     * Finds a subset of created alarms that are marked by a specific custom tag and creates a composite alarm.
     * This composite alarm is created with an 'OR' condition, so it triggers with any child alarm.
     * NOTE: This composite alarm is not added among other alarms, so it is not returned by createdAlarms() calls.
     *
     * @param customTag tag to filter alarms by
     * @param props customization options
     */
    createCompositeAlarmUsingTag(customTag: string, props?: AddCompositeAlarmProps): CompositeAlarm | undefined;
    /**
     * Finds a subset of created alarms that are marked by a specific disambiguator and creates a composite alarm.
     * This composite alarm is created with an 'OR' condition, so it triggers with any child alarm.
     * NOTE: This composite alarm is not added among other alarms, so it is not returned by createdAlarms() calls.
     *
     * @param alarmDisambiguator disambiguator to filter alarms by
     * @param props customization options
     */
    createCompositeAlarmUsingDisambiguator(alarmDisambiguator: string, props?: AddCompositeAlarmProps): CompositeAlarm | undefined;
    addLargeHeader(text: string, addToSummary?: boolean, addToAlarm?: boolean): this;
    addMediumHeader(text: string, addToSummary?: boolean, addToAlarm?: boolean): this;
    addSmallHeader(text: string, addToSummary?: boolean, addToAlarm?: boolean): this;
    addWidget(widget: IWidget, addToSummary?: boolean, addToAlarm?: boolean): this;
    /**
     * Uses an aspect to automatically monitor all resources in the given scope.
     *
     * @param scope Scope with resources to monitor.
     * @param aspectProps Optional configuration.
     *
     * @experimental
     */
    monitorScope(scope: Construct, aspectProps?: MonitoringAspectProps): this;
    monitorApiGateway(props: ApiGatewayMonitoringProps): this;
    monitorApiGatewayV2HttpApi(props: ApiGatewayV2HttpApiMonitoringProps): this;
    monitorAppSyncApi(props: AppSyncMonitoringProps): this;
    monitorAuroraCluster(props: AuroraClusterMonitoringProps): this;
    monitorCertificate(props: CertificateManagerMonitoringProps): this;
    monitorCloudFrontDistribution(props: CloudFrontDistributionMonitoringProps): this;
    monitorCodeBuildProject(props: CodeBuildProjectMonitoringProps): this;
    monitorDocumentDbCluster(props: DocumentDbMonitoringProps): this;
    monitorDynamoTable(props: DynamoTableMonitoringProps): this;
    monitorDynamoTableGlobalSecondaryIndex(props: DynamoTableGlobalSecondaryIndexMonitoringProps): this;
    monitorEC2Instances(props: EC2MonitoringProps): this;
    monitorElasticsearchCluster(props: OpenSearchClusterMonitoringProps): this;
    monitorOpenSearchCluster(props: OpenSearchClusterMonitoringProps): this;
    monitorElastiCacheCluster(props: ElastiCacheClusterMonitoringProps): this;
    monitorGlueJob(props: GlueJobMonitoringProps): this;
    monitorFargateService(props: FargateServiceMonitoringProps): this;
    monitorSimpleFargateService(props: SimpleFargateServiceMonitoringProps): this;
    monitorFargateNetworkLoadBalancer(props: FargateNetworkLoadBalancerMonitoringProps): this;
    monitorFargateApplicationLoadBalancer(props: FargateApplicationLoadBalancerMonitoringProps): this;
    monitorEc2Service(props: Ec2ServiceMonitoringProps): this;
    monitorSimpleEc2Service(props: SimpleEc2ServiceMonitoringProps): this;
    monitorEc2NetworkLoadBalancer(props: Ec2NetworkLoadBalancerMonitoringProps): this;
    monitorEc2ApplicationLoadBalancer(props: Ec2ApplicationLoadBalancerMonitoringProps): this;
    monitorQueueProcessingFargateService(props: QueueProcessingFargateServiceMonitoringProps): this;
    monitorQueueProcessingEc2Service(props: QueueProcessingEc2ServiceMonitoringProps): this;
    monitorAutoScalingGroup(props: AutoScalingGroupMonitoringProps): this;
    monitorKinesisFirehose(props: KinesisFirehoseMonitoringProps): this;
    monitorKinesisDataStream(props: KinesisDataStreamMonitoringProps): this;
    monitorKinesisDataAnalytics(props: KinesisDataAnalyticsMonitoringProps): this;
    monitorLambdaFunction(props: LambdaFunctionMonitoringProps): this;
    monitorNetworkLoadBalancer(props: NetworkLoadBalancerMonitoringProps): this;
    monitorRdsCluster(props: RdsClusterMonitoringProps): this;
    monitorRdsInstance(props: RdsInstanceMonitoringProps): this;
    monitorRedshiftCluster(props: RedshiftClusterMonitoringProps): this;
    monitorSecretsManager(props: SecretsManagerMonitoringProps): this;
    monitorSecretsManagerSecret(props: SecretsManagerSecretMonitoringProps): this;
    monitorSnsTopic(props: SnsTopicMonitoringProps): this;
    monitorSqsQueue(props: SqsQueueMonitoringProps): this;
    monitorSqsQueueWithDlq(props: SqsQueueMonitoringWithDlqProps): this;
    monitorStepFunction(props: StepFunctionMonitoringProps): this;
    monitorStepFunctionActivity(props: StepFunctionActivityMonitoringProps): this;
    monitorStepFunctionLambdaIntegration(props: StepFunctionLambdaIntegrationMonitoringProps): this;
    monitorStepFunctionServiceIntegration(props: StepFunctionServiceIntegrationMonitoringProps): this;
    monitorS3Bucket(props: S3BucketMonitoringProps): this;
    monitorLog(props: LogMonitoringProps): this;
    monitorSyntheticsCanary(props: SyntheticsCanaryMonitoringProps): this;
    monitorWebApplicationFirewallAclV2(props: WafV2MonitoringProps): this;
    monitorBilling(props?: BillingMonitoringProps): this;
    monitorCustom(props: CustomMonitoringProps): this;
    monitorFluentBit(props: FluentBitMonitoringProps): this;
}
