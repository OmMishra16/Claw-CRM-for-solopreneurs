import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: string | React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseClasses = 'flex-row items-center justify-center rounded-xl';

  const variantClasses = {
    primary: 'bg-indigo-500 active:bg-indigo-600',
    secondary: 'bg-slate-100 active:bg-slate-200',
    outline: 'bg-transparent border border-slate-200 active:bg-slate-50',
    ghost: 'bg-transparent active:bg-slate-100',
    danger: 'bg-red-500 active:bg-red-600',
  };

  const textVariantClasses = {
    primary: 'text-white',
    secondary: 'text-slate-900',
    outline: 'text-slate-900',
    ghost: 'text-slate-900',
    danger: 'text-white',
  };

  const sizeClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const iconColors = {
    primary: '#FFFFFF',
    secondary: '#1E293B',
    outline: '#1E293B',
    ghost: '#1E293B',
    danger: '#FFFFFF',
  };

  const isDisabled = disabled || loading;

  const renderIcon = () => {
    if (!icon) return null;

    if (typeof icon === 'string') {
      return (
        <Ionicons
          name={icon as any}
          size={iconSizes[size]}
          color={iconColors[variant]}
          style={{ marginRight: 8 }}
        />
      );
    }

    return <View style={{ marginRight: 8 }}>{icon}</View>;
  };

  return (
    <TouchableOpacity
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        fullWidth ? 'w-full' : ''
      } ${isDisabled ? 'opacity-50' : ''}`}
      disabled={isDisabled}
      style={style}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#6366F1'}
        />
      ) : (
        <>
          {renderIcon()}
          <Text
            className={`font-semibold ${textVariantClasses[variant]} ${textSizeClasses[size]}`}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
