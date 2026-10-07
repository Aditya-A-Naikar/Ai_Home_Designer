import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, AnchorHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

// When asChild is true, the component renders its children with the button styles
// applied. This works by passing className to the immediate child via cloneElement.
// For Phase 1 we keep this simple — asChild just renders an anchor/link with classes.

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

interface ButtonAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: true;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500 shadow-sm",
  secondary:
    "bg-slate-800 text-white hover:bg-slate-700 focus-visible:ring-slate-500 shadow-sm",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400",
  outline:
    "border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400 bg-white shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-5 py-2.5 text-sm rounded-lg",
  lg: "px-7 py-3.5 text-base rounded-lg",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Accessible, polymorphic Button component.
 * Use `asChild` + wrap a Next.js <Link> inside to get button styling on an anchor.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            <span className="sr-only">Loading…</span>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

/**
 * Link-styled button. Use this when you need an <a> tag with button styling.
 * Wrap Next.js <Link> children with this for navigation buttons.
 */
function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonAnchorProps) {
  return (
    <a
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export { Button, ButtonLink, baseClasses, variantClasses, sizeClasses };
export type { ButtonProps, ButtonAnchorProps, ButtonVariant, ButtonSize };
