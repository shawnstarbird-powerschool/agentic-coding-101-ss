"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardRenderingPreference = void 0;
/**
 * Preferred way of rendering dashboard widgets.
 */
var DashboardRenderingPreference;
(function (DashboardRenderingPreference) {
    /**
     * Create standard set of dashboards with interactive widgets only
     */
    DashboardRenderingPreference[DashboardRenderingPreference["INTERACTIVE_ONLY"] = 0] = "INTERACTIVE_ONLY";
    /**
     * Create standard set of dashboards with bitmap widgets only
     */
    DashboardRenderingPreference[DashboardRenderingPreference["BITMAP_ONLY"] = 1] = "BITMAP_ONLY";
    /**
     * Create a two sets of dashboards: standard set (interactive) and a copy (bitmap)
     */
    DashboardRenderingPreference[DashboardRenderingPreference["INTERACTIVE_AND_BITMAP"] = 2] = "INTERACTIVE_AND_BITMAP";
})(DashboardRenderingPreference = exports.DashboardRenderingPreference || (exports.DashboardRenderingPreference = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGFzaGJvYXJkUmVuZGVyaW5nUHJlZmVyZW5jZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkRhc2hib2FyZFJlbmRlcmluZ1ByZWZlcmVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7O0dBRUc7QUFDSCxJQUFZLDRCQWVYO0FBZkQsV0FBWSw0QkFBNEI7SUFDdEM7O09BRUc7SUFDSCx1R0FBZ0IsQ0FBQTtJQUVoQjs7T0FFRztJQUNILDZGQUFXLENBQUE7SUFFWDs7T0FFRztJQUNILG1IQUFzQixDQUFBO0FBQ3hCLENBQUMsRUFmVyw0QkFBNEIsR0FBNUIsb0NBQTRCLEtBQTVCLG9DQUE0QixRQWV2QyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUHJlZmVycmVkIHdheSBvZiByZW5kZXJpbmcgZGFzaGJvYXJkIHdpZGdldHMuXG4gKi9cbmV4cG9ydCBlbnVtIERhc2hib2FyZFJlbmRlcmluZ1ByZWZlcmVuY2Uge1xuICAvKipcbiAgICogQ3JlYXRlIHN0YW5kYXJkIHNldCBvZiBkYXNoYm9hcmRzIHdpdGggaW50ZXJhY3RpdmUgd2lkZ2V0cyBvbmx5XG4gICAqL1xuICBJTlRFUkFDVElWRV9PTkxZLFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgc3RhbmRhcmQgc2V0IG9mIGRhc2hib2FyZHMgd2l0aCBiaXRtYXAgd2lkZ2V0cyBvbmx5XG4gICAqL1xuICBCSVRNQVBfT05MWSxcblxuICAvKipcbiAgICogQ3JlYXRlIGEgdHdvIHNldHMgb2YgZGFzaGJvYXJkczogc3RhbmRhcmQgc2V0IChpbnRlcmFjdGl2ZSkgYW5kIGEgY29weSAoYml0bWFwKVxuICAgKi9cbiAgSU5URVJBQ1RJVkVfQU5EX0JJVE1BUCxcbn1cbiJdfQ==