
"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import jsQR from "jsqr";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, CheckCircle, XCircle, FileSignature, Video, VideoOff, Eye } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from "@/components/ui/table";


type VerificationStatus = "pending" | "success" | "error";
type PageState = "idle" | "verifying" | "result";

interface VerificationResult {
    status: VerificationStatus;
    message?: string;
    claims?: Record<string, any>;
    verifiedAt?: Date;
}

const VERIFY_ENDPOINT = "https://us-central1-bravium-d1e08.cloudfunctions.net/verifyCredential";

export default function VerifyPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [pageState, setPageState] = useState<PageState>("idle");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, startJwsVerification] = useTransition();
  const [jwsInput, setJwsInput] = useState('');
  
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState("jws");

  const [credentialDetails, setCredentialDetails] = useState<Record<string, any> | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isFetchingDetails, startFetchingDetails] = useTransition();


  const handleVerifyJws = useCallback(async (jws: string) => {
    if (!jws) return;
    
    // Clean the JWS string by removing all whitespace, including newlines
    const cleanedJws = jws.replace(/\s/g, '');
    setJwsInput(cleanedJws);
    
    setIsCameraOn(false); // Turn off camera on verification
    setPageState('verifying');
    startJwsVerification(async () => {
      try {
        const response = await fetch(VERIFY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jws: cleanedJws }) // Use the cleaned JWS
        });
        
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Request failed with status ${response.status}`);
        }

        setVerificationResult({
          status: 'success',
          message: 'JWS verified successfully.',
          claims: result.claims,
          verifiedAt: new Date()
        });

      } catch (error: any) {
         setVerificationResult({
          status: 'error',
          message: error.message || "An unknown error occurred."
        });
      } finally {
        setPageState('result');
      }
    });
  }, []);

  const handleShowDetails = async () => {
    if (!jwsInput) return;
    startFetchingDetails(async () => {
        try {
            const cleanedJws = jwsInput.replace(/\s/g, '');
            const response = await fetch(VERIFY_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jws: cleanedJws })
            });

            const result = await response.json();
             if (!response.ok) {
              throw new Error(result.error || "Failed to fetch credential details.");
            }

            const claims = result.claims || {};
            const details = claims.credentialSubject || claims;
            
            // Filter out technical fields before setting the state
            const fieldsToExclude = ['iat', 'exp', 'iss', 'sub', 'aud', 'jti', 'nbf', '@context', 'id', 'type', 'issuer', 'issuanceDate'];
            const filteredDetails = Object.keys(details)
              .filter(key => !fieldsToExclude.includes(key))
              .reduce((obj, key) => {
                obj[key] = details[key];
                return obj;
              }, {} as Record<string, any>);


            setCredentialDetails(filteredDetails);
            setIsDetailsDialogOpen(true);

        } catch (error: any) {
            toast({
              variant: "destructive",
              title: "Error",
              description: error.message || "Could not fetch credential details.",
            });
        }
    });
  };

  const tick = useCallback(() => {
    if (isCameraOn && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "dontInvert",
              });
              if (code) {
                  setJwsInput(code.data);
                  setIsCameraOn(false);
                  setActiveTab("jws");
                  toast({ title: "Código QR detectado", description: "El JWS ha sido copiado. Haz clic en verificar." });
              }
            } catch (e) {
              // Ignore getImageData errors if canvas is tainted
            }
        }
    }
  }, [isCameraOn, toast]);
  
  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      if (isCameraOn && hasCameraPermission) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            const animate = () => {
              tick();
              animationFrameId = requestAnimationFrame(animate);
            };
            animate();
          }
        } catch (err) {
          console.error("Error starting camera:", err);
          setHasCameraPermission(false);
          setIsCameraOn(false);
          toast({ variant: "destructive", title: "Error de Cámara", description: "No se pudo acceder a la cámara."})
        }
      }
    };

    if (isCameraOn) {
      startCamera();
    } else {
       if (videoRef.current && videoRef.current.srcObject) {
         const currentStream = videoRef.current.srcObject as MediaStream;
         currentStream.getTracks().forEach(track => track.stop());
         videoRef.current.srcObject = null;
       }
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isCameraOn, hasCameraPermission, tick, toast]);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasCameraPermission(true);
      setIsCameraOn(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Acceso a Cámara Denegado",
        description: "Por favor, habilita los permisos de cámara en tu navegador.",
      });
    }
  };

  const handleCameraToggle = () => {
    if (!isCameraOn && !hasCameraPermission) {
      requestCameraPermission();
    } else {
      setIsCameraOn(prev => !prev);
    }
  }

  const resetAll = () => {
    setPageState('idle');
    setVerificationResult(null);
    setJwsInput('');
    setIsCameraOn(false);
    setCredentialDetails(null);
  }

  const renderContent = () => {
    switch (pageState) {
        case "idle":
            return (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="jws">Verificar JWS</TabsTrigger>
                  <TabsTrigger value="camera">Verificar con Cámara</TabsTrigger>
                </TabsList>
                
                <TabsContent value="jws" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="jws-input">Pegar JWS de la Credencial</Label>
                    <Textarea
                      id="jws-input"
                      rows={8}
                      value={jwsInput}
                      onChange={(e) => setJwsInput(e.target.value)}
                      placeholder="eyJhbGciOiJFUzI1NiIs..."
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button onClick={() => handleVerifyJws(jwsInput)} disabled={isVerifying || !jwsInput}>
                        {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                        Verificar JWS
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="camera" className="space-y-4 pt-4">
                    <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
                        <video ref={videoRef} className={cn("h-full w-full object-cover", { "hidden": !isCameraOn })} autoPlay playsInline muted />
                         <canvas ref={canvasRef} className="hidden" />
                        {!isCameraOn && <VideoOff className="h-16 w-16 text-muted-foreground" />}
                    </div>
                    {hasCameraPermission === false && (
                       <Alert variant="destructive">
                            <AlertTitle>Acceso a Cámara Requerido</AlertTitle>
                            <AlertDescription>Por favor, permite el acceso a la cámara para usar esta función.</AlertDescription>
                        </Alert>
                    )}
                    <div className="flex flex-col items-center gap-4">
                        <Button onClick={handleCameraToggle}>
                           {isCameraOn ? <VideoOff className="mr-2 h-4 w-4"/> : <Video className="mr-2 h-4 w-4"/>}
                           {isCameraOn ? 'Apagar Cámara' : 'Encender Cámara'}
                        </Button>
                    </div>
                </TabsContent>
              </Tabs>
            );
        case "verifying":
            return (
                <div className="flex flex-col items-center justify-center min-h-[256px] gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">{t.verifyPage.loading_request}</p>
                </div>
            );
        case "result":
            const currentResult = verificationResult;
            if (currentResult) {
                switch (currentResult.status) {
                    case 'success':
                        return (
                            <div className="flex flex-col items-center justify-center min-h-[256px] gap-4 text-center">
                                <CheckCircle className="h-16 w-16 text-green-600" />
                                <h3 className="text-2xl font-bold">{t.verifyPage.result_success_title}</h3>
                                {currentResult.claims && (
                                     <div className="w-full mt-4 text-left">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Datos de la Carga Útil (Payload)</CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-2">
                                                <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                                                    {JSON.stringify(currentResult.claims, null, 2)}
                                                </pre>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                                <div className="flex items-center gap-4 mt-4">
                                  <Button onClick={resetAll} variant="outline">{t.verifyPage.new_verification_button}</Button>
                                  <Button onClick={handleShowDetails} disabled={isFetchingDetails}>
                                    {isFetchingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Eye className="mr-2 h-4 w-4" />}
                                    Ver Credencial
                                  </Button>
                                </div>
                            </div>
                        );
                    case 'error':
                        return (
                            <div className="flex flex-col items-center justify-center min-h-[256px] gap-4 text-center">
                                <XCircle className="h-16 w-16 text-destructive" />
                                <h3 className="text-2xl font-bold">{t.verifyPage.result_error_title}</h3>
                                <p className="text-muted-foreground max-w-full text-left break-words">{currentResult.message}</p>
                                <Button onClick={resetAll}>{t.verifyPage.retry_button}</Button>
                            </div>
                        );
                }
            }
            return null;
        default:
            return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <CardTitle className="text-3xl">{t.verifyPage.title}</CardTitle>
              <CardDescription>{t.verifyPage.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-8">
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </main>
      <LandingFooter />

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles de la Credencial</DialogTitle>
            <DialogDescription>
              Información del destinatario contenida en la credencial.
            </DialogDescription>
          </DialogHeader>
          {credentialDetails ? (
            <div className="py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(credentialDetails).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</TableCell>
                      <TableCell>
                        {typeof value === 'string' && (value.startsWith('http') || value.startsWith('https')) ? (
                          <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                            Abrir Enlace
                          </a>
                        ) : (
                          String(value)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
             <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailsDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
