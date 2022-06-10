import { MinusIcon, PlusIcon } from '@radix-ui/react-icons';
import * as React from 'react';
import { styled } from '~styles';
import { ToolButton } from "../ToolButton";

export function NumberInput({
    value, 
    onChange,
    min,
    max,
    step = 1,
}:{
    value:number, 
    onChange: (value:number) => void,
    min?:number,
    max?:number,
    step?:number,
}) {

    const handleChange = React.useCallback((e) => {
        let v = parseFloat(e.target.value)
        onChange(min && v < min ? min : (max && v > max ? max : v));
    }, [onChange]);

    const increase = React.useCallback(() => {
        onChange(max && value + step > max ? max : value + step);
    }, [onChange, value, step]);

    const decrease = React.useCallback(() => {
        onChange(min && min > value - step ? min : value - step);
    }, [onChange, value, step]);

    return (
        <StyledContainer>
            <ToolButton onClick={decrease}> <MinusIcon/> </ToolButton>
            <StyledInput type="number" value={value} onChange={handleChange} min={min} max={max} step={step}/>
            <ToolButton onClick={increase}> <PlusIcon/> </ToolButton>
        </StyledContainer>
    );
}

const StyledContainer = styled('div', {
    display: 'flex',
    alignItems: 'center',
});

const StyledInput = styled('input', {
    height: '32px',
    width: '32px',
    outline: 'none',
    border: 'none',
    borderRadius: '0',
    textAlign: 'center',
    '-moz-appearance': 'textfield',
    '&::-webkit-inner-spin-button': {
        margin: 0,
        '-webkit-appearance': 'none',
    },
    '&::webkit-outer-spin-button': {
        margin: 0,
        '-webkit-appearance': 'none',
    },
});