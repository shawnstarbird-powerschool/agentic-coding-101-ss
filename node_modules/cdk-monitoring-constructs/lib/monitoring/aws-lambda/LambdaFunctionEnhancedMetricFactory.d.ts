import { IFunction } from "aws-cdk-lib/aws-lambda";
import { MetricFactory } from "../../common";
export declare class LambdaFunctionEnhancedMetricFactory {
    protected readonly metricFactory: MetricFactory;
    protected readonly lambdaFunction: IFunction;
    constructor(metricFactory: MetricFactory, lambdaFunction: IFunction);
    enhancedMetricMaxCpuTotalTime(): import("../../common").MetricWithAlarmSupport;
    enhancedMetricP90CpuTotalTime(): import("../../common").MetricWithAlarmSupport;
    enhancedMetricAvgCpuTotalTime(): import("../../common").MetricWithAlarmSupport;
    enhancedMetricMaxMemoryUtilization(): import("../../common").MetricWithAlarmSupport;
    enhancedMetricP90MemoryUtilization(): import("../../common").MetricWithAlarmSupport;
    enhancedMetricAvgMemoryUtilization(): import("../../common").MetricWithAlarmSupport;
    enhancedMetricFunctionCost(): import("../../common").MetricWithAlarmSupport;
    private enhancedMetricFunctionDuration;
    private enhancedMetric;
}
