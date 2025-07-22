/**
 * Preferred way of rendering dashboard widgets.
 */
export declare enum DashboardRenderingPreference {
    /**
     * Create standard set of dashboards with interactive widgets only
     */
    INTERACTIVE_ONLY = 0,
    /**
     * Create standard set of dashboards with bitmap widgets only
     */
    BITMAP_ONLY = 1,
    /**
     * Create a two sets of dashboards: standard set (interactive) and a copy (bitmap)
     */
    INTERACTIVE_AND_BITMAP = 2
}
