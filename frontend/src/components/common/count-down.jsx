import { useEffect, useState } from "react";

const CountDown = ({ children, durationSeconds, callback }) => {
  if (!durationSeconds) durationSeconds = 7; // seconds
  const [currentSeconds, setCurrentSeconds] = useState(durationSeconds);
  useEffect(() => {
    if (currentSeconds <= 0) {
      if (callback) setTimeout(callback, 500); // delay thêm .5s
      return;
    }
    const timerId = setTimeout(() => {
      setCurrentSeconds(currentSeconds - 1);
    }, 1000);
    return () => clearTimeout(timerId);
  }, [currentSeconds]);
  return (
    <>
      {typeof children === "function" ? children(currentSeconds) : children}
    </>
  )
}

export default CountDown;