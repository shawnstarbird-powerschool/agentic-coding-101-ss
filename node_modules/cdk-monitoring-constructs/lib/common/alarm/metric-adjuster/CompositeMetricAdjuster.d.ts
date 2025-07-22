import { Construct } from "constructs";
import { IMetricAdjuster } from "./IMetricAdjuster";
import { MetricWithAlarmSupport } from "../../metric";
import { AddAlarmProps } from "../AlarmFactory";
/**
 * Allows to apply a collection of {@link IMetricAdjuster} to a metric.
 */
export declare class CompositeMetricAdjuster implements IMetricAdjuster {
    private readonly adjusters;
    constructor(adjusters: IMetricAdjuster[]);
    static of(...adjusters: IMetricAdjuster[]): CompositeMetricAdjuster;
    /** @inheritdoc */
    adjustMetric(metric: MetricWithAlarmSupport, alarmScope: Construct, props: AddAlarmProps): MetricWithAlarmSupport;
}
