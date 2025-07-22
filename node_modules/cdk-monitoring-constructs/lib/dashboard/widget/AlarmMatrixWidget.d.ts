import { AlarmStatusWidget, IAlarm } from "aws-cdk-lib/aws-cloudwatch";
export interface AlarmMatrixWidgetProps {
    /**
     * widget title
     * @default - no title
     */
    readonly title?: string;
    /**
     * desired height
     * @default - auto calculated based on alarm number (3 to 8)
     */
    readonly height?: number;
    /**
     * list of alarms to show
     */
    readonly alarms: IAlarm[];
}
/**
 * Wrapper of Alarm Status Widget which auto-calcultes height based on the number of alarms.
 * Always takes the maximum width.
 */
export declare class AlarmMatrixWidget extends AlarmStatusWidget {
    constructor(props: AlarmMatrixWidgetProps);
    private static getRecommendedHeight;
}
