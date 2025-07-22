"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShortHash = exports.getHashForMetricExpressionId = exports.removeBracketsWithDynamicLabels = exports.capitalizeFirstLetterOnly = exports.capitalizeFirstLetter = void 0;
/**
 * matches all strings enclosed in brackets
 */
const STRINGS_IN_BRACKETS_REGEXP = /(\(.+?\))/g;
/**
 * matches one or more whitespace characters
 */
const ONE_OR_MORE_WHITESPACE_REGEXP = /\s+/g;
/**
 * something we can use to identify brackets with dynamic labels
 */
const DYNAMIC_LABEL_MARKER = "${";
/**
 * Capitalize first letter, leave the rest as-is.
 * @param str string to process
 */
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
exports.capitalizeFirstLetter = capitalizeFirstLetter;
/**
 * Capitalize first letter, make the rest lower-case.
 * @param str string to process
 */
function capitalizeFirstLetterOnly(str) {
    return capitalizeFirstLetter(str.toLowerCase());
}
exports.capitalizeFirstLetterOnly = capitalizeFirstLetterOnly;
/**
 * Removes pieces of string that are enclosed in brackets and contain placeholders.
 * For example, for "label (avg: ${AVG})" it returns "label".
 * This is useful for annotations, because they do not replace the placeholders properly.
 * @param label label to process
 */
function removeBracketsWithDynamicLabels(label) {
    let result = label;
    const stringsInBrackets = label.match(STRINGS_IN_BRACKETS_REGEXP);
    if (stringsInBrackets) {
        for (const stringInBrackets of stringsInBrackets) {
            if (stringInBrackets.includes(DYNAMIC_LABEL_MARKER)) {
                // if this bracket contains dynamic label, we just remove it
                result = result.replace(stringInBrackets, "");
            }
        }
    }
    // we can end up with some extra spaces, so let's fix it
    result = result.replace(ONE_OR_MORE_WHITESPACE_REGEXP, " ").trim();
    return result;
}
exports.removeBracketsWithDynamicLabels = removeBracketsWithDynamicLabels;
/**
 * Simple hashing function to generate hash-based metric expression ID.
 * This function is insecure and outputs a hexadecimal string.
 * @param str string to encode
 * @return hexadecimal hash
 */
function getHashForMetricExpressionId(str) {
    return getShortHash(str);
}
exports.getHashForMetricExpressionId = getHashForMetricExpressionId;
/**
 * Simple hashing function to generate short hash for the given string.
 * This function is insecure and outputs a hexadecimal string.
 * @param str string to encode
 * @return hexadecimal hash
 */
