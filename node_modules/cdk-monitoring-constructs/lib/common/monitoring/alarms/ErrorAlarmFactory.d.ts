import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
export declare enum ErrorType {
    FAULT = "Fault",
    ERROR = "Error",
    SYSTEM_ERROR = "SystemError",
    USER_ERROR = "UserError",
    FAILURE = "Failure",
    ABORTED = "Aborted",
    THROTTLED = "Throttled",
    TIMED_OUT = "TimedOut",
    READ_ERROR = "ReadError",
    WRITE_ERROR = "WriteError",
    EXPIRED = "Expired",
    KILLED = "Killed",
    BLOCKED = "Blocked"
}
export interface ErrorCountThreshold extends CustomAlarmThreshold {
    readonly maxErrorCount: number;
}
export interface ErrorRateThreshold extends CustomAlarmThreshold {
    readonly maxErrorRate: number;
}
export declare class ErrorAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addErrorCountAlarm(metric: MetricWithAlarmSupport, errorType: ErrorType, props: ErrorCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
    addErrorRateAlarm(metric: MetricWithAlarmSupport, errorType: ErrorType, props: ErrorRateThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
