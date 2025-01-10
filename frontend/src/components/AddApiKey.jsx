import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const AddApiKey = ({ isOpen, onSubmit, isPending }) => {
    const [step, setStep] = useState(1);
    const [apiKey, setApiKey] = useState('');
    const [taxRate, setTaxRate] = useState('');

    const handleNext = () => {
        if (apiKey.length === 32) {
            setStep(2);
        }
    };

    const handleSubmit = () => {
        onSubmit({
            apiKey,
            taxRate: parseFloat(taxRate)
        });
    };

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent className="bg-background text-foreground">
                {step === 1 ? (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Welcome to MoonMarket!</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm space-y-2">
                                <p>Greetings, Earthling! You've landed on MoonMarket, where your wildest purchases await.</p>
                                <p>To join our cosmic community, we need your FMP API key. It's like a piece of your soul, but easier to obtain!</p>
                                <p>Here's your mission:</p>
                                <ol className="list-decimal list-inside">
                                    <li>Visit <a href="https://site.financialmodelingprep.com/register" target="_blank" rel="noopener noreferrer" className="text-customTurquoise-400 hover:underline">FMP's registration page</a></li>
                                    <li>Create an account</li>
                                    <li>Navigate to your dashboard</li>
                                    <li>Retrieve your API key</li>
                                </ol>
                                <p>May the market forces be with you!</p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your 32-character API key"
                            maxLength={32}
                            className="bg-background text-foreground border-customTurquoise-400 focus:ring-2 focus:ring-customTurquoise-400 focus:border-customTurquoise-400 hover:border-customTurquoise-400 transition-colors"
                        />
                        <AlertDialogFooter>
                            <AlertDialogAction asChild>
                                <Button
                                    onClick={handleNext}
                                    disabled={apiKey.length !== 32}
                                    className="bg-customTurquoise-400 text-white hover:bg-customTurquoise-400/80 focus:ring-2 focus:ring-customTurquoise-400 focus:ring-offset-2 focus:ring-offset-background"
                                >
                                    Next
                                </Button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </>
                ) : (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Set Your Trading Parameters</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                                Please enter your capital gains tax rate.
                                These will help us calculate your actual profits more accurately.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4">
                            {/* <div>
                                <label className="text-sm font-medium">Commission Fee Percentage($)</label>
                                <Input
                                    type="number"
                                    value={commission}
                                    onChange={(e) => setCommission(e.target.value)}
                                    placeholder="e.g., 4.95"
                                    min="0"
                                    step="0.01"
                                    className="bg-background text-foreground border-customTurquoise-400 focus:ring-2 focus:ring-customTurquoise-400 focus:border-customTurquoise-400 hover:border-customTurquoise-400 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Min Commission Fee per transaction($)</label>
                                <Input
                                    type="number"
                                    value={minCommission}
                                    onChange={(e) => setminCommission(e.target.value)}
                                    placeholder="e.g., 4.95"
                                    min="0"
                                    step="0.01"
                                    className="bg-background text-foreground border-customTurquoise-400 focus:ring-2 focus:ring-customTurquoise-400 focus:border-customTurquoise-400 hover:border-customTurquoise-400 transition-colors"
                                />
                            </div> */}
                            <div>
                                <label className="text-sm font-medium">Capital Gains Tax Rate (%)</label>
                                <Input
                                    type="number"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(e.target.value)}
                                    placeholder="e.g., 15"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    className="bg-background text-foreground border-customTurquoise-400 focus:ring-2 focus:ring-customTurquoise-400 focus:border-customTurquoise-400 hover:border-customTurquoise-400 transition-colors"
                                />
                            </div>
                        </div>
                        <AlertDialogFooter className="space-x-2">
                            <Button
                                onClick={() => setStep(1)}
                                variant="outline"
                                className="border-customTurquoise-400 text-customTurquoise-400 hover:bg-customTurquoise-400/10"
                            >
                                Back
                            </Button>
                            <AlertDialogAction asChild>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={ !taxRate || isPending}
                                    className="bg-customTurquoise-400 text-white hover:bg-customTurquoise-400/80 focus:ring-2 focus:ring-customTurquoise-400 focus:ring-offset-2 focus:ring-offset-background"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit'
                                    )}
                                </Button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default AddApiKey;