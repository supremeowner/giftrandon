import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  visible?: boolean;
  withoutAnimation?: boolean;
};

export const Skeleton = ({
  visible = true,
  withoutAnimation,
  className,
  children,
  ...restProps
}: SkeletonProps) => {
  return (
    <div
      className={cn(
        "tgui-skeleton",
        visible && "tgui-skeleton--visible",
        withoutAnimation && "tgui-skeleton--no-animation",
        className,
      )}
      aria-busy={visible ? "true" : undefined}
      {...restProps}
    >
      {children}
    </div>
  );
};
