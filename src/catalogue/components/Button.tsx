import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cx } from '../../lib/cx';
import styles from './Button.module.css';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'quiet';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: IconName;
  children: ReactNode;
}

export function Button({ variant = 'secondary', icon, children, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cx(styles.button, styles[variant], className)} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  icon?: IconName;
}

export function ButtonLink({ variant = 'secondary', icon, children, className, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cx(styles.button, styles[variant], className)} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      <span>{children as ReactNode}</span>
    </Link>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name, also shown as a tooltip. */
  label: string;
  icon: IconName;
  size?: 'small' | 'medium' | 'large';
  iconSize?: number;
  pressed?: boolean;
}

export function IconButton({
  label,
  icon,
  size = 'medium',
  iconSize,
  pressed,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cx(styles.iconButton, size === 'small' && styles.small, size === 'large' && styles.large, className)}
      {...rest}
    >
      <Icon name={icon} size={iconSize ?? (size === 'small' ? 18 : 22)} />
    </button>
  );
}
