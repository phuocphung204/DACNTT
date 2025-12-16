import { useEffect, useRef } from "react"

export const useRenderCount = (componentName) => {
  const renderCount = useRef(0);

  renderCount.current += 1;
  console.log(`${componentName} RENDER COUNT: ${renderCount.current}`);

  useEffect(() => {
    console.log(`RENDERED: ${componentName}`);
  }, [componentName]);
}