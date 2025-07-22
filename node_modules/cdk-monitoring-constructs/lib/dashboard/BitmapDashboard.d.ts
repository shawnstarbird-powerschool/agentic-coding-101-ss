import { Dashboard, DashboardProps, IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";
import { BitmapWidgetRenderingSupport } from "./widget";
/**
 * Specific subtype of dashboard that renders supported widgets as bitmaps, while preserving the overall layout.
 */
export declare class BitmapDashboard extends Dashboard {
    protected readonly bitmapRenderingSupport: BitmapWidgetRenderingSupport;
    constructor(scope: Construct, id: string, props: DashboardProps);
    addWidgets(...widgets: IWidget[]): void;
    protected asBitmap(widget: IWidget): IWidget;
    protected asBitmaps(...widgets: IWidget[]): IWidget[];
}
