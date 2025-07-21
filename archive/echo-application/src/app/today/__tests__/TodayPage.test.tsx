import { render, screen } from '@testing-library/react';
import TodayPage from '../page';
test('renders TodayPage heading', () => {
  render(<TodayPage />);
  expect(screen.getByText("Today's Focus")).toBeInTheDocument();
});
