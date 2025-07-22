"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricStatistic = void 0;
/**
 * Metric aggregation statistic to be used with the IMetric objects.
 *
 * @see https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Statistics-definitions.html
 */
var MetricStatistic;
(function (MetricStatistic) {
    /**
     * 50th percentile of all datapoints
     */
    MetricStatistic["P50"] = "p50";
    /**
     * 70th percentile of all datapoints
     */
    MetricStatistic["P70"] = "p70";
    /**
     * 90th percentile of all datapoints
     */
    MetricStatistic["P90"] = "p90";
    /**
     * 95th percentile of all datapoints
     */
    MetricStatistic["P95"] = "p95";
    /**
     * 99th percentile of all datapoints
     */
    MetricStatistic["P99"] = "p99";
    /**
     * 99.9th percentile of all datapoints
     */
    MetricStatistic["P999"] = "p99.9";
    /**
     * 99.99th percentile of all datapoints
     */
    MetricStatistic["P9999"] = "p99.99";
    /**
     * 100th percentile of all datapoints
     */
    MetricStatistic["P100"] = "p100";
    /**
     * trimmed mean; calculates the average after removing the 50% of data points with the highest values
     */
    MetricStatistic["TM50"] = "tm50";
    /**
     * trimmed mean; calculates the average after removing the 30% of data points with the highest values
     */
    MetricStatistic["TM70"] = "tm70";
    /**
     * trimmed mean; calculates the average after removing the 10% of data points with the highest values
     */
    MetricStatistic["TM90"] = "tm90";
    /**
     * trimmed mean; calculates the average after removing the 5% of data points with the highest values
     */
    MetricStatistic["TM95"] = "tm95";
    /**
     * trimmed mean; calculates the average after removing the 1% of data points with the highest values
     */
    MetricStatistic["TM99"] = "tm99";
    /**
     * trimmed mean; calculates the average after removing the 0.1% of data points with the highest values
     */
    MetricStatistic["TM999"] = "tm99.9";
    /**
     * trimmed mean; calculates the average after removing the 0.01% of data points with the highest values
     */
    MetricStatistic["TM9999"] = "tm99.99";
    /**
     * trimmed mean; calculates the average after removing the 1% lowest data points and the 1% highest data points
     */
    MetricStatistic["TM99_BOTH"] = "TM(1%:99%)";
    /**
     * trimmed mean; calculates the average after removing the 5% lowest data points and the 5% highest data points
     */
    MetricStatistic["TM95_BOTH"] = "TM(5%:95%)";
    /**
     * trimmed mean; calculates the average after removing the 10% lowest data points and the 10% highest data points
     */
    MetricStatistic["TM90_BOTH"] = "TM(10%:90%)";
    /**
     * trimmed mean; calculates the average after removing the 15% lowest data points and the 15% highest data points
     */
    MetricStatistic["TM85_BOTH"] = "TM(15%:85%)";
    /**
     * trimmed mean; calculates the average after removing the 20% lowest data points and the 20% highest data points
     */
    MetricStatistic["TM80_BOTH"] = "TM(20%:80%)";
    /**
     * trimmed mean; calculates the average after removing the 25% lowest data points and the 25% highest data points
     */
    MetricStatistic["TM75_BOTH"] = "TM(25%:75%)";
    /**
     * trimmed mean; calculates the average after removing the 30% lowest data points and the 30% highest data points
     */
    MetricStatistic["TM70_BOTH"] = "TM(30%:70%)";
    /**
     * trimmed mean; calculates the average after removing the 95% lowest data points
     */
    MetricStatistic["TM95_TOP"] = "TM(95%:100%)";
    /**
     * trimmed mean; calculates the average after removing the 99% lowest data points
     */
    MetricStatistic["TM99_TOP"] = "TM(99%:100%)";
    /**
     * trimmed mean; calculates the average after removing the 99.9% lowest data points
     */
    MetricStatistic["TM999_TOP"] = "TM(99.9%:100%)";
    /**
     * trimmed mean; calculates the average after removing the 99.99% lowest data points
     */
    MetricStatistic["TM9999_TOP"] = "TM(99.99%:100%)";
    /**
     * winsorized mean; calculates the average while treating the 50% of the highest values to be equal to the value at the 50th percentile
     */
    MetricStatistic["WM50"] = "wm50";
    /**
     * winsorized mean; calculates the average while treating the 30% of the highest values to be equal to the value at the 70th percentile
     */
    MetricStatistic["WM70"] = "wm70";
    /**
     * winsorized mean; calculates the average while treating the 10% of the highest values to be equal to the value at the 90th percentile
     */
    MetricStatistic["WM90"] = "wm90";
    /**
     * winsorized mean; calculates the average while treating the 5% of the highest values to be equal to the value at the 95th percentile
     */
    MetricStatistic["WM95"] = "wm95";
    /**
     * winsorized mean; calculates the average while treating the 1% of the highest values to be equal to the value at the 99th percentile
     */
    MetricStatistic["WM99"] = "wm99";
    /**
     * winsorized mean; calculates the average while treating the 0.1% of the highest values to be equal to the value at the 99.9th percentile
     */
    MetricStatistic["WM999"] = "wm99.9";
    /**
     * winsorized mean; calculates the average while treating the 0.01% of the highest values to be equal to the value at the 99.99th percentile
     */
    MetricStatistic["WM9999"] = "wm99.99";
    /**
     * winsorized mean; calculates the average while treating the highest 1% of data points to be the value of the 99% boundary, and treating the lowest 1% of data points to be the value of the 1% boundary
     */
    MetricStatistic["WM99_BOTH"] = "WM(1%:99%)";
    /**
     * winsorized mean; calculates the average while treating the highest 5% of data points to be the value of the 95% boundary, and treating the lowest 5% of data points to be the value of the 5% boundary
     */
    MetricStatistic["WM95_BOTH"] = "WM(5%:95%)";
    /**
     * winsorized mean; calculates the average while treating the highest 10% of data points to be the value of the 90% boundary, and treating the lowest 10% of data points to be the value of the 10% boundary
     */
    MetricStatistic["WM90_BOTH"] = "WM(10%:90%)";
    /**
     * winsorized mean; calculates the average while treating the highest 15% of data points to be the value of the 85% boundary, and treating the lowest 15% of data points to be the value of the 15% boundary
     */
    MetricStatistic["WM85_BOTH"] = "WM(15%:85%)";
    /**
     * winsorized mean; calculates the average while treating the highest 20% of data points to be the value of the 80% boundary, and treating the lowest 20% of data points to be the value of the 20% boundary
     */
    MetricStatistic["WM80_BOTH"] = "WM(20%:80%)";
    /**
     * winsorized mean; calculates the average while treating the highest 25% of data points to be the value of the 75% boundary, and treating the lowest 25% of data points to be the value of the 25% boundary
     */
    MetricStatistic["WM75_BOTH"] = "WM(25%:75%)";
    /**
     * winsorized mean; calculates the average while treating the highest 30% of data points to be the value of the 70% boundary, and treating the lowest 30% of data points to be the value of the 30% boundary
     */
    MetricStatistic["WM70_BOTH"] = "WM(30%:70%)";
    /**
     * minimum of all datapoints
     */
    MetricStatistic["MIN"] = "Minimum";
    /**
     * maximum of all datapoints
     */
    MetricStatistic["MAX"] = "Maximum";
    /**
     * sum of all datapoints
     */
    MetricStatistic["SUM"] = "Sum";
    /**
     * average of all datapoints
     */
    MetricStatistic["AVERAGE"] = "Average";
    /**
     * number of datapoints
     */
    MetricStatistic["N"] = "SampleCount";
})(MetricStatistic = exports.MetricStatistic || (exports.MetricStatistic = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWV0cmljU3RhdGlzdGljLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiTWV0cmljU3RhdGlzdGljLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7O0dBSUc7QUFDSCxJQUFZLGVBMExYO0FBMUxELFdBQVksZUFBZTtJQUN6Qjs7T0FFRztJQUNILDhCQUFXLENBQUE7SUFDWDs7T0FFRztJQUNILDhCQUFXLENBQUE7SUFDWDs7T0FFRztJQUNILDhCQUFXLENBQUE7SUFDWDs7T0FFRztJQUNILDhCQUFXLENBQUE7SUFDWDs7T0FFRztJQUNILDhCQUFXLENBQUE7SUFDWDs7T0FFRztJQUNILGlDQUFjLENBQUE7SUFDZDs7T0FFRztJQUNILG1DQUFnQixDQUFBO0lBQ2hCOztPQUVHO0lBQ0gsZ0NBQWEsQ0FBQTtJQUViOztPQUVHO0lBQ0gsZ0NBQWEsQ0FBQTtJQUNiOztPQUVHO0lBQ0gsZ0NBQWEsQ0FBQTtJQUNiOztPQUVHO0lBQ0gsZ0NBQWEsQ0FBQTtJQUNiOztPQUVHO0lBQ0gsZ0NBQWEsQ0FBQTtJQUNiOztPQUVHO0lBQ0gsZ0NBQWEsQ0FBQTtJQUNiOztPQUVHO0lBQ0gsbUNBQWdCLENBQUE7SUFDaEI7O09BRUc7SUFDSCxxQ0FBa0IsQ0FBQTtJQUVsQjs7T0FFRztJQUNILDJDQUF3QixDQUFBO0lBQ3hCOztPQUVHO0lBQ0gsMkNBQXdCLENBQUE7SUFDeEI7O09BRUc7SUFDSCw0Q0FBeUIsQ0FBQTtJQUN6Qjs7T0FFRztJQUNILDRDQUF5QixDQUFBO0lBQ3pCOztPQUVHO0lBQ0gsNENBQXlCLENBQUE7SUFDekI7O09BRUc7SUFDSCw0Q0FBeUIsQ0FBQTtJQUN6Qjs7T0FFRztJQUNILDRDQUF5QixDQUFBO0lBRXpCOztPQUVHO0lBQ0gsNENBQXlCLENBQUE7SUFDekI7O09BRUc7SUFDSCw0Q0FBeUIsQ0FBQTtJQUN6Qjs7T0FFRztJQUNILCtDQUE0QixDQUFBO0lBQzVCOztPQUVHO0lBQ0gsaURBQThCLENBQUE7SUFFOUI7O09BRUc7SUFDSCxnQ0FBYSxDQUFBO0lBQ2I7O09BRUc7SUFDSCxnQ0FBYSxDQUFBO0lBQ2I7O09BRUc7SUFDSCxnQ0FBYSxDQUFBO0lBQ2I7O09BRUc7SUFDSCxnQ0FBYSxDQUFBO0lBQ2I7O09BRUc7SUFDSCxnQ0FBYSxDQUFBO0lBQ2I7O09BRUc7SUFDSCxtQ0FBZ0IsQ0FBQTtJQUNoQjs7T0FFRztJQUNILHFDQUFrQixDQUFBO0lBQ2xCOztPQUVHO0lBQ0gsMkNBQXdCLENBQUE7SUFDeEI7O09BRUc7SUFDSCwyQ0FBd0IsQ0FBQTtJQUN4Qjs7T0FFRztJQUNILDRDQUF5QixDQUFBO0lBQ3pCOztPQUVHO0lBQ0gsNENBQXlCLENBQUE7SUFDekI7O09BRUc7SUFDSCw0Q0FBeUIsQ0FBQTtJQUN6Qjs7T0FFRztJQUNILDRDQUF5QixDQUFBO0lBQ3pCOztPQUVHO0lBQ0gsNENBQXlCLENBQUE7SUFFekI7O09BRUc7SUFDSCxrQ0FBZSxDQUFBO0lBQ2Y7O09BRUc7SUFDSCxrQ0FBZSxDQUFBO0lBQ2Y7O09BRUc7SUFDSCw4QkFBVyxDQUFBO0lBQ1g7O09BRUc7SUFDSCxzQ0FBbUIsQ0FBQTtJQUNuQjs7T0FFRztJQUNILG9DQUFpQixDQUFBO0FBQ25CLENBQUMsRUExTFcsZUFBZSxHQUFmLHVCQUFlLEtBQWYsdUJBQWUsUUEwTDFCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBNZXRyaWMgYWdncmVnYXRpb24gc3RhdGlzdGljIHRvIGJlIHVzZWQgd2l0aCB0aGUgSU1ldHJpYyBvYmplY3RzLlxuICpcbiAqIEBzZWUgaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL0FtYXpvbkNsb3VkV2F0Y2gvbGF0ZXN0L21vbml0b3JpbmcvU3RhdGlzdGljcy1kZWZpbml0aW9ucy5odG1sXG4gKi9cbmV4cG9ydCBlbnVtIE1ldHJpY1N0YXRpc3RpYyB7XG4gIC8qKlxuICAgKiA1MHRoIHBlcmNlbnRpbGUgb2YgYWxsIGRhdGFwb2ludHNcbiAgICovXG4gIFA1MCA9IFwicDUwXCIsXG4gIC8qKlxuICAgKiA3MHRoIHBlcmNlbnRpbGUgb2YgYWxsIGRhdGFwb2ludHNcbiAgICovXG4gIFA3MCA9IFwicDcwXCIsXG4gIC8qKlxuICAgKiA5MHRoIHBlcmNlbnRpbGUgb2YgYWxsIGRhdGFwb2ludHNcbiAgICovXG4gIFA5MCA9IFwicDkwXCIsXG4gIC8qKlxuICAgKiA5NXRoIHBlcmNlbnRpbGUgb2YgYWxsIGRhdGFwb2ludHNcbiAgICovXG4gIFA5NSA9IFwicDk1XCIsXG4gIC8qKlxuICAgKiA5OXRoIHBlcmNlbnRpbGUgb2YgYWxsIGRhdGFwb2ludHNcbiAgICovXG4gIFA5OSA9IFwicDk5XCIsXG4gIC8qKlxuICAgKiA5OS45dGggcGVyY2VudGlsZSBvZiBhbGwgZGF0YXBvaW50c1xuICAgKi9cbiAgUDk5OSA9IFwicDk5LjlcIixcbiAgLyoqXG4gICAqIDk5Ljk5dGggcGVyY2VudGlsZSBvZiBhbGwgZGF0YXBvaW50c1xuICAgKi9cbiAgUDk5OTkgPSBcInA5OS45OVwiLFxuICAvKipcbiAgICogMTAwdGggcGVyY2VudGlsZSBvZiBhbGwgZGF0YXBvaW50c1xuICAgKi9cbiAgUDEwMCA9IFwicDEwMFwiLFxuXG4gIC8qKlxuICAgKiB0cmltbWVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2UgYWZ0ZXIgcmVtb3ZpbmcgdGhlIDUwJSBvZiBkYXRhIHBvaW50cyB3aXRoIHRoZSBoaWdoZXN0IHZhbHVlc1xuICAgKi9cbiAgVE01MCA9IFwidG01MFwiLFxuICAvKipcbiAgICogdHJpbW1lZCBtZWFuOyBjYWxjdWxhdGVzIHRoZSBhdmVyYWdlIGFmdGVyIHJlbW92aW5nIHRoZSAzMCUgb2YgZGF0YSBwb2ludHMgd2l0aCB0aGUgaGlnaGVzdCB2YWx1ZXNcbiAgICovXG4gIFRNNzAgPSBcInRtNzBcIixcbiAgLyoqXG4gICAqIHRyaW1tZWQgbWVhbjsgY2FsY3VsYXRlcyB0aGUgYXZlcmFnZSBhZnRlciByZW1vdmluZyB0aGUgMTAlIG9mIGRhdGEgcG9pbnRzIHdpdGggdGhlIGhpZ2hlc3QgdmFsdWVzXG4gICAqL1xuICBUTTkwID0gXCJ0bTkwXCIsXG4gIC8qKlxuICAgKiB0cmltbWVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2UgYWZ0ZXIgcmVtb3ZpbmcgdGhlIDUlIG9mIGRhdGEgcG9pbnRzIHdpdGggdGhlIGhpZ2hlc3QgdmFsdWVzXG4gICAqL1xuICBUTTk1ID0gXCJ0bTk1XCIsXG4gIC8qKlxuICAgKiB0cmltbWVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2UgYWZ0ZXIgcmVtb3ZpbmcgdGhlIDElIG9mIGRhdGEgcG9pbnRzIHdpdGggdGhlIGhpZ2hlc3QgdmFsdWVzXG4gICAqL1xuICBUTTk5ID0gXCJ0bTk5XCIsXG4gIC8qKlxuICAgKiB0cmltbWVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2UgYWZ0ZXIgcmVtb3ZpbmcgdGhlIDAuMSUgb2YgZGF0YSBwb2ludHMgd2l0aCB0aGUgaGlnaGVzdCB2YWx1ZXNcbiAgICovXG4gIFRNOTk5ID0gXCJ0bTk5LjlcIixcbiAgLyoqXG4gICAqIHRyaW1tZWQgbWVhbjsgY2FsY3VsYXRlcyB0aGUgYXZlcmFnZSBhZnRlciByZW1vdmluZyB0aGUgMC4wMSUgb2YgZGF0YSBwb2ludHMgd2l0aCB0aGUgaGlnaGVzdCB2YWx1ZXNcbiAgICovXG4gIFRNOTk5OSA9IFwidG05OS45OVwiLFxuXG4gIC8qKlxuICAgKiB0cmltbWVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2UgYWZ0ZXIgcmVtb3ZpbmcgdGhlIDElIGxvd2VzdCBkYXRhIHBvaW50cyBhbmQgdGhlIDElIGhpZ2hlc3QgZGF0YSBwb2ludHNcbiAgICovXG4gIFRNOTlfQk9USCA9IFwiVE0oMSU6OTklKVwiLFxuICAvKipcbiAgICogdHJpbW1lZCBtZWFuOyBjYWxjdWxhdGVzIHRoZSBhdmVyYWdlIGFmdGVyIHJlbW92aW5nIHRoZSA1JSBsb3dlc3QgZGF0YSBwb2ludHMgYW5kIHRoZSA1JSBoaWdoZXN0IGRhdGEgcG9pbnRzXG4gICAqL1xuICBUTTk1X0JPVEggPSBcIlRNKDUlOjk1JSlcIixcbiAgLyoqXG4gICAqIHRyaW1tZWQgbWVhbjsgY2FsY3VsYXRlcyB0aGUgYXZlcmFnZSBhZnRlciByZW1vdmluZyB0aGUgMTAlIGxvd2VzdCBkYXRhIHBvaW50cyBhbmQgdGhlIDEwJSBoaWdoZXN0IGRhdGEgcG9pbnRzXG4gICAqL1xuICBUTTkwX0JPVEggPSBcIlRNKDEwJTo5MCUpXCIsXG4gIC8qKlxuICAgKiB0cmltbWVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2UgYWZ0ZXIgcmVtb3ZpbmcgdGhlIDE1JSBsb3dlc3QgZGF0YSBwb2ludHMgYW5kIHRoZSAxNSUgaGlnaGVzdCBkYXRhIHBvaW50c1xuICAgKi9cbiAgVE04NV9CT1RIID0gXCJUTSgxNSU6ODUlKVwiLFxuICAvKipcbiAgICogdHJpbW1lZCBtZWFuOyBjYWxjdWxhdGVzIHRoZSBhdmVyYWdlIGFmdGVyIHJlbW92aW5nIHRoZSAyMCUgbG93ZXN0IGRhdGEgcG9pbnRzIGFuZCB0aGUgMjAlIGhpZ2hlc3QgZGF0YSBwb2ludHNcbiAgICovXG4gIFRNODBfQk9USCA9IFwiVE0oMjAlOjgwJSlcIixcbiAgLyoqXG4gICAqIHRyaW1tZWQgbWVhbjsgY2FsY3VsYXRlcyB0aGUgYXZlcmFnZSBhZnRlciByZW1vdmluZyB0aGUgMjUlIGxvd2VzdCBkYXRhIHBvaW50cyBhbmQgdGhlIDI1JSBoaWdoZXN0IGRhdGEgcG9pbnRzXG4gICAqL1xuICBUTTc1X0JPVEggPSBcIlRNKDI1JTo3NSUpXCIsXG4gIC8qKlxuICAgKiB0cmltbWVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2UgYWZ0ZXIgcmVtb3ZpbmcgdGhlIDMwJSBsb3dlc3QgZGF0YSBwb2ludHMgYW5kIHRoZSAzMCUgaGlnaGVzdCBkYXRhIHBvaW50c1xuICAgKi9cbiAgVE03MF9CT1RIID0gXCJUTSgzMCU6NzAlKVwiLFxuXG4gIC8qKlxuICAgKiB0cmltbWVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2UgYWZ0ZXIgcmVtb3ZpbmcgdGhlIDk1JSBsb3dlc3QgZGF0YSBwb2ludHNcbiAgICovXG4gIFRNOTVfVE9QID0gXCJUTSg5NSU6MTAwJSlcIixcbiAgLyoqXG4gICAqIHRyaW1tZWQgbWVhbjsgY2FsY3VsYXRlcyB0aGUgYXZlcmFnZSBhZnRlciByZW1vdmluZyB0aGUgOTklIGxvd2VzdCBkYXRhIHBvaW50c1xuICAgKi9cbiAgVE05OV9UT1AgPSBcIlRNKDk5JToxMDAlKVwiLFxuICAvKipcbiAgICogdHJpbW1lZCBtZWFuOyBjYWxjdWxhdGVzIHRoZSBhdmVyYWdlIGFmdGVyIHJlbW92aW5nIHRoZSA5OS45JSBsb3dlc3QgZGF0YSBwb2ludHNcbiAgICovXG4gIFRNOTk5X1RPUCA9IFwiVE0oOTkuOSU6MTAwJSlcIixcbiAgLyoqXG4gICAqIHRyaW1tZWQgbWVhbjsgY2FsY3VsYXRlcyB0aGUgYXZlcmFnZSBhZnRlciByZW1vdmluZyB0aGUgOTkuOTklIGxvd2VzdCBkYXRhIHBvaW50c1xuICAgKi9cbiAgVE05OTk5X1RPUCA9IFwiVE0oOTkuOTklOjEwMCUpXCIsXG5cbiAgLyoqXG4gICAqIHdpbnNvcml6ZWQgbWVhbjsgY2FsY3VsYXRlcyB0aGUgYXZlcmFnZSB3aGlsZSB0cmVhdGluZyB0aGUgNTAlIG9mIHRoZSBoaWdoZXN0IHZhbHVlcyB0byBiZSBlcXVhbCB0byB0aGUgdmFsdWUgYXQgdGhlIDUwdGggcGVyY2VudGlsZVxuICAgKi9cbiAgV001MCA9IFwid201MFwiLFxuICAvKipcbiAgICogd2luc29yaXplZCBtZWFuOyBjYWxjdWxhdGVzIHRoZSBhdmVyYWdlIHdoaWxlIHRyZWF0aW5nIHRoZSAzMCUgb2YgdGhlIGhpZ2hlc3QgdmFsdWVzIHRvIGJlIGVxdWFsIHRvIHRoZSB2YWx1ZSBhdCB0aGUgNzB0aCBwZXJjZW50aWxlXG4gICAqL1xuICBXTTcwID0gXCJ3bTcwXCIsXG4gIC8qKlxuICAgKiB3aW5zb3JpemVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2Ugd2hpbGUgdHJlYXRpbmcgdGhlIDEwJSBvZiB0aGUgaGlnaGVzdCB2YWx1ZXMgdG8gYmUgZXF1YWwgdG8gdGhlIHZhbHVlIGF0IHRoZSA5MHRoIHBlcmNlbnRpbGVcbiAgICovXG4gIFdNOTAgPSBcIndtOTBcIixcbiAgLyoqXG4gICAqIHdpbnNvcml6ZWQgbWVhbjsgY2FsY3VsYXRlcyB0aGUgYXZlcmFnZSB3aGlsZSB0cmVhdGluZyB0aGUgNSUgb2YgdGhlIGhpZ2hlc3QgdmFsdWVzIHRvIGJlIGVxdWFsIHRvIHRoZSB2YWx1ZSBhdCB0aGUgOTV0aCBwZXJjZW50aWxlXG4gICAqL1xuICBXTTk1ID0gXCJ3bTk1XCIsXG4gIC8qKlxuICAgKiB3aW5zb3JpemVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2Ugd2hpbGUgdHJlYXRpbmcgdGhlIDElIG9mIHRoZSBoaWdoZXN0IHZhbHVlcyB0byBiZSBlcXVhbCB0byB0aGUgdmFsdWUgYXQgdGhlIDk5dGggcGVyY2VudGlsZVxuICAgKi9cbiAgV005OSA9IFwid205OVwiLFxuICAvKipcbiAgICogd2luc29yaXplZCBtZWFuOyBjYWxjdWxhdGVzIHRoZSBhdmVyYWdlIHdoaWxlIHRyZWF0aW5nIHRoZSAwLjElIG9mIHRoZSBoaWdoZXN0IHZhbHVlcyB0byBiZSBlcXVhbCB0byB0aGUgdmFsdWUgYXQgdGhlIDk5Ljl0aCBwZXJjZW50aWxlXG4gICAqL1xuICBXTTk5OSA9IFwid205OS45XCIsXG4gIC8qKlxuICAgKiB3aW5zb3JpemVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2Ugd2hpbGUgdHJlYXRpbmcgdGhlIDAuMDElIG9mIHRoZSBoaWdoZXN0IHZhbHVlcyB0byBiZSBlcXVhbCB0byB0aGUgdmFsdWUgYXQgdGhlIDk5Ljk5dGggcGVyY2VudGlsZVxuICAgKi9cbiAgV005OTk5ID0gXCJ3bTk5Ljk5XCIsXG4gIC8qKlxuICAgKiB3aW5zb3JpemVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2Ugd2hpbGUgdHJlYXRpbmcgdGhlIGhpZ2hlc3QgMSUgb2YgZGF0YSBwb2ludHMgdG8gYmUgdGhlIHZhbHVlIG9mIHRoZSA5OSUgYm91bmRhcnksIGFuZCB0cmVhdGluZyB0aGUgbG93ZXN0IDElIG9mIGRhdGEgcG9pbnRzIHRvIGJlIHRoZSB2YWx1ZSBvZiB0aGUgMSUgYm91bmRhcnlcbiAgICovXG4gIFdNOTlfQk9USCA9IFwiV00oMSU6OTklKVwiLFxuICAvKipcbiAgICogd2luc29yaXplZCBtZWFuOyBjYWxjdWxhdGVzIHRoZSBhdmVyYWdlIHdoaWxlIHRyZWF0aW5nIHRoZSBoaWdoZXN0IDUlIG9mIGRhdGEgcG9pbnRzIHRvIGJlIHRoZSB2YWx1ZSBvZiB0aGUgOTUlIGJvdW5kYXJ5LCBhbmQgdHJlYXRpbmcgdGhlIGxvd2VzdCA1JSBvZiBkYXRhIHBvaW50cyB0byBiZSB0aGUgdmFsdWUgb2YgdGhlIDUlIGJvdW5kYXJ5XG4gICAqL1xuICBXTTk1X0JPVEggPSBcIldNKDUlOjk1JSlcIixcbiAgLyoqXG4gICAqIHdpbnNvcml6ZWQgbWVhbjsgY2FsY3VsYXRlcyB0aGUgYXZlcmFnZSB3aGlsZSB0cmVhdGluZyB0aGUgaGlnaGVzdCAxMCUgb2YgZGF0YSBwb2ludHMgdG8gYmUgdGhlIHZhbHVlIG9mIHRoZSA5MCUgYm91bmRhcnksIGFuZCB0cmVhdGluZyB0aGUgbG93ZXN0IDEwJSBvZiBkYXRhIHBvaW50cyB0byBiZSB0aGUgdmFsdWUgb2YgdGhlIDEwJSBib3VuZGFyeVxuICAgKi9cbiAgV005MF9CT1RIID0gXCJXTSgxMCU6OTAlKVwiLFxuICAvKipcbiAgICogd2luc29yaXplZCBtZWFuOyBjYWxjdWxhdGVzIHRoZSBhdmVyYWdlIHdoaWxlIHRyZWF0aW5nIHRoZSBoaWdoZXN0IDE1JSBvZiBkYXRhIHBvaW50cyB0byBiZSB0aGUgdmFsdWUgb2YgdGhlIDg1JSBib3VuZGFyeSwgYW5kIHRyZWF0aW5nIHRoZSBsb3dlc3QgMTUlIG9mIGRhdGEgcG9pbnRzIHRvIGJlIHRoZSB2YWx1ZSBvZiB0aGUgMTUlIGJvdW5kYXJ5XG4gICAqL1xuICBXTTg1X0JPVEggPSBcIldNKDE1JTo4NSUpXCIsXG4gIC8qKlxuICAgKiB3aW5zb3JpemVkIG1lYW47IGNhbGN1bGF0ZXMgdGhlIGF2ZXJhZ2Ugd2hpbGUgdHJlYXRpbmcgdGhlIGhpZ2hlc3QgMjAlIG9mIGRhdGEgcG9pbnRzIHRvIGJlIHRoZSB2YWx1ZSBvZiB0aGUgODAlIGJvdW5kYXJ5LCBhbmQgdHJlYXRpbmcgdGhlIGxvd2VzdCAyMCUgb2YgZGF0YSBwb2ludHMgdG8gYmUgdGhlIHZhbHVlIG9mIHRoZSAyMCUgYm91bmRhcnlcbiAgICovXG4gIFdNODBfQk9USCA9IFwiV00oMjAlOjgwJSlcIixcbiAgLyoqXG4gICAqIHdpbnNvcml6ZWQgbWVhbjsgY2FsY3VsYXRlcyB0aGUgYXZlcmFnZSB3aGlsZSB0cmVhdGluZyB0aGUgaGlnaGVzdCAyNSUgb2YgZGF0YSBwb2ludHMgdG8gYmUgdGhlIHZhbHVlIG9mIHRoZSA3NSUgYm91bmRhcnksIGFuZCB0cmVhdGluZyB0aGUgbG93ZXN0IDI1JSBvZiBkYXRhIHBvaW50cyB0byBiZSB0aGUgdmFsdWUgb2YgdGhlIDI1JSBib3VuZGFyeVxuICAgKi9cbiAgV003NV9CT1RIID0gXCJXTSgyNSU6NzUlKVwiLFxuICAvKipcbiAgICogd2luc29yaXplZCBtZWFuOyBjYWxjdWxhdGVzIHRoZSBhdmVyYWdlIHdoaWxlIHRyZWF0aW5nIHRoZSBoaWdoZXN0IDMwJSBvZiBkYXRhIHBvaW50cyB0byBiZSB0aGUgdmFsdWUgb2YgdGhlIDcwJSBib3VuZGFyeSwgYW5kIHRyZWF0aW5nIHRoZSBsb3dlc3QgMzAlIG9mIGRhdGEgcG9pbnRzIHRvIGJlIHRoZSB2YWx1ZSBvZiB0aGUgMzAlIGJvdW5kYXJ5XG4gICAqL1xuICBXTTcwX0JPVEggPSBcIldNKDMwJTo3MCUpXCIsXG5cbiAgLyoqXG4gICAqIG1pbmltdW0gb2YgYWxsIGRhdGFwb2ludHNcbiAgICovXG4gIE1JTiA9IFwiTWluaW11bVwiLFxuICAvKipcbiAgICogbWF4aW11bSBvZiBhbGwgZGF0YXBvaW50c1xuICAgKi9cbiAgTUFYID0gXCJNYXhpbXVtXCIsXG4gIC8qKlxuICAgKiBzdW0gb2YgYWxsIGRhdGFwb2ludHNcbiAgICovXG4gIFNVTSA9IFwiU3VtXCIsXG4gIC8qKlxuICAgKiBhdmVyYWdlIG9mIGFsbCBkYXRhcG9pbnRzXG4gICAqL1xuICBBVkVSQUdFID0gXCJBdmVyYWdlXCIsXG4gIC8qKlxuICAgKiBudW1iZXIgb2YgZGF0YXBvaW50c1xuICAgKi9cbiAgTiA9IFwiU2FtcGxlQ291bnRcIixcbn1cbiJdfQ==