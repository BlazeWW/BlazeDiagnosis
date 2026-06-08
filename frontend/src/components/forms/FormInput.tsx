import React from "react";

type InputType = React.HTMLInputTypeAttribute;

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> 
{
    id: string;
    label: string;
    error?: string;
    hint?: string;
    type?: InputType;
}

export default function FormInput({
    id, label, type = "text",error, hint, onChange, }: FormInputProps) 
{
    return (
        <div>
            <label htmlFor={id}>{label}</label>

            <input
                id={id}
                name={id}
                type={type}
                aria-invalid={!!error}
                onChange={(e) => {
                    onChange?.(e);
                }}
            />

            {hint && <small>{hint}</small>}
            {error && <small style={{ color: "red" }}>{error}</small>}
        </div>
    );
}