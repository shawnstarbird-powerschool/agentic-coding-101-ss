import { IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { CustomWidget } from "./CustomWidget";
/**
 * Support for rendering bitmap widgets on the server side.
 * It is a custom widget lambda with some additional roles and helper methods.
 */
export declare class BitmapWidgetRenderingSupport extends Construct {
    readonly handler: IFunction;
    constructor(scope: Construct, id: string);
    asBitmap(widget: IWidget): CustomWidget;
    protected getWidgetProperties(widget: IWidget): any;
}
