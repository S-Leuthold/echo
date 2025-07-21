# Usage Examples

## Zustand Store Example
```tsx
import { useCounterStore } from '@/store/counterStore';

function CounterButton() {
  const { count, increment } = useCounterStore();
  return <button onClick={increment}>Count: {count}</button>;
}
```

## SWR Data Fetching Example
```tsx
"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function Profile() {
  const { data, error, isLoading } = useSWR('/api/user', fetcher);
  if (error) return <div>Failed to load</div>;
  if (isLoading) return <div>Loading...</div>;
  return <div>Hello, {data.name}!</div>;
}
```

## Sample Test (React Testing Library)
```tsx
import { render, screen } from '@testing-library/react';
import TodayPage from '@/app/today/page';

test('renders TodayPage heading', () => {
  render(<TodayPage />);
  expect(screen.getByText("Today's Focus")).toBeInTheDocument();
});
```
