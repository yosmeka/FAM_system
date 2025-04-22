 import React from 'react';

export interface RoleBasedFormProps {
  children?: React.ReactNode;
  onSubmit?: (formData: FormData) => void;
}

export const RoleBasedForm: React.FC<RoleBasedFormProps> = ({ children, onSubmit }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit) {
      const formData = new FormData(e.currentTarget);
      onSubmit(formData);
    }
  };
  return (
    <form onSubmit={handleSubmit}>
      {children}
    </form>
  );
};