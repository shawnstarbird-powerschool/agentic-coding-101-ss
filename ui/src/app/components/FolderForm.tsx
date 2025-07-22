import {translate} from '@ps-refarch-ux/mfe-utils';
import {
  NeonSelectField,
  NeonTextField
} from '@ps-refarch-ux/neon';
import React from 'react';

interface Product {
  code: string;
  name: string;
  uses?: Array<{name: string}>;
}

interface FolderFormProps {
  // Form fields
  use: string;
  setUse: (value: string) => void;
  path: string;
  setPath: (value: string) => void;
  productCode: string;
  setProductCode: (value: string) => void;
  accessType: string;
  setAccessType: (value: string) => void;

  // Available options
  products: Array<Product>;
  availableUses: Array<{name: string}>;

  // Product code read-only mode (for edit)
  productReadOnly?: boolean;

  // Validation errors
  errors?: {
    use?: string;
    path?: string;
    productCode?: string;
    accessType?: string;
  };
}

export default function FolderForm({
  use,
  setUse,
  path,
  setPath,
  productCode,
  setProductCode,
  accessType,
  setAccessType,
  products,
  availableUses,
  productReadOnly = false,
  errors = {}
}: FolderFormProps): React.ReactElement {
  return (
    <div className="__neon__form">
      <NeonSelectField
        id="product-select"
        dataLabelText={translate('powerschoolftp.product')}
        dataIsRequired="true"
        dataSize="large"
        dataIsReadOnly={productReadOnly}
        modelValue={productCode}
        dataHelperText={errors?.productCode}
        options={products.map((product) => { return {
          text: product.name,
          value: product.code
        }; })}
        modelValueChange={(value: string | undefined): void => {
          setProductCode(value || '');
        }}
      />

      {productCode && availableUses.length > 0 && (
        <NeonSelectField
          id="use-select"
          dataLabelText={translate('powerschoolftp.use')}
          dataIsRequired="true"
          dataSize="large"
          modelValue={use}
          dataHelperText={errors?.use}
          options={availableUses.map((useOption) => { return {
            text: useOption.name,
            value: useOption.name
          }; })}
          modelValueChange={(value: string | undefined): void => {
            setUse(value || '');
          }}
        />
      )}

      <NeonTextField
        id="path-input"
        dataLabelText={translate('powerschoolftp.path')}
        dataIsRequired="true"
        dataSize="large"
        modelValue={path}
        dataHelperText={errors?.path}
        modelValueChange={(value: string): void => {
          setPath(value);
        }}
      />

      <NeonSelectField
        id="access-type-select"
        dataLabelText={translate('powerschoolftp.access_type')}
        dataIsRequired="true"
        dataSize="large"
        modelValue={accessType}
        dataHelperText={errors?.accessType}
        options={[
          {
            text: translate('powerschoolftp.inbound'),
            value: 'inbound'
          },
          {
            text: translate('powerschoolftp.outbound'),
            value: 'outbound'
          }
        ]}
        modelValueChange={(value: string | undefined): void => {
          setAccessType(value || 'inbound');
        }}
      />
    </div>
  );
}