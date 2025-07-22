/**
 * Capitalize first letter, leave the rest as-is.
 * @param str string to process
 */
export declare function capitalizeFirstLetter(str: string): string;
/**
 * Capitalize first letter, make the rest lower-case.
 * @param str string to process
 */
export declare function capitalizeFirstLetterOnly(str: string): string;
/**
 * Removes pieces of string that are enclosed in brackets and contain placeholders.
 * For example, for "label (avg: ${AVG})" it returns "label".
 * This is useful for annotations, because they do not replace the placeholders properly.
 * @param label label to process
 */
export declare function removeBracketsWithDynamicLabels(label: string): string;
/**
 * Simple hashing function to generate hash-based metric expression ID.
 * This function is insecure and outputs a hexadecimal string.
 * @param str string to encode
 * @return hexadecimal hash
 */
export declare function getHashForMetricExpressionId(str: string): string;
/**
 * Simple hashing function to generate short hash for the given string.
 * This function is insecure and outputs a hexadecimal string.
 * @param str string to encode
 * @return hexadecimal hash
 */
export declare function getShortHash(str: string): string;
