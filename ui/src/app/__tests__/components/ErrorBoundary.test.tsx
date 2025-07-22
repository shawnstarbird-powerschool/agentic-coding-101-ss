import React from 'react';
import {render, screen} from '@testing-library/react';
import ErrorBoundary from '../../components/ErrorBoundary';

describe('ErrorBoundary', () => {
  const consoleError = console.error;

  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = consoleError;
    jest.clearAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders default error UI when error occurs', () => {
    const ThrowError = (): never => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('powerschoolftp.something_went_wrong')).toBeInTheDocument();
    expect(screen.getByText('powerschoolftp.application_encountered_an_error')).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('renders custom fallback UI when provided and error occurs', () => {
    const ThrowError = (): never => {
      throw new Error('Test error');
    };

    const fallback = <div>Custom Error UI</div>;

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('updates state when error occurs', () => {
    const ThrowError = (): never => {
      throw new Error('Test error');
    };

    const {container} = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(container.firstChild).toHaveClass('__neon__layout');
  });

  it('handles multiple errors', () => {
    const ThrowError = (): never => {
      throw new Error('Test error');
    };

    const {rerender} = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('powerschoolftp.something_went_wrong')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <div>New content that will error</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('powerschoolftp.something_went_wrong')).toBeInTheDocument();
  });
});