import { QueueProcessingEc2Service, QueueProcessingFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { Ec2ServiceMonitoring } from "./Ec2ServiceMonitoring";
import { BaseFargateServiceAlarms, FargateServiceMonitoring } from "./FargateServiceMonitoring";
import { BaseMonitoringProps, MonitoringScope } from "../../common";
import { BaseDlqAlarms, BaseSqsQueueAlarms, SqsQueueMonitoring } from "../aws-sqs";
interface BaseQueueProcessingServiceMonitoringProps extends BaseMonitoringProps {
    readonly addServiceAlarms?: BaseFargateServiceAlarms;
    readonly addQueueAlarms?: BaseSqsQueueAlarms;
    readonly addDeadLetterQueueAlarms?: BaseDlqAlarms;
}
export interface QueueProcessingFargateServiceMonitoringProps extends BaseQueueProcessingServiceMonitoringProps {
    readonly fargateService: QueueProcessingFargateService;
}
export interface QueueProcessingEc2ServiceMonitoringProps extends BaseQueueProcessingServiceMonitoringProps {
    readonly ec2Service: QueueProcessingEc2Service;
}
export declare function getQueueProcessingFargateServiceMonitoring(facade: MonitoringScope, props: QueueProcessingFargateServiceMonitoringProps): (FargateServiceMonitoring | SqsQueueMonitoring)[];
export declare function getQueueProcessingEc2ServiceMonitoring(facade: MonitoringScope, props: QueueProcessingEc2ServiceMonitoringProps): (Ec2ServiceMonitoring | SqsQueueMonitoring)[];
export {};
