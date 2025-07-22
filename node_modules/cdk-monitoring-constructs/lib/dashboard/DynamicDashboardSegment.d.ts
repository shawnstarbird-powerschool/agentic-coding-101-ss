import { IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { IDashboardFactoryProps } from "./IDashboardFactory";
export interface IDynamicDashboardSegment {
    /**
     * Returns widgets for the requested dashboard type.
     * @param name name of dashboard for which widgets are generated.
     */
    widgetsForDashboard(name: string): IWidget[];
}
export declare class StaticSegmentDynamicAdapter implements IDynamicDashboardSegment {
    protected readonly props: IDashboardFactoryProps;
    constructor(props: IDashboardFactoryProps);
    /**
     * Adapts an IDashboardSegment to the IDynamicDashboardSegment interface by using
     * overrideProps to determine if a segment should be shown on a specific dashboard.
     * The default values are true, so consumers must set these to false if they would
     * like to hide these items from dashboards
     */
    widgetsForDashboard(name: string): IWidget[];
}
