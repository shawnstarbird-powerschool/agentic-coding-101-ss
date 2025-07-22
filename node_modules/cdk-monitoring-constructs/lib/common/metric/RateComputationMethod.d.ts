/**
 * Enumeration of different rate computation methods.
 */
export declare enum RateComputationMethod {
    /**
     * Number of occurrences relative to requests.
     * Less sensitive than per-second when TPS > 1.
     */
    AVERAGE = 0,
    /**
     * Number of occurrences per second.
     * More sensitive than average when TPS > 1.
     */
    PER_SECOND = 1,
    /**
     * Number of occurrences per minute.
     */
    PER_MINUTE = 2,
    /**
     * Number of occurrences per hour.
     */
    PER_HOUR = 3,
    /**
     * Number of occurrences per day.
     */
    PER_DAY = 4
}
