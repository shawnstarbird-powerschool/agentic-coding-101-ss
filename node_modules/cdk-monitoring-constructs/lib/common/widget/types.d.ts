import { GraphWidgetProps, IWidget } from "aws-cdk-lib/aws-cloudwatch";
export declare enum GraphWidgetType {
    BAR = "Bar",
    LINE = "Line",
    PIE = "Pie",
    SINGLE_VALUE = "SingleValue",
    STACKED_AREA = "StackedArea"
}
/**
 * Creates a graph widget of the desired type.
 *
 * @param type graph type (e.g. Pie or Bar)
 * @param props graph widget properties
 */
export declare function createGraphWidget(type: GraphWidgetType, props: GraphWidgetProps): IWidget;
