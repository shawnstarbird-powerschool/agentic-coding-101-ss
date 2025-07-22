/**
 * Payload for creating a district-specific product record. There must already be a product
 * with the same product code in the database. This payload is used for the POST /products endpoint.
 */
export interface PostProduct {
  /**
   * The product code for the product. Example: 'QA'
   */
  productCode: string;

  /**
   * The district ID associated with the product. This is a unique identifier for the district.
   * Example: '12341234-1234-1324-1234-123413241234'
   */
  districtId: string;

  /**
   * The public key for the product. This is used for SSH key authentication.
   * Example: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCxyz integration-test-key-1'
   */
  publicKey: string;
}
