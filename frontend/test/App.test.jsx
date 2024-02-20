import { fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App';

describe('App', () => {
  it('renders initially the login screen and allows switching to registration and back', () => {
    // given
    window.sessionStorage.clear();

    // when
    render(<App />);

    // then
    expect(screen.queryByText('Abmelden')).toBeNull();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Login');

    // when
    fireEvent.click(screen.getByText('zur Registrierung'));

    // then
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Registrierung');

    // when
    fireEvent.click(screen.getByText('zum Login'));

    // then
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Login');
  });

  it('renders the contents page with a logout button when logged in', () => {
    // given
    window.sessionStorage.setItem('apiKey', '"some-api-key-value"');

    // when
    render(<App />);

    // then
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(screen.getByText('Abmelden')).toHaveRole('button');
  });
});
