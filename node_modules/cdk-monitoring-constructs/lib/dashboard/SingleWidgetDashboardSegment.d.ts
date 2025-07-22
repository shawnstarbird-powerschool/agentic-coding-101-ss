import { IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { IDashboardSegment } from "./DashboardSegment";
import { IDynamicDashboardSegment } from "./DynamicDashboardSegment";
export declare class SingleWidgetDashboardSegment implements IDashboardSegment, IDynamicDashboardSegment {
    protected readonly widget: IWidget;
    protected readonly dashboardsToInclude: string[];
    /**
     * Create a dashboard segment representing a single widget.
     * @param widget widget to add
     * @param dashboardsToInclude list of dashboard names which to show this widget on. Defaults to the default dashboards.
     */
    constructor(widget: IWidget, dashboardsToInclude?: string[]);
    widgetsForDashboard(name: string): IWidget[];
    alarmWidgets(): IWidget[];
    summaryWidgets(): IWidget[];
    widgets(): IWidget[];
}
