import React from 'react';
import { statusMap } from './status';

export default function StatusIcon({ status, className }) {
  const iconClasses = className || 'size-6';
  return statusMap[status] && React.createElement(statusMap[status], { className: iconClasses });
}
