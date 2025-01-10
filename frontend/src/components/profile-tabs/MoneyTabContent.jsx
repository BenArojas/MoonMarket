import React from 'react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from '@mui/material';

const MoneyTabContent = ({ currentBalance, onSubmit, isLoading }) => {
  const [depositAmount, setDepositAmount] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(Number(depositAmount));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Money</CardTitle>
        <CardDescription>
          You currently have {currentBalance.toLocaleString("en-US")}$ in
          your account. If you wish to add more, you can deposit below.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="deposit">Deposit Amount ($)</Label>
            <Input 
              id="deposit" 
              type="number" 
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="contained" 
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Add'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default MoneyTabContent;