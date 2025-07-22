/**
 * Strategy used to finalize dedupe string.
 */
export interface IAlarmDedupeStringProcessor {
    /**
     * Process the dedupe string which was specified by the user as an override.
     *
     * @param dedupeString
     * @return final dedupe string
     */
    processDedupeStringOverride(dedupeString: string): string;
    /**
     * Process the dedupe string which was auto-generated.
     *
     * @param dedupeString
     * @return final dedupe string
     */
    processDedupeString(dedupeString: string): string;
}
/**
 * Dedupe string processor that adds prefix and/or suffix to the dedupe string.
 */
export declare class ExtendDedupeString implements IAlarmDedupeStringProcessor {
    private readonly prefix;
    private readonly suffix;
    constructor(prefix?: string, suffix?: string);
    processDedupeString(dedupeString: string): string;
    processDedupeStringOverride(dedupeString: string): string;
}
/**
 * Default dedupe strategy - does not add any prefix nor suffix.
 */
export declare class DoNotModifyDedupeString extends ExtendDedupeString {
}
