import { Duration } from "aws-cdk-lib";
import { Dashboard, DashboardProps, PeriodOverride } from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";
import { DashboardRenderingPreference } from "./DashboardRenderingPreference";
import { IDynamicDashboardSegment } from "./DynamicDashboardSegment";
import { IDashboardFactory, IDashboardFactoryProps } from "./IDashboardFactory";
import { IDynamicDashboardFactory } from "./IDynamicDashboardFactory";
export interface MonitoringDashboardsProps {
    /**
     * Prefix added to each dashboard name.
     * This allows to have all dashboards sorted close to each other and also separate multiple monitoring facades.
     */
    readonly dashboardNamePrefix: string;
    /**
     * Range of the detail dashboard (and other auxiliary dashboards).
     * @default - 8 hours
     * @see DefaultDetailDashboardRange
     */
    readonly detailDashboardRange?: Duration;
    /**
     * Period override for the detail dashboard (and other auxiliary dashboards).
     * @default - respect individual graphs (PeriodOverride.INHERIT)
     */
    readonly detailDashboardPeriodOverride?: PeriodOverride;
    /**
     * Range of the summary dashboard.
     * @default - 14 days
     */
    readonly summaryDashboardRange?: Duration;
    /**
     * Period override for the summary dashboard.
     * @default - respect individual graphs (PeriodOverride.INHERIT)
     */
    readonly summaryDashboardPeriodOverride?: PeriodOverride;
    /**
     * Flag indicating whether the default dashboard should be created.
     * This is independent on other create dashboard flags.
     *
     * @default - true
     */
    readonly createDashboard?: boolean;
    /**
     * Flag indicating whether the summary dashboard should be created.
     * This is independent on other create dashboard flags.
     *
     * @default - false
     */
    readonly createSummaryDashboard?: boolean;
    /**
     * Flag indicating whether the alarm dashboard should be created.
     * This is independent on other create dashboard flags.
     *
     * @default - false
     */
    readonly createAlarmDashboard?: boolean;
    /**
     * Dashboard rendering preference.
     *
     * @default - DashboardRenderingPreference.INTERACTIVE_ONLY
     */
    readonly renderingPreference?: DashboardRenderingPreference;
}
export declare enum DefaultDashboards {
    SUMMARY = "Summary",
    DETAIL = "Detail",
    ALARMS = "Alarms"
}
export declare class DefaultDashboardFactory extends Construct implements IDashboardFactory, IDynamicDashboardFactory {
    readonly dashboard?: Dashboard;
    readonly summaryDashboard?: Dashboard;
    readonly alarmDashboard?: Dashboard;
    readonly anyDashboardCreated: boolean;
    readonly dashboards: Record<string, Dashboard>;
    constructor(scope: Construct, id: string, props: MonitoringDashboardsProps);
    addSegment(props: IDashboardFactoryProps): void;
    addDynamicSegment(segment: IDynamicDashboardSegment): void;
    protected createDashboard(renderingPreference: DashboardRenderingPreference, id: string, props: DashboardProps): Dashboard;
    createdDashboard(): Dashboard | undefined;
    createdSummaryDashboard(): Dashboard | undefined;
    createdAlarmDashboard(): Dashboard | undefined;
    getDashboard(name: string): Dashboard | undefined;
}
