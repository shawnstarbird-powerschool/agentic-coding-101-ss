"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateComputationMethod = void 0;
/**
 * Enumeration of different rate computation methods.
 */
var RateComputationMethod;
(function (RateComputationMethod) {
    /**
     * Number of occurrences relative to requests.
     * Less sensitive than per-second when TPS > 1.
     */
    RateComputationMethod[RateComputationMethod["AVERAGE"] = 0] = "AVERAGE";
    /**
     * Number of occurrences per second.
     * More sensitive than average when TPS > 1.
     */
    RateComputationMethod[RateComputationMethod["PER_SECOND"] = 1] = "PER_SECOND";
    /**
     * Number of occurrences per minute.
     */
    RateComputationMethod[RateComputationMethod["PER_MINUTE"] = 2] = "PER_MINUTE";
    /**
     * Number of occurrences per hour.
     */
    RateComputationMethod[RateComputationMethod["PER_HOUR"] = 3] = "PER_HOUR";
    /**
     * Number of occurrences per day.
     */
    RateComputationMethod[RateComputationMethod["PER_DAY"] = 4] = "PER_DAY";
})(RateComputationMethod = exports.RateComputationMethod || (exports.RateComputationMethod = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmF0ZUNvbXB1dGF0aW9uTWV0aG9kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUmF0ZUNvbXB1dGF0aW9uTWV0aG9kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOztHQUVHO0FBQ0gsSUFBWSxxQkF1Qlg7QUF2QkQsV0FBWSxxQkFBcUI7SUFDL0I7OztPQUdHO0lBQ0gsdUVBQU8sQ0FBQTtJQUNQOzs7T0FHRztJQUNILDZFQUFVLENBQUE7SUFDVjs7T0FFRztJQUNILDZFQUFVLENBQUE7SUFDVjs7T0FFRztJQUNILHlFQUFRLENBQUE7SUFDUjs7T0FFRztJQUNILHVFQUFPLENBQUE7QUFDVCxDQUFDLEVBdkJXLHFCQUFxQixHQUFyQiw2QkFBcUIsS0FBckIsNkJBQXFCLFFBdUJoQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRW51bWVyYXRpb24gb2YgZGlmZmVyZW50IHJhdGUgY29tcHV0YXRpb24gbWV0aG9kcy5cbiAqL1xuZXhwb3J0IGVudW0gUmF0ZUNvbXB1dGF0aW9uTWV0aG9kIHtcbiAgLyoqXG4gICAqIE51bWJlciBvZiBvY2N1cnJlbmNlcyByZWxhdGl2ZSB0byByZXF1ZXN0cy5cbiAgICogTGVzcyBzZW5zaXRpdmUgdGhhbiBwZXItc2Vjb25kIHdoZW4gVFBTID4gMS5cbiAgICovXG4gIEFWRVJBR0UsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2Ygb2NjdXJyZW5jZXMgcGVyIHNlY29uZC5cbiAgICogTW9yZSBzZW5zaXRpdmUgdGhhbiBhdmVyYWdlIHdoZW4gVFBTID4gMS5cbiAgICovXG4gIFBFUl9TRUNPTkQsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2Ygb2NjdXJyZW5jZXMgcGVyIG1pbnV0ZS5cbiAgICovXG4gIFBFUl9NSU5VVEUsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2Ygb2NjdXJyZW5jZXMgcGVyIGhvdXIuXG4gICAqL1xuICBQRVJfSE9VUixcbiAgLyoqXG4gICAqIE51bWJlciBvZiBvY2N1cnJlbmNlcyBwZXIgZGF5LlxuICAgKi9cbiAgUEVSX0RBWSxcbn1cbiJdfQ==