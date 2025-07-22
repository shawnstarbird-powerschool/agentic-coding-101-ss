export function getBucketEnvNameForKey(key: string): string {
  return `TRANSFER_BUCKET_${key.toUpperCase()}`;
}

export function getBucketNameKey(
  productCode: string,
  direction: 'int' | 'ext'
): string {
  return `${productCode}_${direction.toUpperCase()}`;
}

export function getBucketEnvName(
  productCode: string,
  direction: 'int' | 'ext'
) {
  return getBucketEnvNameForKey(getBucketNameKey(productCode, direction));
}
