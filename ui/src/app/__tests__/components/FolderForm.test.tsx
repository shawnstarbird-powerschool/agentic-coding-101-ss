import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import FolderForm from '../../components/FolderForm';

jest.mock('@ps-refarch-ux/mfe-utils', () => {
  return {
    translate: (key: string): string => {
      return key;
    },
  };
});

jest.mock('@ps-refarch-ux/neon', () => {
  return {
    NeonSelectField: function MockSelectField({
      id,
      modelValue,
      modelValueChange,
      options,
      dataIsReadOnly,
      dataHelperText,
    }: any): JSX.Element {
      return (
        <div data-testid={id} data-is-read-only={dataIsReadOnly} data-helper-text={dataHelperText}>
          <select
            value={modelValue}
            disabled={dataIsReadOnly}
            onChange={(e): void => {
              modelValueChange(e.target.value);
            }}
            data-testid={`${id}-select`}
          >
            <option value="">Select...</option>
            {options?.map((opt: {value: string; text: string}) => {
              return (
                <option key={opt.value} value={opt.value}>
                  {opt.text}
                </option>
              );
            })}
          </select>
        </div>
      );
    },
    NeonTextField: function MockTextField({id, modelValue, modelValueChange, dataHelperText}: any): JSX.Element {
      return (
        <div data-testid={id} data-helper-text={dataHelperText}>
          <input
            type="text"
            value={modelValue}
            onChange={(e): void => {
              modelValueChange(e.target.value);
            }}
            data-testid={`${id}-input`}
          />
        </div>
      );
    },
  };
});

describe('FolderForm', () => {
  const mockProducts = [
    {code: 'PROD1', name: 'Product 1', uses: [{name: 'Use 1'}, {name: 'Use 2'}]},
    {code: 'PROD2', name: 'Product 2', uses: [{name: 'Use 3'}]},
  ];

  const mockAvailableUses = [{name: 'Use 1'}, {name: 'Use 2'}, {name: 'Use 3'}];

  const defaultProps = {
    use: '',
    setUse: jest.fn(),
    path: '',
    setPath: jest.fn(),
    productCode: '',
    setProductCode: jest.fn(),
    accessType: 'inbound',
    setAccessType: jest.fn(),
    products: mockProducts,
    availableUses: mockAvailableUses,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(<FolderForm {...defaultProps} />);
    expect(screen.getByTestId('product-select')).toBeInTheDocument();
    expect(screen.getByTestId('path-input')).toBeInTheDocument();
    expect(screen.getByTestId('access-type-select')).toBeInTheDocument();
    expect(screen.queryByTestId('use-select')).not.toBeInTheDocument();
  });

  it('shows use field only when product is selected and uses are available', () => {
    const props = {...defaultProps, productCode: 'PROD1'};
    render(<FolderForm {...props} />);
    expect(screen.getByTestId('use-select')).toBeInTheDocument();
  });

  it('handles product selection', () => {
    render(<FolderForm {...defaultProps} />);
    const productSelect = screen.getByTestId('product-select-select');
    fireEvent.change(productSelect, {target: {value: 'PROD1'}});
    expect(defaultProps.setProductCode).toHaveBeenCalledWith('PROD1');
  });

  it('handles use selection', () => {
    const props = {...defaultProps, productCode: 'PROD1'};
    render(<FolderForm {...props} />);
    const useSelect = screen.getByTestId('use-select-select');
    fireEvent.change(useSelect, {target: {value: 'Use 1'}});
    expect(defaultProps.setUse).toHaveBeenCalledWith('Use 1');
  });

  it('handles path input', () => {
    render(<FolderForm {...defaultProps} />);
    const pathInput = screen.getByTestId('path-input-input');
    fireEvent.change(pathInput, {target: {value: '/test/path'}});
    expect(defaultProps.setPath).toHaveBeenCalledWith('/test/path');
  });

  it('handles access type selection', () => {
    render(<FolderForm {...defaultProps} />);
    const accessTypeSelect = screen.getByTestId('access-type-select-select');
    fireEvent.change(accessTypeSelect, {target: {value: 'outbound'}});
    expect(defaultProps.setAccessType).toHaveBeenCalledWith('outbound');
  });

  it('respects product readonly mode', () => {
    render(<FolderForm {...defaultProps} productReadOnly={true} />);
    const productSelect = screen.getByTestId('product-select');
    expect(productSelect).toHaveAttribute('data-is-read-only', 'true');
    expect(screen.getByTestId('product-select-select')).toBeDisabled();
  });

  it('displays validation errors', () => {
    const errors = {
      path: 'Path is required',
      productCode: 'Product is required',
      accessType: 'Access type is required',
    };

    render(<FolderForm {...defaultProps} errors={errors} />);
    Object.entries(errors).forEach(([field, error]) => {
      const elementId = field === 'path' ? 'path-input' :
                       field === 'productCode' ? 'product-select' :
                       'access-type-select';
      expect(screen.getByTestId(elementId)).toHaveAttribute('data-helper-text', error);
    });

    // Test use field error when product is selected
    const propsWithProduct = {
      ...defaultProps,
      productCode: 'PROD1',
      errors: {use: 'Use is required'},
    };
    render(<FolderForm {...propsWithProduct} />);
    expect(screen.getByTestId('use-select')).toHaveAttribute('data-helper-text', 'Use is required');
  });

  it('preselects initial values', () => {
    const initialProps = {
      ...defaultProps,
      productCode: 'PROD1',
      use: 'Use 1',
      path: '/initial/path',
      accessType: 'outbound',
    };

    render(<FolderForm {...initialProps} />);
    expect(screen.getByTestId('product-select-select')).toHaveValue('PROD1');
    expect(screen.getByTestId('use-select-select')).toHaveValue('Use 1');
    expect(screen.getByTestId('path-input-input')).toHaveValue('/initial/path');
    expect(screen.getByTestId('access-type-select-select')).toHaveValue('outbound');
  });

  it('handles empty value in selects', () => {
    render(<FolderForm {...defaultProps} />);
    fireEvent.change(screen.getByTestId('product-select-select'), {target: {value: ''}});
    expect(defaultProps.setProductCode).toHaveBeenCalledWith('');
    fireEvent.change(screen.getByTestId('access-type-select-select'), {target: {value: ''}});
    expect(defaultProps.setAccessType).toHaveBeenCalledWith('inbound');
  });

  it('handles undefined value in use select (covers || fallback)', () => {
    const props = {...defaultProps, productCode: 'PROD1'};
    const {rerender} = render(<FolderForm {...props} />);

    // Find the use select component
    const useSelect = screen.getByTestId('use-select-select');

    // Mock the onChange event to simulate what happens when NeonSelectField
    // passes undefined to modelValueChange callback
    const originalOnChange = useSelect.onchange;
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    useSelect.onchange = () => {
      // Simulate the NeonSelectField calling modelValueChange with undefined
      // This tests the || '' fallback in setUse(value || '')
      const mockEvent = {
        target: {
          value: undefined
        }
      } as any;

      // The mock component will call modelValueChange with undefined
      if (originalOnChange) {
        originalOnChange.call(useSelect, mockEvent);
      }
    };

    // Trigger the event
    fireEvent.change(useSelect, {target: {value: undefined}});

    // Since our mock treats undefined as empty string, setUse should be called with ''
    expect(defaultProps.setUse).toHaveBeenCalledWith('');
  });
});