import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const AddApiKey = ({ isOpen, onClose, onSubmit }) => {
    const [apiKey, setApiKey] = useState('');

    const handleSubmit = () => {
        if (apiKey.length === 32) {
            onSubmit(apiKey);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="bg-background text-foreground">
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
                            onClick={handleSubmit}
                            disabled={apiKey.length !== 32}
                            className="bg-customTurquoise-400 text-white hover:bg-customTurquoise-400/80 focus:ring-2 focus:ring-customTurquoise-400 focus:ring-offset-2 focus:ring-offset-background"
                        >
                            Submit
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
export default AddApiKey;