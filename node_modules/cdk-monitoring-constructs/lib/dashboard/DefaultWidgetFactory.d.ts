import { IWidget } from "aws-cdk-lib/aws-cloudwatch";
import { IWidgetFactory } from "./IWidgetFactory";
import { AlarmWithAnnotation } from "../common";
export declare class DefaultWidgetFactory implements IWidgetFactory {
    createAlarmDetailWidget(alarm: AlarmWithAnnotation): IWidget;
}
