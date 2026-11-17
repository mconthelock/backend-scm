export enum OrderStatus {
    ISSUED = 1,
    READ = 2,
    ACKNOWLEDGED = 3,
    PARTIAL_SHIPPED = 4,
    SHIPPED = 5,
    CLOSED = 6,
}

export const OrderStatusNameMap: Record<number, string> = {
    [OrderStatus.ISSUED]: 'ISSUED',
    [OrderStatus.READ]: 'READ',
    [OrderStatus.ACKNOWLEDGED]: 'ACKNOWLEDGED',
    [OrderStatus.PARTIAL_SHIPPED]: 'PARTIAL_SHIPPED',
    [OrderStatus.SHIPPED]: 'SHIPPED',
    [OrderStatus.CLOSED]: 'CLOSED',
};

export const OrderStatusCodeMap: Record<string, number> = {
    ISSUED: OrderStatus.ISSUED,
    READ: OrderStatus.READ,
    ACKNOWLEDGED: OrderStatus.ACKNOWLEDGED,
    PARTIAL_SHIPPED: OrderStatus.PARTIAL_SHIPPED,
    SHIPPED: OrderStatus.SHIPPED,
    CLOSED: OrderStatus.CLOSED,
};
