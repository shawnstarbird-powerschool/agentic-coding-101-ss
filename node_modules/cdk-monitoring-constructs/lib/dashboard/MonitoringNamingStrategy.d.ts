import { IConstruct } from "constructs";
export interface NameResolutionInput extends UserProvidedNames {
    /**
     * Construct that this naming strategy is naming.
     * It is used as a last resort for naming.
     */
    readonly namedConstruct?: IConstruct;
    /**
     * Fallback name before we fallback to extracting name from the construct itself.
     * This might be some construct reference, such is cluster ID, stream name, and so on.
     *
     * @default - use namedConstruct to extract the name
     */
    readonly fallbackConstructName?: string;
}
export interface UserProvidedNames {
    /**
     * Human-readable name is a freeform string, used as a caption or description.
     * There are no limitations on what it can be.
     *
     * @default - use alarmFriendlyName
     */
    readonly humanReadableName?: string;
    /**
     * Plain name, used in naming alarms. This unique among other resources, and respect the AWS CDK restriction posed on alarm names.
     * The length must be 1 - 255 characters and although the validation rules are undocumented, we recommend using ASCII and hyphens.
     *
     * @default - derives name from the construct itself
     */
    readonly alarmFriendlyName?: string;
    /**
     * If this is defined, the local alarm name prefix used in naming alarms for the construct will be set to this value.
     * The length must be 1 - 255 characters and although the validation rules are undocumented, we recommend using ASCII and hyphens.
     * @see AlarmNamingStrategy for more details on alarm name prefixes
     */
    readonly localAlarmNamePrefixOverride?: string;
}
/**
 * Utility class to unify approach to naming monitoring sections.
 * @see https://docs.aws.amazon.com/cdk/latest/guide/tokens.html#tokens_lazy
 */
export declare class MonitoringNamingStrategy {
    protected readonly input: NameResolutionInput;
    constructor(input: NameResolutionInput);
    resolveAlarmFriendlyName(): string;
    resolveHumanReadableName(): string;
    static isAlarmFriendly(str: string): boolean | "";
    private getFallbackAlarmFriendlyName;
    private getFallbackHumanReadableName;
    private static isNonBlank;
}
