import { useState, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Webcam from 'react-webcam';

// Interfaces
interface ExtractedData {
  nombre: string;
  apellido: string;
  nacionalidad: string;
  fechaNacimiento: string;
}

interface ButtonProps {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
}

// Estilos reutilizables
const styles = {
  container: {
    fontFamily: 'sans-serif',
    maxWidth: '600px',
    margin: 'auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    backgroundColor: '#fff'
  },
  button: (isActive: boolean) => ({
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : '#333',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    cursor: 'pointer'
  }),
  uploadArea: {
    border: '2px dashed #dee2e6',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    backgroundColor: '#f8f9fa'
  },
  resultContainer: {
    marginTop: '20px',
    padding: '20px',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  resultItem: {
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #e9ecef'
  }
};

// --- Configuración de la API de Gemini ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Componente de botón reutilizable
const SwitchButton: React.FC<ButtonProps> = ({ onClick, isActive, children }) => (
  <button
    onClick={onClick}
    style={styles.button(isActive)}
  >
    {children}
  </button>
);

// --- Componente Principal ---
const KycVerifier: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useWebcam, setUseWebcam] = useState<boolean>(false);
  const webcamRef = useRef<Webcam | null>(null);

  // Convierte un objeto File a una parte de la API de Gemini
  const fileToGenerativePart = async (file: File) => {
    const base64EncodedData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: base64EncodedData, mimeType: file.type },
    };
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setExtractedData(null);
      setError(null);
    }
  };

  const handleVerifyClick = async () => {
    if (!image) {
      setError('Por favor, selecciona una imagen primero.');
      return;
    }

    setLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      const prompt = `
      Analiza la imagen de este documento de identidad (DNI). Extrae únicamente los siguientes datos y devuélvelos en formato JSON. No incluyas ninguna otra explicación o texto introductorio, solo el objeto JSON.
      1.  nombre (string)
      2.  apellido (string)
      3.  nacionalidad (string) el código de país ISO 3166-1 alfa-2. Por ejemplo: AR para Argentina, US para Estados Unidos.
      4.  fechaNacimiento (string) en formato YYYY-MM-DD.

      Ejemplo de respuesta:
      {
        "nombre": "Juan",
        "apellido": "Perez",
        "nacionalidad": "AR",
        "fechaNacimiento": "1990-05-15"
      }
      `;
      
      const imagePart = await fileToGenerativePart(image);
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(jsonString) as ExtractedData;
      setExtractedData(parsedData);

    } catch (e) {
      console.error(e);
      setError('Ocurrió un error al procesar la imagen. Asegúrate de que la imagen sea clara y que la API key sea correcta.');
    } finally {
      setLoading(false);
    }
  };

  const captureImage = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
          setImage(file);
          setUseWebcam(false);
        });
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Verificación KYC</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>
        Sube una imagen de un documento de identidad (DNI, pasaporte, etc.)
      </p>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
        <SwitchButton onClick={() => setUseWebcam(false)} isActive={!useWebcam}>
          Subir Archivo
        </SwitchButton>
        <SwitchButton onClick={() => setUseWebcam(true)} isActive={useWebcam}>
          Usar Cámara
        </SwitchButton>
      </div>

      {!useWebcam ? (
        <div style={{ marginBottom: '15px' }}>
          <div style={styles.uploadArea}>
            <label htmlFor="image-upload" style={{ display: 'block', cursor: 'pointer', color: '#007bff' }}>
              📁 Haz clic aquí para seleccionar un archivo
              <input 
                id="image-upload"
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '15px', textAlign: 'center' }}>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            style={{ width: '100%', maxWidth: '400px', borderRadius: '8px' }}
          />
          <button
            onClick={captureImage}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📸 Capturar Foto
          </button>
        </div>
      )}

      {image && !useWebcam && (
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <img 
            src={URL.createObjectURL(image)} 
            alt="ID preview" 
            style={{ 
              maxWidth: '100%',
              maxHeight: '300px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
        </div>
      )}

      <button 
        onClick={handleVerifyClick} 
        disabled={!image || loading}
        style={{ 
          width: '100%', 
          padding: '10px', 
          fontSize: '16px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: image && !loading ? 'pointer' : 'not-allowed',
          opacity: image && !loading ? 1 : 0.7
        }}
      >
        {loading ? 'Verificando...' : 'Verificar Identidad'}
      </button>

      {error && (
        <div style={{ marginTop: '15px', color: 'red', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {extractedData && (
        <div style={styles.resultContainer}>
          <h3 style={{ color: '#333', marginBottom: '15px' }}>Resultados de la Verificación:</h3>
          <div style={{ display: 'grid', gap: '10px', fontSize: '16px', color: '#333' }}>
            <div style={styles.resultItem}>
              <strong>Nombre:</strong> {extractedData.nombre || 'No encontrado'}
            </div>
            <div style={styles.resultItem}>
              <strong>Apellido:</strong> {extractedData.apellido || 'No encontrado'}
            </div>
            <div style={styles.resultItem}>
              <strong>Nacionalidad:</strong> {extractedData.nacionalidad || 'No encontrada'}
            </div>
            <div style={styles.resultItem}>
              <strong>Fecha de Nacimiento:</strong> {extractedData.fechaNacimiento || 'No encontrada'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KycVerifier;
