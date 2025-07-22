import { TextWidget } from "aws-cdk-lib/aws-cloudwatch";
export declare enum HeaderLevel {
    LARGE = 0,
    MEDIUM = 1,
    SMALL = 2
}
export declare class HeaderWidget extends TextWidget {
    constructor(text: string, level?: HeaderLevel, description?: string, descriptionHeight?: number);
    private static calculateHeight;
    private static toMarkdown;
    private static toHeaderMarkdown;
}
