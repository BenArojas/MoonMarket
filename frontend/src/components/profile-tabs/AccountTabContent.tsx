import React from 'react';
import AccountInfoBox from '@/components/AccountInfoBox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/styles/App.css";
import { formatCurrency } from '@/utils/dataProcessing';
import { responsiveFontSizes, useTheme } from "@mui/material";

export type YearlyExpense = {
  year: number;
  commission_paid: number;
  taxes_paid: number;
}

export type Deposit = {
  amount: number;
  date: string;
}

export type AccountTabContentProps = {
  currentBalance: number;
  profit: number;
  deposits: Deposit[];
  yearly_expenses: YearlyExpense[];
}

const AccountTabContent: React.FC<AccountTabContentProps> = ({ 
  currentBalance, 
  profit, 
  deposits, 
  yearly_expenses 
}) => {
  let theme = useTheme();
  theme = responsiveFontSizes(theme);

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 gap-y-4">
          <AccountInfoBox text={'Current Balance'} data={currentBalance} isProfit={false}/>
          <AccountInfoBox text={'Realized Profits'} data={profit} isProfit={true}/>
          <AccountInfoBox text={'Total Deposits'} data={totalDeposits} isProfit={false}/>
        </div>

        <div>
          <div
            className="text-sm font-medium mb-3"
            style={{
              color: theme.palette.secondary.main
            }}
          >
            Yearly Expenses
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div style={{ maxHeight: '240px', overflowY: 'auto' }} className="custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-200">
                <thead
                  className="bg-gray-50 sticky top-0"
                  style={{
                    backgroundColor: theme.palette.trinary.main
                  }}
                >
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Commission Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Taxes Paid</th>
                  </tr>
                </thead>
                <tbody
                  className="divide-y divide-gray-200"
                  style={{
                    backgroundColor: theme.palette.background.paper
                  }}
                >
                  {yearly_expenses.map((expense, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {expense.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatCurrency(expense.commission_paid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatCurrency(expense.taxes_paid)}
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