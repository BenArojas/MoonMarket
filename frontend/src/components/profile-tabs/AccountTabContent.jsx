import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { useTheme } from '@mui/material/styles';
import "@/styles/App.css"
import {formatCurrency, formatDate} from '@/utils/dataProcessing'

const AccountTabContent = ({ currentBalance, profit, deposits }) => {
  const theme = useTheme();

  // Calculate total deposits
  const totalDeposits = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Summary</CardTitle>
        <CardDescription>
          View your account balance, realized profits from selling shares, and deposit history
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm font-medium" style={{ color: theme.palette.mode === 'dark' ? theme.palette.secondary.main : theme.palette.secondary.main }}>
              Current Balance
            </div>
            <div className="text-2xl font-semibold mt-1">
              {formatCurrency(currentBalance)}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium" style={{ color: theme.palette.mode === 'dark' ? theme.palette.secondary.main : theme.palette.secondary.main }}>
              Realized Profits
            </div>
            <div className="text-2xl font-semibold mt-1" style={{ color: theme.palette.primary.main }}>
              {formatCurrency(profit)}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium" style={{ color: theme.palette.mode === 'dark' ? theme.palette.secondary.main : theme.palette.secondary.main }}>
              Total Deposits
            </div>
            <div className="text-2xl font-semibold mt-1">
              {formatCurrency(totalDeposits)}
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-3" style={{ color: theme.palette.mode === 'dark' ? theme.palette.secondary.main : theme.palette.secondary.main }}>
            Deposit History
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div style={{ maxHeight: '240px', overflowY: 'auto' }} className='custom-scrollbar'>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0" style={{ 
                  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.trinary.main : theme.palette.trinary.main 
                }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200" style={{ 
                  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.background.paper 
                }}>
                  {deposits.map((deposit, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(deposit.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatCurrency(deposit.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountTabContent;