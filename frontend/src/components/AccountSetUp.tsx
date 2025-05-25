import React, { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Rocket } from 'lucide-react';
import { completeSetUp } from '@/api/user'; // Renamed function
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getIbkrConnection, IbkrConnectionResponse } from '@/api/ibkr';

interface AccountSetUpProps {
    isOpen: boolean;
    onClose: () => void;
}

const AccountSetUp: React.FC<AccountSetUpProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<number>(1);
    const [accountId, setAccountId] = useState<string>('');
    const queryClient = useQueryClient();

    const { mutate: submitAccountSetupMutation, isPending } = useMutation({
        mutationFn: (data: { accountId: string }) => completeSetUp(data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["authStatus"] });
            toast.success("Cosmic configuration complete! Your settings are saved.");
            onClose();
            setTimeout(() => {
                setStep(1);
                setAccountId('');
            }, 300);
        },
        onError: (error: any) => {
            toast.error(error?.message || "A cosmic anomaly occurred. Please try again.");
        },
    });

    const { mutate: verifyIbkrConnection, isPending: isVerifying } = useMutation({
        mutationFn: getIbkrConnection,
        onSuccess: (data: IbkrConnectionResponse) => {
            if (data.isAuthenticated) {
                setStep(2);
                toast.success("IBKR connection verified! Ready for account setup.");
            } else {
                toast.error("IBKR login not detected. Please log in via the Gateway.");
            }
        },
        onError: (error: Error) => {
            toast.error(
                error.message || "Failed to verify IBKR connection. Please try again."
            );
        },
    });

    const handleSubmitFinal = () => {
        if (!accountId) {
            toast.warn("Please enter your IBKR Account ID.");
            return;
        }
        submitAccountSetupMutation({ accountId });
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center">
                                <Rocket className="mr-2 h-6 w-6 text-customTurquoise-400" />
                                Connect to Interactive Brokers
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm space-y-2">
                                <p>You're connecting to Interactive Brokers via the Client Portal Gateway.</p>
                                <p>Follow these steps to authenticate:</p>
                                <ol className="list-decimal list-inside ml-4 space-y-1">
                                    <li>Log in with your Interactive Brokers credentials and complete two-factor authentication.</li>
                                    <li>Look for "Client login succeeds" in the browser.</li>
                                    <li>Return here and click "Verify Connection".</li>
                                </ol>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Button
                            onClick={() => window.open('https://localhost:5055', '_blank')}
                            className="w-full my-4 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Rocket className="mr-2 h-4 w-4" />
                            Open IBKR Gateway Login
                        </Button>
                        <Button
                            onClick={() => verifyIbkrConnection()}
                            disabled={isVerifying}
                            className="w-full my-4 bg-customTurquoise-400 hover:bg-customTurquoise-400/80 text-white"
                        >
                            {isVerifying ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Rocket className="mr-2 h-4 w-4" />
                            )}
                            Verify Connection
                        </Button>
                    </>
                );
            case 2:
                return (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center">
                                <Rocket className="mr-2 h-6 w-6 text-customTurquoise-400" />
                                Enter Your IBKR Account ID
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm space-y-2">
                                <p>Enter your Interactive Brokers Account ID to complete setup.</p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            placeholder="Enter your IBKR Account ID"
                            className="bg-background text-foreground border-customTurquoise-400 focus:ring-2 focus:ring-customTurquoise-400 focus:border-customTurquoise-400 hover:border-customTurquoise-400 transition-colors my-4"
                        />
                        <AlertDialogFooter>
                            <Button
                                onClick={() => setStep(1)}
                                variant="outline"
                                className="hover:border-customTurquoise-400/50"
                            >
                                Back
                            </Button>
                            <AlertDialogAction asChild>
                                <Button
                                    onClick={handleSubmitFinal}
                                    disabled={!accountId || isPending}
                                    className="bg-customTurquoise-400 text-white hover:bg-customTurquoise-400/80"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Finalizing Configuration...
                                        </>
                                    ) : (
                                        'Complete Setup & Launch!'
                                    )}
                                </Button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="bg-background text-foreground max-w-lg">
                {renderStepContent()}
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default AccountSetUp;