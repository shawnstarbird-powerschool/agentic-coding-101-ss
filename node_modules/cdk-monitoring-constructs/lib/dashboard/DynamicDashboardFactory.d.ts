import { Duration } from "aws-cdk-lib";
import { Dashboard, DashboardProps, PeriodOverride } from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";
import { DashboardRenderingPreference } from "./DashboardRenderingPreference";
import { IDynamicDashboardSegment } from "./DynamicDashboardSegment";
import { IDynamicDashboardFactory } from "./IDynamicDashboardFactory";
export interface DynamicDashboardConfiguration {
    /**
     * Name of the dashboard. Full dashboard name will take the form of:
     * `{@link MonitoringDynamicDashboardsProps.dashboardNamePrefix}-{@link name}`
     *
     * NOTE: The dashboard names in {@link DefaultDashboardFactory.DefaultDashboards}
     * are reserved and cannot be used as dashboard names.
     */
    readonly name: string;
    /**
     * Dashboard rendering preference.
     *
     * @default - DashboardRenderingPreference.INTERACTIVE_ONLY
     */
    readonly renderingPreference?: DashboardRenderingPreference;
    /**
     * Range of the dashboard
     * @default - 8 hours
     */
    readonly range?: Duration;
    /**
     * Period override for the dashboard.
     * @default - respect individual graphs (PeriodOverride.INHERIT)
     */
    readonly periodOverride?: PeriodOverride;
}
export interface MonitoringDynamicDashboardsProps {
    /**
     * Prefix added to each dashboard's name.
     * This allows to have all dashboards sorted close to each other and also separate multiple monitoring facades.
     */
    readonly dashboardNamePrefix: string;
    /**
     * List of dashboard types to generate.
     */
    readonly dashboardConfigs: DynamicDashboardConfiguration[];
}
export declare class DynamicDashboardFactory extends Construct implements IDynamicDashboardFactory {
    readonly dashboards: Record<string, Dashboard>;
    constructor(scope: Construct, id: string, props: MonitoringDynamicDashboardsProps);
    protected createDashboard(renderingPreference: DashboardRenderingPreference, id: string, props: DashboardProps): Dashboard;
    addDynamicSegment(segment: IDynamicDashboardSegment): void;
    getDashboard(type: string): Dashboard | undefined;
}
