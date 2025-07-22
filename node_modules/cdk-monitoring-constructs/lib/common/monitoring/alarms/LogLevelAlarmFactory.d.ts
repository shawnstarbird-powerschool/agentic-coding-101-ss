import { AlarmFactory, CustomAlarmThreshold } from "../../alarm";
import { MetricWithAlarmSupport } from "../../metric";
/**
 * Level of a given log
 */
export declare enum LogLevel {
    ERROR = "ERROR",
    CRITICAL = "CRITICAL",
    FATAL = "FATAL"
}
export interface LogLevelCountThreshold extends CustomAlarmThreshold {
    /**
     * Threshold for the number of logs to alarm on
     */
    readonly maxLogCount: number;
}
export declare class LogLevelAlarmFactory {
    protected readonly alarmFactory: AlarmFactory;
    constructor(alarmFactory: AlarmFactory);
    addLogCountAlarm(metric: MetricWithAlarmSupport, logLevel: LogLevel, props: LogLevelCountThreshold, disambiguator?: string): import("../../alarm").AlarmWithAnnotation;
}
