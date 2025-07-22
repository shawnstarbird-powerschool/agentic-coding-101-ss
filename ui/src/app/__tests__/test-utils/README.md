# Test Utilities

This directory contains common utilities for testing to reduce code duplication and improve maintainability.

## Mock Utils

The `mock-utils.ts` file provides common mock implementations for frequently used packages in tests.

### Available Functions

#### `setupCommonMocks()`
The most commonly used function that sets up both mfe-utils and neon mocks. This is what you'll use in most test files.

```typescript
import {setupCommonMocks} from '../test-utils/mock-utils';

// Setup common mocks for neon and mfe-utils
setupCommonMocks();
```

#### `mockMfeUtils()`
Sets up mocks for `@ps-refarch-ux/mfe-utils` package:
- `translate`: Returns the key as-is

#### `mockNeonComponents()`
Sets up mocks for all commonly used `@ps-refarch-ux/neon` components:
- `NeonTextField`
- `NeonTextareaField`
- `NeonNumberField`
- `NeonSelectField`
- `NeonMultiSelectField`
- `NeonButton`
- `NeonModalDialog`
- `NeonCheckboxSingle`
- `NeonRatingField`
- `NeonToast`
- `NeonTabs`
- `NeonSystemMessage`
- `NeonTableHeader`
- `NeonFullPageSkeleton`
- `loadNeonGlobalStylesAndFonts`

### Usage Examples

#### Basic Usage (Most Common)
```typescript
import React from 'react';
import {render, screen} from '@testing-library/react';
import {setupCommonMocks} from '../test-utils/mock-utils';
import MyComponent from '../../components/MyComponent';

// Setup common mocks for neon and mfe-utils
setupCommonMocks();

// Your other mocks...
jest.mock('../../some-other-module', () => ({
  someFunction: jest.fn()
}));

describe('MyComponent', () => {
  // Your tests...
});
```

#### Individual Mock Setup
If you only need specific mocks:

```typescript
import {mockMfeUtils, mockNeonComponents} from '../test-utils/mock-utils';

// Only mock mfe-utils
mockMfeUtils();

// Or only mock neon components
mockNeonComponents();
```

### Migration Guide

To migrate existing test files:

1. **Remove existing mock blocks** for `@ps-refarch-ux/mfe-utils` and `@ps-refarch-ux/neon`
2. **Add the import** for `setupCommonMocks`
3. **Call `setupCommonMocks()`** near the top of your test file

**Before:**
```typescript
import React from 'react';
import {render, screen} from '@testing-library/react';
import MyComponent from '../../components/MyComponent';

jest.mock('@ps-refarch-ux/mfe-utils', () => {
  return {
    translate: (key: string): string => {
      return key;
    }
  };
});

jest.mock('@ps-refarch-ux/neon', () => {
  return {
    NeonTextField: function MockTextField(props: any): JSX.Element {
      // ... lots of mock implementation
    },
    // ... more mock implementations
  };
});
```

**After:**
```typescript
import React from 'react';
import {render, screen} from '@testing-library/react';
import {setupCommonMocks} from '../test-utils/mock-utils';
import MyComponent from '../../components/MyComponent';

// Setup common mocks for neon and mfe-utils
setupCommonMocks();
```

### Benefits

- **Reduced Code Duplication**: No more copying the same mock implementations across multiple test files
- **Consistency**: All tests use the same mock behavior
- **Maintainability**: Changes to mock behavior only need to be made in one place
- **Easier Testing**: Simple one-line setup for common mocks

### Customization

If you need to customize the behavior of any mock for a specific test, you can override it after calling `setupCommonMocks()`:

```typescript
setupCommonMocks();

// Override specific mock behavior for this test
jest.requireMock('@ps-refarch-ux/neon').NeonTextField = function CustomMockTextField(props: any): JSX.Element {
  // Custom implementation for this test
  return <input data-testid={props.id} value={props.modelValue} />;
};