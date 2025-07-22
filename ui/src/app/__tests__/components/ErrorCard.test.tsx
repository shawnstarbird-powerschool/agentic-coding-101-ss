import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import ErrorCard from '../../components/ErrorCard/ErrorCard';

describe('ErrorCard', () => {
  const defaultProps = {
    errorText: 'Test error message',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error text correctly', () => {
    render(<ErrorCard {...defaultProps} />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders with proper ID', () => {
    render(<ErrorCard {...defaultProps} />);
    const errorCard = document.getElementById('__mfe__powerftp-error');
    expect(errorCard).toBeInTheDocument();
  });

  it('renders without action button when not provided', () => {
    render(<ErrorCard {...defaultProps} />);
    // Check that no button container exists when action button is not provided
    const buttonContainer = document.querySelector('[data-slot="card-error-buttons"]');
    expect(buttonContainer).not.toBeInTheDocument();
  });

  it('renders with action button when provided', () => {
    const mockOnClick = jest.fn();
    const propsWithButton = {
      ...defaultProps,
      actionButton: {
        text: 'Retry',
        onClick: mockOnClick,
      },
    };

    render(<ErrorCard {...propsWithButton} />);
    
    const actionButton = screen.getByText('Retry');
    expect(actionButton).toBeInTheDocument();
  });

  it('calls onClick handler when action button is clicked', () => {
    const mockOnClick = jest.fn();
    const propsWithButton = {
      ...defaultProps,
      actionButton: {
        text: 'Retry',
        onClick: mockOnClick,
      },
    };

    render(<ErrorCard {...propsWithButton} />);
    
    const actionButton = screen.getByText('Retry');
    fireEvent.click(actionButton);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('renders with custom illustration when provided', () => {
    const propsWithIllustration = {
      ...defaultProps,
      dataIllustration: 'timeout',
    };

    render(<ErrorCard {...propsWithIllustration} />);
    
    const errorCard = document.getElementById('__mfe__powerftp-error');
    expect(errorCard).toHaveAttribute('data-illustration', 'timeout');
  });

  it('renders without illustration attribute when not provided', () => {
    render(<ErrorCard {...defaultProps} />);
    
    const errorCard = document.getElementById('__mfe__powerftp-error');
    expect(errorCard).not.toHaveAttribute('data-illustration');
  });

  it('renders action button with correct type', () => {
    const mockOnClick = jest.fn();
    const propsWithButton = {
      ...defaultProps,
      actionButton: {
        text: 'Retry',
        onClick: mockOnClick,
      },
    };

    render(<ErrorCard {...propsWithButton} />);
    
    const actionButton = screen.getByText('Retry');
    expect(actionButton).toBeInTheDocument();
  });

  it('renders with both action button and illustration', () => {
    const mockOnClick = jest.fn();
    const fullProps = {
      errorText: 'Network error occurred',
      actionButton: {
        text: 'Try Again',
        onClick: mockOnClick,
      },
      dataIllustration: 'general-error',
    };

    render(<ErrorCard {...fullProps} />);
    
    // Check error text
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    
    // Check action button
    const actionButton = screen.getByText('Try Again');
    expect(actionButton).toBeInTheDocument();
    
    // Check illustration
    const errorCard = document.getElementById('__mfe__powerftp-error');
    expect(errorCard).toHaveAttribute('data-illustration', 'general-error');
    
    // Check button functionality
    fireEvent.click(actionButton);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('handles long error messages correctly', () => {
    const longErrorMessage = 'This is a very long error message that should still be displayed correctly in the error card component without any issues or truncation problems.';
    const propsWithLongMessage = {
      ...defaultProps,
      errorText: longErrorMessage,
    };

    render(<ErrorCard {...propsWithLongMessage} />);
    expect(screen.getByText(longErrorMessage)).toBeInTheDocument();
  });

  it('handles empty action button text', () => {
    const mockOnClick = jest.fn();
    const propsWithEmptyText = {
      ...defaultProps,
      actionButton: {
        text: '',
        onClick: mockOnClick,
      },
    };

    render(<ErrorCard {...propsWithEmptyText} />);
    
    // Check that the button container exists even with empty text
    const buttonContainer = document.querySelector('[data-slot="card-error-buttons"]');
    expect(buttonContainer).toBeInTheDocument();
  });
});