"use client"

import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card"
import { createContext, useContext, useMemo } from "react"

import { cn } from "@/lib/utils"

/**
 * base-ui moved the hover delays off Root and onto Trigger, renaming
 * `openDelay` to `delay`. Callers still pass them to the root, so they are
 * carried down here rather than rewriting every call site.
 */
type HoverDelays = { openDelay?: number; closeDelay?: number }

const HoverCardDelayContext = createContext<HoverDelays>({})

function HoverCard({
  openDelay,
  closeDelay,
  ...props
}: PreviewCardPrimitive.Root.Props & HoverDelays) {
  const delays = useMemo(() => ({ openDelay, closeDelay }), [
    openDelay,
    closeDelay,
  ])

  return (
    <HoverCardDelayContext.Provider value={delays}>
      <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />
    </HoverCardDelayContext.Provider>
  )
}

function HoverCardTrigger({
  delay,
  closeDelay,
  ...props
}: PreviewCardPrimitive.Trigger.Props) {
  const inherited = useContext(HoverCardDelayContext)

  return (
    <PreviewCardPrimitive.Trigger
      data-slot="hover-card-trigger"
      delay={delay ?? inherited.openDelay}
      closeDelay={closeDelay ?? inherited.closeDelay}
      {...props}
    />
  )
}

function HoverCardContent({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 4,
  ...props
}: PreviewCardPrimitive.Popup.Props &
  Pick<
    PreviewCardPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <PreviewCardPrimitive.Portal data-slot="hover-card-portal">
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PreviewCardPrimitive.Popup
          data-slot="hover-card-content"
          className={cn(
            "z-50 w-64 origin-(--transform-origin) rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
