export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'refunded';

export function formatOrderStatus(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Awaiting payment';
    case 'paid':
      return 'Paid';
    case 'shipped':
      return 'Shipped';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    default:
      return status;
  }
}

export function orderStatusHint(_status: OrderStatus, _role: 'buying' | 'selling'): string {
  return '';
}

export function orderTimelineSteps(status: OrderStatus): { key: string; label: string; done: boolean; current: boolean }[] {
  const paidDone = status === 'shipped' || status === 'completed';
  const shippedDone = status === 'completed';

  return [
    { key: 'paid', label: 'Paid', done: paidDone, current: status === 'paid' },
    { key: 'shipped', label: 'Shipped', done: shippedDone, current: status === 'shipped' },
    { key: 'completed', label: 'Confirmed', done: status === 'completed', current: status === 'completed' },
  ];
}
