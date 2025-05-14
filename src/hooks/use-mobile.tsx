
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean { // Explicitly return boolean
  // Initialize state based on window width if available, otherwise default to false (SSR)
  const [isMobile, setIsMobile] = React.useState<boolean>(
      typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
    );

  React.useEffect(() => {
    // Ensure this effect only runs client-side
    if (typeof window === 'undefined') {
        return;
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check in case the component mounts after the initial state calculation
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  return isMobile; // Return the boolean state
}
