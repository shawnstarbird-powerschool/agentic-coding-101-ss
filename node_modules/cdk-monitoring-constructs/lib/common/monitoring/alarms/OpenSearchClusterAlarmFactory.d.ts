import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export declare enum OpenSearchClusterStatus {
    RED = "red",
    YELLOW = "yellow"
}
export declare enum ElasticsearchClusterStatus {
    RED = "red",
    YELLOW = "yellow"
}
export interface OpenSearchClusterStatusCustomization extends CustomAlarmThreshold {
    readonly status: OpenSearchClusterStatus | ElasticsearchClusterStatus;
}
export interface OpenSearchClusterIndexWritesBlockedThreshold extends CustomAlarmThreshold {
    readonly maxBlockedWrites: number;
}
export interface OpenSearchClusterNodesThreshold extends CustomAlarmThreshold {
    readonly minNodes: number;
}
export interface OpenSearchClusterAutomatedSnapshotFailureThreshold extends CustomAlarmThreshold {
    readonly maxFailures: number;
}
export interface OpenSearchKmsKeyErrorThreshold extends CustomAlarmThreshold {
    readonly maxErrors: number;
}
export interface OpenSearchKmsKeyInaccessibleThreshold extends CustomAlarmThreshold {
    readonly maxAccessAttempts: number;
}
export declare class OpenSearchClusterAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addClusterStatusAlarm(metric: MetricWithAlarmSupport, props: OpenSearchClusterStatusCustomization, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addClusterIndexWritesBlockedAlarm(metric: MetricWithAlarmSupport, props: OpenSearchClusterIndexWritesBlockedThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addClusterNodeCountAlarm(metric: MetricWithAlarmSupport, props: OpenSearchClusterNodesThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addAutomatedSnapshotFailureAlarm(metric: MetricWithAlarmSupport, props: OpenSearchClusterAutomatedSnapshotFailureThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addKmsKeyErrorAlarm(metric: MetricWithAlarmSupport, props: OpenSearchKmsKeyErrorThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addKmsKeyInaccessibleAlarm(metric: MetricWithAlarmSupport, props: OpenSearchKmsKeyInaccessibleThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
