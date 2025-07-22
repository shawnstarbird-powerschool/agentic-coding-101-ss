// We are disabling the '@typescript-eslint/ban-ts-comment' rule because we are using 'ts-ignore' in this file.
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, {useEffect} from 'react';
import '@testing-library/jest-dom';

// Hide console debug messages to reduce test messages clutter
window.console.debug = jest.fn();

// Mock IntersectionObserver as it isn't available in test environment
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => { return jest.fn(); },
  unobserve: () => { return jest.fn(); },
  disconnect: () => { return jest.fn(); },
});

window.IntersectionObserver = mockIntersectionObserver;

// Clear MFE events
export function clearMfeEvents(): void {
  // @ts-ignore
  (window as unknown).mfeUtilsEventCache = {};
}

// Mfe utils mocks
jest.mock('@ps-refarch-ux/mfe-utils', () => {
  const realUtils = jest.requireActual('@ps-refarch-ux/mfe-utils');
  return {
    __esModule: true,
    ...realUtils,
    loadStylesheet: jest.fn(),
    translate: jest.fn((i: string, p: object | undefined) =>
      { return p ? `${i}, ${JSON.stringify(p)}` : i; },
    ),
    dispatchMfeEvent: jest.fn(),
    formatDate: jest.fn((date: number) => { return date.toString(); }),
    addMfeEventListener: jest.fn((event, cb) => {
      // Simulate event listener removal
      return jest.fn();
    }),
    setTranslations: jest.fn(),
  };
});

// Mock for NeonLayoutDetail
const neonLayoutMock = ({
  neonLayoutDetailHasClosed,
  children,
  'data-testid': testId,
  dataBackButtonText,
}: {
  neonLayoutDetailHasClosed: () => void;
  children: React.ReactNode;
  'data-testid': string;
  dataBackButtonText: string;
}): JSX.Element => {
  // Create a ref to store the div element
  const ref = React.createRef<HTMLDivElement>();

  // Call neonLayoutDetailHasClosed when the animationEnd event is fired
  useEffect(() => {
    const {current} = ref;
    if (current) {
      current.addEventListener('animationend', neonLayoutDetailHasClosed);
    }
    return (): void => {
      if (current) {
        current.removeEventListener('animationend', neonLayoutDetailHasClosed);
      }
    };
  }, [neonLayoutDetailHasClosed]);

  // Render the children as is
  return React.createElement(
    'div',
    {ref, 'data-testid': testId},
    dataBackButtonText && React.createElement('span', {}, dataBackButtonText),
    children,
  );
};

// Mock for NeonCheckboxSingle
const neonCheckboxSingle = ({
  onInput,
  children,
  'data-testid': testId,
  id,
  value,
}: {
  onInput: (value: boolean) => void;
  children: React.ReactNode;
  'data-testid': string;
  id: string;
  value: boolean;
}): JSX.Element => {
  return React.createElement('div', {'data-testid': testId}, [
    React.createElement('input', {
      key: 'checkbox',
      type: 'checkbox',
      checked: value || false,
      onChange: (e: any): void => {
        onInput?.(e.target.checked);
      },
      'data-testid': `${id}-checkbox`,
    }),
    children,
  ]);
};

// Mock for NeonTextField
const neonTextField = ({
  id,
  modelValue,
  modelValueChange,
  dataIsReadOnly,
  dataHelperText,
}: any): JSX.Element => {
  return React.createElement('div', {'data-testid': id}, [
    React.createElement('input', {
      key: 'input',
      type: 'text',
      value: modelValue || '',
      readOnly: dataIsReadOnly === 'true',
      onChange: (e: any): void => {
        modelValueChange?.(e.target.value ?? '');
      },
      'data-testid': `${id}-input`,
    }),
    dataHelperText &&
      React.createElement(
        'div',
        {
          key: 'helper',
          'data-testid': `${id}-helper`,
        },
        dataHelperText,
      ),
  ]);
};

// Mock for NeonTextareaField
const neonTextareaField = ({
  id,
  modelValue,
  modelValueChange,
  dataIsReadOnly,
}: any): JSX.Element => {
  return React.createElement('div', {'data-testid': id}, [
    React.createElement('textarea', {
      key: 'textarea',
      value: modelValue || '',
      readOnly: dataIsReadOnly === 'true',
      onChange: (e: any): void => {
        modelValueChange?.(e.target.value ?? '');
      },
      'data-testid': `${id}-textarea`,
    }),
  ]);
};

// Mock for NeonNumberField
const neonNumberField = ({
  id,
  modelValue,
  modelValueChange,
  dataMin,
  dataMax,
  dataMinValue,
  dataMaxValue,
}: any): JSX.Element => {
  return React.createElement('div', {'data-testid': id}, [
    React.createElement('input', {
      key: 'input',
      type: 'number',
      value: modelValue?.toString() || '',
      min: dataMin || dataMinValue,
      max: dataMax || dataMaxValue,
      onChange: (e: any): void => {
        const value = e.target.value === '' ? undefined : Number(e.target.value);
        modelValueChange?.(value);
      },
      'data-testid': `${id}-input`,
    }),
  ]);
};

