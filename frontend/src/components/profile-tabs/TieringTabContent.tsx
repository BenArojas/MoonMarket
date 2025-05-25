import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@mui/material";
import { ChangeTierPayload } from "@/api/user";
import { Loader2, Rocket } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface SubscriptionTabContentProps {
  currentTier: string;
  changeSubscriptionTier: (payload: ChangeTierPayload) => void;
  changeSubscriptionTierLoading: boolean;
}

const SubscriptionTabContent = ({
  currentTier,
  changeSubscriptionTier,
  changeSubscriptionTierLoading,
}: SubscriptionTabContentProps) => {
  const [selectedTier, setSelectedTier] = useState(currentTier || "free");
  const [billingCycle, setBillingCycle] = useState("monthly");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload: ChangeTierPayload = { account_type: selectedTier };
    if (selectedTier === "premium") {
      payload.billing_cycle = billingCycle;
    }
    changeSubscriptionTier(payload);
  };

  const isSaveDisabled =
    selectedTier === currentTier || changeSubscriptionTierLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          Manage your subscription tier here.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Tier Selection */}
          <div className="space-y-1">
            <Label htmlFor="tier">Subscription Tier</Label>
            <select
              id="tier"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full p-2 border rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="free">
                Free {currentTier === "free" ? "(Current)" : ""}
              </option>
              <option value="premium">
                Premium {currentTier === "premium" ? "(Current)" : ""}
              </option>
            </select>
          </div>

          {/* Billing Cycle Selection (only for Premium) */}
          {selectedTier === "premium" && (
            <div className="space-y-1">
              <Label htmlFor="billing-cycle">Billing Cycle</Label>
              <select
                id="billing-cycle"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="w-full p-2 border rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="monthly">Monthly ($20)</option>
                <option value="yearly">Yearly ($200 - Save 16%)</option>
              </select>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            variant="contained"
            type="submit"
            disabled={isSaveDisabled}
            sx={{
              backgroundColor: "#00C4B4",
              "&:hover": { backgroundColor: "#00A89A" },
            }}
          >
            {changeSubscriptionTierLoading ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SubscriptionTabContent;
