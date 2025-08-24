
import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Configuración de la API de Gemini ---
// ¡IMPORTANTE! La clave se obtiene de las variables de entorno de Vite.
// Para producción, NUNCA expongas esta clave en el lado del cliente.
// Usa un backend o una función serverless para llamar a la API de Gemini.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// --- Componente Principal ---
function KycVerifier() {
  const [image, setImage] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Convierte un objeto File a una parte de la API de Gemini
  async function fileToGenerativePart(file) {
    const base64EncodedData = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: base64EncodedData, mimeType: file.type },
    };
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setExtractedData(null); // Resetea datos anteriores
      setError(null); // Resetea errores anteriores
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
      const prompt = `Analiza la imagen de este documento de identidad. Extrae únicamente la nacionalidad y la edad de la persona. Devuelve la información exclusivamente en formato JSON con las claves "nacionalidad" y "edad". Por ejemplo: {"nacionalidad": "Mexicana", "edad": 30}. Si un dato no se puede encontrar, establécelo como null.`;
      
      const imagePart = await fileToGenerativePart(image);
      
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      // Limpia la respuesta para asegurarse de que es un JSON válido
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Parsea el JSON
      const parsedData = JSON.parse(jsonString);
      setExtractedData(parsedData);

    } catch (e) {
      console.error(e);
      setError('Ocurrió un error al procesar la imagen. Asegúrate de que la imagen sea clara y que la API key sea correcta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '500px', margin: 'auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Verificación KYC</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>
        Sube una imagen de un documento de identidad (DNI, pasaporte, etc.)
      </p>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="image-upload" style={{ display: 'block', marginBottom: '5px' }}>Subir Imagen:</label>
        <input 
          id="image-upload"
          type="file" 
          accept="image/*" 
          onChange={handleImageChange} 
          style={{ width: '100%' }}
        />
      </div>

      {image && (
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <img 
                src={URL.createObjectURL(image)} 
                alt="ID preview" 
                style={{ maxWidth: '200px', maxHeight: '200px', border: '1px solid #ddd' }}
            />
        </div>
      )}

      <button 
        onClick={handleVerifyClick} 
        disabled={!image || loading}
        style={{ width: '100%', padding: '10px', fontSize: '16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {loading ? 'Verificando...' : 'Verificar Identidad'}
      </button>

      {error && (
        <div style={{ marginTop: '15px', color: 'red', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {extractedData && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ color: '#333' }}>Resultados de la Verificación:</h3>
          <p><strong>Nacionalidad:</strong> {extractedData.nacionalidad || 'No encontrada'}</p>
          <p><strong>Edad:</strong> {extractedData.edad || 'No encontrada'}</p>
        </div>
      )}
    </div>
  );
}

export default KycVerifier;
