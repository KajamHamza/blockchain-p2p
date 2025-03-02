
import React from 'react';
import { LucideProps } from 'lucide-react';

export const Pickaxe = (props: LucideProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m14 10-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0 0-.83.83-2.17 0-3L11 7" />
      <path d="M14.5 12.5 17 15c2.67-2.67 5.33-5.33 8-8l-4-4-8 8Z" />
      <path d="M11 14 7 11l-1 1" />
    </svg>
  );
};
