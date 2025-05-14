
'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

const Calculator: React.FC = () => {
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState<boolean>(false);

  const inputDigit = (digit: string) => {
    if (waitingForSecondOperand) {
      setDisplayValue(digit);
      setWaitingForSecondOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForSecondOperand) {
        setDisplayValue('0.');
        setWaitingForSecondOperand(false);
        return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };

  const clearDisplay = () => {
    setDisplayValue('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(displayValue);

    if (firstOperand === null) {
      setFirstOperand(inputValue);
    } else if (operator) {
      const result = calculate(firstOperand, inputValue, operator);
      const resultString = String(parseFloat(result.toFixed(7))); // Prevent floating point issues display
      setDisplayValue(resultString);
      setFirstOperand(result);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (first: number, second: number, op: string): number => {
    switch (op) {
      case '+': return first + second;
      case '-': return first - second;
      case '*': return first * second;
      case '/': return second === 0 ? NaN : first / second; // Handle division by zero
      default: return second;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(displayValue);
    if (operator && firstOperand !== null) {
      const result = calculate(firstOperand, inputValue, operator);
       const resultString = String(parseFloat(result.toFixed(7)));
       if (isNaN(result)) {
            setDisplayValue("Error");
       } else {
            setDisplayValue(resultString);
       }
      setFirstOperand(null); // Reset for next calculation chain
      setOperator(null);
      setWaitingForSecondOperand(true); // Ready for new input after '='
    }
  };

  const buttonLayout = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
  ];

  return (
    <div className="bg-card p-3 rounded-md border shadow-sm w-full">
      <Input
        type="text"
        value={displayValue}
        readOnly
        className="mb-3 text-right text-2xl font-mono h-12 bg-muted"
        aria-label="Calculator display"
      />
      <div className="grid grid-cols-4 gap-1.5">
        {/* Clear Button */}
        <Button
          variant="destructive"
          className="col-span-4 h-10 text-base"
          onClick={clearDisplay}
        >
           <Trash2 className="mr-1 h-4 w-4" /> Clear
        </Button>

        {buttonLayout.flat().map((label) => {
          const isOperator = ['/', '*', '-', '+'].includes(label);
          const isEquals = label === '=';
          const isDecimal = label === '.';
          const isDigit = !isOperator && !isEquals && !isDecimal;

          return (
            <Button
              key={label}
              variant={isOperator ? 'secondary' : (isEquals ? 'default' : 'outline')}
              className={cn(
                "h-10 text-base font-medium",
                label === '0' && 'col-span-1' // Adjust if needed
              )}
              onClick={() => {
                if (isDigit) inputDigit(label);
                else if (isDecimal) inputDecimal();
                else if (isOperator) performOperation(label);
                else if (isEquals) handleEquals();
              }}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default Calculator;
