import { HeaderWidget } from "./HeaderWidget";
export interface MonitoringHeaderWidgetProps {
    readonly title: string;
    readonly family?: string;
    readonly goToLinkUrl?: string;
    readonly description?: string;
    readonly descriptionHeight?: number;
}
export declare class MonitoringHeaderWidget extends HeaderWidget {
    constructor(props: MonitoringHeaderWidgetProps);
    private static getText;
}
