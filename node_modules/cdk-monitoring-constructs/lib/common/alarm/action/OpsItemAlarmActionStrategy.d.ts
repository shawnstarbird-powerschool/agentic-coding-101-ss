import { OpsItemCategory, OpsItemSeverity } from "aws-cdk-lib/aws-cloudwatch-actions";
import { AlarmActionStrategyProps, IAlarmActionStrategy } from "./IAlarmActionStrategy";
/**
 * Creates an AWS OpsCenter OpsItem with critical severity.
 *
 * @param category optional category (no category by default)
 */
export declare function createCriticalSeverityOpsItem(category?: OpsItemCategory): OpsItemAlarmActionStrategy;
/**
 * Creates an AWS OpsCenter OpsItem with high severity.
 *
 * @param category optional category (no category by default)
 */
export declare function createHighSeverityOpsItem(category?: OpsItemCategory): OpsItemAlarmActionStrategy;
/**
 * Creates an AWS OpsCenter OpsItem with medium severity.
 *
 * @param category optional category (no category by default)
 */
export declare function createMediumSeverityOpsItem(category?: OpsItemCategory): OpsItemAlarmActionStrategy;
/**
 * Creates an AWS OpsCenter OpsItem with low severity.
 *
 * @param category optional category (no category by default)
 */
export declare function createLowSeverityOpsItem(category?: OpsItemCategory): OpsItemAlarmActionStrategy;
/**
 * Creates an AWS OpsCenter OpsItem.
 *
 * @param severity desired item severity
 * @param category optional category (no category by default)
 */
export declare function createOpsItem(severity: OpsItemSeverity, category?: OpsItemCategory): OpsItemAlarmActionStrategy;
/**
 * Alarm action strategy that creates an AWS OpsCenter OpsItem.
 */
export declare class OpsItemAlarmActionStrategy implements IAlarmActionStrategy {
    /**
     * OPS Item Severity
     */
    readonly severity: OpsItemSeverity;
    /**
     * OPS Item Category
     */
    readonly category?: OpsItemCategory;
    constructor(severity: OpsItemSeverity, category?: OpsItemCategory);
    addAlarmActions(props: AlarmActionStrategyProps): void;
}
