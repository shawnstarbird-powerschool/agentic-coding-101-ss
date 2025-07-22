import { TextWidget } from "aws-cdk-lib/aws-cloudwatch";
export declare class KeyValueTableWidget extends TextWidget {
    constructor(data: [string, string][]);
    private static toMarkdown;
}
