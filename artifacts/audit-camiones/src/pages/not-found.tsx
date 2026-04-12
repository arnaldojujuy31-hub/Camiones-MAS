import { useNavigate } from "../hooks/useNavigate";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  const { navigate } = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500 text-lg font-medium">Pagina no encontrada</p>
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1 text-blue-600 font-medium hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al inicio
      </button>
    </div>
  );
}
