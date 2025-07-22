import '@testing-library/jest-dom';

global.ResizeObserver = jest.fn().mockImplementation(() => { return {
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}; });

//By default fetch responses will come back empty.
global.fetch = function(): Promise<any> {
  return Promise.resolve({
    ok: false,
    body: '',
    bodyUsed: false,
    headers: '',
    redirected: '',
    status: 400
  });
};