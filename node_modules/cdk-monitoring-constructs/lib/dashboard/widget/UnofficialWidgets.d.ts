import { ConcreteWidget, MetricWidgetProps } from "aws-cdk-lib/aws-cloudwatch";
export interface AlarmSummaryMatrixWidgetProps extends MetricWidgetProps {
    readonly alarmArns: string[];
}
export interface AlarmSummaryMatrixWidgetPropertiesJson {
    readonly title?: string;
    readonly alarms: string[];
}
export declare class AlarmSummaryMatrixWidget extends ConcreteWidget {
    protected readonly props: AlarmSummaryMatrixWidgetProps;
    constructor(props: AlarmSummaryMatrixWidgetProps);
    toJson(): any[];
}
