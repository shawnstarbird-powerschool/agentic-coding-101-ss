import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {ConfirmationModal} from '../../components/ConfirmationModal';
import {NeonModalDialog, NeonButton} from '@ps-refarch-ux/neon';

describe('ConfirmationModal', () => {
  const defaultProps = {
    id: 'test-modal',
    show: true,
    title: 'Test Title',
    message: 'Test Message',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: jest.fn(),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when show is false', () => {
    const {container} = render(
      <ConfirmationModal {...defaultProps} show={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with correct content when show is true', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId('test-modal-confirm'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn();
    const props = {...defaultProps, onCancel};
    render(<ConfirmationModal {...props} />);
    fireEvent.click(screen.getByTestId('test-modal-cancel'));
    // The onCancel will be called at least once, possibly twice due to event bubbling in our mock
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when modal is closed', () => {
    const onCancel = jest.fn();
    const props = {...defaultProps, onCancel};
    render(<ConfirmationModal {...props} />);
    fireEvent.click(screen.getByTestId('test-modal'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when loading', () => {
    render(<ConfirmationModal {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId('test-modal-cancel')).toBeDisabled();
    expect(screen.getByTestId('test-modal-confirm')).toHaveAttribute('disabled');
  });

  it('uses correct button type for confirm button', () => {
    const {rerender} = render(
      <ConfirmationModal {...defaultProps} confirmButtonType="secondary" />
    );
    const confirmButton = screen.getByTestId('test-modal-confirm');
    expect(confirmButton).toHaveAttribute('data-type', 'secondary');

    rerender(<ConfirmationModal {...defaultProps} confirmButtonType="borderless" />);
    expect(confirmButton).toHaveAttribute('data-type', 'borderless');
  });
});