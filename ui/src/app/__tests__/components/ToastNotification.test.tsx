import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {ToastNotification} from '../../components/ToastNotification';
import {ToastType} from '../../types/common-types';

describe('ToastNotification', () => {
  const defaultProps = {
    id: 'test-toast',
    show: true,
    message: 'Test message',
    type: 'info' as ToastType,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when show is false', () => {
    const {container} = render(
      <ToastNotification {...defaultProps} show={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders toast with correct content when show is true', () => {
    render(<ToastNotification {...defaultProps} />);
    const toast = screen.getByTestId('test-toast');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute('data-type', 'info');
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ToastNotification {...defaultProps} />);
    fireEvent.click(screen.getByTestId('test-toast-close'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders datetime when provided', () => {
    const testDate = new Date('2025-01-01T12:00:00Z');
    render(<ToastNotification {...defaultProps} datetime={testDate} />);
    expect(screen.getByText(testDate.toISOString())).toBeInTheDocument();
  });

  it('handles different toast types', () => {
    const toastTypes: Array<ToastType> = ['info', 'success', 'warning', 'error'];
    const {rerender} = render(<ToastNotification {...defaultProps} />);

    toastTypes.forEach((type) => {
      rerender(<ToastNotification {...defaultProps} type={type} />);
      expect(screen.getByTestId('test-toast')).toHaveAttribute('data-type', type);
    });
  });
});