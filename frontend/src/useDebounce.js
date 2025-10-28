import { useEffect, useState } from 'react';

export function useDebounce(value, delay, updateFn) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      updateFn && updateFn(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, updateFn]);

  return debouncedValue;
}
