import React from 'react';
import { View, TouchableOpacity, ViewProps, TouchableOpacityProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  style,
  ...props
}: CardProps) {
  const variantClasses = {
    default: 'bg-white',
    elevated: 'bg-white shadow-sm',
    outlined: 'bg-white border border-slate-200',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <View
      className={`rounded-2xl ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}

interface PressableCardProps extends TouchableOpacityProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function PressableCard({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  style,
  ...props
}: PressableCardProps) {
  const variantClasses = {
    default: 'bg-white active:bg-slate-50',
    elevated: 'bg-white shadow-sm active:bg-slate-50',
    outlined: 'bg-white border border-slate-200 active:bg-slate-50',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <TouchableOpacity
      className={`rounded-2xl ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      style={style}
      activeOpacity={0.7}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}
