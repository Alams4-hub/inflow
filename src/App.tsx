import { useEffect, useRef } from "react";

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    });
  }, []);

  return <video ref={videoRef} autoPlay playsInline muted style={{ width: 480 }} />;
}
