import { Dashboard, DashboardProps, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";
import { BitmapDashboard } from "./BitmapDashboard";
/**
 * Composite dashboard which keeps a normal dashboard with its bitmap copy.
 * The bitmap copy name will be derived from the primary dashboard name, if specified.
 */
export declare class DashboardWithBitmapCopy extends Dashboard {
    protected readonly bitmapCopy: BitmapDashboard;
    constructor(scope: Construct, id: string, props: DashboardProps);
    addWidgets(...widgets: IWidget[]): void;
}
