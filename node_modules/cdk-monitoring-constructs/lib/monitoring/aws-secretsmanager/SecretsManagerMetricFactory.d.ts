import { MetricFactory } from "../../common";
export declare class SecretsManagerMetricFactory {
    protected readonly metricFactory: MetricFactory;
    constructor(metricFactory: MetricFactory);
    metricSecretCount(): import("../../common").MetricWithAlarmSupport;
}