function getShortHash(str) {
    const seed = 31;
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 =
        Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
            Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 =
        Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
            Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const result = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return result.toString(16);
}
exports.getShortHash = getShortHash;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5ncy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInN0cmluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUE7O0dBRUc7QUFDSCxNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FBQztBQUNoRDs7R0FFRztBQUNILE1BQU0sNkJBQTZCLEdBQUcsTUFBTSxDQUFDO0FBQzdDOztHQUVHO0FBQ0gsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUM7QUFFbEM7OztHQUdHO0FBQ0gsU0FBZ0IscUJBQXFCLENBQUMsR0FBVztJQUMvQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRCxDQUFDO0FBRkQsc0RBRUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQix5QkFBeUIsQ0FBQyxHQUFXO0lBQ25ELE9BQU8scUJBQXFCLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUZELDhEQUVDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFnQiwrQkFBK0IsQ0FBQyxLQUFhO0lBQzNELElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztJQUNuQixNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUNsRSxJQUFJLGlCQUFpQixFQUFFO1FBQ3JCLEtBQUssTUFBTSxnQkFBZ0IsSUFBSSxpQkFBaUIsRUFBRTtZQUNoRCxJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFO2dCQUNuRCw0REFBNEQ7Z0JBQzVELE1BQU0sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQy9DO1NBQ0Y7S0FDRjtJQUNELHdEQUF3RDtJQUN4RCxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNuRSxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBZEQsMEVBY0M7QUFFRDs7Ozs7R0FLRztBQUNILFNBQWdCLDRCQUE0QixDQUFDLEdBQVc7SUFDdEQsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUZELG9FQUVDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxTQUFnQixZQUFZLENBQUMsR0FBVztJQUN0QyxNQUFNLElBQUksR0FBRyxFQUFFLENBQUM7SUFDaEIsSUFBSSxFQUFFLEdBQUcsVUFBVSxHQUFHLElBQUksQ0FBQztJQUMzQixJQUFJLEVBQUUsR0FBRyxVQUFVLEdBQUcsSUFBSSxDQUFDO0lBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN2QyxFQUFFLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3BDLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7S0FDckM7SUFDRCxFQUFFO1FBQ0EsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzFDLEVBQUU7UUFDQSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUM7WUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDMUMsTUFBTSxNQUFNLEdBQUcsVUFBVSxHQUFHLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3hELE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM3QixDQUFDO0FBakJELG9DQWlCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogbWF0Y2hlcyBhbGwgc3RyaW5ncyBlbmNsb3NlZCBpbiBicmFja2V0c1xuICovXG5jb25zdCBTVFJJTkdTX0lOX0JSQUNLRVRTX1JFR0VYUCA9IC8oXFwoLis/XFwpKS9nO1xuLyoqXG4gKiBtYXRjaGVzIG9uZSBvciBtb3JlIHdoaXRlc3BhY2UgY2hhcmFjdGVyc1xuICovXG5jb25zdCBPTkVfT1JfTU9SRV9XSElURVNQQUNFX1JFR0VYUCA9IC9cXHMrL2c7XG4vKipcbiAqIHNvbWV0aGluZyB3ZSBjYW4gdXNlIHRvIGlkZW50aWZ5IGJyYWNrZXRzIHdpdGggZHluYW1pYyBsYWJlbHNcbiAqL1xuY29uc3QgRFlOQU1JQ19MQUJFTF9NQVJLRVIgPSBcIiR7XCI7XG5cbi8qKlxuICogQ2FwaXRhbGl6ZSBmaXJzdCBsZXR0ZXIsIGxlYXZlIHRoZSByZXN0IGFzLWlzLlxuICogQHBhcmFtIHN0ciBzdHJpbmcgdG8gcHJvY2Vzc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2FwaXRhbGl6ZUZpcnN0TGV0dGVyKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHN0ci5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKTtcbn1cblxuLyoqXG4gKiBDYXBpdGFsaXplIGZpcnN0IGxldHRlciwgbWFrZSB0aGUgcmVzdCBsb3dlci1jYXNlLlxuICogQHBhcmFtIHN0ciBzdHJpbmcgdG8gcHJvY2Vzc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2FwaXRhbGl6ZUZpcnN0TGV0dGVyT25seShzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjYXBpdGFsaXplRmlyc3RMZXR0ZXIoc3RyLnRvTG93ZXJDYXNlKCkpO1xufVxuXG4vKipcbiAqIFJlbW92ZXMgcGllY2VzIG9mIHN0cmluZyB0aGF0IGFyZSBlbmNsb3NlZCBpbiBicmFja2V0cyBhbmQgY29udGFpbiBwbGFjZWhvbGRlcnMuXG4gKiBGb3IgZXhhbXBsZSwgZm9yIFwibGFiZWwgKGF2ZzogJHtBVkd9KVwiIGl0IHJldHVybnMgXCJsYWJlbFwiLlxuICogVGhpcyBpcyB1c2VmdWwgZm9yIGFubm90YXRpb25zLCBiZWNhdXNlIHRoZXkgZG8gbm90IHJlcGxhY2UgdGhlIHBsYWNlaG9sZGVycyBwcm9wZXJseS5cbiAqIEBwYXJhbSBsYWJlbCBsYWJlbCB0byBwcm9jZXNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVCcmFja2V0c1dpdGhEeW5hbWljTGFiZWxzKGxhYmVsOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgcmVzdWx0ID0gbGFiZWw7XG4gIGNvbnN0IHN0cmluZ3NJbkJyYWNrZXRzID0gbGFiZWwubWF0Y2goU1RSSU5HU19JTl9CUkFDS0VUU19SRUdFWFApO1xuICBpZiAoc3RyaW5nc0luQnJhY2tldHMpIHtcbiAgICBmb3IgKGNvbnN0IHN0cmluZ0luQnJhY2tldHMgb2Ygc3RyaW5nc0luQnJhY2tldHMpIHtcbiAgICAgIGlmIChzdHJpbmdJbkJyYWNrZXRzLmluY2x1ZGVzKERZTkFNSUNfTEFCRUxfTUFSS0VSKSkge1xuICAgICAgICAvLyBpZiB0aGlzIGJyYWNrZXQgY29udGFpbnMgZHluYW1pYyBsYWJlbCwgd2UganVzdCByZW1vdmUgaXRcbiAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2Uoc3RyaW5nSW5CcmFja2V0cywgXCJcIik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIHdlIGNhbiBlbmQgdXAgd2l0aCBzb21lIGV4dHJhIHNwYWNlcywgc28gbGV0J3MgZml4IGl0XG4gIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKE9ORV9PUl9NT1JFX1dISVRFU1BBQ0VfUkVHRVhQLCBcIiBcIikudHJpbSgpO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFNpbXBsZSBoYXNoaW5nIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGhhc2gtYmFzZWQgbWV0cmljIGV4cHJlc3Npb24gSUQuXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGluc2VjdXJlIGFuZCBvdXRwdXRzIGEgaGV4YWRlY2ltYWwgc3RyaW5nLlxuICogQHBhcmFtIHN0ciBzdHJpbmcgdG8gZW5jb2RlXG4gKiBAcmV0dXJuIGhleGFkZWNpbWFsIGhhc2hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEhhc2hGb3JNZXRyaWNFeHByZXNzaW9uSWQoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZ2V0U2hvcnRIYXNoKHN0cik7XG59XG5cbi8qKlxuICogU2ltcGxlIGhhc2hpbmcgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgc2hvcnQgaGFzaCBmb3IgdGhlIGdpdmVuIHN0cmluZy5cbiAqIFRoaXMgZnVuY3Rpb24gaXMgaW5zZWN1cmUgYW5kIG91dHB1dHMgYSBoZXhhZGVjaW1hbCBzdHJpbmcuXG4gKiBAcGFyYW0gc3RyIHN0cmluZyB0byBlbmNvZGVcbiAqIEByZXR1cm4gaGV4YWRlY2ltYWwgaGFzaFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hvcnRIYXNoKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3Qgc2VlZCA9IDMxO1xuICBsZXQgaDEgPSAweGRlYWRiZWVmIF4gc2VlZDtcbiAgbGV0IGgyID0gMHg0MWM2Y2U1NyBeIHNlZWQ7XG4gIGZvciAobGV0IGkgPSAwLCBjaDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGNoID0gc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgaDEgPSBNYXRoLmltdWwoaDEgXiBjaCwgMjY1NDQzNTc2MSk7XG4gICAgaDIgPSBNYXRoLmltdWwoaDIgXiBjaCwgMTU5NzMzNDY3Nyk7XG4gIH1cbiAgaDEgPVxuICAgIE1hdGguaW11bChoMSBeIChoMSA+Pj4gMTYpLCAyMjQ2ODIyNTA3KSBeXG4gICAgTWF0aC5pbXVsKGgyIF4gKGgyID4+PiAxMyksIDMyNjY0ODk5MDkpO1xuICBoMiA9XG4gICAgTWF0aC5pbXVsKGgyIF4gKGgyID4+PiAxNiksIDIyNDY4MjI1MDcpIF5cbiAgICBNYXRoLmltdWwoaDEgXiAoaDEgPj4+IDEzKSwgMzI2NjQ4OTkwOSk7XG4gIGNvbnN0IHJlc3VsdCA9IDQyOTQ5NjcyOTYgKiAoMjA5NzE1MSAmIGgyKSArIChoMSA+Pj4gMCk7XG4gIHJldHVybiByZXN1bHQudG9TdHJpbmcoMTYpO1xufVxuIl19