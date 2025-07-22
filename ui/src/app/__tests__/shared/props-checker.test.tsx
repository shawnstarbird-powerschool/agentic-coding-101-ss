import React from 'react';
import {render, screen} from '@testing-library/react';
import {PropsChecker} from '../../shared/props-checker';

// Mock Neon components
jest.mock('@ps-refarch-ux/neon', () => {
  return {
    NeonSystemMessage: ({children, id, dataType}: any): JSX.Element => {
      return (
        <div data-testid={id} data-type={dataType}>
          {children}
        </div>
      );
    },
    NeonAccordion: ({children, id, dataHeading}: any): JSX.Element => {
      return (
        <div data-testid={id} data-heading={dataHeading}>
          {children}
        </div>
      );
    },
    NeonJsObject: ({value}: any): JSX.Element => {
      return (
        <pre data-testid="neon-js-object">{JSON.stringify(value, null, 2)}</pre>
      );
    }
  };
});

describe('PropsChecker', () => {
  const validProps = {
    serverConfig: {test: 'config'},
    exampleContextInfoStarterPack1: 'info1',
    exampleContextInfoStarterPack2: 'info2',
    exampleContextInfoStarterPack3: 'info3'
  };

  it('renders props in accordion when all required props are provided', () => {
    render(<PropsChecker {...validProps} />);

    // Check for accordion
    const accordion = screen.getByTestId('props-checker');
    expect(accordion).toBeInTheDocument();
    expect(accordion).toHaveAttribute('data-heading', 'Props passed into the component');

    // Check props are displayed
    const jsObject = screen.getByTestId('neon-js-object');
    const displayedProps = JSON.parse(jsObject.textContent || '{}');
    expect(displayedProps).toEqual(validProps);
  });

  it('displays error messages when required props are missing', () => {
    const invalidProps = {
      exampleContextInfoStarterPack1: 'info1',
      exampleContextInfoStarterPack2: 'info2',
      exampleContextInfoStarterPack3: 'info3'
    };

    render(<PropsChecker {...invalidProps} />);

    // Check for error heading
    expect(screen.getByText('Something Went Wrong With Passing Props')).toBeInTheDocument();

    // Check for explanatory text
    expect(screen.getByText(/The starter pack needs to show off/)).toBeInTheDocument();

    // Check for error messages (there should be 25 of them)
    const errorMessages = screen.getAllByTestId(/^__mfe__system-message-info/);
    expect(errorMessages).toHaveLength(25);

    // Check error message content
    errorMessages.forEach((message) => {
      expect(message).toHaveAttribute('data-type', 'error');
      expect(message).toHaveTextContent('props.serverConfig == null');
    });
  });

  it('displays error messages for missing exampleContextInfoStarterPack1', () => {
    const propsWithoutPack1 = {
      serverConfig: {test: 'config'},
      exampleContextInfoStarterPack2: 'info2',
      exampleContextInfoStarterPack3: 'info3'
    };

    render(<PropsChecker {...propsWithoutPack1} />);

    const errorMessages = screen.getAllByTestId(/^__mfe__system-message-info/);
    errorMessages.forEach((message) => {
      expect(message).toHaveTextContent('props.exampleContextInfoStarterPack1 == null');
    });
  });

  it('displays error messages for missing exampleContextInfoStarterPack2', () => {
    const propsWithoutPack2 = {
      serverConfig: {test: 'config'},
      exampleContextInfoStarterPack1: 'info1',
      exampleContextInfoStarterPack3: 'info3'
    };

    render(<PropsChecker {...propsWithoutPack2} />);

    const errorMessages = screen.getAllByTestId(/^__mfe__system-message-info/);
    errorMessages.forEach((message) => {
      expect(message).toHaveTextContent('props.exampleContextInfoStarterPack2 == null');
    });
  });

  it('displays error messages for missing exampleContextInfoStarterPack3', () => {
    const propsWithoutPack3 = {
      serverConfig: {test: 'config'},
      exampleContextInfoStarterPack1: 'info1',
      exampleContextInfoStarterPack2: 'info2'
    };

    render(<PropsChecker {...propsWithoutPack3} />);

    const errorMessages = screen.getAllByTestId(/^__mfe__system-message-info/);
    errorMessages.forEach((message) => {
      expect(message).toHaveTextContent('props.exampleContextInfoStarterPack3 == null');
    });
  });

  it('displays multiple error messages when multiple props are missing', () => {
    const propsWithMultipleMissing = {
      exampleContextInfoStarterPack1: 'info1'
    };

    render(<PropsChecker {...propsWithMultipleMissing} />);
    const errorMessages = screen.getAllByTestId(/^__mfe__system-message-info/);
    const firstMessage = errorMessages[0];

    // Check that all missing props are mentioned in the error message
    expect(firstMessage).toHaveTextContent('props.serverConfig == null');
    expect(firstMessage).toHaveTextContent('props.exampleContextInfoStarterPack2 == null');
    expect(firstMessage).toHaveTextContent('props.exampleContextInfoStarterPack3 == null');
  });

  it('shows stringified props in error state', () => {
    const partialProps = {
      exampleContextInfoStarterPack1: 'info1'
    };

    render(<PropsChecker {...partialProps} />);

    // Find the stringified props output
    const propsOutput = screen.getByText((content) => {
      try {
        const parsed = JSON.parse(content);
        return parsed.exampleContextInfoStarterPack1 === 'info1';
      } catch {
        return false;
      }
    });

    expect(propsOutput).toBeInTheDocument();
    expect(propsOutput.textContent).toBe(JSON.stringify(partialProps, null, 2));
  });
});