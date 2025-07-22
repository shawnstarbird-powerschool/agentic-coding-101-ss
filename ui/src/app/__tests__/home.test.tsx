import React from 'react';
import { render } from '@testing-library/react';
import { Home } from '../home';

describe('Home component unit tests', () => {
  it('will test the Home component', async () => {
      const { getByText } = render(<Home injectionRoute="mfe-1/*"/>);
      expect(getByText(/Welcome to the mfe-starter pack home page./)).toBeVisible();
  });
});