// Mock for NeonSelectField
const neonSelectField = ({
  id,
  modelValue,
  modelValueChange,
  options,
}: any): JSX.Element => {
  return React.createElement('div', {'data-testid': id}, [
    React.createElement(
      'select',
      {
        key: 'select',
        value: modelValue || '',
        onChange: (e: any): void => {
          modelValueChange?.(e.target.value || '');
        },
        'data-testid': `${id}-select`,
      },
      [
        React.createElement('option', {key: 'empty', value: ''}, 'Select...'),
        ...(options?.map((opt: { value: string; text: string }) => {
          return React.createElement('option', {
            key: opt.value,
            value: opt.value,
          }, opt.text);
        }) || []),
      ],
    ),
  ]);
};

// Mock for NeonMultiSelectField
const neonMultiSelectField = ({
  id,
  modelValue,
  modelValueChange,
  options,
}: any): JSX.Element => {
  return React.createElement('div', {'data-testid': id}, [
    React.createElement(
      'select',
      {
        key: 'select',
        multiple: true,
        value: modelValue || [],
        onChange: (e: any): void => {
          const values = Array.from(e.target.selectedOptions).map((opt: any): string => {
            return opt.value;
          });
          modelValueChange?.(values);
        },
        'data-testid': `${id}-select`,
      },
      options?.map((opt: { value: string; text: string }, index: number) => {
        return React.createElement('option', {
          key: `${opt.value}-${index}`,
          value: opt.value,
        }, opt.text);
      }) || [],
    ),
  ]);
};

// Mock for NeonButton
const neonButton = ({
  id,
  onClick,
  disabled,
  dataText,
  dataIcon,
  dataTooltipText,
  dataType,
  dataIsLoading,
  children,
}: any): JSX.Element => {
  return React.createElement(
    'button',
    {
      'data-testid': id,
      onClick,
      disabled: disabled || dataIsLoading,
      'data-icon': dataIcon,
      'data-tooltip': dataTooltipText,
      'data-type': dataType,
    },
    dataText || children || 'Button',
  );
};

// Mock for NeonModalDialog
const neonModalDialog = ({
  id,
  neonDialogHasClosed,
  dataSize,
  children,
}: any): JSX.Element => {
  return React.createElement(
    'div',
    {
      'data-testid': id || 'modal',
      'data-size': dataSize,
      onClick: neonDialogHasClosed,
    },
    children,
  );
};

// Mock for NeonRatingField
const neonRatingField = ({id, modelValue}: any): JSX.Element => {
  return React.createElement(
    'div',
    {
      'data-testid': id,
    },
    modelValue,
  );
};

// Mock for NeonToast
const neonToast = ({
  id,
  dataToastType,
  dataHeading,
  dataType,
  datetime,
  neonToastCloseButtonClick,
  children,
}: any): JSX.Element => {
  return React.createElement(
    'div',
    {
      'data-testid': id,
      'data-type': dataToastType || dataType,
      'data-heading': dataHeading,
    },
    [
      dataHeading && React.createElement('span', {key: 'heading'}, dataHeading),
      datetime && React.createElement('time', {key: 'time'}, datetime.toISOString()),
      React.createElement(
        'button',
        {
          key: 'close',
          'data-testid': `${id}-close`,
          onClick: neonToastCloseButtonClick,
        },
        'Close',
      ),
      children,
    ],
  );
};

// Mock for NeonTabs
const neonTabs = (props: any): JSX.Element => {
  const renderTab = (id: string, text: string): JSX.Element => {
    return React.createElement(
      'button',
      {
        key: id,
        'data-testid': id,
        'data-current': props.currentTab === id,
        onClick: (): void => {
          props.tabSelectionChanged?.(id);
        },
      },
      text,
    );
  };

  return React.createElement(
    'div',
    {
      'data-testid': props.id || 'tabs-container',
    },
    [
      renderTab('users-tab', 'powerschoolftp.users'),
      renderTab('folders-tab', 'powerschoolftp.folders'),
    ],
  );
};

// Mock for NeonSystemMessage
const neonSystemMessage = ({
  id,
  dataType,
  dataHeading,
  children,
}: any): JSX.Element => {
  return React.createElement(
    'div',
    {
      'data-testid': id,
      'data-type': dataType,
      'data-heading': dataHeading,
    },
    children,
  );
};

// Mock for NeonTableHeader
const neonTableHeader = ({id, dataText}: any): JSX.Element => {
  return React.createElement(
    'th',
    {
      'data-testid': id,
    },
    dataText,
  );
};

// Mock for NeonFullPageSkeleton
const neonFullPageSkeleton = (props: any): JSX.Element => {
  return React.createElement('div', {
    'data-testid': 'loading-skeleton',
    'data-type': props.dataType,
  });
};

// Neon mocks
jest.mock('@ps-refarch-ux/neon', () => {
  return {
    ...jest.requireActual('@ps-refarch-ux/neon'),
    NeonLayoutDetail: neonLayoutMock,
    NeonCheckboxSingle: neonCheckboxSingle,
    NeonTextField: neonTextField,
    NeonTextareaField: neonTextareaField,
    NeonNumberField: neonNumberField,
    NeonSelectField: neonSelectField,
    NeonMultiSelectField: neonMultiSelectField,
    NeonButton: neonButton,
    NeonModalDialog: neonModalDialog,
    NeonRatingField: neonRatingField,
    NeonToast: neonToast,
    NeonTabs: neonTabs,
    NeonSystemMessage: neonSystemMessage,
    NeonTableHeader: neonTableHeader,
    NeonFullPageSkeleton: neonFullPageSkeleton,
    showToastMessage: jest.fn(),
    DEFAULT_TOAST_MESSAGE_FLOATING_ID: 'default-toast-id',
    loadNeonGlobalStylesAndFonts: jest.fn(),
  };
});