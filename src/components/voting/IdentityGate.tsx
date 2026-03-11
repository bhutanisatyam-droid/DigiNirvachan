import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, ScanFace, Eye } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { FaceMesh, FACEMESH_TESSELATION, FACEMESH_RIGHT_EYE, FACEMESH_RIGHT_EYEBROW, FACEMESH_LEFT_EYE, FACEMESH_LEFT_EYEBROW, FACEMESH_FACE_OVAL, FACEMESH_LIPS } from "@mediapipe/face_mesh";
import { drawConnectors } from "@mediapipe/drawing_utils";

interface IdentityGateProps {
  onComplete: (faceImage: string) => void;
}

const biometricOptions = [
  { icon: ScanFace, label: "Face ID", desc: "Live webcam capture" },
  { icon: Eye, label: "Iris Scan", desc: "Retinal pattern match" },
  { icon: Fingerprint, label: "Fingerprint", desc: "Biometric touch" },
];

const IdentityGate = ({ onComplete }: IdentityGateProps) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [showWebcam, setShowWebcam] = useState(true);
  const [faceData, setFaceData] = useState("");
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-capture logic for Face ID using MediaPipe ML FaceMesh
  useEffect(() => {
    if (activeStep !== 0 || !showWebcam) return;

    let isMounted = true;
    let frameCount = 0;

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    faceMesh.onResults((results) => {
      if (!isMounted) return;
      const canvas = canvasRef.current;
      const videoRaw = webcamRef.current?.video;

      if (canvas && videoRaw) {
        canvas.width = videoRaw.videoWidth;
        canvas.height = videoRaw.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            frameCount++;

            // Calculate color transition based on progress (0 to 20 frames)
            // Start at blue (207) and end at green (142)
            const progress = Math.min(frameCount / 20, 1);
            const currentHue = Math.floor(207 - (progress * (207 - 142)));

            for (const landmarks of results.multiFaceLandmarks) {
              // Draw the full mesh so it is clearly visible
              drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {
                color: `hsla(${currentHue}, 90%, 54%, 0.45)`, // 45% opacity mesh 
                lineWidth: 0.8,
              });

              // Draw structural highlights stronger
              const opts = { color: `hsla(${currentHue}, 90%, 54%, 0.7)`, lineWidth: 1.5 };
              drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, opts);
              drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYEBROW, opts);
              drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, opts);
              drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYEBROW, opts);
              drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, opts);
              drawConnectors(ctx, landmarks, FACEMESH_LIPS, opts);
            }

            // Wait for 20 successful confident ML frames before proceeding (~1.5 seconds)
            if (frameCount > 20) {
              const imageSrc = webcamRef.current?.getScreenshot();
              if (imageSrc) {
                setFaceData(imageSrc);
                setShowWebcam(false);
                setCompleted(prev => new Set(prev).add(0));
                setActiveStep(1); // Move to Iris
              }
            }
          } else {
            frameCount = 0;
          }
          ctx.restore();
        }
      }
    });

    const processInterval = setInterval(async () => {
      if (!isMounted) return;
      if (webcamRef.current?.video && webcamRef.current.video.readyState >= 2) {
        try {
          await faceMesh.send({ image: webcamRef.current.video });
        } catch (e) {
          console.error("FaceMesh processing error:", e);
        }
      }
    }, 150); // Processing at ~6 FPS for ML analysis

    return () => {
      isMounted = false;
      clearInterval(processInterval);
      faceMesh.close();
    };
  }, [activeStep, showWebcam]);

  // Auto-scan logic for Iris and Fingerprint
  useEffect(() => {
    if (activeStep === 1 || activeStep === 2) {
      const t = setTimeout(() => {
        setCompleted(prev => new Set(prev).add(activeStep));
        if (activeStep === 2) {
          setTimeout(() => onComplete(faceData), 800);
        } else {
          setActiveStep(activeStep + 1);
        }
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [activeStep, faceData, onComplete]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col items-center gap-8 w-full max-w-md mx-auto relative z-10"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            DigiYatra Identity Gate
          </h2>
          <p className="text-muted-foreground text-sm">
            Autonomous biometric verification
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-display">
          <span className="text-primary font-bold">{completed.size}</span>
          <span>/</span>
          <span>3 verified</span>
        </div>

        <div className="grid gap-4 w-full">
          {biometricOptions.map((opt, i) => {
            const isScanning = activeStep === i && !showWebcam;
            const isDone = completed.has(i);
            return (
              <motion.div
                key={opt.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card glow-border p-5 flex items-center gap-4 text-left transition-all duration-500 ${isDone ? "!border-accent glow-accent" : ""
                  } ${isScanning || (i === 0 && showWebcam) ? "!border-primary" : ""}`}
              >
                <div className="relative">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500 ${isDone
                      ? "bg-accent/20"
                      : (isScanning || (i === 0 && showWebcam))
                        ? "bg-primary/20"
                        : "bg-secondary"
                      }`}
                  >
                    <opt.icon
                      className={`w-7 h-7 transition-colors duration-500 ${isDone
                        ? "text-accent"
                        : (isScanning || (i === 0 && showWebcam))
                          ? "text-primary"
                          : "text-muted-foreground"
                        }`}
                    />
                  </div>
                  {(isScanning || (i === 0 && showWebcam)) && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-primary"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-display font-semibold text-foreground">
                    {opt.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {isDone && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center"
                  >
                    <span className="text-accent text-lg">✓</span>
                  </motion.div>
                )}
                {isScanning && (
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Fullscreen Webcam & Canvas */}
      <AnimatePresence>
        {showWebcam && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
          >
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              videoConstraints={{ facingMode: "user" }}
            />

            {/* MediaPipe FaceMesh Overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />

            {/* Top right indicator */}
            <div className="absolute top-8 right-8 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full flex items-center gap-3 text-white font-mono text-sm border border-destructive/30">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse shadow-[0_0_10px_hsl(var(--destructive))]" />
              <span className="font-bold tracking-widest">LIVE ML SCAN</span>
            </div>

            {/* Status Tooltip UI */}
            <div className="absolute bottom-16 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-md py-4 px-8 rounded-full border border-primary/30">
              <div className="flex items-center gap-3 text-primary font-bold animate-pulse">
                <ScanFace className="w-6 h-6 animate-bounce" />
                <span className="text-xl tracking-wider uppercase font-display">Processing Geometry</span>
              </div>
              <p className="text-white/80 text-sm">Please position your face within the frame</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default IdentityGate;
