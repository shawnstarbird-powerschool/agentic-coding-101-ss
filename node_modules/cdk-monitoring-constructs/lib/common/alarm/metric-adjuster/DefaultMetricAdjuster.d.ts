import { Construct } from "constructs";
import { IMetricAdjuster } from "./IMetricAdjuster";
import { MetricWithAlarmSupport } from "../../metric";
import { AddAlarmProps } from "../AlarmFactory";
/**
 * Applies the default metric adjustments.
 * These adjustments are always applied last, regardless the value configured in {@link AddAlarmProps.metricAdjuster}.
 */
export declare class DefaultMetricAdjuster implements IMetricAdjuster {
    static readonly INSTANCE: DefaultMetricAdjuster;
    /** @inheritdoc */
    adjustMetric(metric: MetricWithAlarmSupport, _: Construct, props: AddAlarmProps): MetricWithAlarmSupport;
}
