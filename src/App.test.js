import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the home page hero without crashing', async () => {
  render(<App />);
  const heading = await screen.findByRole('heading', {
    name: /el servicio que tú y tu mejor amigo merecen/i,
  });
  expect(heading).toBeInTheDocument();
});
