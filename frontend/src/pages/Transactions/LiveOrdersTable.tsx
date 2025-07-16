/* ---------- LIVE ORDERS TABLE ---------- */

import { LiveOrder } from "@/api/transaction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLiveOrders } from "@/hooks/useLiveOrders";

export const LiveOrdersTable: React.FC<{ orders: LiveOrder[] }> = ({ orders }) => {
    const { cancelMutation, modifyMutation } = useLiveOrders();

    const handleCancel = (orderId: number) => {
        if (window.confirm("Are you sure you want to cancel this order?")) {
            cancelMutation.mutate(orderId);
        }
    };

    // ... A simple modify modal would go here.
    // This is a placeholder for a more complete implementation.
    const handleModify = (order: LiveOrder) => {
        const newPrice = prompt("Enter new price:", order.limitPrice);
        if (newPrice) {
            modifyMutation.mutate({
                orderId: order.orderId,
                newOrderData: { ...order, price: newPrice },
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <h3 className="text-lg font-semibold">Live Orders</h3>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Side</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.length ? (
                            orders.map((order) => (
                                <TableRow key={order.orderId}>
                                    <TableCell>{order.ticker}</TableCell>
                                    <TableCell>{order.side}</TableCell>
                                    <TableCell>{order.orderType}</TableCell>
                                    <TableCell className="text-right">{order.quantity}</TableCell>
                                    <TableCell className="text-right">{order.limitPrice}</TableCell>
                                    <TableCell>{order.status}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleModify(order)}>
                                            Modify
                                        </Button>
                                        <Button variant="destructive" size="sm" className="ml-2" onClick={() => handleCancel(order.orderId)}>
                                            Cancel
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                                    No live orders.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};