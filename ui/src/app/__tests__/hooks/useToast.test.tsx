import {renderHook, act} from '@testing-library/react';
import {useToast} from '../../hooks/useToast';
import {ToastType} from '../../types/common-types';

// Mock timers for testing auto-dismiss functionality
jest.useFakeTimers();

describe('useToast', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      expect(result.current.toast.show).toBe(false);
      expect(result.current.toast.message).toBe('');
      expect(result.current.toast.type).toBe('info');
      expect(result.current.toast.datetime).toBeUndefined();
      expect(typeof result.current.showToast).toBe('function');
      expect(typeof result.current.hideToast).toBe('function');
    });

    it('should initialize with custom auto-dismiss time', () => {
      const customTime = 10000;
      const {result} = renderHook(() => {
        return useToast(customTime);
      });

      expect(result.current.toast.show).toBe(false);
      expect(result.current.toast.message).toBe('');
      expect(result.current.toast.type).toBe('info');
    });
  });

  describe('showToast', () => {
    it('should show toast with message and default type when type not provided', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      const testMessage = 'Test message';

      act(() => {
        // Call showToast with only message parameter to test default type
        result.current.showToast(testMessage);
      });

      expect(result.current.toast.show).toBe(true);
      expect(result.current.toast.message).toBe(testMessage);
      expect(result.current.toast.type).toBe('info'); // Should default to 'info'
      expect(result.current.toast.datetime).toBeInstanceOf(Date);
    });

    it('should show toast with message and explicitly provided type', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      const testMessage = 'Test message';

      act(() => {
        result.current.showToast(testMessage, 'info');
      });

      expect(result.current.toast.show).toBe(true);
      expect(result.current.toast.message).toBe(testMessage);
      expect(result.current.toast.type).toBe('info');
      expect(result.current.toast.datetime).toBeInstanceOf(Date);
    });

    it('should show toast with message and specified type', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      const testMessage = 'Success message';
      const testType: ToastType = 'success';

      act(() => {
        result.current.showToast(testMessage, testType);
      });

      expect(result.current.toast.show).toBe(true);
      expect(result.current.toast.message).toBe(testMessage);
      expect(result.current.toast.type).toBe(testType);
      expect(result.current.toast.datetime).toBeInstanceOf(Date);
    });

    it('should handle all toast types correctly', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      const toastTypes: Array<ToastType> = ['info', 'success', 'warning', 'error'];

      toastTypes.forEach((type) => {
        act(() => {
          result.current.showToast(`Test ${type} message`, type);
        });

        expect(result.current.toast.show).toBe(true);
        expect(result.current.toast.message).toBe(`Test ${type} message`);
        expect(result.current.toast.type).toBe(type);
      });
    });

    it('should update datetime when showing toast', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      const beforeTime = new Date();

      act(() => {
        result.current.showToast('Test message', 'info');
      });

      const afterTime = new Date();

      expect(result.current.toast.datetime).toBeInstanceOf(Date);
      expect(result.current.toast.datetime!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.current.toast.datetime!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should override previous toast when called multiple times', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      act(() => {
        result.current.showToast('First message', 'info');
      });

      expect(result.current.toast.message).toBe('First message');
      expect(result.current.toast.type).toBe('info');

      act(() => {
        result.current.showToast('Second message', 'error');
      });

      expect(result.current.toast.message).toBe('Second message');
      expect(result.current.toast.type).toBe('error');
    });
  });

  describe('hideToast', () => {
    it('should hide visible toast', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      // First show a toast
      act(() => {
        result.current.showToast('Test message', 'info');
      });

      expect(result.current.toast.show).toBe(true);

      // Then hide it
      act(() => {
        result.current.hideToast();
      });

      expect(result.current.toast.show).toBe(false);
      // Other properties should remain unchanged
      expect(result.current.toast.message).toBe('Test message');
      expect(result.current.toast.type).toBe('info');
      expect(result.current.toast.datetime).toBeInstanceOf(Date);
    });

    it('should work when called on already hidden toast', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      expect(result.current.toast.show).toBe(false);

      act(() => {
        result.current.hideToast();
      });

      expect(result.current.toast.show).toBe(false);
    });

    it('should maintain state consistency when hiding toast', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      act(() => {
        result.current.showToast('Test message', 'warning');
      });

      const originalMessage = result.current.toast.message;
      const originalType = result.current.toast.type;
      const originalDatetime = result.current.toast.datetime;

      act(() => {
        result.current.hideToast();
      });

      expect(result.current.toast.show).toBe(false);
      expect(result.current.toast.message).toBe(originalMessage);
      expect(result.current.toast.type).toBe(originalType);
      expect(result.current.toast.datetime).toBe(originalDatetime);
    });
  });

  describe('auto-dismiss functionality', () => {
    it('should auto-dismiss toast after default time (5000ms)', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      act(() => {
        result.current.showToast('Test message', 'info');
      });

      expect(result.current.toast.show).toBe(true);

      // Fast-forward time by 5000ms
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.toast.show).toBe(false);
    });

    it('should auto-dismiss toast after custom time', () => {
      const customTime = 3000;
      const {result} = renderHook(() => {
        return useToast(customTime);
      });

      act(() => {
        result.current.showToast('Test message', 'info');
      });

      expect(result.current.toast.show).toBe(true);

      // Fast-forward time by less than custom time
      act(() => {
        jest.advanceTimersByTime(2999);
      });

      expect(result.current.toast.show).toBe(true);

      // Fast-forward time to reach custom time
      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(result.current.toast.show).toBe(false);
    });

    it('should not auto-dismiss when autoDismissTime is 0', () => {
      const {result} = renderHook(() => {
        return useToast(0);
      });

      act(() => {
        result.current.showToast('Test message', 'info');
      });

      expect(result.current.toast.show).toBe(true);

      // Fast-forward time significantly
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.toast.show).toBe(true);
    });

    it('should not auto-dismiss when autoDismissTime is negative', () => {
      const {result} = renderHook(() => {
        return useToast(-1000);
      });

      act(() => {
        result.current.showToast('Test message', 'info');
      });

      expect(result.current.toast.show).toBe(true);

      // Fast-forward time significantly
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.toast.show).toBe(true);
    });

    it('should clear previous timer when showing new toast', () => {
      const {result} = renderHook(() => {
        return useToast(5000);
      });

      // Show first toast
      act(() => {
        result.current.showToast('First message', 'info');
      });

      // Advance time partially
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.toast.show).toBe(true);

      // Show second toast (should reset timer)
      act(() => {
        result.current.showToast('Second message', 'info');
      });

      // Advance time by the full new timer duration (5000ms)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.toast.show).toBe(false);
    });

    it('should not set timer when toast is already hidden', () => {
      const {result} = renderHook(() => {
        return useToast(5000);
      });

      // Show toast then immediately hide it
      act(() => {
        result.current.showToast('Test message', 'info');
      });

      act(() => {
        result.current.hideToast();
      });

      expect(result.current.toast.show).toBe(false);

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should remain hidden
      expect(result.current.toast.show).toBe(false);
    });

    it('should clear timer on component unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const {result, unmount} = renderHook(() => {
        return useToast(5000);
      });

      act(() => {
        result.current.showToast('Test message', 'info');
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('function stability', () => {
    it('should maintain stable function references', () => {
      const {result, rerender} = renderHook(() => {
        return useToast();
      });

      const firstShowToast = result.current.showToast;
      const firstHideToast = result.current.hideToast;

      rerender();

      const secondShowToast = result.current.showToast;
      const secondHideToast = result.current.hideToast;

      expect(firstShowToast).toBe(secondShowToast);
      expect(firstHideToast).toBe(secondHideToast);
    });

    it('should maintain function stability across state changes', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      const showToastBeforeStateChange = result.current.showToast;
      const hideToastBeforeStateChange = result.current.hideToast;

      act(() => {
        result.current.showToast('Test message', 'info');
      });

      const showToastAfterStateChange = result.current.showToast;
      const hideToastAfterStateChange = result.current.hideToast;

      expect(showToastBeforeStateChange).toBe(showToastAfterStateChange);
      expect(hideToastBeforeStateChange).toBe(hideToastAfterStateChange);
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      act(() => {
        result.current.showToast('', 'info');
      });

      expect(result.current.toast.show).toBe(true);
      expect(result.current.toast.message).toBe('');
      expect(result.current.toast.type).toBe('info');
    });

    it('should handle very long message', () => {
      const {result} = renderHook(() => {
        return useToast();
      });

      const longMessage = 'A'.repeat(1000);

      act(() => {
        result.current.showToast(longMessage, 'info');
      });

      expect(result.current.toast.show).toBe(true);
      expect(result.current.toast.message).toBe(longMessage);
    });

    it('should handle rapid sequential calls', () => {
      const {result} = renderHook(() => {
        return useToast(1000);
      });

      act(() => {
        result.current.showToast('Message 1', 'info');
        result.current.showToast('Message 2', 'info');
        result.current.showToast('Message 3', 'info');
      });

      expect(result.current.toast.show).toBe(true);
      expect(result.current.toast.message).toBe('Message 3');

      // Should auto-dismiss after 1000ms from the last call
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.toast.show).toBe(false);
    });
  });
});